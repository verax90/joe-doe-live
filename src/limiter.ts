// Limiter at the very end of Strudel's output. With Full Level pads, reverb, echo
// and a few piano notes ringing at once, the sum goes past 0 dB and clips: it
// sounds like the audio breaking up. This keeps the peaks under the ceiling.

type Output = { destinationGain?: GainNode | null };
type Global = typeof globalThis & {
  getSuperdoughAudioController?: () => { output?: Output } | undefined;
};

// Strudel rebuilds its output node now and then; each new one gets its own limiter
const limited = new WeakSet<GainNode>();
// sweep and gate: a high-pass and a gain the build-up (drop.ts) moves; at rest
// the filter sits at 10 Hz and the gate at 1, so nothing is heard of them
let current: { master: GainNode; limiter: DynamicsCompressorNode; sweep: BiquadFilterNode; gate: GainNode; dj: BiquadFilterNode } | undefined;

// For the ?debug panel: the signal before the limiter and how much it cuts
export const getLimiter = () => current;

// Master volume (MPK knob 7). 0.8 leaves some headroom before the limiter
let volume = 0.8;
export function setMasterVolume(value: number) {
  volume = value;
  if (current) current.master.gain.setTargetAtTime(value, current.master.context.currentTime, 0.05);
}

export function ensureLimiter() {
  const output = (globalThis as Global).getSuperdoughAudioController?.()?.output;
  const master = output?.destinationGain;
  if (!master || limited.has(master)) return;

  const context = master.context;
  const limiter = new DynamicsCompressorNode(context, {
    threshold: -6,
    knee: 0,
    ratio: 20,
    attack: 0.002,
    release: 0.15,
  });
  // A little headroom before the limiter so it works less
  master.gain.value = volume;
  const sweep = new BiquadFilterNode(context, { type: 'highpass', frequency: 10, Q: 0.9 });
  // the DJ filter (the phone's XY): wide open at rest
  const dj = new BiquadFilterNode(context, { type: 'lowpass', frequency: 22000, Q: 0.7 });
  const gate = new GainNode(context, { gain: 1 });
  master.disconnect();
  master.connect(dj).connect(sweep).connect(gate).connect(limiter).connect(context.destination);
  limited.add(master);
  current = { master, limiter, sweep, gate, dj };
}

// A DJ filter on the whole mix, like a Kaoss pad: x left of the middle closes
// a low-pass (down to 80 Hz), right of it opens a high-pass (up to 8 kHz), the
// middle lets everything through; y is the resonance. null: back to rest.
export function djFilterSetting(x: number, y: number) {
  const side = Math.min(1, Math.max(0, x)) - 0.5;
  const q = 0.7 + Math.min(1, Math.max(0, y)) * 14;
  if (Math.abs(side) < 0.03) return { type: 'lowpass' as const, frequency: 22000, q: 0.7 };
  if (side < 0) return { type: 'lowpass' as const, frequency: 80 * 250 ** ((side + 0.5) / 0.5), q };
  return { type: 'highpass' as const, frequency: 20 * 400 ** (side / 0.5), q };
}

export function setDjFilter(x: number | null, y = 0) {
  const dj = current?.dj;
  if (!dj) return;
  const setting = x === null ? { type: 'lowpass' as const, frequency: 22000, q: 0.7 } : djFilterSetting(x, y);
  const now = dj.context.currentTime;
  if (dj.type !== setting.type) {
    // switching sides: start the new filter open, then glide
    dj.frequency.cancelScheduledValues(now);
    dj.frequency.value = setting.type === 'lowpass' ? 22000 : 10;
    dj.type = setting.type;
  }
  dj.frequency.setTargetAtTime(setting.frequency, now, 0.03);
  dj.Q.setTargetAtTime(setting.q, now, 0.03);
}
