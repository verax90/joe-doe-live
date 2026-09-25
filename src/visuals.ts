// Visuales de Hydra que se eligen aparte del sonido.
// Dos tipos de sincronía:
// - H("...") sigue el reloj de Strudel: golpea exactamente en el tiempo.
// - bass(), mid(), high(), level() escuchan el audio (el patrón necesita .analyze(1)).

import { attachAscii } from './ascii';
import { connectSource } from './video';
import type { Localized } from './i18n';

// camera: the visual uses s0 (the webcam, or the video or tab picked in the
// Video panel); it is switched on only while picked
export type Visual = { id: string; name: Localized; code: string; camera?: boolean };

export const CODE_VISUAL = 'code';
export const AUTO_VISUAL = 'auto';

export const visuals: Visual[] = [
  { id: CODE_VISUAL, name: { en: 'From the code', es: 'Del código' }, code: '' },
  {
    id: 'lima',
    name: { en: 'Lime (bar)', es: 'Lima (compás)' },
    code: `osc(6, 0.03, 0.8)
  .color(...tint(0.4))
  .modulate(noise(1.5), 0.25)
  .kaleid(H("<3 3 4 6>"))
  .out()`,
  },
  {
    id: 'corcheas',
    name: { en: 'Pulse (eighths)', es: 'Pulso (corcheas)' },
    code: `shape(4, 0.35, 0.02)
  .repeat(3, 3)
  .scale(H("1.25 1 1 1.1 1 1.25 1 1"))
  .color(...tint(0.4))
  .modulateRotate(osc(2, 0.1), 0.3)
  .out()`,
  },
  {
    id: 'graves',
    name: { en: 'Tunnel (bass)', es: 'Túnel (graves)' },
    code: `osc(20, 0.05, 0.4)
  .kaleid(4)
  .color(...tint(0.4))
  .scale(() => 0.8 + bass() * 1.2)
  .modulate(noise(2), () => high() * 0.3)
  .out()`,
  },
  {
    id: 'celdas',
    name: { en: 'Cells (volume)', es: 'Celdas (volumen)' },
    code: `voronoi(6, 0.3, 0.2)
  .color(...tint(0.3))
  .modulate(osc(3, 0.05), () => mid() * 0.6)
  .brightness(() => level() * 0.3 - 0.1)
  .out()`,
  },
  {
    id: 'eco',
    name: { en: 'Echo (bar)', es: 'Eco (compás)' },
    code: `shape(H("<3 4 5 6>"), 0.3, 0.01)
  .color(...tint(0.4))
  .rotate(0, 0.1)
  .diff(src(o0).scale(1.02).rotate(0.01))
  .out()`,
  },
  {
    id: 'glitch',
    name: { en: 'Glitch (highs)', es: 'Glitch (agudos)' },
    code: `osc(40, 0.1, 1.2)
  .color(...tint(0.4))
  .modulate(noise(3).pixelate(8, 8), () => high() * 0.6)
  .posterize(3, 0.6)
  .scrollX(() => (Math.random() - 0.5) * high() * 0.08)
  .out()`,
  },
  {
    id: 'plasma',
    name: { en: 'Plasma (bar)', es: 'Plasma (compás)' },
    code: `voronoi(8, 0.4, 0.3)
  .modulateScale(osc(6, 0.05), 0.6)
  .color(...tint(0.42))
  .hue(H("<0 0.05 0 -0.05>"))
  .out()`,
  },
  // Picks the others by itself; after the first eight so the PROG CHANGE pads keep theirs
  { id: AUTO_VISUAL, name: { en: 'Auto', es: 'Automático' }, code: '' },
  {
    id: 'anillos',
    name: { en: 'Rings (kick)', es: 'Anillos (bombo)' },
    code: `shape(64, 0.42, 0.01)
  .diff(shape(64, 0.3, 0.01))
  .repeat(2, 2)
  .scale(() => 0.9 + bass() * 0.5)
  .color(...tint(0.6))
  .modulateRotate(osc(1, 0.05), 0.2)
  .out()`,
  },
  {
    id: 'estela',
    name: { en: 'Trails (bar)', es: 'Estela (compás)' },
    code: `shape(H("<3 4 6 8>"), 0.2, 0.01)
  .rotate(0, 0.2)
  .color(...tint(0.4))
  .blend(src(o0).scale(1.02).rotate(0.01), 0.85)
  .out()`,
  },
  {
    id: 'cam',
    name: { en: 'Webcam (warp)', es: 'Webcam (deformada)' },
    camera: true,
    code: `src(s0)
  .saturate(0.3)
  .color(...tint(0.9))
  .modulate(noise(3), () => bass() * 0.2)
  .out()`,
  },
  {
    id: 'cam-kaleid',
    name: { en: 'Webcam (kaleidoscope)', es: 'Webcam (caleidoscopio)' },
    camera: true,
    code: `src(s0)
  .kaleid(H("<4 6 8>"))
  .rotate(0, 0.05)
  .color(...tint(0.9))
  .out()`,
  },
  {
    id: 'cam-pixel',
    name: { en: 'Webcam (pixels)', es: 'Webcam (píxeles)' },
    camera: true,
    code: `src(s0)
  .pixelate(() => 90 - bass() * 70, () => 60 - bass() * 45)
  .posterize(4, 0.6)
  .color(...tint(0.9))
  .out()`,
  },
  {
    id: 'cam-trails',
    name: { en: 'Webcam (trails)', es: 'Webcam (estela)' },
    camera: true,
    code: `src(s0)
  .color(...tint(0.9))
  .blend(src(o0).scale(1.01), 0.8)
  .out()`,
  },
  {
    id: 'cam-thermal',
    name: { en: 'Webcam (thermal)', es: 'Webcam (térmica)' },
    camera: true,
    code: `src(s0)
  .saturate(0)
  .contrast(1.4)
  .colorama(() => 0.2 + bass() * 0.2)
  .out()`,
  },
  {
    id: 'cam-rgb',
    name: { en: 'Webcam (RGB split)', es: 'Webcam (RGB desplazado)' },
    camera: true,
    code: `src(s0)
  .color(1, 0, 0)
  .add(src(s0).scrollX(() => 0.01 + bass() * 0.04).color(0, 1, 0))
  .add(src(s0).scrollX(() => -0.01 - bass() * 0.04).color(0, 0, 1))
  .out()`,
  },
  {
    id: 'cam-contrast',
    name: { en: 'Webcam (high contrast)', es: 'Webcam (alto contraste)' },
    camera: true,
    code: `src(s0)
  .thresh(() => 0.45 + mid() * 0.2, 0.04)
  .color(...tint(1))
  .out()`,
  },
  { id: 'ninguno', name: { en: 'No visuals', es: 'Sin visuales' }, code: `solid(0, 0, 0, 0).out()` },
];

