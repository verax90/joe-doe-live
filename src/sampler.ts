// Sampler: take a few bars of what sounds (the backing track, the mic, or
// everything) and keep them as your own sounds, like chopping a record on an
// MPC. While the studio plays it starts on the next bar you hear and takes
// whole bars, so the loop is in time; stopped, it starts at once and takes the
// bars at the BPM field's tempo. It is saved twice, as your samples: the whole
// take (s("muestra1").loopAt(2)) and the take cut in 8 equal chops
// (s("muestra1_trozos"), ready for the pads or n("0 3 1 …")).
import { ensureAudio } from './audio';
import { backingInput } from './backing';
import { t } from './i18n';
import { ensureLimiter, getLimiter } from './limiter';
import { micOutput } from './mic';
import { audioTimeOfCycle, heardCycle, whenCycleKnown } from './cycle-clock';
import { encodeWav, startTap, type TapBlock } from './record';
import { addSamples, loadedKits } from './samples';
import type { StrudelMirror } from './strudel';

export type Stereo = [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>];

// The samples between two audio clock times, out of the tap's blocks
export function takeWindow(blocks: TapBlock[], from: number, to: number, sampleRate: number): Stereo {
  const length = Math.max(0, Math.round((to - from) * sampleRate));
  const out: Stereo = [new Float32Array(length), new Float32Array(length)];
  for (const { time, channels } of blocks) {
    const offset = Math.round((time - from) * sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = channels[c] ?? channels[0];
      for (let i = 0; i < data.length; i++) {
        const at = offset + i;
        if (at >= 0 && at < length) out[c][at] = data[i];
      }
    }
  }
  return out;
}

// Loudest point up to `peak` (sampled tabs come in at any level); silence stays
export function normalize([left, right]: Stereo, peak = 0.9): Stereo {
  let max = 0;
  for (const data of [left, right]) for (const value of data) max = Math.max(max, Math.abs(value));
  if (max < 1e-4) return [left, right];
  const gain = peak / max;
  return [left.map((v) => v * gain), right.map((v) => v * gain)];
}

// Equal chops, the last one taking any leftover samples
export function chops([left, right]: Stereo, parts: number): Stereo[] {
  const size = Math.floor(left.length / parts);
  return Array.from({ length: parts }, (_, i) => {
    const end = i === parts - 1 ? left.length : (i + 1) * size;
    return [left.slice(i * size, end), right.slice(i * size, end)] as Stereo;
  });
}

// muestra1, muestra2… the first one not taken
export function nextName(taken: string[]) {
  for (let n = 1; ; n++) if (!taken.includes(`muestra${n}`)) return `muestra${n}`;
}

// The code that plays a take back in time: whole, or as its chops in order
export const loopCode = (name: string, bars: number) => `s("${name}").loopAt(${bars})`;
export const chopsCode = (name: string, bars: number) =>
  `s("${name}_trozos").n("0 1 2 3 4 5 6 7")${bars === 1 ? '' : `.slow(${bars})`}`;

const toWav = ([left, right]: Stereo, sampleRate: number, name: string) =>
  new File([encodeWav([[left, right]], sampleRate)], `${name}.wav`, { type: 'audio/wav' });

type Options = { editor: StrudelMirror; addTrack: (pattern: string) => void };

