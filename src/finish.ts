// The finish: what makes the picture look done rather than drawn. A glow
// around what is bright, a little grain, and darker corners, over whatever
// the visual and the VJ made, as one last pass (Hydra draws it into o2 and
// shows that; o0 stays clean, so trails and tunnels do not feed on the glow).
// And the quality: light (half the pixels each way, 30 pictures a second,
// so the audio keeps the processor) or high (every pixel, 60), which Go live
// takes by itself, the studio being silent then.
import { onLangChange, pick, t, type Localized } from './i18n';
import { readStorage, writeStorage } from './storage';

export type FinishControl = 'glow' | 'grain' | 'vignette';
export const FINISH_CONTROLS: { id: FinishControl; name: Localized; start: number }[] = [
  { id: 'glow', name: { en: 'Glow', es: 'Resplandor', ca: 'Resplendor' }, start: 0.4 },
  { id: 'grain', name: { en: 'Grain', es: 'Grano', ca: 'Gra' }, start: 0.2 },
  { id: 'vignette', name: { en: 'Dark corners', es: 'Esquinas oscuras', ca: 'Cantonades fosques' }, start: 0.3 },
];
export type Quality = 'light' | 'high';

// Palettes: the picture's brightness read as a place along four colours, from
// its darkest to its lightest. The visuals are drawn in the theme's one
// colour; a palette gives them shadows of one hue and lights of another
export type Palette = { id: string; name: Localized; stops: [string, string, string, string] };
export const PALETTES: Palette[] = [
  { id: 'none', name: { en: "The theme's colour", es: 'El color del tema', ca: 'El color del tema' }, stops: ['#000000', '#555555', '#aaaaaa', '#ffffff'] },
  { id: 'sunset', name: { en: 'Sunset', es: 'Atardecer', ca: 'Capvespre' }, stops: ['#12061f', '#7a1f6b', '#f0564a', '#ffd98a'] },
  { id: 'ocean', name: { en: 'Ocean', es: 'Océano', ca: 'Oceà' }, stops: ['#020814', '#0c3f7a', '#1fb5c9', '#d6fff4'] },
  { id: 'fire', name: { en: 'Fire', es: 'Fuego', ca: 'Foc' }, stops: ['#080000', '#8a0f08', '#f5661b', '#fff0a8'] },
  { id: 'neon', name: { en: 'Neon', es: 'Neón', ca: 'Neó' }, stops: ['#07021a', '#5b1fd1', '#ff2bd0', '#5cf5ff'] },
  { id: 'forest', name: { en: 'Forest', es: 'Bosque', ca: 'Bosc' }, stops: ['#040d08', '#12563a', '#58b85c', '#f0ffb0'] },
  { id: 'ice', name: { en: 'Ice', es: 'Hielo', ca: 'Gel' }, stops: ['#03060f', '#274a8f', '#86c2ff', '#ffffff'] },
  { id: 'vhs', name: { en: 'VHS', es: 'VHS', ca: 'VHS' }, stops: ['#0d0718', '#4a2a9c', '#d6567f', '#ffc27a'] },
  { id: 'infra', name: { en: 'Infrared', es: 'Infrarrojo', ca: 'Infraroig' }, stops: ['#000326', '#6b00b8', '#ff1654', '#fff14a'] },
  { id: 'mono', name: { en: 'Black and white', es: 'Blanco y negro', ca: 'Blanc i negre' }, stops: ['#000000', '#4a4a4a', '#b0b0b0', '#ffffff'] },
];
// "#ff8000" as what a shader wants: 1, 0.5, 0
export const rgb = (hex: string) => [1, 3, 5].map((at) => Math.round((parseInt(hex.slice(at, at + 2), 16) / 255) * 1000) / 1000);

