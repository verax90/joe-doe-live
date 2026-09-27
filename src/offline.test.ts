import { describe, expect, it } from 'vitest';
import { soundsToLoad } from './offline';

describe('soundsToLoad', () => {
  it('lists each file once: samples by sound, index and note, soundfonts by instrument', () => {
    const values = [
      { s: 'bd', bank: 'RolandTR808' },
      { s: 'bd', bank: 'RolandTR808', gain: 0.5 },
      { s: 'bd', bank: 'AkaiMPC60' },
      { s: 'hh', bank: 'RolandTR808', n: 2 },
      { s: 'piano', note: 'c3' },
      { s: 'piano', note: 'e3' },
      { s: 'gm_epiano1', note: 60 },
      { s: 'gm_epiano1', note: 64 },
      { note: 'c2' },
    ];
    expect(soundsToLoad(values).map((sound) => [sound.s, sound.bank, sound.n, sound.note].filter((x) => x !== undefined).join(' '))).toEqual([
      'bd RolandTR808',
      'bd AkaiMPC60',
      'hh RolandTR808 2',
      'piano c3',
      'piano e3',
      'gm_epiano1 60', // one load per instrument, with a note to trigger it
    ]);
  });
});
