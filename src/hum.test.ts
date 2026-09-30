import { describe, expect, it } from 'vitest';
import { framePitch, humGrid, humSteps, midiOf, pitchTrack } from './hum';
import { noteName, toMini } from './riff';

const RATE = 48000;
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

// A voice-like tone: a fundamental and a few weaker harmonics
function sing(notes: { midi: number; seconds: number; gap?: number }[]) {
  const total = notes.reduce((sum, n) => sum + n.seconds, 0);
  const out = new Float32Array(Math.round(total * RATE));
  let at = 0;
  let phase = 0;
  for (const { midi, seconds, gap = 0 } of notes) {
    const length = Math.round(seconds * RATE);
    const sounding = midi ? length - Math.round(gap * RATE) : 0;
    for (let i = 0; i < length; i++) {
      phase += (2 * Math.PI * hz(midi || 60)) / RATE;
      const envelope = i < sounding ? Math.min(1, i / 480, (sounding - i) / 480) : 0;
      out[at + i] = envelope * 0.3 * (Math.sin(phase) + 0.5 * Math.sin(2 * phase) + 0.25 * Math.sin(3 * phase));
    }
    at += length;
  }
  return out;
}

describe('hum', () => {
  it('finds the pitch of a sung frame, and none in noise', () => {
    for (const midi of [45, 57, 64, 76]) {
      const tone = sing([{ midi, seconds: 0.05 }]).subarray(0, 2048);
      // the analysis runs at 12 kHz: every 4th sample
      const frame = new Float32Array(512).map((_, i) => tone[i * 4]);
      expect(midiOf(framePitch(frame, 12000))).toBeCloseTo(midi, 0);
    }
    const noise = new Float32Array(512).map(() => Math.random() - 0.5);
    expect(framePitch(noise, 12000)).toBe(0);
  });

  it('writes a hummed bar on the grid: notes, a held one, a rest', () => {
    // one bar of 2 s at eighths (0.25 s): c4 e4 g4-held ~ a4 a4(re-sung) g4 ~
    const take = sing([
      { midi: 60, seconds: 0.25 },
      { midi: 64, seconds: 0.25 },
      { midi: 67, seconds: 0.5 },
      { midi: 0, seconds: 0.25 },
      { midi: 69, seconds: 0.25, gap: 0.06 },
      { midi: 69, seconds: 0.25 },
      { midi: 67, seconds: 0.25 },
    ]);
    const padded = new Float32Array(2 * RATE);
    padded.set(take);
    const steps = humSteps(pitchTrack(padded, RATE), { bars: 1, steps: 8, seconds: 2 });
    expect(toMini(humGrid(steps, 8, noteName)!)).toBe('c4 e4 g4 _ ~ a4 a4 g4');
  });

  it('snaps to a scale and strikes again on each bar', () => {
    // c#4 held over two bars of 1 s at quarters
    const take = sing([{ midi: 61, seconds: 2 }]);
    const steps = humSteps(pitchTrack(take, RATE), { bars: 2, steps: 4, seconds: 2, snap: (n) => (n === 61 ? 60 : n) });
    expect(toMini(humGrid(steps, 4, noteName)!)).toBe('<[c4 _ _ _] [c4 _ _ _]>');
  });

  it('gives nothing for silence', () => {
    const steps = humSteps(pitchTrack(new Float32Array(RATE), RATE), { bars: 1, steps: 8, seconds: 1 });
    expect(humGrid(steps, 8, noteName)).toBeNull();
  });
});
