import { describe, expect, it } from 'vitest';
import { overlayTitle } from './overlay';

describe('stream overlay title', () => {
  const base = { on: true, artist: 'joe doe', title: 'Mi tema', auto: true };
  it('follows the live set song, then the pattern, when automatic', () => {
    expect(overlayTitle(base, 'Intro', 'Lofi 78')).toBe('Intro');
    expect(overlayTitle(base, undefined, 'Lofi 78')).toBe('Lofi 78');
    expect(overlayTitle(base, undefined, undefined)).toBe('Mi tema');
  });
  it('keeps the typed title when not automatic', () => {
    expect(overlayTitle({ ...base, auto: false }, 'Intro', 'Lofi 78')).toBe('Mi tema');
  });
});
