// Tempo detection for the backing track. From the audio, an onset curve (how
// much the energy rises, a hundred times a second); then which spacing that
// curve repeats at, between 60 and 180 BPM. When half or double would fit as
// well, tempos around 100 are preferred: hip-hop is where that goes wrong,
// the same song reading as 85 or 170.

const HOP = 0.01; // seconds between onset frames

// Rises in energy, frame by frame (half-wave rectified log energy flux)
export function onsetCurve(samples: Float32Array, sampleRate: number) {
  const hop = Math.max(1, Math.round(sampleRate * HOP));
  const frames = Math.floor(samples.length / hop);
  const energy = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    for (let i = f * hop; i < (f + 1) * hop; i++) sum += samples[i] * samples[i];
    energy[f] = Math.log(1e-9 + sum / hop);
  }
  const curve = new Float32Array(frames);
  for (let f = 1; f < frames; f++) curve[f] = Math.max(0, energy[f] - energy[f - 1]);
  // without its slow average, so steady loudness does not count
  let mean = 0;
  for (const value of curve) mean += value;
  mean /= frames || 1;
  return curve.map((value) => Math.max(0, value - mean));
}

// The tempo, and how clearly it stands out (above ~1.3 is a clear beat)
export function detectTempo(samples: Float32Array, sampleRate: number, low = 60, high = 180) {
  const curve = onsetCurve(samples, sampleRate);
  const lagFor = (bpm: number) => 60 / bpm / HOP;
  const score = new Map<number, number>();
  const correlation = (lag: number) => {
    let sum = 0;
    for (let i = lag; i < curve.length; i++) sum += curve[i] * curve[i - lag];
    return sum / Math.max(1, curve.length - lag);
  };
  let best = { bpm: 0, value: -Infinity };
  let total = 0;
  let count = 0;
  for (let lag = Math.floor(lagFor(high)); lag <= Math.ceil(lagFor(low)); lag++) {
    // a beat also shows at twice its spacing: count both
    const value = correlation(lag) + 0.5 * correlation(lag * 2);
    const bpm = 60 / (lag * HOP);
    // gentle preference for 80-120, the usual home of a beat
    const weight = Math.exp(-0.5 * (Math.log2(bpm / 100) / 0.9) ** 2);
    const weighted = value * weight;
    score.set(lag, value);
    total += value;
    count++;
    if (weighted > best.value) best = { bpm, value: weighted };
  }
  if (!Number.isFinite(best.value) || best.bpm === 0) return { bpm: 0, confidence: 0 };
  // finer: the peak between neighbouring lags
  const lag = Math.round(60 / best.bpm / HOP);
  const [a, b, c] = [score.get(lag - 1) ?? 0, score.get(lag) ?? 0, score.get(lag + 1) ?? 0];
  const shift = a - 2 * b + c === 0 ? 0 : (0.5 * (a - c)) / (a - 2 * b + c);
  const bpm = 60 / ((lag + Math.max(-0.5, Math.min(0.5, shift))) * HOP);
  return { bpm: Math.round(bpm * 10) / 10, confidence: b / (total / count || 1) };
}
