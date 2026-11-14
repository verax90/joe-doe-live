// Drum hits as pulses for the visuals: kickHit(), snareHit() and hatHit() are
// 1 the moment the drum lands and fade to 0 in a fraction of a second, for
// flashes and bumps (bass() and friends follow the level, not the hit). They
// come from Strudel's own sounds (clips-react.ts) and from the hardware on an
// audio input (machines.ts). Available in Hydra code and in patterns.
export type HitRole = 'kick' | 'snare' | 'hat';

// How long each takes to fall to a third: a kick lingers, a hat is a blink
export const HIT_FADE_MS: Record<HitRole, number> = { kick: 220, snare: 160, hat: 70 };

export const hitAfter = (elapsedMs: number, fadeMs: number) => (elapsedMs < 0 ? 0 : Math.exp(-elapsedMs / fadeMs));

const lastAt: Record<HitRole, number> = { kick: -Infinity, snare: -Infinity, hat: -Infinity };
// How many kicks so far: a visual can change something on each one
let kicks = 0;

// at: when it sounds (performance.now() clock); Strudel tells a little ahead
export function markHit(role: HitRole, at = performance.now()) {
  const land = () => {
    lastAt[role] = at;
    if (role === 'kick') kicks++;
  };
  const wait = at - performance.now();
  if (wait > 4) setTimeout(land, wait);
  else land();
}

const read = (role: HitRole) => () => hitAfter(performance.now() - lastAt[role], HIT_FADE_MS[role]);
export const kickHit = read('kick');
export const snareHit = read('snare');
export const hatHit = read('hat');
export const kickCount = () => kicks;

Object.assign(globalThis, { kickHit, snareHit, hatHit, kickCount });
