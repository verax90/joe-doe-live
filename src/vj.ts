// VJ: play the visuals like an instrument. Twelve controls act on any
// built-in visual. The first six (zoom, hue, warp, pixels, trails, spin) are
// the ones the MPK's knobs 1-6 move when "MPK knobs" is on; six more (punch,
// kaleidoscope, glitch, RGB split, negative, blocks) are for the sliders, the
// phone and the movement in front of the webcam. The visual draws into
// Hydra's o1 and this chain draws o1 into o0 (what shows), reading the values
// live, so nothing has to be run again while you move them. Neutral values
// leave the picture as it was.
import { keepingFocus } from './a11y';
import type { Localized } from './i18n';
import { onLangChange, pick, t } from './i18n';
import { readStorage, writeStorage } from './storage';

export type VjControl = 'zoom' | 'hue' | 'warp' | 'pixels' | 'trails' | 'spin' | 'punch' | 'kaleid' | 'glitch' | 'split' | 'invert' | 'blocks';
// How many of them the MPK's knobs reach (7 is the volume, 8 the ASCII filter)
export const VJ_KNOBS = 6;

// Each control from 0 to 1 as a slider or knob sees it, and what it means
export const VJ_CONTROLS: { id: VjControl; name: Localized; neutral: number }[] = [
  { id: 'zoom', name: { en: 'Zoom', es: 'Zoom', ca: 'Zoom' }, neutral: 0.5 },
  { id: 'hue', name: { en: 'Colour', es: 'Color', ca: 'Color' }, neutral: 0 },
  { id: 'warp', name: { en: 'Warp', es: 'Distorsión', ca: 'Distorsió' }, neutral: 0 },
  { id: 'pixels', name: { en: 'Pixels', es: 'Píxeles', ca: 'Píxels' }, neutral: 0 },
  { id: 'trails', name: { en: 'Trails', es: 'Estela', ca: 'Estela' }, neutral: 0 },
  { id: 'spin', name: { en: 'Spin', es: 'Giro', ca: 'Gir' }, neutral: 0.5 },
  // the kick (heard in the pattern, on the machines or hit on the phone) bumps the zoom and flashes
  { id: 'punch', name: { en: 'Punch', es: 'Golpe', ca: 'Cop' }, neutral: 0 },
  { id: 'kaleid', name: { en: 'Kaleidoscope', es: 'Caleidoscopio', ca: 'Calidoscopi' }, neutral: 0 },
  { id: 'glitch', name: { en: 'Glitch', es: 'Glitch', ca: 'Glitch' }, neutral: 0 },
  { id: 'split', name: { en: 'RGB split', es: 'RGB partido', ca: 'RGB partit' }, neutral: 0 },
  { id: 'invert', name: { en: 'Negative', es: 'Negativo', ca: 'Negatiu' }, neutral: 0 },
  { id: 'blocks', name: { en: 'Blocks', es: 'Bloques', ca: 'Blocs' }, neutral: 0 },
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
  punch: 0,
  kaleid: 1,
  glitch: 0,
  split: 0,
  invert: 0,
  blocks: 0,
};
(globalThis as { vj?: typeof vj }).vj = vj;

// The turn so far. Hydra's own rotate(0, speed) is time × speed, so moving
// the speed made the picture jump to another angle; this adds up instead,
// and slowing down just slows down
let angle = 0;
let angleAt = 0;
export function vjAngle(now = performance.now()) {
  const elapsed = Math.min(0.25, Math.max(0, (now - angleAt) / 1000)); // a pause (hidden tab) is not a spin
  angleAt = now;
  angle = (angle + vj.spin * elapsed) % (Math.PI * 2);
  return angle;
}
(globalThis as { vjAngle?: () => number }).vjAngle = () => vjAngle();

