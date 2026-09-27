import { describe, expect, it } from 'vitest';
import { padSound } from './freeplay';

describe('padSound', () => {
  it('plays the drum kit by default', () => {
    expect(padSound(0, { name: '', page: 0 })).toEqual({ s: 'bd' });
    expect(padSound(1, { name: '', page: 0 })).toEqual({ s: 'sd' });
  });
  it('plays your kit, eight sounds a page', () => {
    expect(padSound(0, { name: 'mpc_celestial', page: 0 })).toEqual({ s: 'mpc_celestial', n: 0 });
    expect(padSound(3, { name: 'mpc_celestial', page: 2 })).toEqual({ s: 'mpc_celestial', n: 19 });
  });
});
