import { describe, expect, it } from 'vitest';
import { missingBanks } from './dirt';

describe('the full Dirt-Samples library', () => {
  const library = { _base: 'https://x/', bass: ['bass/1.wav'], bd: ['bd/1.wav'], jvbass: ['jvbass/1.wav'] };
  it('adds the banks that are missing, with their base address', () => {
    expect(missingBanks(library, new Set(['bd', 'sine']))).toEqual({ _base: 'https://x/', bass: ['bass/1.wav'], jvbass: ['jvbass/1.wav'] });
  });
  it('leaves the sounds the studio already has alone', () => {
    expect(missingBanks(library, new Set(['bd', 'bass', 'jvbass']))).toEqual({ _base: 'https://x/' });
  });
});