// 0-1 positions to what each effect needs; the middle of zoom and spin is
// neutral, so a knob can go both ways
export function vjValues(p: Record<VjControl, number>) {
  return {
    zoom: 2 ** ((p.zoom - 0.5) * 3), // ×0.35 to ×2.8
    hue: p.hue,
    warp: p.warp * 0.6,
    pixels: p.pixels < 0.02 ? 4000 : Math.round(400 * (1 - p.pixels) ** 2 + 12), // 4000 = none
    trails: p.trails * 0.92,
    spin: (p.spin - 0.5) * 1.2, // radians per second, either way
    punch: p.punch,
    kaleid: p.kaleid < 0.04 ? 1 : Math.round(2 + p.kaleid * 10), // mirrors: 2 to 12, 1 = none
    glitch: p.glitch * 0.9,
    split: p.split * 0.04,
    invert: p.invert,
    blocks: p.blocks * 0.06,
  };
}

let enabled = false;
let knobs = false;
export const vjTakesKnobs = () => enabled && knobs;

// Moves one control; the panel's slider follows through onMove
let onMove: ((id: VjControl, value: number) => void) | undefined;
let splitDrawn = false; // whether the chain running now has the RGB split's second copy
let redrawVisual: (() => void) | undefined;
function setControl(id: VjControl, value: number) {
  positions[id] = value;
  Object.assign(vj, vjValues(positions));
  onMove?.(id, value);
  if (id === 'split' && enabled && value > 0 !== splitDrawn) redrawVisual?.();
}

// Several controls at once (a look recalled, Surprise me, All neutral): the
// phones are told, so their sliders follow
const bulkListeners: (() => void)[] = [];
export const onVjLook = (listener: () => void) => bulkListeners.push(listener);
function setAll(look: Partial<Record<VjControl, number>>) {
  for (const control of VJ_CONTROLS) setControl(control.id, look[control.id] ?? control.neutral);
  for (const listener of bulkListeners) listener();
}
export const resetVj = () => setAll({});

// Looks: four memories of where every effect is, to come back to in one
// press while playing (the phone's Visual tab has them too)
export const LOOKS = 4;
const LOOKS_KEY = 'jdl:vj-looks';
type Look = Record<VjControl, number> | null;
const readLooks = () => {
  const stored = readStorage<Look[]>(LOOKS_KEY, []);
  return Array.from({ length: LOOKS }, (_, i) => stored[i] ?? null);
};
export const savedLooks = () => readLooks().map(Boolean);
export function saveLook(slot: number) {
  const looks = readLooks();
  if (slot < 0 || slot >= LOOKS) return;
  looks[slot] = { ...positions };
  writeStorage(LOOKS_KEY, looks);
}
let onRecall: (() => void) | undefined;
// false when that memory is empty
export function recallLook(slot: number) {
  const look = readLooks()[slot];
  if (!look) return false;
  setAll(look);
  onRecall?.();
  return true;
}

// Where every control is (0-1), for the phone's sliders to start from
export const vjPositions = (): Record<VjControl, number> => ({ ...positions });

// Something else playing a control: the movement in front of the webcam (motion.ts)
export const setVjControl = (id: VjControl, value: number) => setControl(id, Math.min(1, Math.max(0, value)));

// Knobs 1-6 while they belong to VJ; false leaves the knob to the sound
export function vjKnob(cc: number, value: number) {
  const control = cc <= VJ_KNOBS ? VJ_CONTROLS[cc - 1] : undefined;
  if (!vjTakesKnobs() || !control) return false;
  setControl(control.id, value);
  return true;
}

// The chain a built-in visual gets while VJ is on: its .out() goes to o1,
// and o1 comes back through the effects into o0
export function withVj(code: string) {
  if (!enabled) return code;
  const drawn = code.replace(/\.out\(\s*\)\s*$/, '.out(o1)');
  // everything that moves the picture around, on the visual as drawn in o1.
  // Twice: the RGB split is the same picture again, a little to the side
  const moved = `src(o1)
  .scale(() => vj.zoom * (1 + vj.punch * kickHit() * 0.35))
  .rotate(() => vjAngle())
  .vjKaleid(() => vj.kaleid)
  .modulate(noise(3, 0.2), () => vj.warp)
  .mosh(noise(3, 0.25).pixelate(32, 18), () => vj.blocks)
  .tear(() => vj.glitch, () => time * 14)
  .pixelate(() => vj.pixels, () => vj.pixels * 0.5625)`;
  // the second copy only while the split is in use: it is the whole chain
  // again for every pixel (setControl redraws when it comes in or goes out)
  splitDrawn = positions.split > 0;
  const split = splitDrawn
    ? `
  .color(0, 1, 1)
  .add(${moved}
  .scrollX(() => vj.split)
  .color(1, 0, 0))`
    : '';
  return `${drawn}
${moved}${split}
  .hue(() => vj.hue)
  .invert(() => vj.invert)
  .brightness(() => vj.punch * kickHit() * 0.25)
  .blend(src(o0).scale(() => 1 + vj.trails * 0.015), () => vj.trails)
  .out(o0)`;
}

