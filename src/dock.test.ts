import { describe, expect, it } from 'vitest';
import { remember } from './dock';

describe('tools at hand', () => {
  it('puts the newest first, once, and keeps only a few', () => {
    expect(remember(['a', 'b', 'c'], 'b')).toEqual(['b', 'a', 'c']);
    expect(remember(['a', 'b'], 'c', 2)).toEqual(['c', 'a']);
  });
});
