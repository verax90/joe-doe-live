import { describe, expect, it } from 'vitest';
import { groupIntoKits } from './samples';

const file = (name: string, type = 'audio/wav') => new File([''], name, { type });
const names = (kits: Map<string, File[]>) =>
  Object.fromEntries([...kits].map(([kit, files]) => [kit, files.map((f) => f.name)]));

describe('folders become kits', () => {
  it('names a kit after its folder and orders files naturally', () => {
    const kits = groupIntoKits([
      { path: 'kicks/Kick 10.wav', file: file('Kick 10.wav') },
      { path: 'kicks/Kick 2.wav', file: file('Kick 2.wav') },
      { path: 'kicks/Kick 1.wav', file: file('Kick 1.wav') },
    ]);
    expect(names(kits)).toEqual({ kicks: ['Kick 1.wav', 'Kick 2.wav', 'Kick 10.wav'] });
  });

  it('keeps loose files as single sounds', () => {
    expect(names(groupIntoKits([{ path: 'Snare Seca.wav', file: file('Snare Seca.wav') }]))).toEqual({
      snare_seca: ['Snare Seca.wav'],
    });
  });

  it('makes one kit per subfolder, parent in front when names clash', () => {
    const kits = groupIntoKits([
      { path: '/MPC/drums/kicks/a.wav', file: file('a.wav') },
      { path: '/MPC/808/kicks/b.wav', file: file('b.wav') },
      { path: '/MPC/drums/snares/c.wav', file: file('c.wav') },
    ]);
    expect(Object.keys(names(kits)).sort()).toEqual(['drums_kicks', 's_808_kicks', 'snares']);
  });

  it('skips files that are not audio', () => {
    const kits = groupIntoKits([
      { path: 'kit/readme.txt', file: file('readme.txt', 'text/plain') },
      { path: 'kit/hat.wav', file: file('hat.wav') },
    ]);
    expect(names(kits)).toEqual({ kit: ['hat.wav'] });
  });
});
