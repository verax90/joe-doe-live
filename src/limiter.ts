// Limiter at the very end of Strudel's output. With Full Level pads, reverb, echo
// and a few piano notes ringing at once, the sum goes past 0 dB and clips: it
// sounds like the audio breaking up. This keeps the peaks under the ceiling.

type Output = { destinationGain?: GainNode | null };
type Global = typeof globalThis & {
  getSuperdoughAudioController?: () => { output?: Output } | undefined;
};

// Strudel rebuilds its output node now and then; each new one gets its own limiter
const limited = new WeakSet<GainNode>();

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
  master.gain.value = 0.8;
  master.disconnect();
  master.connect(limiter).connect(context.destination);
  limited.add(master);
}
