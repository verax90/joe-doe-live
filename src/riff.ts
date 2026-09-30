// Record a riff: play a few bars on the MPK and get them back as code. Keys
// become note("…") with the free play sound, bank B pads become s("…") with
// what the pads play (the drum kit or your kit). Notes land on a grid of
// eighths or sixteenths, one bracket per bar inside <…>, and you decide to
// add them as tracks or not. Or hum it: with the voice as source, the mic's
// take becomes note("…") (hum.ts reads its pitch).
// Timing: over a playing pattern it starts on its next bar and follows what
// you hear (the heard cycle comes from cycle-clock.ts, which reads when
// Strudel schedules each beat); with nothing playing, a one-bar count-in and a click
// keep time at the BPM field's tempo.
import { ensureAudio } from './audio';
import { audioTimeOfCycle, heardCycle, whenCycleKnown } from './cycle-clock';
import { padSound } from './freeplay';
import { humGrid, humSteps, pitchTrack } from './hum';
import { micInput } from './mic';
import { startTap } from './record';
import { takeWindow } from './sampler';
import { playedNotes, SCALES, scaleSetting, snap } from './scale';
import { t } from './i18n';
import { NOTE_EVENT, type NoteDetail } from './midi';
import { readStorage } from './storage';
import type { StrudelMirror } from './strudel';

type Hit = { cycle: number; token: string; pad: boolean };

