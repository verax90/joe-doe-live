import { describe as group, expect, it } from 'vitest';
import { describe, isEcho, steady, synthNote } from './voice';

group('voice', () => {
  it('names the sung note and how far off it is', () => {
    expect(describe(57.3, 'es')).toEqual({ name: 'La3', cents: 30 });
    expect(describe(59.8, 'en')).toEqual({ name: 'C4', cents: -20 });
  });

  it('tunes the synth: free, to semitones, to the key, octaves away', () => {
    const aMinor = { root: 9, scale: 'minor', chords: false };
    expect(synthNote(60.4, 'free', 0, aMinor)).toBeCloseTo(60.4);
    expect(synthNote(60.4, 'semitone', -1, aMinor)).toBe(48);
    // C#4 is not in A minor: down to C4, an octave up
    expect(synthNote(61.2, 'key', 1, aMinor)).toBe(72);
    // no key picked: semitones
    expect(synthNote(61.2, 'key', 0, { root: 9, scale: '', chords: false })).toBe(61);
  });

  it('tells the synth coming back through the mic from the voice', () => {
    expect(isEcho(72.1, 72, 1)).toBe(true); // it hears itself
    expect(isEcho(60, 72, 1)).toBe(false); // the voice, an octave under
    expect(isEcho(72, 72, 0)).toBe(false); // same octave: cannot tell
  });

  it('keeps the middle reading, and silence when most are silent', () => {
    expect(steady([60, 72, 60.1, 59.9, 60])).toBe(60);
    expect(steady([0, 0, 0, 60, 0])).toBe(0);
  });
});
