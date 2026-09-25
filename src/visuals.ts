// Visuales de Hydra que se eligen aparte del sonido.
// Dos tipos de sincronía:
// - H("...") sigue el reloj de Strudel: golpea exactamente en el tiempo.
// - bass(), mid(), high(), level() escuchan el audio (el patrón necesita .analyze(1)).

export type Visual = { id: string; name: string; code: string };

export const CODE_VISUAL = 'code';

export const visuals: Visual[] = [
  { id: CODE_VISUAL, name: 'Del código', code: '' },
  {
    id: 'lima',
    name: 'Lima (compás)',
    code: `osc(6, 0.03, 0.8)
  .color(0.34, 0.4, 0.12)
  .modulate(noise(1.5), 0.25)
  .kaleid(H("<3 3 4 6>"))
  .out()`,
  },
  {
    id: 'corcheas',
    name: 'Pulso (corcheas)',
    code: `shape(4, 0.35, 0.02)
  .repeat(3, 3)
  .scale(H("1.25 1 1 1.1 1 1.25 1 1"))
  .color(0.34, 0.4, 0.12)
  .modulateRotate(osc(2, 0.1), 0.3)
  .out()`,
  },
  {
    id: 'graves',
    name: 'Túnel (graves)',
    code: `osc(20, 0.05, 0.4)
  .kaleid(4)
  .color(0.34, 0.4, 0.12)
  .scale(() => 0.8 + bass() * 1.2)
  .modulate(noise(2), () => high() * 0.3)
  .out()`,
  },
  {
    id: 'celdas',
    name: 'Celdas (volumen)',
    code: `voronoi(6, 0.3, 0.2)
  .color(0.2, 0.35, 0.1)
  .modulate(osc(3, 0.05), () => mid() * 0.6)
  .brightness(() => level() * 0.3 - 0.1)
  .out()`,
  },
  {
    id: 'eco',
    name: 'Eco (compás)',
    code: `shape(H("<3 4 5 6>"), 0.3, 0.01)
  .color(0.34, 0.4, 0.12)
  .rotate(0, 0.1)
  .diff(src(o0).scale(1.02).rotate(0.01))
  .out()`,
  },
  { id: 'ninguno', name: 'Sin visuales', code: `solid(0, 0, 0, 0).out()` },
];

type Global = typeof globalThis & {
  initHydra?: () => Promise<unknown>;
  getAnalyzerData?: (type: 'frequency' | 'time', id?: number) => Float32Array;
  getAudioContext?: () => AudioContext;
  bass?: () => number;
  mid?: () => number;
  high?: () => number;
  level?: () => number;
};

const g = globalThis as Global;

// Energía media de una banda de frecuencias, de 0 a 1
function band(lowHz: number, highHz: number) {
  let data: Float32Array | undefined;
  try {
    data = g.getAnalyzerData?.('frequency', 1);
  } catch {
    return 0;
  }
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

export async function applyVisual(id: string) {
  const visual = visuals.find((v) => v.id === id);
  if (!visual || visual.id === CODE_VISUAL || !g.initHydra) return;
  await g.initHydra();
  new Function(visual.code)();
}
