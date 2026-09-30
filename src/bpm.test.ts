import { describe, expect, it } from 'vitest';
import { detectTempo } from './bpm';

// A beat: kick on 1 and 3, snare on 2 and 4, hats on eighths, a little noise
function beat(bpm: number, seconds = 20, sampleRate = 8000, swing = 0) {
  const out = new Float32Array(seconds * sampleRate);
  const beatLength = 60 / bpm;
  let seed = 1;
  const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const hit = (at: number, amp: number, decay: number, freq: number) => {
    const start = Math.round(at * sampleRate);
    for (let i = 0; i < sampleRate * 0.25 && start + i < out.length; i++) {
      const t = i / sampleRate;
      out[start + i] += amp * Math.exp(-t / decay) * (freq ? Math.sin(2 * Math.PI * freq * t) : noise());
    }
  };
  for (let b = 0; b * beatLength < seconds; b++) {
    const at = b * beatLength;
    if (b % 2 === 0) hit(at, 0.9, 0.08, 55);
    else hit(at, 0.6, 0.05, 0);
    hit(at, 0.2, 0.02, 0);
    hit(at + beatLength * (0.5 + swing), 0.15, 0.02, 0);
  }
  for (let i = 0; i < out.length; i++) out[i] += noise() * 0.01;
  return out;
}

describe('tempo detection', () => {
  for (const bpm of [78, 92, 100, 120, 140]) {
    it(`finds ${bpm} BPM`, () => {
      const { bpm: found, confidence } = detectTempo(beat(bpm), 8000);
      expect(Math.abs(found - bpm)).toBeLessThanOrEqual(1);
      expect(confidence).toBeGreaterThan(1.3);
    });
  }
  it('reads a fast 160 as its half, 80 (×2 in the panel fixes it)', () => {
    expect(Math.abs(detectTempo(beat(160), 8000).bpm - 80)).toBeLessThanOrEqual(1);
  });
  it('finds a swung boom bap at 88', () => {
    expect(Math.abs(detectTempo(beat(88, 20, 8000, 0.08), 8000).bpm - 88)).toBeLessThanOrEqual(1);
  });
  it('says so when there is no beat', () => {
    const silence = new Float32Array(8000 * 10);
    expect(detectTempo(silence, 8000).confidence).toBeLessThan(1.3);
  });
});