const KEY = 'jdl:finish';
type Saved = Partial<Record<FinishControl, number>> & { quality?: Quality; palette?: string; tone?: number; light?: number };
const saved = readStorage<Saved>(KEY, {});
// what Hydra reads, live
export const fin: Record<FinishControl, number> = {
  glow: saved.glow ?? FINISH_CONTROLS[0].start,
  grain: saved.grain ?? FINISH_CONTROLS[1].start,
  vignette: saved.vignette ?? FINISH_CONTROLS[2].start,
};
(globalThis as { fin?: typeof fin }).fin = fin;
// the palette Hydra reads: twelve numbers (four colours) and how much of it
// shows over the picture's own colours
// gain: how bright the picture is taken to be before it is placed along the
// palette. Many visuals are drawn dim, to sit behind the code, and would
// never leave the first colour; a bright one wants less
export const pal = { v: PALETTES[0].stops.flatMap(rgb), amount: 0, gain: 1.55 };
// the Light slider (0-1) as that gain: ×0.6 to ×4, the middle about ×1.5
export const gainOfLight = (slider: number) => 0.6 * (4 / 0.6) ** slider;
pal.gain = gainOfLight(0.5);
(globalThis as { pal?: typeof pal }).pal = pal;
let paletteId = PALETTES.some((palette) => palette.id === saved.palette) ? saved.palette! : 'none';
let tone = saved.tone ?? 1;
let light = saved.light ?? 0.5;
export function setPalette(id: string, amount = tone) {
  const palette = PALETTES.find((candidate) => candidate.id === id) ?? PALETTES[0];
  paletteId = palette.id;
  tone = amount;
  pal.v = palette.stops.flatMap(rgb);
  pal.amount = palette.id === 'none' ? 0 : amount;
}
setPalette(paletteId);
pal.gain = gainOfLight(light);
export const currentPalette = () => paletteId;

// The colour as a look keeps it (vj.ts) and as the phone sets it: the
// palette, how much of it, and the light it is read with
export type Colour = { palette: string; tone: number; light: number };
export const colourNow = (): Colour => ({ palette: paletteId, tone, light });
const colourListeners: (() => void)[] = [];
export const onColour = (listener: () => void) => colourListeners.push(listener);
let afterColour: ((wasOn: boolean) => void) | undefined;
export function applyColour(next: Partial<Colour>) {
  const wasOn = finishOn();
  if (typeof next.light === 'number') {
    light = Math.min(1, Math.max(0, next.light));
    pal.gain = gainOfLight(light);
  }
  setPalette(next.palette ?? paletteId, typeof next.tone === 'number' ? Math.min(1, Math.max(0, next.tone)) : tone);
  afterColour?.(wasOn);
  for (const listener of colourListeners) listener();
}

let chosen: Quality = saved.quality === 'high' ? 'high' : 'light';
let live = false; // Go live holds it high until it ends
export const quality = (): Quality => (live ? 'high' : chosen);

// With all three at zero and no palette there is nothing to draw: the pass is skipped
export const finishOn = (values: Record<FinishControl, number> = fin, palette = pal.amount) =>
  values.glow > 0 || values.grain > 0 || values.vignette > 0 || palette > 0;

// The last pass, as Hydra code; null when it is off
export function finishCode(values: Record<FinishControl, number> = fin, palette = pal.amount) {
  if (!finishOn(values, palette)) return null;
  const colours = Array.from({ length: 12 }, (_, i) => `() => pal.v[${i}]`).join(', ');
  return `finish(o0, () => fin.glow, () => fin.grain, () => fin.vignette, () => pal.amount, ${colours}, () => pal.gain).out(o2)`;
}

let applyQuality: ((quality: Quality) => void) | undefined;
let redrawVisual: (() => void) | undefined;
let onLive: (() => void) | undefined;
// Go live (machines.ts): high while it lasts, back to what was chosen after
export function liveQuality(on: boolean) {
  if (live === on) return;
  live = on;
  applyQuality?.(quality());
  onLive?.();
}

type Options = { redraw: () => void; setQuality: (quality: Quality) => void };