type Global = typeof globalThis & {
  initHydra?: (options?: Record<string, unknown>) => Promise<unknown>;
  getAnalyzerData?: (type: 'frequency' | 'time', id?: number) => Float32Array;
  getAudioContext?: () => AudioContext;
  bass?: () => number;
  mid?: () => number;
  high?: () => number;
  level?: () => number;
};

const g = globalThis as Global;

// One analysis per frame: bass(), mid(), high() and level() are called several
// times per frame by a single visual, and each read used to copy the spectrum
let cached: { at: number; data: Float32Array | undefined } = { at: -1, data: undefined };
function spectrum() {
  const now = performance.now();
  if (now - cached.at > 8) {
    try {
      cached = { at: now, data: g.getAnalyzerData?.('frequency', 1) };
    } catch {
      cached = { at: now, data: undefined };
    }
  }
  return cached.data;
}

// Energía media de una banda de frecuencias, de 0 a 1
function band(lowHz: number, highHz: number) {
  const data = spectrum();
  if (!data?.length || !g.getAudioContext) return 0;
  const nyquist = g.getAudioContext().sampleRate / 2;
  const from = Math.floor((lowHz / nyquist) * data.length);
  const to = Math.max(from + 1, Math.floor((highHz / nyquist) * data.length));
  let sum = 0;
  for (let i = from; i < to; i++) {
    const db = Number.isFinite(data[i]) ? data[i] : -100;
    sum += Math.min(1, Math.max(0, (db + 90) / 60));
  }
  return sum / (to - from);
}

