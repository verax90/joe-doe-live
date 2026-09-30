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
let current: { master: GainNode; limiter: DynamicsCompressorNode; sweep: BiquadFilterNode; gate: GainNode } | undefined;

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
  const gate = new GainNode(context, { gain: 1 });
  master.disconnect();
  master.connect(sweep).connect(gate).connect(limiter).connect(context.destination);
  limited.add(master);
  current = { master, limiter, sweep, gate };
}
