import { describe, expect, it } from 'vitest';
import { changedLines, remember, summary } from './history';

describe('history of what played', () => {
  it('keeps new versions on top, not the same one twice, at most 50', () => {
    let list = remember([], 's("bd")', 1);
    list = remember(list, 's("bd")', 2);
    expect(list).toEqual([{ at: 1, code: 's("bd")' }]);
    list = remember(list, 's("bd sd")', 3);
    expect(list.map((v) => v.at)).toEqual([3, 1]);
    for (let i = 0; i < 60; i++) list = remember(list, `s("bd*${i}")`, 10 + i);
    expect(list.length).toBe(50);
    expect(remember(list, '  \n', 99)).toBe(list);
  });
  it('sums up a version by its first line that plays', () => {
    expect(summary('// Lofi\nsetcps(78 / 60 / 4)\n\nstack(\n  s("bd")')).toBe('stack(');
    expect(summary('$: s("bd ~ ~ bd ~ ~ sd ~, hh*8 hh*8 hh*8 hh*8").bank("RolandTR808")', 20)).toBe('$: s("bd ~ ~ bd ~ ~…');
  });
  it('counts the lines that changed', () => {
    expect(changedLines('a\nb\nc', 'a\nb\nc')).toBe(0);
    expect(changedLines('a\nB\nc', 'a\nb\nc')).toBe(2);
    expect(changedLines('a\nb\nc\nd', 'a\nb\nc')).toBe(1);
    expect(changedLines('a', undefined)).toBe(0);
  });
});
