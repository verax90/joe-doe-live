// Build-up and drop, for playing live: from the next bar, for 2, 4 or 8
// bars, a snare roll speeds up (quarters, eighths, sixteenths, thirty-
// seconds) and grows, a noise riser climbs, and a high-pass takes the bass
// out of everything that plays; optionally half a beat of silence just
// before; and on the first beat after, the drop: everything back at once,
// with a deep boom and a crash. All of it is scheduled on the audio clock
// against the bars Strudel plays (cycle-clock.ts), so the drop lands on the
// one, and none of it touches the code. Stop in the middle calls it off.
import { audioTimeOfCycle, heardCycle, whenCycleKnown } from './cycle-clock';
import { t } from './i18n';
import { getLimiter } from './limiter';
import { readStorage, writeStorage } from './storage';

export type DropSettings = { bars: number; roll: boolean; riser: boolean; filter: boolean; gap: boolean; impact: boolean };
const DEFAULTS: DropSettings = { bars: 4, roll: true, riser: true, filter: true, gap: true, impact: true };

// The snare roll: seconds from the build's start and a gain for each hit.
// The build is split in four stages of 4, 8, 16 and 32 hits a bar; the gap,
// if any, leaves the last half beat empty
export function rollHits(bars: number, barSeconds: number, gap: boolean) {
  const hits: { at: number; gain: number }[] = [];
  const end = bars * barSeconds - (gap ? barSeconds / 8 : 0);
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

type Scheduler = { started?: boolean };
type Superdough = (value: Record<string, unknown>, time: number, duration: number) => Promise<unknown>;

export function setupDrop(scheduler: Scheduler | undefined) {
  const go = document.querySelector<HTMLButtonElement>('#drop-go')!;
  const bars = document.querySelector<HTMLSelectElement>('#drop-bars')!;
  const status = document.querySelector<HTMLElement>('#drop-status')!;
  for (const key of ['roll', 'riser', 'filter', 'gap', 'impact'] as const) {
    const box = document.querySelector<HTMLInputElement>(`#drop-${key}`)!;
    box.checked = settings[key];
    box.addEventListener('change', () => save({ [key]: box.checked }));
  }
  bars.value = String(settings.bars);
  bars.addEventListener('change', () => save({ bars: Number(bars.value) }));

  function save(next: Partial<DropSettings>) {
    settings = { ...settings, ...next };
    writeStorage('jdl:drop', settings);
  }

  // What a build left running, to call it off
  let running: { nodes: AudioScheduledSourceNode[]; timer: number } | undefined;

  const reset = (context: BaseAudioContext) => {
    const limiter = getLimiter();
    if (!limiter) return;
    const now = context.currentTime;
    for (const param of [limiter.sweep.frequency, limiter.gate.gain]) param.cancelScheduledValues(now);
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
    if (limiter) reset(limiter.master.context);
    running = undefined;
    go.textContent = t('dropGo');
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
      for (const hit of rollHits(length, barSeconds, settings.gap)) {
        pending.push({ time: start + hit.at, value: { s: 'sd', bank: 'RolandTR909', gain: 0.9 * hit.gain }, duration: 0.1 });
      }
    }
    if (settings.impact) pending.push({ time: dropAt, value: { s: 'crash', bank: 'RolandTR909', gain: 0.8 }, duration: 1 });

    if (settings.riser) {
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
      level.gain.exponentialRampToValueAtTime(0.35, dropAt - (settings.gap ? barSeconds / 8 : 0.01));
      level.gain.setValueAtTime(0, dropAt - (settings.gap ? barSeconds / 8 : 0));
      noise.connect(band).connect(level).connect(out);
      noise.start(start);
      noise.stop(dropAt + 0.05);
      nodes.push(noise);
    }

    // everything that plays: the bass going away, then all back on the one
    const { sweep, gate } = limiter;
    for (const param of [sweep.frequency, gate.gain]) param.cancelScheduledValues(context.currentTime);
    sweep.frequency.setValueAtTime(10, start);
    if (settings.filter) sweep.frequency.exponentialRampToValueAtTime(900, dropAt - 0.01);
    if (settings.gap) {
      gate.gain.setValueAtTime(1, dropAt - barSeconds / 8);
      gate.gain.linearRampToValueAtTime(0, dropAt - barSeconds / 8 + 0.01);
    }
    sweep.frequency.setValueAtTime(10, dropAt);
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

    go.textContent = t('dropCancel');
    const timer = window.setInterval(() => {
      while (pending.length && pending[0].time < context.currentTime + 0.25) {
        const { time, value, duration } = pending.shift()!;
        void superdough?.(value, time, duration)?.catch(() => undefined);
      }
      const left = dropAt - context.currentTime;
      if (left > dropAt - start) status.textContent = t('dropWaiting');
      else if (left > 0) status.textContent = t('dropBuilding', { bars: Math.ceil(left / barSeconds) });
      else if (!pending.length) {
        window.clearInterval(timer);
        running = undefined;
        go.textContent = t('dropGo');
        status.textContent = t('dropDone');
      }
    }, 50);
    running = { nodes, timer };
  });

  // Stop in the middle calls it off, so nothing stays filtered
  return { stopped: cancel };
}
