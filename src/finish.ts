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

const KEY = 'jdl:finish';
type Saved = Partial<Record<FinishControl, number>> & { quality?: Quality };
const saved = readStorage<Saved>(KEY, {});
// what Hydra reads, live
export const fin: Record<FinishControl, number> = {
  glow: saved.glow ?? FINISH_CONTROLS[0].start,
  grain: saved.grain ?? FINISH_CONTROLS[1].start,
  vignette: saved.vignette ?? FINISH_CONTROLS[2].start,
};
(globalThis as { fin?: typeof fin }).fin = fin;
let chosen: Quality = saved.quality === 'high' ? 'high' : 'light';
let live = false; // Go live holds it high until it ends
export const quality = (): Quality => (live ? 'high' : chosen);

// With all three at zero there is nothing to draw: the pass is skipped
export const finishOn = (values: Record<FinishControl, number> = fin) => values.glow > 0 || values.grain > 0 || values.vignette > 0;

// The last pass, as Hydra code; null when it is off
export function finishCode(values: Record<FinishControl, number> = fin) {
  if (!finishOn(values)) return null;
  return 'finish(o0, () => fin.glow, () => fin.grain, () => fin.vignette).out(o2)';
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
  const save = () => writeStorage(KEY, { ...fin, quality: chosen });

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