// Two to four effects somewhere in their range, everything else neutral.
// Kept watchable: the trails never so long that the picture freezes, the
// pixels never so big that nothing is left, the negative all or nothing
export function randomLook(random = Math.random): Record<VjControl, number> {
  const look = Object.fromEntries(VJ_CONTROLS.map((c) => [c.id, c.neutral])) as Record<VjControl, number>;
  const ids = VJ_CONTROLS.map((c) => c.id);
  const count = 2 + Math.floor(random() * 3);
  for (let i = 0; i < count; i++) {
    const id = ids.splice(Math.floor(random() * ids.length), 1)[0];
    const value = random();
    look[id] =
      id === 'trails' ? value * 0.7 : id === 'pixels' ? 0.2 + value * 0.5 : id === 'invert' ? 1 : id === 'zoom' || id === 'spin' ? 0.2 + value * 0.6 : 0.15 + value * 0.85;
  }
  return look;
}

type Options = { redraw: () => void };

export function setupVj({ redraw }: Options) {
  redrawVisual = redraw;
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
        name.textContent = i < VJ_KNOBS ? `K${i + 1} · ${pick(control.name)}` : pick(control.name);
        if (i === VJ_KNOBS) label.classList.add('vj-slider-first-extra');
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
  document.querySelector('#vj-reset')!.addEventListener('click', resetVj);
  // the effects only show with VJ on: a look turns it on
  const turnOn = () => {
    if (!enabled) toggle.click();
  };
  onRecall = turnOn;
  // A look you did not choose: a few effects at once, the rest neutral
  document.querySelector('#vj-random')!.addEventListener('click', () => {
    setAll(randomLook());
    turnOn();
  });

  // The four memories: a press recalls; with Save armed, the next press keeps
  // what is on screen there instead
  const looksBox = document.querySelector<HTMLElement>('#vj-looks')!;
  const saveButton = document.querySelector<HTMLButtonElement>('#vj-look-save')!;
  const looksStatus = document.querySelector<HTMLElement>('#vj-looks-status')!;
  const lookButtons = Array.from({ length: LOOKS }, (_, slot) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'control vj-look';
    button.textContent = String(slot + 1);
    button.addEventListener('click', () => {
      if (saveButton.getAttribute('aria-pressed') === 'true') {
        saveLook(slot);
        saveButton.setAttribute('aria-pressed', 'false');
        looksStatus.textContent = t('vjLookSaved', { n: slot + 1 });
        showLooks();
        for (const listener of bulkListeners) listener(); // the phones learn it exists
      } else if (!recallLook(slot)) looksStatus.textContent = t('vjLookEmpty', { n: slot + 1 });
      else looksStatus.textContent = '';
    });
    return button;
  });
  looksBox.prepend(...lookButtons);
  const showLooks = () => {
    const filled = savedLooks();
    lookButtons.forEach((button, slot) => {
      button.classList.toggle('is-filled', filled[slot]);
      button.setAttribute('aria-label', t(filled[slot] ? 'vjLookRecall' : 'vjLookEmptyLabel', { n: slot + 1 }));
    });
  };
  saveButton.addEventListener('click', () => {
    const armed = saveButton.getAttribute('aria-pressed') !== 'true';
    saveButton.setAttribute('aria-pressed', String(armed));
    looksStatus.textContent = armed ? t('vjLookPick') : '';
  });
  showLooks();
  onLangChange(showLooks);

  render();
  onLangChange(render);
}
