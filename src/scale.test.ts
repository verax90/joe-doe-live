import { describe, expect, it } from 'vitest';
import { SCALES, playedNotes, snap } from './scale';

describe('playing in a key', () => {
  it('leaves notes alone when free', () => {
    expect(playedNotes(61, { root: 9, scale: '', chords: false })).toEqual([61]);
  });
  it('moves a note to the nearest one of A minor (ties go down)', () => {
    const aMinor = SCALES.minor;
    expect(snap(69, 9, aMinor)).toBe(69); // A stays
    expect(snap(70, 9, aMinor)).toBe(69); // A# → A (tie with B: down)
    expect(snap(66, 9, aMinor)).toBe(65); // F# → F (tie with G: down)
    expect(snap(61, 9, aMinor)).toBe(60); // C# → C
  });
  it('plays chords of the scale: A minor gives Am, C, Dm…', () => {
    const minor = { root: 9, scale: 'minor', chords: true };
    expect(playedNotes(57, minor)).toEqual([57, 60, 64]); // A C E
    expect(playedNotes(60, minor)).toEqual([60, 64, 67]); // C E G
    expect(playedNotes(62, minor)).toEqual([62, 65, 69]); // D F A
    expect(playedNotes(64, minor)).toEqual([64, 67, 71]); // E G B (Em)
  });
  it('keeps pentatonic chords inside the scale', () => {
    const notes = playedNotes(57, { root: 9, scale: 'pentaMinor', chords: true }); // A C E
    expect(notes).toEqual([57, 60, 64]);
  });
});
