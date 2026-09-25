import { describe, expect, it } from 'vitest';
import { sampleName } from './samples';

describe('sample names usable inside s("…")', () => {
  it.each([
    ['Kick Gordo 01.wav', 'kick_gordo_01'],
    ['Caja Ñandú (seca).mp3', 'caja_nandu_seca'],
    ['808.wav', 's_808'],
    ['---.wav', 'sample'],
  ])('%s → %s', (file, name) => {
    expect(sampleName(file)).toBe(name);
  });
});
