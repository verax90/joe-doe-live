import { describe, expect, it } from 'vitest';
import { playState } from './play-state';

describe('play state', () => {
  it('is stopped, playing what you see, or with changes to apply', () => {
    expect(playState(false, 's("bd")', 's("bd")')).toBe('stopped');
    expect(playState(true, 's("bd")', 's("bd")')).toBe('playing');
    expect(playState(true, 's("bd sd")', 's("bd")')).toBe('changed');
    expect(playState(true, 's("bd")', undefined)).toBe('changed');
  });

  it('does not count blank lines or indents as changes', () => {
    expect(playState(true, '$: s("bd")\n\n  ', '$: s("bd")')).toBe('playing');
    expect(playState(true, '$:  s("bd")', '$: s("bd")')).toBe('playing');
  });
});
