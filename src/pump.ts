// Pump (sidechain): every kick pushes the rest down for a moment and lets it
// swell back, the breathing of house and French touch. Strudel already knows
// how (duckorbit: a sound ducks whole orbits), but everything plays on orbit
// 1 by default, the kick too. So while it is on, every sound on its way to
// Strudel is looked at: a kick (bd, kick) without an orbit of its own moves to
// KICK_ORBIT and ducks every other orbit that has played; the rest is left as
// it was. Nothing in the code changes, it works on any pattern, and turning it
// off lets the next beat through untouched.
import { onLangChange, t } from './i18n';
import { readStorage, writeStorage } from './storage';

export const KICK_ORBIT = 9;
const KICK = /^(bd|kick|bassdrum)/i;

export type PumpSettings = { on: boolean; depth: number; release: number }; // release in beats
export const PUMP_DEFAULTS: PumpSettings = { on: false, depth: 0.6, release: 0.5 };

type Value = Record<string, unknown>;

// One sound's value, pumped: orbits seen collects where the rest plays
export function pumpValue(value: unknown, settings: PumpSettings, cps: number, seen: Set<number>, exists: (orbit: number) => boolean) {
  if (!settings.on || !value || typeof value !== 'object') return value;
  const v = value as Value;
  const kick = typeof v.s === 'string' && KICK.test(v.s) && v.duckorbit === undefined;
  if (!kick) {
    seen.add(Number(v.orbit ?? 1));
    return value;
  }
  const orbit = Number(v.orbit ?? KICK_ORBIT);
  // only orbits that exist: Strudel complains about the others
  const targets = [...seen].filter((o) => o !== orbit && exists(o));
  if (!targets.length) return { ...v, orbit };
  return {
    ...v,
    orbit,
    duckorbit: targets.length === 1 ? targets[0] : targets,
    duckdepth: settings.depth,
    duckonset: 0.004, // a few ms down, so the drop does not click
    duckattack: settings.release / (4 * cps), // a beat is a quarter of a cycle
  };
}

type Pattern = { withValue(fn: (value: unknown) => unknown): Pattern };
type Scheduler = { cps?: number; setPattern(pattern: unknown, autostart?: boolean): Promise<void> };
type Controller = { nodes?: Record<string, unknown> };

let settings = { ...PUMP_DEFAULTS, ...readStorage<Partial<PumpSettings>>('jdl:pump', {}) };
let lastKick = 0;
let cpsNow = () => 0.5; // the studio's tempo, once setupPump has the scheduler
export function setPump(next: Partial<PumpSettings>) {
  settings = { ...settings, ...next };
  writeStorage('jdl:pump', settings);
}
// Whether a kick went by lately (for the panel)
export const kickHeard = () => performance.now() - lastKick < 2500;

export function setupPump(scheduler: Scheduler | undefined) {
  if (!scheduler) return;
  cpsNow = () => scheduler.cps || 0.5;
  const controller = () => (globalThis as { getSuperdoughAudioController?: () => Controller }).getSuperdoughAudioController?.();
  const exists = (orbit: number) => Boolean(controller()?.nodes?.[orbit]);
  const setPattern = scheduler.setPattern.bind(scheduler);
  scheduler.setPattern = (pattern, autostart) => {
    // read on every sound, so turning it on or off needs no new Play
    const seen = new Set<number>();
    const pumped = pattern
      ? (pattern as Pattern).withValue((value) => {
          const out = pumpValue(value, settings, scheduler.cps || 0.5, seen, exists);
          if (out !== value && (out as Value).duckorbit !== undefined) lastKick = performance.now();
          return out;
        })
      : pattern;
    return setPattern(pumped, autostart);
  };
}

// A kick and a pad that holds, to hear it breathe
export const PUMP_EXAMPLE = [
  's("bd*4").bank("RolandTR909")',
  'note("<[a2,c3,e3,g3] [f2,a2,c3,e3]>").s("sawtooth").lpf(1400).legato(1).gain(0.5)',
];

// The volume of the rest a moment after a kick: down to 1 - depth at once,
// then back up over release beats, curving like the duck it is (0-1 of a beat in)
export function pumpLevel(beats: number, depth: number, release: number) {
  if (beats < 0) return 1;
  const back = Math.min(1, beats / Math.max(release, 0.01));
  return 1 - depth * (1 - back) ** 2;
}

// How a release reads: a quarter, half, three quarters of a beat, or a beat
export function releaseWords(release: number) {
  const quarters = Math.round(release * 4);
  return quarters >= 4 ? null : ['¼', '¼', '½', '¾'][quarters] ?? '¼';
}

