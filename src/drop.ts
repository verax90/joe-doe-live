// Build-up and drop, for playing live: from the next bar, for 2, 4 or 8
// bars, a snare roll speeds up (quarters, eighths, sixteenths, thirty-
// seconds) and grows, a noise riser climbs, and a high-pass takes the bass
// out of everything that plays; optionally half a beat of silence just
// before; and on the first beat after, the drop: everything back at once,
// with a deep boom and a crash. All of it is scheduled on the audio clock
// against the bars Strudel plays (cycle-clock.ts), so the drop lands on the
// one, and none of it touches the code. Stop in the middle calls it off.
import { audioTimeOfCycle, heardCycle, whenCycleKnown } from './cycle-clock';
import { onLangChange, t } from './i18n';
import { getLimiter } from './limiter';
import { readStorage, writeStorage } from './storage';
import { cancelShatter, shatterAt } from './shatter';

// On the one of a build-up, when it is set to change the visual
export const DROP_EVENT = 'jdl:drop';

export type DropSettings = {
  bars: number;
  roll: boolean;
  riser: boolean;
  filter: boolean;
  gap: boolean;
  impact: boolean;
  glass: boolean;
  // another visual comes in on the one (gallery.ts picks which)
  visual: boolean;
  // what kind: what rolls (snare, clap or kick), what rises (noise or a tone
  // going up), which way the filter goes (the bass away, or everything going
  // dark), and how long the silence before (half a beat or a whole one)
  rollSound: 'sd' | 'cp' | 'bd';
  riserKind: 'noise' | 'tone';
  filterKind: 'high' | 'low';
  gapBeats: number;
};
const DEFAULTS: DropSettings = {
  bars: 4,
  roll: true,
  riser: true,
  filter: true,
  gap: true,
  impact: true,
  glass: true,
  visual: true,
  rollSound: 'sd',
  riserKind: 'noise',
  filterKind: 'high',
  gapBeats: 0.5,
};

// Kinds of build-up, each a whole setting at once
export type DropKind = { id: string; settings: Partial<DropSettings> };
export const DROP_KINDS: DropKind[] = [
  // the festival one: snare roll, noise up, the bass away, half a beat of nothing
  { id: 'classic', settings: { roll: true, rollSound: 'sd', riser: true, riserKind: 'noise', filter: true, filterKind: 'high', gap: true, gapBeats: 0.5, impact: true } },
  // the kick itself speeds up, no silence: straight into it
  { id: 'techno', settings: { roll: true, rollSound: 'bd', riser: true, riserKind: 'noise', filter: true, filterKind: 'high', gap: false, impact: true } },
  // claps and a tone climbing, like a siren
  { id: 'rise', settings: { roll: true, rollSound: 'cp', riser: true, riserKind: 'tone', filter: true, filterKind: 'high', gap: true, gapBeats: 0.5, impact: true } },
  // no roll: everything goes dark and muffled, a whole beat of nothing, then all of it
  { id: 'blackout', settings: { roll: false, riser: false, filter: true, filterKind: 'low', gap: true, gapBeats: 1, impact: true } },
];
export function kindOf(settings: DropSettings) {
  return DROP_KINDS.find((kind) => Object.entries(kind.settings).every(([key, value]) => settings[key as keyof DropSettings] === value))?.id;
}

// The snare roll: seconds from the build's start and a gain for each hit.
// The build is split in four stages of 4, 8, 16 and 32 hits a bar; the gap,
// if any, leaves the last half beat empty
export function rollHits(bars: number, barSeconds: number, gap: boolean, gapBeats = 0.5) {
  const hits: { at: number; gain: number }[] = [];
  const end = bars * barSeconds - (gap ? (barSeconds / 4) * gapBeats : 0);
  for (let bar = 0; bar < bars; bar++) {
    const division = [4, 8, 16, 32][Math.min(3, Math.floor((bar / bars) * 4))];
    for (let step = 0; step < division; step++) {
      const at = (bar + step / division) * barSeconds;
      if (at >= end - 1e-9) break;
      hits.push({ at, gain: 0.25 + 0.75 * (at / (bars * barSeconds)) });
    }
  }
  return hits;
}

let settings: DropSettings = { ...DEFAULTS, ...readStorage<Partial<DropSettings>>('jdl:drop', {}) };
const gapSeconds = (barSeconds: number) => (settings.gap ? (barSeconds / 4) * settings.gapBeats : 0);

type Scheduler = { started?: boolean };
type Superdough = (value: Record<string, unknown>, time: number, duration: number) => Promise<unknown>;

