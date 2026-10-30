// Clips that follow the music with no code: every sound Strudel plays is
// heard on its way out (an extra trigger, the sound itself is untouched), and
// the drums move the clips. The kick cuts to another clip, the snare jumps
// back to where the clip came in (a stutter) and, in the busiest mode, the
// hi-hats flash a different clip on top for an instant.
import { allClips, fire, pickFromPool, prepare, rewindLayer, type Clip, type Hit } from './clips';
import { readStorage, writeStorage } from './storage';

export type ReactMode = 'off' | 'kick' | 'drums' | 'all';
export const REACT_MODES: ReactMode[] = ['off', 'kick', 'drums', 'all'];
export type Role = 'kick' | 'snare' | 'hat';
export type Action = 'cut' | 'stutter' | 'flash';

const KICK = /^(bd|kick|bassdrum)/i;
const SNARE = /^(sd|snare|cp|clap|rim)/i;
const HAT = /^(hh|oh|ch|hat|openhat|closedhat)/i;

// What a sound is, from its name (bank or not: Strudel keeps s as "bd")
export function soundRole(value: unknown): Role | undefined {
  const s = value && typeof value === 'object' ? (value as { s?: unknown }).s : undefined;
  if (typeof s !== 'string') return undefined;
  const name = s.replace(/^.*_/, ''); // RolandTR909_bd
  if (KICK.test(name)) return 'kick';
  if (SNARE.test(name)) return 'snare';
  if (HAT.test(name)) return 'hat';
  return undefined;
}

export function reaction(role: Role | undefined, mode: ReactMode): Action | undefined {
  if (!role || mode === 'off') return undefined;
  if (role === 'kick') return 'cut';
  if (role === 'snare' && mode !== 'kick') return 'stutter';
  if (role === 'hat' && mode === 'all') return 'flash';
  return undefined;
}

// Fast kicks (drum and bass, rolls) would decode a new video every few
// frames: a cut needs this much since the last one
export const MIN_GAP_MS = { cut: 180, stutter: 90, flash: 120 } as const;

let mode = readStorage<ReactMode>('jdl:clips-react', 'off');
if (!REACT_MODES.includes(mode)) mode = 'off';
export const reactMode = () => mode;
export function setReactMode(next: ReactMode) {
  mode = next;
  writeStorage('jdl:clips-react', next);
}

let onFire: (() => void) | undefined;
// Called on every move, so the panel can switch to a Clips visual
export const onReact = (fn: () => void) => (onFire = fn);

let bag: string[] | undefined;
let last: string | undefined;
function nextClip(): Clip | undefined {
  const clips = allClips();
  if (!clips.length) return undefined;
  const { picked, bag: rest } = pickFromPool(clips.map((c) => c.id), bag, last);
  bag = rest;
  last = picked;
  return clips.find((c) => c.id === picked);
}

const lastAt: Record<Action, number> = { cut: 0, stutter: 0, flash: 0 };

function act(action: Action, at: number) {
  if (at - lastAt[action] < MIN_GAP_MS[action]) return;
  lastAt[action] = at;
  if (action === 'stutter') {
    setTimeout(() => rewindLayer(0) && onFire?.(), Math.max(0, at - performance.now()));
    return;
  }
  const clip = nextClip();
  if (!clip) return;
  // a flash is a glimpse on layer 2, mixed in light so the cut stays visible
  const hit: Hit = action === 'cut' ? { layer: 0 } : { layer: 1, holdMs: 70, fx: ['screen'] };
  void prepare(clip, hit).then((plan) => {
    if (!plan) return;
    setTimeout(() => {
      void fire(clip, hit, plan);
      onFire?.();
    }, Math.max(0, at - performance.now()));
  });
}

type Hap = { value: unknown; context?: { dominantTrigger?: boolean } };
type Pattern = { onTrigger(fn: (hap: Hap, now: number, cps: number, target: number) => void, dominant?: boolean): Pattern };
type Scheduler = { setPattern(pattern: unknown, autostart?: boolean): Promise<void> };

export function setupClipsReact(scheduler: Scheduler | undefined) {
  if (!scheduler) return;
  const audio = () => (globalThis as { getAudioContext?: () => AudioContext }).getAudioContext?.();
  const setPattern = scheduler.setPattern.bind(scheduler);
  scheduler.setPattern = (pattern, autostart) => {
    // read on every sound, so changing the mode needs no new Play
    const heard =
      pattern && typeof (pattern as Pattern).onTrigger === 'function'
        ? (pattern as Pattern).onTrigger((hap, _now, _cps, target) => {
            if (mode === 'off' || hap.context?.dominantTrigger) return; // .video() hits are clips already
            const action = reaction(soundRole(hap.value), mode);
            const ctx = audio();
            if (!action || !ctx) return;
            act(action, performance.now() + (target - ctx.currentTime) * 1000);
          }, false)
        : pattern;
    return setPattern(heard, autostart);
  };
}
