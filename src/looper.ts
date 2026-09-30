// Looper: record 1, 2 or 4 bars of the mic (or the backing track, or
// everything) over the playing pattern and they repeat in time, layer on
// layer. Each layer is saved as one of your samples (capa1, capa2…) and joins
// the code as a line, $: s("capa1").loopAt(2), so it can be seen, muted with _,
// turned up or moved like any track. The first repeat is played straight
// away by the audio clock, since Strudel has already planned that bar by the
// time the take is ready; the line takes over from the next one.
// Singing in time with what you hear lands a little late in the take (the
// sound reaches the speakers late, the mic adds its own delay): with the mic
// that lag is taken off, plus an offset you can nudge by ear.
import { ensureAudio } from './audio';
import { audioTimeOfCycle, heardCycle, whenCycleKnown } from './cycle-clock';
import { t } from './i18n';
import { ensureLimiter, getLimiter } from './limiter';
import { startTap } from './record';
import { addSamples, loadedKits } from './samples';
import { takeSources, takeWindow, toWav } from './sampler';
import { readStorage, writeStorage } from './storage';
import type { StrudelMirror } from './strudel';

// capa1, capa2… the first one not taken
export function layerName(taken: string[]) {
  for (let n = 1; ; n++) if (!taken.includes(`capa${n}`)) return `capa${n}`;
}

// The line that plays a layer in time. loopAt(bars) starts it on every bars-th
// cycle; a take that began elsewhere is moved by its phase
export function layerLine(name: string, bars: number, startCycle: number) {
  const phase = ((startCycle % bars) + bars) % bars;
  return `s("${name}").loopAt(${bars})${phase ? `.late(${phase})` : ''}.gain(1)`;
}

// Takes one line out of the code, with its line break
export function withoutLine(code: string, line: string) {
  const lines = code.split('\n');
  const index = lines.findIndex((l) => l.trim().endsWith(line) && l.includes(line));
  if (index < 0) return null;
  const from = lines.slice(0, index).reduce((sum, l) => sum + l.length + 1, 0);
  const to = Math.min(code.length, from + lines[index].length + 1);
  return { from, to };
}

type Layer = { name: string; line: string };
type Options = { editor: StrudelMirror; addTrack: (pattern: string) => void };

export function setupLooper({ editor, addTrack }: Options) {
  const sourceSelect = document.querySelector<HTMLSelectElement>('#looper-source')!;
  const barsSelect = document.querySelector<HTMLSelectElement>('#looper-bars')!;
  const record = document.querySelector<HTMLButtonElement>('#looper-record')!;
  const undo = document.querySelector<HTMLButtonElement>('#looper-undo')!;
  const clear = document.querySelector<HTMLButtonElement>('#looper-clear')!;
  const status = document.querySelector<HTMLElement>('#looper-status')!;
  const list = document.querySelector<HTMLElement>('#looper-layers')!;
  const offsetInput = document.querySelector<HTMLInputElement>('#looper-offset')!;
  const offsetText = document.querySelector<HTMLElement>('#looper-offset-value')!;

  let offset = readStorage<number>('jdl:looper-offset', 0);
  offsetInput.value = String(offset);
  offsetText.textContent = String(offset);
  offsetInput.addEventListener('input', () => {
    offset = Number(offsetInput.value);
    offsetText.textContent = offsetInput.value;
    writeStorage('jdl:looper-offset', offset);
  });

  let layers: Layer[] = [];
  let busy = false;

  const render = () => {
    list.replaceChildren(
      ...layers.map((layer, i) => {
        const item = document.createElement('li');
        item.textContent = `${t('looperLayer', { n: i + 1 })} · s("${layer.name}")`;
        return item;
      }),
    );
    undo.disabled = !layers.length;
    clear.disabled = !layers.length;
  };

  // Out of the code, and heard at once if it plays
  const removeLines = (gone: Layer[]) => {
    for (const layer of gone) {
      const range = withoutLine(editor.code, layer.line);
      if (range) editor.editor?.dispatch({ changes: { from: range.from, to: range.to, insert: '' } });
    }
    if (editor.repl?.scheduler?.started) void editor.evaluate();
  };

  const context = () => (globalThis as { getAudioContext?: () => AudioContext }).getAudioContext!();

  record.addEventListener('click', async () => {
    if (busy) return;
    const clock = editor.repl?.scheduler;
    if (!clock?.started) {
      status.textContent = t('looperNeedsPlay');
      return;
    }
    await ensureAudio();
    ensureLimiter();
    const nodes = takeSources(sourceSelect.value);
    if (typeof nodes === 'string') {
      status.textContent = nodes;
      return;
    }
    if (!(await whenCycleKnown())) return;
    busy = true;
    record.disabled = true;
    const audio = context();
    const bars = Number(barsSelect.value);
    // the next bar you hear
    const heard = heardCycle(audio.currentTime)!;
    let start = Math.ceil(heard);
    if (start - heard < 0.1) start += 1;
    const from = audioTimeOfCycle(start)!;
    const to = audioTimeOfCycle(start + bars)!;
    // singing to what you hear: take the lag off (mic only)
    const lag = sourceSelect.value === 'mic' ? Math.min(0.15, audio.outputLatency || 0) + 0.01 + offset / 1000 : 0;
    const stop = await startTap(audio, nodes);
    await new Promise<void>((resolve) => {
      const tick = setInterval(() => {
        const now = audio.currentTime;
        const cps = bars / (to - from);
        if (now < from) status.textContent = t('samplerWaiting');
        else if (now < to + lag) status.textContent = t('looperRecording', { bar: Math.min(bars, Math.floor((now - from) * cps) + 1), bars });
        else {
          clearInterval(tick);
          resolve();
        }
      }, 20);
    });
    await new Promise((resolve) => setTimeout(resolve, 40));
    const blocks = stop();
    const take = takeWindow(blocks, from + lag, to + lag, audio.sampleRate);
    busy = false;
    record.disabled = false;
    if (take[0].every((v) => v === 0)) {
      status.textContent = t('samplerSilent');
      return;
    }
    // The first repeat, right now, by the audio clock
    const buffer = audio.createBuffer(2, take[0].length, audio.sampleRate);
    buffer.copyToChannel(take[0], 0);
    buffer.copyToChannel(take[1], 1);
    const bridge = new AudioBufferSourceNode(audio, { buffer });
    bridge.connect(getLimiter()?.master ?? audio.destination);
    const late = Math.max(0, audio.currentTime - to);
    bridge.start(Math.max(to, audio.currentTime), late);
    // …then as a line of code from the next one
    const name = layerName(loadedKits().map((kit) => kit.name));
    await addSamples([{ path: `${name}.wav`, file: toWav(take, audio.sampleRate, name) }]);
    const line = layerLine(name, bars, start);
    layers.push({ name, line });
    addTrack(line);
    status.textContent = t('looperAdded', { name });
    render();
  });

  undo.addEventListener('click', () => {
    const last = layers.pop();
    if (last) removeLines([last]);
    status.textContent = '';
    render();
  });
  clear.addEventListener('click', () => {
    removeLines(layers);
    layers = [];
    status.textContent = '';
    render();
  });

  render();
}