export function setupDrop(scheduler: Scheduler | undefined) {
  const go = document.querySelector<HTMLButtonElement>('#drop-go')!;
  const goLabel = go.querySelector<HTMLElement>('span')!;
  const status = document.querySelector<HTMLElement>('#drop-status')!;
  const progress = document.querySelector<HTMLElement>('#drop-progress')!;
  const boxes = (['roll', 'riser', 'filter', 'gap', 'impact', 'glass', 'visual'] as const).map((key) => [key, document.querySelector<HTMLInputElement>(`#drop-${key}`)!] as const);
  const kinds = [...document.querySelectorAll<HTMLButtonElement>('.drop-kind')];
  const barButtons = [...document.querySelectorAll<HTMLButtonElement>('.drop-bar')];
  const show = () => {
    for (const [key, box] of boxes) box.checked = settings[key];
    const current = kindOf(settings);
    for (const kind of kinds) kind.setAttribute('aria-pressed', String(kind.dataset.kind === current));
    for (const button of barButtons) button.setAttribute('aria-pressed', String(Number(button.dataset.bars) === settings.bars));
  };
  for (const [key, box] of boxes) box.addEventListener('change', () => save({ [key]: box.checked }));
  for (const kind of kinds) kind.addEventListener('click', () => save(DROP_KINDS.find((k) => k.id === kind.dataset.kind)!.settings));
  for (const button of barButtons) button.addEventListener('click', () => save({ bars: Number(button.dataset.bars) }));

  function save(next: Partial<DropSettings>) {
    settings = { ...settings, ...next };
    writeStorage('jdl:drop', settings);
    show();
  }
  show();
  const idle = () => {
    goLabel.textContent = t('dropGo');
    go.dataset.icon = 'drop';
    go.classList.remove('is-running');
    progress.style.setProperty('--done', '0');
  };

  // What a build left running, to call it off
  let running: { nodes: AudioScheduledSourceNode[]; timer: number; swap?: number } | undefined;

  const reset = (context: BaseAudioContext) => {
    const limiter = getLimiter();
    if (!limiter) return;
    const now = context.currentTime;
    for (const param of [limiter.sweep.frequency, limiter.gate.gain]) param.cancelScheduledValues(now);
    limiter.sweep.type = 'highpass';
    limiter.sweep.frequency.setValueAtTime(10, now);
    limiter.gate.gain.setValueAtTime(1, now);
  };

  const cancel = () => {
    if (!running) return;
    const limiter = getLimiter();
    for (const node of running.nodes) {
      try {
        node.stop();
      } catch {
        // not started yet or already over
      }
    }
    window.clearInterval(running.timer);
    window.clearTimeout(running.swap);
    cancelShatter();
    if (limiter) reset(limiter.master.context);
    running = undefined;
    idle();
    status.textContent = t('dropCancelled');
  };

  go.addEventListener('click', async () => {
    if (running) return cancel();
    const limiter = getLimiter();
    if (!scheduler?.started || !limiter) {
      status.textContent = t('dropNeedsPlay');
      return;
    }
    if (!(await whenCycleKnown())) return;
    const context = limiter.master.context as AudioContext;
    const length = settings.bars;
    // from the next bar you hear, not one already under way
    const heard = heardCycle(context.currentTime)!;
    let startCycle = Math.ceil(heard);
    if (startCycle - heard < 0.15) startCycle += 1;
    const start = audioTimeOfCycle(startCycle)!;
    const dropAt = audioTimeOfCycle(startCycle + length)!;
    const barSeconds = (dropAt - start) / length;
    const nodes: AudioScheduledSourceNode[] = [];
    const out = limiter.limiter; // after the sweep: the build itself is not filtered
    const superdough = (globalThis as { superdough?: Superdough }).superdough;
    // Strudel's sounds are handed over a quarter of a second ahead (below),
    // so a Stop in the middle leaves none of them behind
    const pending: { time: number; value: Record<string, unknown>; duration: number }[] = [];
    if (settings.roll) {
      for (const hit of rollHits(length, barSeconds, settings.gap, settings.gapBeats)) {
        const loud = settings.rollSound === 'bd' ? 1 : 0.9;
        pending.push({ time: start + hit.at, value: { s: settings.rollSound, bank: 'RolandTR909', gain: loud * hit.gain }, duration: 0.1 });
      }
    }
    if (settings.impact) pending.push({ time: dropAt, value: { s: 'crash', bank: 'RolandTR909', gain: 0.8 }, duration: 1 });

    if (settings.riser && settings.riserKind === 'tone') {
      // a saw climbing two octaves and a fifth, opening up as it goes: a siren
      const tone = new OscillatorNode(context, { type: 'sawtooth', frequency: 110 });
      const shine = new BiquadFilterNode(context, { type: 'lowpass', frequency: 400, Q: 6 });
      const level = new GainNode(context, { gain: 0.0001 });
      tone.frequency.setValueAtTime(110, start);
      tone.frequency.exponentialRampToValueAtTime(660, dropAt);
      shine.frequency.setValueAtTime(400, start);
      shine.frequency.exponentialRampToValueAtTime(7000, dropAt);
      level.gain.setValueAtTime(0.0001, start);
      level.gain.exponentialRampToValueAtTime(0.16, dropAt - gapSeconds(barSeconds) - 0.01);
      level.gain.setValueAtTime(0, dropAt - gapSeconds(barSeconds));
      tone.connect(shine).connect(level).connect(out);
      tone.start(start);
      tone.stop(dropAt + 0.05);
      nodes.push(tone);
    } else if (settings.riser) {
      // white noise through a band-pass sweeping up, louder and louder
      const seconds = dropAt - start;
      const buffer = context.createBuffer(1, Math.ceil(seconds * context.sampleRate), context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const noise = new AudioBufferSourceNode(context, { buffer });
      const band = new BiquadFilterNode(context, { type: 'bandpass', frequency: 300, Q: 1.2 });
      const level = new GainNode(context, { gain: 0.0001 });
      band.frequency.setValueAtTime(300, start);
      band.frequency.exponentialRampToValueAtTime(9000, dropAt);
      level.gain.setValueAtTime(0.0001, start);
      level.gain.exponentialRampToValueAtTime(0.35, dropAt - gapSeconds(barSeconds) - 0.01);
      level.gain.setValueAtTime(0, dropAt - gapSeconds(barSeconds));
      noise.connect(band).connect(level).connect(out);
      noise.start(start);
      noise.stop(dropAt + 0.05);
      nodes.push(noise);
    }

    // everything that plays: the bass going away, then all back on the one
    // (or, in a blackout, everything going dark: the same filter as a low-pass
    // closing down; wide open it changes nothing, so it can switch kind now)
    const { sweep, gate } = limiter;
    for (const param of [sweep.frequency, gate.gain]) param.cancelScheduledValues(context.currentTime);
    const dark = settings.filter && settings.filterKind === 'low';
    sweep.type = dark ? 'lowpass' : 'highpass';
    const open = dark ? 20000 : 10;
    sweep.frequency.setValueAtTime(open, context.currentTime);
    sweep.frequency.setValueAtTime(open, start);
    if (settings.filter) sweep.frequency.exponentialRampToValueAtTime(dark ? 260 : 900, dropAt - gapSeconds(barSeconds) - 0.01);
    if (settings.gap) {
      gate.gain.setValueAtTime(1, dropAt - gapSeconds(barSeconds));
      gate.gain.linearRampToValueAtTime(0, dropAt - gapSeconds(barSeconds) + 0.01);
    }
    sweep.frequency.setValueAtTime(open, dropAt);
    gate.gain.setValueAtTime(1, dropAt);

    if (settings.impact) {
      // a deep boom: a sine falling from 110 to 40 Hz over half a second
      const boom = new OscillatorNode(context, { type: 'sine', frequency: 110 });
      const boomLevel = new GainNode(context, { gain: 0 });
      boom.frequency.setValueAtTime(110, dropAt);
      boom.frequency.exponentialRampToValueAtTime(40, dropAt + 0.5);
      boomLevel.gain.setValueAtTime(0.9, dropAt);
      boomLevel.gain.exponentialRampToValueAtTime(0.001, dropAt + 1.2);
      boom.connect(boomLevel).connect(out);
      boom.start(dropAt);
      boom.stop(dropAt + 1.3);
      nodes.push(boom);
    }

    // the screen cracks over the last bar and breaks on the one (shatter.ts),
    // at the moment it is heard, not when it is scheduled
    if (settings.glass) shatterAt(performance.now() + (dropAt - context.currentTime + (context.outputLatency || 0)) * 1000, barSeconds);
    // and another visual comes in right then
    const swap = settings.visual
      ? window.setTimeout(() => window.dispatchEvent(new Event(DROP_EVENT)), (dropAt - context.currentTime + (context.outputLatency || 0)) * 1000)
      : undefined;
    goLabel.textContent = t('dropCancel');
    go.dataset.icon = 'close';
    go.classList.add('is-running');
    const timer = window.setInterval(() => {
      while (pending.length && pending[0].time < context.currentTime + 0.25) {
        const { time, value, duration } = pending.shift()!;
        void superdough?.(value, time, duration)?.catch(() => undefined);
      }
      const left = dropAt - context.currentTime;
      progress.style.setProperty('--done', String(Math.min(1, Math.max(0, 1 - left / (dropAt - start)))));
      if (left > dropAt - start) status.textContent = t('dropWaiting');
      else if (left > 0) status.textContent = t('dropBuilding', { bars: Math.ceil(left / barSeconds) });
      else if (!pending.length) {
        window.clearInterval(timer);
        running = undefined;
        idle();
        // the filter back to how it rests, a moment after the drop
        if (sweep.type !== 'highpass') {
          sweep.type = 'highpass';
          sweep.frequency.setValueAtTime(10, context.currentTime);
        }
        status.textContent = t('dropDone');
      }
    }, 50);
    running = { nodes, timer, swap };
  });

  idle();
  onLangChange(() => {
    if (!running) idle();
  });

  // Stop in the middle calls it off, so nothing stays filtered
  return { stopped: cancel };
}
