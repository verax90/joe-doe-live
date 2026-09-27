import { describe, expect, it } from 'vitest';
import { moveSong, msUntilBar } from './live-set';

describe('msUntilBar', () => {
  it('swaps early enough for the new pattern to start on the next bar', () => {
    // 90 BPM: a bar lasts 2.667 s; 0.4 of it left is 1.067 s, minus the 0.3 s lead
    expect(msUntilBar(3.6, 90 / 240)).toBe(767);
  });
  it('waits for the following bar when this one is too close', () => {
    expect(msUntilBar(3.95, 0.5)).toBe(Math.round((0.1 - 0.3 + 2) * 1000));
  });
});

describe('moveSong', () => {
  const songs = ['a', 'b', 'c'].map((name) => ({ name, code: '', visual: 'lima' }));
  const names = (list: typeof songs) => list.map((s) => s.name).join('');
  it('moves one song up or down', () => {
    expect(names(moveSong(songs, 1, -1))).toBe('bac');
    expect(names(moveSong(songs, 1, 1))).toBe('acb');
  });
  it('leaves the ends alone', () => {
    expect(names(moveSong(songs, 0, -1))).toBe('abc');
    expect(names(moveSong(songs, 2, 1))).toBe('abc');
  });
});