export function setupFinish({ redraw, setQuality }: Options) {
  applyQuality = setQuality;
  redrawVisual = redraw;
  const sliders = document.querySelector<HTMLElement>('#finish-sliders')!;
  const select = document.querySelector<HTMLSelectElement>('#finish-quality')!;
  const rate = document.querySelector<HTMLElement>('#finish-rate')!;
  const save = () => writeStorage(KEY, { ...fin, quality: chosen, palette: paletteId, tone, light });

  const render = () => {
    sliders.replaceChildren(
      ...FINISH_CONTROLS.map((control) => {
        const label = document.createElement('label');
        label.className = 'vj-slider';
        const name = document.createElement('span');
        name.textContent = pick(control.name);
        const input = document.createElement('input');
        input.type = 'range';
        input.min = '0';
        input.max = '1';
        input.step = '0.01';
        input.value = String(fin[control.id]);
        input.addEventListener('input', () => {
          const was = finishOn();
          fin[control.id] = Number(input.value);
          save();
          // the pass comes in or goes out: the visual is drawn again with or without it
          if (was !== finishOn()) redrawVisual?.();
        });
        label.append(name, input);
        return label;
      }),
    );
  };
  render();
  onLangChange(render);

  // The palette, and how much of it over the picture's own colours
  const paletteSelect = document.querySelector<HTMLSelectElement>('#finish-palette')!;
  const toneInput = document.querySelector<HTMLInputElement>('#finish-tone')!;
  const lightInput = document.querySelector<HTMLInputElement>('#finish-light')!;
  lightInput.value = String(light);
  lightInput.addEventListener('input', () => {
    light = Number(lightInput.value);
    pal.gain = gainOfLight(light);
    save();
  });
  const swatch = document.querySelector<HTMLElement>('#finish-swatch')!;
  const listPalettes = () => {
    paletteSelect.replaceChildren(...PALETTES.map((palette) => new Option(pick(palette.name), palette.id)));
    paletteSelect.value = paletteId;
  };
  const showPalette = () => {
    const palette = PALETTES.find((candidate) => candidate.id === paletteId)!;
    swatch.hidden = palette.id === 'none';
    swatch.style.background = `linear-gradient(90deg, ${palette.stops.join(', ')})`;
    toneInput.disabled = palette.id === 'none';
    lightInput.disabled = palette.id === 'none';
    toneInput.value = String(tone);
  };
  const choosePalette = (id: string, amount: number) => {
    const was = finishOn();
    setPalette(id, amount);
    save();
    showPalette();
    if (was !== finishOn()) redrawVisual?.();
    for (const listener of colourListeners) listener(); // the phones follow
  };
  listPalettes();
  showPalette();
  onLangChange(listPalettes);
  // set from somewhere else (a look recalled, the phone): saved, shown, and
  // the pass comes in or goes out if it has to
  afterColour = (wasOn) => {
    save();
    paletteSelect.value = paletteId;
    lightInput.value = String(light);
    showPalette();
    if (wasOn !== finishOn()) redrawVisual?.();
  };
  paletteSelect.addEventListener('change', () => choosePalette(paletteSelect.value, tone));
  toneInput.addEventListener('input', () => choosePalette(paletteId, Number(toneInput.value)));

  select.value = chosen;
  select.addEventListener('change', () => {
    chosen = select.value === 'high' ? 'high' : 'light';
    save();
    setQuality(quality());
  });
  onLive = () => {
    select.disabled = live;
    select.value = quality();
  };
  document.querySelector('#finish-reset')!.addEventListener('click', () => {
    const was = finishOn();
    for (const control of FINISH_CONTROLS) fin[control.id] = control.start;
    setPalette('none', 1);
    light = 0.5;
    pal.gain = gainOfLight(light);
    lightInput.value = String(light);
    paletteSelect.value = 'none';
    showPalette();
    save();
    render();
    if (was !== finishOn()) redrawVisual?.();
  });
  setQuality(quality());

  // How many pictures a second it is really drawing, while this tab is open:
  // the way to see whether the machine holds the high quality
  let frames = 0;
  let since = performance.now();
  const count = () => {
    frames++;
    requestAnimationFrame(count);
  };
  requestAnimationFrame(count);
  window.setInterval(() => {
    const now = performance.now();
    const perSecond = Math.round((frames * 1000) / (now - since));
    frames = 0;
    since = now;
    if (rate.offsetParent !== null) rate.textContent = t('finishRate', { n: perSecond, of: quality() === 'high' ? 60 : 30 });
  }, 1000);
}
