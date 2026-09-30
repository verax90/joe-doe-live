import { describe, expect, it } from 'vitest';
import { refocusIndex } from './a11y';

describe('focus after a redraw', () => {
  it('goes back to the control with the same name, nearest to where it was', () => {
    expect(refocusIndex(['a', 'b', 'c'], 1, ['a', 'b', 'c'])).toBe(1);
    // a row was added above: same name, one further down
    expect(refocusIndex(['a', 'b', 'c'], 1, ['x', 'a', 'b', 'c'])).toBe(2);
    // two with the same name: the nearer one
    expect(refocusIndex(['▶', '▶', '▶'], 2, ['▶', '▶', '▶', '▶'])).toBe(2);
  });

  it('falls back to what is now in its place, or the last', () => {
    expect(refocusIndex(['a', 'Delete kicks', 'c'], 1, ['a', 'c'])).toBe(1);
    expect(refocusIndex(['a', 'b', 'c'], 2, ['a'])).toBe(0);
    expect(refocusIndex(['a'], 0, [])).toBe(-1);
  });
});
