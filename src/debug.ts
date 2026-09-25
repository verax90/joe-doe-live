// Diagnostics panel, only with ?debug in the URL. Built to find out why the
// sound drops out while playing a controller: it shows the output level, the
// limiter, how late the main thread runs and how many MIDI notes arrive, and
// it logs every dropout (silence while notes keep coming in).
import { getLimiter } from './limiter';
import { measureLatency } from './latency';
import { midiStats } from './midi';

type Scheduler = { started?: boolean };
type Snapshot = {
  time: string;
  peakDb: number;
  cutDb: number;
  lagMs: number;
  longTasks: number;
  longestMs: number;
  notesPerSec: number;
  audio: string;
  playing: boolean;
};

const round = (value: number) => Math.round(value * 10) / 10;

export function setupDebug(getScheduler: () => Scheduler | undefined) {
  if (!new URLSearchParams(location.search).has('debug')) return;

  const box = document.createElement('aside');
  box.className = 'debug';
  box.innerHTML = `
    <strong>debug</strong>
    <pre class="debug-now"></pre>
    <strong>dropouts</strong>
    <pre class="debug-log">none yet</pre>
    <button type="button" class="control debug-copy">Copy report</button>
    <button type="button" class="control debug-latency">Measure latency</button>
    <pre class="debug-latency-result"></pre>`;
  document.body.append(box);
  const now = box.querySelector<HTMLElement>('.debug-now')!;
  const logView = box.querySelector<HTMLElement>('.debug-log')!;
  const copy = box.querySelector<HTMLButtonElement>('.debug-copy')!;

  // Main thread lag: a 50 ms timer that fires late means the page is choking
  let lagMs = 0;
  let expected = performance.now() + 50;
  setInterval(() => {
    const late = performance.now() - expected;
    lagMs = Math.max(lagMs, late);
    expected = performance.now() + 50;
  }, 50);

  // Tasks over 50 ms block the scheduler and the MIDI handlers
  const tasks: { at: number; ms: number }[] = [];
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) tasks.push({ at: entry.startTime, ms: entry.duration });
    }).observe({ type: 'longtask', buffered: false });
  } catch {
    // longtask is Chromium only
  }

  // Which GPU draws the visuals: a software renderer here would explain stutter
  const gpu = (() => {
    const gl = document.createElement('canvas').getContext('webgl');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    const name = info ? gl!.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl?.getParameter(gl.RENDERER);
    return String(name ?? 'no WebGL').replace(/^ANGLE \((.*)\)$/, '$1');
  })();
  let hydraSynth: { stats?: { fps?: number } } | undefined;
  (globalThis as { initHydra?: () => Promise<unknown> }).initHydra?.().then((hydra) => {
    hydraSynth = (hydra as { synth?: typeof hydraSynth })?.synth;
  });

  let analyser: AnalyserNode | undefined;
  let tapped: GainNode | undefined;
  const buffer = new Float32Array(2048);
  let lastNotes = midiStats.notes;
  let quietSince: number | null = null;
  const dropouts: Snapshot[] = [];
  const history: Snapshot[] = [];

  setInterval(() => {
    const limiter = getLimiter();
    if (limiter && limiter.master !== tapped) {
      analyser = new AnalyserNode(limiter.master.context, { fftSize: 2048 });
      limiter.master.connect(analyser);
      tapped = limiter.master;
    }
    let peak = 0;
    if (analyser) {
      analyser.getFloatTimeDomainData(buffer);
      for (const sample of buffer) peak = Math.max(peak, Math.abs(sample));
    }
    const nowMs = performance.now();
    while (tasks.length && tasks[0].at < nowMs - 5000) tasks.shift();
    const notesPerSec = (midiStats.notes - lastNotes) * 4;
    lastNotes = midiStats.notes;
    const context = limiter?.master.context as AudioContext | undefined;

    const snap: Snapshot = {
      time: new Date().toLocaleTimeString(),
      peakDb: peak > 0 ? round(20 * Math.log10(peak)) : -Infinity,
      cutDb: round(limiter?.limiter.reduction ?? 0),
      lagMs: Math.round(lagMs),
      longTasks: tasks.length,
      longestMs: Math.round(Math.max(0, ...tasks.map((task) => task.ms))),
      notesPerSec,
      audio: context ? `${context.state} · ${Math.round((context.baseLatency + (context.outputLatency || 0)) * 1000)} ms` : 'not started',
      playing: Boolean(getScheduler()?.started),
    };
    lagMs = 0;
    history.push(snap);
    if (history.length > 40) history.shift();

    now.textContent = [
      `output peak   ${snap.peakDb} dB`,
      `limiter cut   ${snap.cutDb} dB`,
      `main lag      ${snap.lagMs} ms`,
      `long tasks 5s ${snap.longTasks} (max ${snap.longestMs} ms)`,
      `MIDI notes/s  ${snap.notesPerSec}`,
      `audio         ${snap.audio}`,
      `scheduler     ${snap.playing ? 'playing' : 'stopped'}`,
      `visuals fps   ${hydraSynth?.stats?.fps ?? '–'}`,
      `gpu           ${gpu}`,
    ].join('\n');

    // Dropout: at least a second of silence while notes keep arriving
    // Only while the studio is actually playing: notes arriving before Play
    // are not a dropout
    const silent = snap.peakDb < -60;
    if (silent && notesPerSec > 0 && snap.playing && context?.state === 'running') {
      quietSince ??= nowMs;
      if (nowMs - quietSince > 1000 && dropouts.at(-1)?.time !== snap.time) {
        dropouts.push(snap);
        logView.textContent = dropouts
          .slice(-5)
          .map((d) => `${d.time} lag ${d.lagMs} ms · tasks ${d.longTasks} · cut ${d.cutDb} dB · ${d.audio}`)
          .join('\n');
        quietSince = nowMs + 5000; // one entry per dropout, not four per second
      }
    } else if (!silent) {
      quietSince = null;
    }
  }, 250);

  // Real round trip, speakers to microphone: what Chrome reports can be off
  const latencyButton = box.querySelector<HTMLButtonElement>('.debug-latency')!;
  const latencyResult = box.querySelector<HTMLElement>('.debug-latency-result')!;
  latencyButton.addEventListener('click', async () => {
    const context = (globalThis as { getAudioContext?: () => AudioContext }).getAudioContext?.();
    if (!context) return;
    latencyButton.disabled = true;
    latencyResult.textContent = 'listening… (speakers on, no headphones)';
    // The studio goes silent while measuring (a latched arpeggiator included),
    // so the microphone only hears the clicks
    const output = getLimiter()?.limiter;
    output?.disconnect(context.destination);
    try {
      if (context.state !== 'running') await context.resume();
      const seconds = await measureLatency(context);
      const reported = Math.round((context.baseLatency + (context.outputLatency || 0)) * 1000);
      latencyResult.textContent = `measured round trip ${Math.round(seconds * 1000)} ms\nChrome reports ${reported} ms (output only)`;
    } catch (error) {
      latencyResult.textContent = error instanceof Error ? error.message : String(error);
    } finally {
      output?.connect(context.destination);
      latencyButton.disabled = false;
    }
  });

  copy.addEventListener('click', async () => {
    const report = JSON.stringify({ userAgent: navigator.userAgent, dropouts, lastSeconds: history }, null, 1);
    try {
      await navigator.clipboard.writeText(report);
      copy.textContent = 'Copied';
    } catch {
      console.log(report);
      copy.textContent = 'In the console';
    }
    setTimeout(() => (copy.textContent = 'Copy report'), 2000);
  });
}