const NAMES = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
export const noteName = (midi: number) => `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;

// Hits (cycles from the start of the take) onto the grid: bar → step → tokens
export function quantize(hits: { cycle: number; token: string }[], bars: number, steps: number) {
  const grid = Array.from({ length: bars }, () => Array.from({ length: steps }, () => [] as string[]));
  for (const { cycle, token } of hits) {
    const index = Math.round(cycle * steps);
    if (index < 0 || index >= bars * steps) continue;
    const cell = grid[Math.floor(index / steps)][index % steps];
    if (!cell.includes(token)) cell.push(token);
  }
  return grid;
}

// The grid as mini-notation: a chord is [a,b], a rest ~, a bar per bracket
export function toMini(grid: string[][][]) {
  const bars = grid.map((bar) => bar.map((cell) => (cell.length > 1 ? `[${cell.join(',')}]` : (cell[0] ?? '~'))).join(' '));
  return bars.length === 1 ? bars[0] : `<${bars.map((bar) => `[${bar}]`).join(' ')}>`;
}

// The code for a take; empty when nothing landed on the grid
export function riffCode(hits: Hit[], bars: number, steps: number, keysSound: string) {
  const lines: string[] = [];
  const keys = hits.filter((hit) => !hit.pad);
  const pads = hits.filter((hit) => hit.pad);
  const keyGrid = quantize(keys, bars, steps);
  const padGrid = quantize(pads, bars, steps);
  if (keyGrid.flat(2).length) lines.push(`note("${toMini(keyGrid)}").s("${keysSound}")`);
  if (padGrid.flat(2).length) lines.push(`s("${toMini(padGrid)}")`);
  return lines;
}

type Options = { editor: StrudelMirror; addTrack: (pattern: string) => void };

export function setupRiff({ editor, addTrack }: Options) {
  const record = document.querySelector<HTMLButtonElement>('#riff-record')!;
  const barsSelect = document.querySelector<HTMLSelectElement>('#riff-bars')!;
  const gridSelect = document.querySelector<HTMLSelectElement>('#riff-grid')!;
  const sourceSelect = document.querySelector<HTMLSelectElement>('#riff-source')!;
  const status = document.querySelector<HTMLElement>('#riff-status')!;
  const result = document.querySelector<HTMLElement>('#riff-result')!;
  const codeView = document.querySelector<HTMLElement>('#riff-code')!;
  let lines: string[] = [];
  let busy = false;

  const g = globalThis as {
    getAudioContext?: () => AudioContext;
    superdough?: (value: Record<string, unknown>, time: number, duration: number) => Promise<unknown>;
  };

  record.addEventListener('click', async () => {
    if (busy) return;
    const voice = sourceSelect.value === 'voice';
    const mic = micInput();
    if (voice && !mic) {
      status.textContent = t('samplerNoMic');
      return;
    }
    busy = true;
    result.hidden = true;
    record.disabled = true;
    await ensureAudio();
    const context = g.getAudioContext!();
    const bars = Number(barsSelect.value);
    const steps = Number(gridSelect.value);
    const clock = editor.repl?.scheduler;
    const playing = Boolean(clock?.started && clock.now && clock.cps);
    const cps = playing ? clock!.cps! : Number(document.querySelector<HTMLInputElement>('#bpm')!.value || 120) / 240;

    // heard(): the cycle of what you hear right now, relative to the take's start
    let heard: () => number;
    // the take's first bar and length on the audio clock, for the voice
    let from = 0;
    let seconds = bars / cps;
    if (playing) {
      // measured from Strudel's own schedule; the estimate only as a fallback
      await whenCycleKnown();
      // you hear it a little after it is made: the output's latency (capped,
      // as some systems report far more than they have)
      const outputLag = Math.min(0.1, context.outputLatency || 0);
      const heardNow = () => heardCycle(context.currentTime - outputLag) ?? clock!.now!() - (clock!.latency ?? 0.1) * cps;
      let start = Math.ceil(heardNow());
      if (start - heardNow() < 0.25) start += 1; // too close: the bar after
      heard = () => heardNow() - start;
      from = audioTimeOfCycle(start) ?? context.currentTime;
      seconds = (audioTimeOfCycle(start + bars) ?? from + bars / cps) - from;
    } else {
      // Count-in: one bar of clicks, then the take, clicks going on
      const begin = context.currentTime + 0.1;
      const start = begin + 1 / cps;
      const beat = 1 / cps / 4;
      for (let i = 0; i < (bars + 1) * 4; i++) {
        void g.superdough?.({ s: 'rim', bank: 'RolandTR808', gain: i % 4 === 0 ? 0.8 : 0.45 }, begin + i * beat, 0.1).catch(() => undefined);
      }
      heard = () => (context.currentTime - start) * cps;
      from = start;
    }

    const hits: Hit[] = [];
    const pads = readStorage<{ name: string; page: number }>('jdl:pads-kit', { name: '', page: 0 });
    const onNote = (event: Event) => {
      const { note } = (event as CustomEvent<NoteDetail>).detail;
      const cycle = heard();
      // a hair early for the downbeat still counts: it rounds onto step 0
      if (cycle < -0.5 / steps || cycle >= bars) return;
      if (note >= 32 && note < 40) {
        const sound = padSound(note - 32, pads);
        hits.push({ cycle, pad: true, token: 'n' in sound ? `${sound.s}:${sound.n}` : sound.s });
      } else {
        // what sounded: in a key, the scale's note or chord (scale.ts)
        for (const played of playedNotes(note)) hits.push({ cycle, pad: false, token: noteName(played) });
      }
    };
    // singing to what you hear lands late in the take: the looper's lag
    const lag = Math.min(0.15, context.outputLatency || 0) + 0.01 + readStorage<number>('jdl:looper-offset', 0) / 1000;
    const stopTap = voice ? await startTap(context, [mic!]) : undefined;
    if (!voice) window.addEventListener(NOTE_EVENT, onNote);

    await new Promise<void>((resolve) => {
      const tick = setInterval(() => {
        const cycle = heard();
        if (cycle < 0) status.textContent = t('riffCountIn', { beats: Math.ceil(-cycle * 4) });
        else if (cycle < bars || (voice && context.currentTime < from + seconds + lag + 0.05))
          status.textContent = t(voice ? 'humRecording' : 'riffRecording', { bar: Math.min(bars, Math.floor(cycle) + 1), bars });
        else {
          clearInterval(tick);
          resolve();
        }
      }, 50);
    });
    window.removeEventListener(NOTE_EVENT, onNote);

    const keysSound = document.querySelector<HTMLSelectElement>('#freeplay-sound')!.value || 'piano';
    let notes = hits.length;
    if (voice) {
      const take = takeWindow(stopTap!(), from + lag, from + lag + seconds, context.sampleRate)[0];
      // in a key (scale.ts), each sung note goes to the scale's nearest
      const key = scaleSetting();
      const scale = SCALES[key.scale];
      const sung = humSteps(pitchTrack(take, context.sampleRate), {
        bars,
        steps,
        seconds,
        snap: scale ? (note) => snap(note, key.root, scale) : undefined,
      });
      const grid = humGrid(sung, steps, noteName);
      lines = grid ? [`note("${toMini(grid)}").s("${keysSound}")`] : [];
      notes = sung.filter((note) => note > 0).length;
    } else {
      lines = riffCode(hits, bars, steps, keysSound);
    }
    busy = false;
    record.disabled = false;
    if (!lines.length) {
      status.textContent = t(voice ? 'humEmpty' : 'riffEmpty');
      return;
    }
    status.textContent = t('riffDone', { notes });
    codeView.textContent = lines.map((line) => `$: ${line}`).join('\n');
    result.hidden = false;
  });

  document.querySelector('#riff-add')!.addEventListener('click', () => {
    for (const line of lines) addTrack(line);
    result.hidden = true;
    status.textContent = t('riffAdded');
  });
  document.querySelector('#riff-discard')!.addEventListener('click', () => {
    result.hidden = true;
    status.textContent = '';
  });
}
