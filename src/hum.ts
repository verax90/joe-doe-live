// Hum a riff: sing or hum a few bars into the mic and get them back as
// note("…"), on the grid, like a riff played on the MPK (riff.ts records it).
// The pitch of every 10 ms of voice comes from YIN (de Cheveigné & Kawahara,
// 2002): how unlike itself the sound is when shifted by each possible period,
// the first clear dip being the period. Each grid step then takes the median
// pitch of its voiced moments; a step that goes on with the same note holds it
// (_), unless the voice dipped and came back (da-da), which strikes it again.

// Voice is well under 1 kHz: analysed at about 12 kHz, fast enough in JS
const RATE = 12000;
const MIN_HZ = 70;
const MAX_HZ = 1000;
const FRAME = 512; // 43 ms at 12 kHz: two periods of the lowest note
const HOP = 120; // 10 ms

// Averages every few samples down to about 12 kHz
export function downsample(samples: Float32Array, sampleRate: number) {
  const factor = Math.max(1, Math.round(sampleRate / RATE));
  const out = new Float32Array(Math.floor(samples.length / factor));
  for (let i = 0; i < out.length; i++) {
    let sum = 0;
    for (let j = 0; j < factor; j++) sum += samples[i * factor + j];
    out[i] = sum / factor;
  }
  return { samples: out, sampleRate: sampleRate / factor };
}

// YIN on one frame: its pitch in Hz, or 0 when it has none (noise, silence,
// a click)
export function framePitch(frame: Float32Array, sampleRate: number, threshold = 0.15) {
  const maxLag = Math.min(Math.floor(sampleRate / MIN_HZ), Math.floor(frame.length / 2));
  const minLag = Math.max(2, Math.floor(sampleRate / MAX_HZ));
  const width = frame.length - maxLag;
  const dip = new Float32Array(maxLag + 2).fill(1);
  let running = 0;
  for (let lag = 1; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < width; i++) {
      const difference = frame[i] - frame[i + lag];
      sum += difference * difference;
    }
    running += sum;
    dip[lag] = running ? (sum * lag) / running : 1;
  }
  for (let lag = minLag; lag < maxLag; lag++) {
    if (dip[lag] >= threshold) continue;
    while (lag + 1 < maxLag && dip[lag + 1] < dip[lag]) lag++;
    // between samples: the bottom of the parabola through the dip
    const [a, b, c] = [dip[lag - 1], dip[lag], dip[lag + 1]];
    const shift = (a - c) / (2 * (a - 2 * b + c));
    return sampleRate / (lag + (Number.isFinite(shift) && Math.abs(shift) < 1 ? shift : 0));
  }
  return 0;
}

export const midiOf = (hz: number) => 69 + 12 * Math.log2(hz / 440);

// hop: seconds between frames; offset: the first frame's middle, in seconds;
// pitch in MIDI (0: none)
export type PitchTrack = { hop: number; offset: number; pitch: number[]; level: number[] };

// The voice's pitch and loudness every 10 ms
export function pitchTrack(input: Float32Array, inputRate: number): PitchTrack {
  const { samples, sampleRate } = downsample(input, inputRate);
  const pitch: number[] = [];
  const level: number[] = [];
  for (let at = 0; at + FRAME <= samples.length; at += HOP) {
    const frame = samples.subarray(at, at + FRAME);
    let energy = 0;
    for (const v of frame) energy += v * v;
    level.push(Math.sqrt(energy / FRAME));
    const hz = framePitch(frame, sampleRate);
    pitch.push(hz ? midiOf(hz) : 0);
  }
  // quiet frames are not the voice, whatever their pitch
  const loud = level.reduce((max, v) => Math.max(max, v), 0);
  const floor = Math.max(0.005, loud * 0.12);
  return { hop: HOP / sampleRate, offset: FRAME / 2 / sampleRate, pitch: pitch.map((p, i) => (level[i] >= floor ? p : 0)), level };
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

type Options = { bars: number; steps: number; seconds: number; snap?: (note: number) => number };

// The track onto the grid: per step a note (MIDI), a hold (-1) or a rest (0).
// seconds is how long the take's bars last
export function humSteps(track: PitchTrack, { bars, steps, seconds, snap = (n) => n }: Options) {
  const total = bars * steps;
  const stepSeconds = seconds / total;
  const frameAt = (time: number) => Math.max(0, Math.min(track.pitch.length, Math.round((time - track.offset) / track.hop)));
  const loudest = (from: number, to: number) => track.level.slice(frameAt(from), frameAt(to)).reduce((max, v) => Math.max(max, v), 0);
  const quietest = (from: number, to: number) => track.level.slice(frameAt(from), frameAt(to)).reduce((min, v) => Math.min(min, v), Infinity);
  const out: number[] = [];
  let last = 0;
  for (let step = 0; step < total; step++) {
    const from = step * stepSeconds;
    const frames = track.pitch.slice(frameAt(from), frameAt(from + stepSeconds));
    const voiced = frames.filter((p) => p > 0);
    if (!frames.length || voiced.length < frames.length / 2) {
      out.push(0);
      last = 0;
      continue;
    }
    const note = snap(Math.round(median(voiced)));
    // the same note going on: held, unless the voice dipped around the step's start
    const dipped = quietest(from - stepSeconds / 2, from + stepSeconds / 4) < 0.35 * loudest(from, from + stepSeconds / 2);
    const barStart = step % steps === 0;
    out.push(note === last && !dipped && !barStart ? -1 : note);
    last = note;
  }
  return out;
}

// The steps as a riff grid (bar → step → tokens) with names from noteName:
// a hold is _, a rest empty; null if nothing was sung
export function humGrid(stepsOut: number[], steps: number, noteName: (midi: number) => string) {
  if (!stepsOut.some((n) => n > 0)) return null;
  const grid: string[][][] = [];
  for (let at = 0; at < stepsOut.length; at += steps) {
    grid.push(stepsOut.slice(at, at + steps).map((n) => (n > 0 ? [noteName(n)] : n < 0 ? ['_'] : [])));
  }
  return grid;
}
