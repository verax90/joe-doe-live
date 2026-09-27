import { describe, expect, it } from 'vitest';
import { triggerPoint } from './scope';

describe('triggerPoint', () => {
  it('starts the wave on its first rise through zero, so it stands still', () => {
    expect(triggerPoint([0.5, 0.2, -0.3, -0.1, 0.2, 0.4, 0.1, -0.2], 2)).toBe(4);
  });
  it('starts at 0 when there is no rise with room after it (silence)', () => {
    expect(triggerPoint([0, 0, 0, 0], 2)).toBe(0);
  });
});
