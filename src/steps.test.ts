import { beforeAll, describe, expect, it } from 'vitest';
import { findRow, mainSound, parseSteps, stepsToMini, toggleStep } from './steps';
import { playingParts, tracksReady } from './tracks';

beforeAll(() => tracksReady);

describe('steps by hand', () => {
  it('reads plain rows and leaves the rest to the code', () => {
    expect(parseSteps('bd ~ sd*2')).toEqual(['bd', '~', 'sd', 'sd']);
    expect(parseSteps('hh*8')).toHaveLength(8);
    expect(parseSteps('bd [sd sd]')).toBeNull();
    expect(parseSteps('<bd sd>')).toBeNull();
  });

  it('writes them back short when it can', () => {
    expect(stepsToMini(['hh', 'hh', 'hh', 'hh'])).toBe('hh*4');
    expect(stepsToMini(['bd', '~', 'sd', '~'])).toBe('bd ~ sd ~');
  });

  it('a box puts in the sound most used, or takes it out', () => {
    const steps = parseSteps('~ ~ ~ sd ~ ~ sd ~')!;
    expect(mainSound(steps)).toBe('sd');
    expect(stepsToMini(toggleStep(steps, 0))).toBe('sd ~ ~ sd ~ ~ sd ~');
    expect(stepsToMini(toggleStep(steps, 3))).toBe('~ ~ ~ ~ ~ ~ sd ~');
  });

  it('finds the row of a drum voice, not of a melody', () => {
    const code = '$: s("bd ~ sd ~").bank("RolandTR909")\n$: note("c e g").s("piano")';
    const [drums, melody] = playingParts(code)!;
    const row = findRow(code, drums.end)!;
    expect(code.slice(row.from, row.to)).toBe('bd ~ sd ~');
    expect(findRow(code, melody.end)).toBeNull();
  });
});