export function setupPumpPanel({ addTrack }: { addTrack: (pattern: string) => void }) {
  const on = document.querySelector<HTMLButtonElement>('#pump-on')!;
  const onLabel = on.querySelector<HTMLElement>('span')!;
  const depth = document.querySelector<HTMLInputElement>('#pump-depth')!;
  const release = document.querySelector<HTMLInputElement>('#pump-release')!;
  const depthValue = document.querySelector<HTMLOutputElement>('#pump-depth-value')!;
  const releaseValue = document.querySelector<HTMLOutputElement>('#pump-release-value')!;
  const status = document.querySelector<HTMLElement>('#pump-status')!;
  const panel = document.querySelector<HTMLElement>('#pump')!;
  const curve = document.querySelector<HTMLCanvasElement>('#pump-curve')!;
  const presets = [...document.querySelectorAll<HTMLButtonElement>('.pump-preset')];

  const show = () => {
    on.setAttribute('aria-pressed', String(settings.on));
    onLabel.textContent = t(settings.on ? 'pumpTurnOff' : 'pumpTurnOn');
    depth.value = String(settings.depth);
    release.value = String(settings.release);
    depthValue.textContent = t('pumpPercent', { n: Math.round(settings.depth * 100) });
    const words = releaseWords(settings.release);
    releaseValue.textContent = words ? t('pumpBeats', { n: words }) : t('pumpBeat');
    for (const preset of presets) {
      const same = Math.abs(Number(preset.dataset.depth) - settings.depth) < 0.02 && Math.abs(Number(preset.dataset.release) - settings.release) < 0.03;
      preset.setAttribute('aria-pressed', String(same));
    }
    status.textContent = settings.on ? t(kickHeard() ? 'pumpActive' : 'pumpNoKick') : t('pumpOff');
    status.classList.toggle('is-on', settings.on && kickHeard());
  };
  const change = (next: Partial<PumpSettings>) => {
    setPump(next);
    show();
  };
  on.addEventListener('click', () => change({ on: !settings.on }));
  depth.addEventListener('input', () => change({ depth: Number(depth.value) }));
  release.addEventListener('input', () => change({ release: Number(release.value) }));
  for (const preset of presets) {
    preset.addEventListener('click', () => change({ on: true, depth: Number(preset.dataset.depth), release: Number(preset.dataset.release) }));
  }
  document.querySelector('#pump-example')!.addEventListener('click', () => {
    for (const line of PUMP_EXAMPLE) addTrack(line);
    if (!settings.on) change({ on: true });
  });

  // The curve: one beat, the volume of the rest from the kick on. While it
  // pumps, a dot rides it in time with the kicks
  const draw = () => {
    const context = curve.getContext('2d');
    if (!context) return;
    const style = getComputedStyle(panel);
    const accent = style.getPropertyValue('--accent').trim() || '#d4ff3f';
    const line = style.getPropertyValue('--line').trim() || '#333';
    const muted = style.getPropertyValue('--muted').trim() || '#888';
    const { width, height } = curve;
    const pad = 18;
    const x = (beats: number) => pad + beats * (width - pad * 2);
    const y = (level: number) => pad + (1 - level) * (height - pad * 2);
    context.clearRect(0, 0, width, height);
    context.strokeStyle = line;
    context.lineWidth = 2;
    context.setLineDash([6, 8]);
    context.beginPath();
    context.moveTo(pad, y(1));
    context.lineTo(width - pad, y(1));
    context.stroke();
    context.setLineDash([]);
    const shape = (level: (beats: number) => number) => {
      context.beginPath();
      context.moveTo(x(0), y(1));
      for (let i = 0; i <= 80; i++) context.lineTo(x(i / 80), y(level(i / 80)));
    };
    shape((b) => pumpLevel(b, settings.depth, settings.release));
    context.lineTo(x(1), y(0));
    context.lineTo(x(0), y(0));
    context.closePath();
    context.fillStyle = settings.on ? `color-mix(in srgb, ${accent} 16%, transparent)` : 'transparent';
    context.fill();
    shape((b) => pumpLevel(b, settings.depth, settings.release));
    context.strokeStyle = settings.on ? accent : muted;
    context.lineWidth = 4;
    context.stroke();
    context.fillStyle = muted;
    context.font = '22px ui-monospace, monospace';
    context.fillText(t('pumpKick'), x(0) + 6, height - 4);
    const since = (performance.now() - lastKick) / 1000;
    const beats = since * cpsNow() * 4;
    if (settings.on && beats < 1) {
      context.fillStyle = accent;
      context.beginPath();
      context.arc(x(beats), y(pumpLevel(beats, settings.depth, settings.release)), 9, 0, Math.PI * 2);
      context.fill();
    }
  };
  let frame = 0;
  const loop = () => {
    frame = 0;
    if (panel.hidden) return;
    draw();
    frame = requestAnimationFrame(loop);
  };
  new MutationObserver(() => {
    if (!panel.hidden && !frame) {
      show();
      frame = requestAnimationFrame(loop);
    }
  }).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  window.setInterval(() => {
    if (!panel.hidden) show();
  }, 500);
  onLangChange(show);
  show();
}
