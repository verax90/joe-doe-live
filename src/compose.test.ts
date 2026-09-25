import { beforeAll, describe, expect, it } from 'vitest';
import { bassNotes, chords, LAYERS, layerChanges, layerCode, muteChanges, newSong, removeChanges, STYLES } from './compose';
import { applyChanges, findLabel, tracksReady } from './tracks';

beforeAll(() => tracksReady);

const song = { style: 'boombap', key: 'A', progression: 0 };
const state = { variant: 0, motif: '<[0 2 4 ~] [4 2 0 ~]>' };

describe('theory', () => {
  it('builds the progression in the key', () => {
    expect(chords(song)).toEqual(['Am7', 'F^7', 'C^7', 'G7']);
    expect(chords({ ...song, key: 'D', progression: 3 })).toEqual(['Dm7', 'Gm7', 'Am7', 'Dm7']);
  });
  it('keeps the bass between E1 and Eb2', () => {
    expect(bassNotes(song)).toEqual(['a1', 'f1', 'c2', 'g1']);
    expect(bassNotes({ ...song, key: 'E' })).toEqual(['e1', 'c2', 'g1', 'd2']);
  });
});

describe('layers in the code', () => {
  const start = newSong(song, { drums: state }, '// header');

  it('starts a song with tempo, layers and all() last', () => {
    expect(start).toBe(`// header\nsetcps(90 / 60 / 4)\n\ndrums: ${STYLES[0].drums[0]}\n\nall(x => x.analyze(1))\n`);
  });

  it('adds a layer before all(), swaps it in place, keeps it muted', () => {
    const withBass = applyChanges(start, layerChanges(start, 'bass', layerCode('bass', song, state)));
    expect(withBass.indexOf('bass:')).toBeLessThan(withBass.indexOf('all('));
    const muted = applyChanges(withBass, muteChanges(withBass, 'bass'));
    expect(findLabel(muted, 'bass')!.muted).toBe(true);
    const inD = applyChanges(muted, layerChanges(muted, 'bass', layerCode('bass', { ...song, key: 'D' }, state)));
    expect(inD).toContain('_bass: note("<d2 bb1 f1 c2>")');
    const removed = applyChanges(inD, removeChanges(inD, 'bass'));
    expect(removed).toBe(start);
  });

  it('turns your bare patterns into tracks so they keep playing', () => {
    const code = 's("bd*4")\n';
    expect(applyChanges(code, layerChanges(code, 'hats', 's("hh*8")'))).toBe('$: s("bd*4")\nhats: s("hh*8")\n');
  });

  it('writes code for every layer of every style', () => {
    for (const style of STYLES) for (const layer of LAYERS) expect(layerCode(layer, { ...song, style: style.id }, state)).toMatch(/^(s|note|chord|n)\(/);
  });
});
