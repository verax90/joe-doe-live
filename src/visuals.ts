// Visuales de Hydra que se eligen aparte del sonido.
// Dos tipos de sincronía:
// - H("...") sigue el reloj de Strudel: golpea exactamente en el tiempo.
// - bass(), mid(), high(), level() escuchan el audio (el patrón necesita .analyze(1)).

import type { Localized } from './i18n';

export type Visual = { id: string; name: Localized; code: string };

export const CODE_VISUAL = 'code';

export const visuals: Visual[] = [
  { id: CODE_VISUAL, name: { en: 'From the code', es: 'Del código' }, code: '' },
  {
    id: 'lima',
    name: { en: 'Lime (bar)', es: 'Lima (compás)' },
    code: `osc(6, 0.03, 0.8)
  .color(0.34, 0.4, 0.12)
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
  .color(0.34, 0.4, 0.12)
  .modulateRotate(osc(2, 0.1), 0.3)
  .out()`,
  },
  {
    id: 'graves',
    name: { en: 'Tunnel (bass)', es: 'Túnel (graves)' },
    code: `osc(20, 0.05, 0.4)
  .kaleid(4)
  .color(0.34, 0.4, 0.12)
  .scale(() => 0.8 + bass() * 1.2)
  .modulate(noise(2), () => high() * 0.3)
  .out()`,
  },
  {
    id: 'celdas',
    name: { en: 'Cells (volume)', es: 'Celdas (volumen)' },
    code: `voronoi(6, 0.3, 0.2)
  .color(0.2, 0.35, 0.1)
  .modulate(osc(3, 0.05), () => mid() * 0.6)
  .brightness(() => level() * 0.3 - 0.1)
  .out()`,
  },
  {
    id: 'eco',
    name: { en: 'Echo (bar)', es: 'Eco (compás)' },
    code: `shape(H("<3 4 5 6>"), 0.3, 0.01)
  .color(0.34, 0.4, 0.12)
  .rotate(0, 0.1)
  .diff(src(o0).scale(1.02).rotate(0.01))
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
    // 30 frames a second instead of 60: Hydra draws on the same thread that
    // schedules the notes, and these visuals look the same at half the work.
    // A pattern can still ask for more with fps = 60
    const synth = (hydra as { synth?: { fps?: number } }).synth;
    if (synth && !synth.fps) synth.fps = 30;
    followWindowSize(hydra as { setResolution?: (width: number, height: number) => void });
    return hydra;
  };
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

export async function applyVisual(id: string) {
  const visual = visuals.find((v) => v.id === id);
  if (!visual || visual.id === CODE_VISUAL || !g.initHydra) return;
  await g.initHydra();
  new Function(visual.code)();
}
