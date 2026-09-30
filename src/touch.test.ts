import { describe, expect, it } from 'vitest';
import { easeTowards, touchFromNote } from './midi';

describe('TouchMe touch()', () => {
  it('glides towards the new strength instead of jumping', () => {
    expect(easeTowards(0, 1, 0)).toBe(0);
    expect(easeTowards(0, 1, 60)).toBeCloseTo(1 - Math.exp(-1));
    expect(easeTowards(0, 1, 600)).toBeCloseTo(1, 3);
    expect(easeTowards(1, 0, 60)).toBeCloseTo(Math.exp(-1));
  });
  it('never goes backwards in time', () => {
    expect(easeTowards(0.5, 1, -100)).toBe(0.5);
  });
});

describe('TouchMe without CC 90', () => {
  it('reads the touch from the note, over the range seen so far', () => {
    const range = { low: 127, high: 0 };
    // the user's TouchMe played 57 to 64
    expect(touchFromNote(60, range)).toBe(0);
    expect(touchFromNote(57, range)).toBe(0);
    expect(touchFromNote(64, range)).toBe(1);
    expect(touchFromNote(60, range)).toBeCloseTo(3 / 7);
  });
  it('keeps the range at least 6 semitones wide at first', () => {
    const range = { low: 127, high: 0 };
    touchFromNote(58, range);
    expect(touchFromNote(61, range)).toBeCloseTo(0.5);
  });
});