// Disponibles en el código de Hydra (en los visuales y en tus patrones)
g.bass = () => band(20, 150);
g.mid = () => band(150, 2000);
g.high = () => band(2000, 10000);
g.level = () => band(20, 10000);

// Strudel carga Hydra desde unpkg.com; así se usa la copia que va con el estudio.
// Vale también para el initHydra() que escribas en tus patrones.
// Half resolution by default: a quarter of the pixels to draw, which leaves CPU
// for the audio. These visuals are soft anyway; initHydra({ pixelRatio: 1 }) for full.
export function useBundledHydra(src: string) {
  const original = g.initHydra as ((options?: Record<string, unknown>) => Promise<unknown>) | undefined;
  if (!original) return;
  g.initHydra = async (options: Record<string, unknown> = {}) => {
    const hydra = await original({ src, pixelRatio: 0.5, pixelated: false, ...options });
    capFrameRate();
    followWindowSize(hydra as { setResolution?: (width: number, height: number) => void });
    return hydra;
  };
}

// 30 frames a second instead of 60: Hydra draws on the same thread that
// schedules the notes, and these visuals look the same at half the work.
// Hydra copies the global fps into its settings on every frame, so the global
// is what has to be set. A pattern can still ask for more with fps = 60
function capFrameRate() {
  const globals = globalThis as { fps?: number };
  if (!globals.fps) globals.fps = 30;
}

// Strudel resizes the canvas when the window changes, but Hydra keeps drawing
// at the old size in a corner. Tell it the new size once the canvas has settled.
let followed: unknown;
function followWindowSize(hydra: { setResolution?: (width: number, height: number) => void }) {
  if (followed === hydra || !hydra?.setResolution) return;
  followed = hydra;
  let timer: number | undefined;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      const canvas = document.getElementById('hydra-canvas') as HTMLCanvasElement | null;
      if (canvas && followed === hydra) hydra.setResolution!(canvas.width, canvas.height);
    }, 300);
  });
}

// Auto: another built-in visual every few bars while it plays (every few
// seconds while stopped), on the bar line, never the same twice in a row and
// never a webcam one, so the camera only turns on when you ask for it
const AUTO_BARS = 4;
const AUTO_SECONDS = 8;
let clock: () => number | null = () => null;
let autoTimer: number | undefined;
let autoCurrent: Visual | undefined;

// Cycles since Play, or null while stopped
export function setVisualClock(read: () => number | null) {
  clock = read;
}

function stopAuto() {
  clearInterval(autoTimer);
  autoTimer = undefined;
}

function startAuto() {
  const pool = visuals.filter((v) => v.code && !v.camera && v.id !== 'ninguno');
  const step = () => {
    const cycles = clock();
    return cycles === null ? Math.floor(performance.now() / 1000 / AUTO_SECONDS) : Math.floor(cycles / AUTO_BARS);
  };
  const next = () => {
    const choices = pool.filter((v) => v !== autoCurrent);
    autoCurrent = choices[Math.floor(Math.random() * choices.length)];
    new Function(autoCurrent.code)();
  };
  let last = step();
  next();
  autoTimer = window.setInterval(() => {
    const now = step();
    if (now === last) return;
    last = now;
    next();
  }, 50);
}

export async function applyVisual(id: string) {
  const visual = visuals.find((v) => v.id === id);
  if (!visual || !g.initHydra) return;
  if (id !== AUTO_VISUAL) stopAuto();
  const hydra = await g.initHydra();
  // hush() in a pattern resets both, so they are set again on every visual
  capFrameRate();
  attachAscii(hydra);
  if (visual.id === CODE_VISUAL) return;
  if (visual.id === AUTO_VISUAL) {
    connectSource(false);
    // Already running (Ctrl+Enter runs the visual again): redraw the current
    // one instead of jumping to another
    if (autoTimer === undefined) startAuto();
    else if (autoCurrent) new Function(autoCurrent.code)();
    return;
  }
  // The webcam, or the video or tab chosen in the Video panel
  connectSource(Boolean(visual.camera));
  new Function(visual.code)();
}