export function setupSampler({ editor, addTrack }: Options) {
  const sourceSelect = document.querySelector<HTMLSelectElement>('#sampler-source')!;
  const barsSelect = document.querySelector<HTMLSelectElement>('#sampler-bars')!;
  const record = document.querySelector<HTMLButtonElement>('#sampler-record')!;
  const status = document.querySelector<HTMLElement>('#sampler-status')!;
  const result = document.querySelector<HTMLElement>('#sampler-result')!;
  const canvas = document.querySelector<HTMLCanvasElement>('#sampler-wave')!;
  const nameInput = document.querySelector<HTMLInputElement>('#sampler-name')!;
  const listen = document.querySelector<HTMLButtonElement>('#sampler-listen')!;
  const save = document.querySelector<HTMLButtonElement>('#sampler-save')!;
  const discard = document.querySelector<HTMLButtonElement>('#sampler-discard')!;
  const saved = document.querySelector<HTMLElement>('#sampler-saved')!;

  let take: { audio: Stereo; sampleRate: number; bars: number } | undefined;
  let lastSaved: { name: string; bars: number } | undefined;
  let busy = false;
  let listening: AudioBufferSourceNode | undefined;

  const context = () => (globalThis as { getAudioContext?: () => AudioContext }).getAudioContext!();

  // What to listen to, or why it cannot
  const sources = (): AudioNode[] | string => {
    const which = sourceSelect.value;
    if (which === 'backing') return backingInput() ? [backingInput()!] : t('samplerNoBacking');
    if (which === 'mic') return micOutput() ? [micOutput()!] : t('samplerNoMic');
    const limiter = getLimiter()?.limiter;
    if (!limiter) return t('samplerNoSound');
    const mic = micOutput();
    return mic ? [limiter, mic] : [limiter];
  };

  const draw = ([left]: Stereo) => {
    const g = canvas.getContext('2d')!;
    const { width, height } = canvas;
    g.clearRect(0, 0, width, height);
    g.fillStyle = getComputedStyle(canvas).color;
    const per = Math.max(1, Math.floor(left.length / width));
    for (let x = 0; x < width; x++) {
      let min = 0;
      let max = 0;
      for (let i = x * per; i < Math.min(left.length, (x + 1) * per); i++) {
        min = Math.min(min, left[i]);
        max = Math.max(max, left[i]);
      }
      g.fillRect(x, ((1 - max) / 2) * height, 1, Math.max(1, ((max - min) / 2) * height));
    }
    // where the 8 chops fall
    g.globalAlpha = 0.35;
    for (let k = 1; k < 8; k++) g.fillRect(Math.round((k * width) / 8), 0, 1, height);
    g.globalAlpha = 1;
  };

  record.addEventListener('click', async () => {
    if (busy) return;
    await ensureAudio();
    ensureLimiter();
    const nodes = sources();
    if (typeof nodes === 'string') {
      status.textContent = nodes;
      return;
    }
    busy = true;
    record.disabled = true;
    result.hidden = true;
    saved.hidden = true;
    const audio = context();
    const bars = Number(barsSelect.value);
    const clock = editor.repl?.scheduler;
    const playing = Boolean(clock?.started && clock.now && clock.cps);
    const cps = playing ? clock!.cps! : Number(document.querySelector<HTMLInputElement>('#bpm')!.value || 90) / 240;
    // Where the take starts on the audio clock: the next bar you hear (the
    // scheduler plays a little ahead of now), or at once when stopped
    let from = audio.currentTime + 0.05;
    if (playing && (await whenCycleKnown())) {
      const heard = heardCycle(audio.currentTime)!;
      let next = Math.ceil(heard);
      if (next - heard < 0.1) next += 1;
      from = audioTimeOfCycle(next)!;
    }
    const to = from + bars / cps;
    const stop = await startTap(audio, nodes);
    await new Promise<void>((resolve) => {
      const tick = setInterval(() => {
        const now = audio.currentTime;
        if (now < from) status.textContent = t('samplerWaiting');
        else if (now < to) status.textContent = t('samplerRecording', { bar: Math.min(bars, Math.floor((now - from) * cps) + 1), bars });
        else {
          clearInterval(tick);
          resolve();
        }
      }, 50);
    });
    // a little longer, so the last block is in
    await new Promise((resolve) => setTimeout(resolve, 60));
    const blocks = stop();
    busy = false;
    record.disabled = false;
    take = { audio: normalize(takeWindow(blocks, from, to, audio.sampleRate)), sampleRate: audio.sampleRate, bars };
    const silent = take.audio[0].every((v) => v === 0);
    if (silent) {
      take = undefined;
      status.textContent = t('samplerSilent');
      return;
    }
    status.textContent = bars === 1 ? t('samplerDoneOne') : t('samplerDone', { bars });
    nameInput.value = nextName(loadedKits().map((kit) => kit.name));
    draw(take.audio);
    result.hidden = false;
  });

  listen.addEventListener('click', () => {
    if (!take) return;
    listening?.stop();
    const audio = context();
    const buffer = audio.createBuffer(2, take.audio[0].length, take.sampleRate);
    buffer.copyToChannel(take.audio[0], 0);
    buffer.copyToChannel(take.audio[1], 1);
    listening = new AudioBufferSourceNode(audio, { buffer });
    listening.connect(getLimiter()?.master ?? audio.destination);
    listening.start();
  });

  save.addEventListener('click', async () => {
    if (!take) return;
    const name = nameInput.value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || nextName([]);
    const { audio, sampleRate, bars } = take;
    await addSamples([
      { path: `${name}.wav`, file: toWav(audio, sampleRate, name) },
      ...chops(audio, 8).map((chop, i) => ({ path: `${name}_trozos/${i + 1}.wav`, file: toWav(chop, sampleRate, `${i + 1}`) })),
    ]);
    lastSaved = { name, bars };
    take = undefined;
    result.hidden = true;
    saved.hidden = false;
    status.textContent = t('samplerSaved', { name });
  });

  discard.addEventListener('click', () => {
    take = undefined;
    result.hidden = true;
    status.textContent = '';
  });

  document.querySelector('#sampler-add-loop')!.addEventListener('click', () => {
    if (lastSaved) addTrack(loopCode(lastSaved.name, lastSaved.bars));
  });
  document.querySelector('#sampler-add-chops')!.addEventListener('click', () => {
    if (lastSaved) addTrack(chopsCode(lastSaved.name, lastSaved.bars));
  });
}
