// VJ: play the visuals like an instrument. Six controls act on any built-in
// visual: zoom, hue, warp, pixels, trails and spin. The visual draws into
// Hydra's o1 and this chain draws o1 into o0 (what shows), reading the values
// live, so nothing has to be run again while you move them. Neutral values
// leave the picture as it was. With "MPK knobs" on, knobs 1-6 move them.
import { keepingFocus } from './a11y';
import type { Localized } from './i18n';
import { onLangChange, pick } from './i18n';
import { readStorage, writeStorage } from './storage';

export type VjControl = 'zoom' | 'hue' | 'warp' | 'pixels' | 'trails' | 'spin';

// Each control from 0 to 1 as a slider or knob sees it, and what it means
export const VJ_CONTROLS: { id: VjControl; name: Localized; neutral: number }[] = [
  { id: 'zoom', name: { en: 'Zoom', es: 'Zoom' }, neutral: 0.5 },
  { id: 'hue', name: { en: 'Colour', es: 'Color' }, neutral: 0 },
  { id: 'warp', name: { en: 'Warp', es: 'Distorsión' }, neutral: 0 },
  { id: 'pixels', name: { en: 'Pixels', es: 'Píxeles' }, neutral: 0 },
  { id: 'trails', name: { en: 'Trails', es: 'Estela' }, neutral: 0 },
  { id: 'spin', name: { en: 'Spin', es: 'Giro' }, neutral: 0.5 },
];

const STORAGE_KEY = 'jdl:vj';
const neutral = () => Object.fromEntries(VJ_CONTROLS.map((c) => [c.id, c.neutral])) as Record<VjControl, number>;

// The raw 0-1 positions, and the values Hydra reads (globalThis.vj)
const positions = neutral();
export const vj = {
  zoom: 1,
  hue: 0,
  warp: 0,
  pixels: 4000,
  trails: 0,
  spin: 0,
};
(globalThis as { vj?: typeof vj }).vj = vj;

// 0-1 positions to what each effect needs; the middle of zoom and spin is
// neutral, so a knob can go both ways
export function vjValues(p: Record<VjControl, number>) {
  return {
    zoom: 2 ** ((p.zoom - 0.5) * 3), // ×0.35 to ×2.8
    hue: p.hue,
    warp: p.warp * 0.6,
    pixels: p.pixels < 0.02 ? 4000 : Math.round(400 * (1 - p.pixels) ** 2 + 12), // 4000 = none
    trails: p.trails * 0.92,
    spin: (p.spin - 0.5) * 0.6, // turns per second, either way
  };
}

let enabled = false;
let knobs = false;
export const vjTakesKnobs = () => enabled && knobs;

// Moves one control; the panel's slider follows through onMove
let onMove: ((id: VjControl, value: number) => void) | undefined;
function setControl(id: VjControl, value: number) {
  positions[id] = value;
  Object.assign(vj, vjValues(positions));
  onMove?.(id, value);
}

// Knobs 1-6 while they belong to VJ; false leaves the knob to the sound
export function vjKnob(cc: number, value: number) {
  const control = VJ_CONTROLS[cc - 1];
  if (!vjTakesKnobs() || !control) return false;
  setControl(control.id, value);
  return true;
}

// The chain a built-in visual gets while VJ is on: its .out() goes to o1,
// and o1 comes back through the effects into o0
export function withVj(code: string) {
  if (!enabled) return code;
  const drawn = code.replace(/\.out\(\s*\)\s*$/, '.out(o1)');
  return `${drawn}
src(o1)
  .scale(() => vj.zoom)
  .rotate(0, () => vj.spin)
  .modulate(noise(3, 0.2), () => vj.warp)
  .pixelate(() => vj.pixels, () => vj.pixels * 0.5625)
  .hue(() => vj.hue)
  .blend(src(o0), () => vj.trails)
  .out(o0)`;
}

type Options = { redraw: () => void };

export function setupVj({ redraw }: Options) {
  const toggle = document.querySelector<HTMLInputElement>('#vj-on')!;
  const knobsToggle = document.querySelector<HTMLInputElement>('#vj-knobs')!;
  const sliders = document.querySelector<HTMLElement>('#vj-sliders')!;
  const inputs = new Map<VjControl, HTMLInputElement>();

  // drawn again, the keyboard focus stays where it was (a11y.ts)
  const render = () => keepingFocus(sliders, renderNow);
  const renderNow = () => {
    sliders.replaceChildren(
      ...VJ_CONTROLS.map((control, i) => {
        const label = document.createElement('label');
        label.className = 'vj-slider';
        const name = document.createElement('span');
        name.textContent = `K${i + 1} · ${pick(control.name)}`;
        const input = document.createElement('input');
        input.type = 'range';
        input.min = '0';
        input.max = '1';
        input.step = '0.01';
        input.value = String(positions[control.id]);
        input.addEventListener('input', () => setControl(control.id, Number(input.value)));
        inputs.set(control.id, input);
        label.append(name, input);
        return label;
      }),
    );
  };

  onMove = (id, value) => {
    const input = inputs.get(id);
    if (input && Number(input.value) !== value) input.value = String(value);
  };

  const save = () => writeStorage(STORAGE_KEY, { enabled, knobs });
  const saved = readStorage<{ enabled?: boolean; knobs?: boolean }>(STORAGE_KEY, {});
  enabled = Boolean(saved.enabled);
  knobs = Boolean(saved.knobs);
  toggle.checked = enabled;
  knobsToggle.checked = knobs;

  toggle.addEventListener('change', () => {
    enabled = toggle.checked;
    save();
    redraw(); // the visual runs again, with or without the chain
  });
  knobsToggle.addEventListener('change', () => {
    knobs = knobsToggle.checked;
    save();
  });
  document.querySelector('#vj-reset')!.addEventListener('click', () => {
    for (const control of VJ_CONTROLS) setControl(control.id, control.neutral);
  });

  render();
  onLangChange(render);
}
