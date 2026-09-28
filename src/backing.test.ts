import { describe, expect, it } from 'vitest';
import { clockTime } from './backing';

describe('backing track clock', () => {
  it('shows minutes and seconds', () => {
    expect(clockTime(0)).toBe('0:00');
    expect(clockTime(75.9)).toBe('1:15');
    expect(clockTime(600)).toBe('10:00');
  });
  it('shows 0:00 before the length is known', () => {
    expect(clockTime(Number.NaN)).toBe('0:00');
    expect(clockTime(Number.POSITIVE_INFINITY)).toBe('0:00');
  });
});
