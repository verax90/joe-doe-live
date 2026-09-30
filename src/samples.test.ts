import { describe, expect, it } from 'vitest';
import { sampleName, shortName } from './samples';

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

describe('short names', () => {
  it('cuts long names in the middle, keeping the number at the end', () => {
    const name = 'selda_bagcan_adimiz_miskindir_bizim_1973_zbeerge4qua12';
    const short = shortName(name, 24);
    expect(short).toHaveLength(24);
    expect(short.endsWith('ge4qua12')).toBe(true);
    expect(short.startsWith('selda_bagcan')).toBe(true);
    expect(shortName('kicks', 24)).toBe('kicks');
  });
});
