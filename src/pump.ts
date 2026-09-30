// Pump (sidechain): every kick pushes the rest down for a moment and lets it
// swell back, the breathing of house and French touch. Strudel already knows
// how (duckorbit: a sound ducks whole orbits), but everything plays on orbit
// 1 by default, the kick too. So while it is on, every sound on its way to
// Strudel is looked at: a kick (bd, kick) without an orbit of its own moves to
// KICK_ORBIT and ducks every other orbit that has played; the rest is left as
// it was. Nothing in the code changes, it works on any pattern, and turning it
// off lets the next beat through untouched.
import { t } from './i18n';
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
export const pumpSettings = () => settings;
export function setPump(next: Partial<PumpSettings>) {
  settings = { ...settings, ...next };
  writeStorage('jdl:pump', settings);
}
// Whether a kick went by lately (for the panel)
export const kickHeard = () => performance.now() - lastKick < 2500;

export function setupPump(scheduler: Scheduler | undefined) {
  if (!scheduler) return;
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

export function setupPumpPanel({ addTrack }: { addTrack: (pattern: string) => void }) {
  const on = document.querySelector<HTMLInputElement>('#pump-on')!;
  const depth = document.querySelector<HTMLInputElement>('#pump-depth')!;
  const release = document.querySelector<HTMLInputElement>('#pump-release')!;
  const status = document.querySelector<HTMLElement>('#pump-status')!;
  const panel = document.querySelector<HTMLElement>('#pump')!;
  on.checked = settings.on;
  depth.value = String(settings.depth);
  release.value = String(settings.release);
  const render = () => {
    status.textContent = settings.on ? t(kickHeard() ? 'pumpActive' : 'pumpNoKick') : '';
  };
  on.addEventListener('change', () => {
    setPump({ on: on.checked });
    render();
  });
  depth.addEventListener('input', () => setPump({ depth: Number(depth.value) }));
  release.addEventListener('input', () => setPump({ release: Number(release.value) }));
  document.querySelector('#pump-example')!.addEventListener('click', () => {
    for (const line of PUMP_EXAMPLE) addTrack(line);
    if (!settings.on) {
      on.checked = true;
      setPump({ on: true });
    }
  });
  window.setInterval(() => {
    if (!panel.hidden) render();
  }, 500);
  render();
}
