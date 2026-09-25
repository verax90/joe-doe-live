// Measures real round-trip latency: clicks out of the speakers, back in through
// the microphone. Chrome's own figure (outputLatency) can be off on Linux, and
// this is the delay you actually feel. Needs speakers, not headphones.
//
// First it listens to the room to set a threshold above the background noise,
// then only accepts a sound that starts after the click was sent: a negative or
// near-zero result means something else was heard, never a real measurement.

// Two jobs, in AudioContext time: report the loudest sample while listening to
// the room, and timestamp the first sample over the threshold once armed
const ONSET_PROCESSOR = `
class Onset extends AudioWorkletProcessor {
  constructor() {
    super();
    this.armedAt = Infinity;
    this.threshold = 1;
    this.peakUntil = -1;
    this.peak = 0;
    this.port.onmessage = ({ data }) => {
      if (data.type === 'noise') { this.peak = 0; this.peakUntil = currentTime + data.seconds; }
      if (data.type === 'arm') { this.armedAt = data.at; this.threshold = data.threshold; }
    };
  }
  process(inputs) {
    const channel = inputs[0][0];
    if (!channel) return true;
    if (currentTime < this.peakUntil) {
      for (let i = 0; i < channel.length; i++) this.peak = Math.max(this.peak, Math.abs(channel[i]));
    } else if (this.peakUntil > 0) {
      this.port.postMessage({ type: 'noise', peak: this.peak });
      this.peakUntil = -1;
    }
    if (currentTime >= this.armedAt) {
      for (let i = 0; i < channel.length; i++) {
        if (Math.abs(channel[i]) > this.threshold) {
          this.port.postMessage({ type: 'onset', at: currentTime + i / sampleRate });
          this.armedAt = Infinity;
          break;
        }
      }
    }
    return true;
  }
}
registerProcessor('jdl-onset', Onset);
`;

// A processor name can only be registered once per audio context
const loaded = new WeakSet<BaseAudioContext>();

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

type Message = { type: 'noise'; peak: number } | { type: 'onset'; at: number };

function nextMessage(port: MessagePort, type: Message['type'], timeoutMs: number) {
  return new Promise<Message>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    port.onmessage = ({ data }) => {
      if (data.type !== type) return;
      clearTimeout(timeout);
      resolve(data);
    };
  });
}

export async function measureLatency(context: AudioContext, clicks = 5): Promise<number> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  try {
    if (!loaded.has(context)) {
      const url = URL.createObjectURL(new Blob([ONSET_PROCESSOR], { type: 'text/javascript' }));
      await context.audioWorklet.addModule(url);
      loaded.add(context);
    }
    const input = context.createMediaStreamSource(stream);
    const onset = new AudioWorkletNode(context, 'jdl-onset', { numberOfOutputs: 0 });
    input.connect(onset);

    // 1. The room: the threshold goes well above whatever is already there
    onset.port.postMessage({ type: 'noise', seconds: 0.6 });
    const noise = (await nextMessage(onset.port, 'noise', 3000)) as { peak: number };
    if (noise.peak > 0.3) throw new Error('too noisy: stop the music and anything playing, then try again');
    const threshold = Math.min(0.6, Math.max(0.05, noise.peak * 3));

    // 2. The clicks: only a sound that starts after the click counts
    const results: number[] = [];
    for (let i = 0; i < clicks; i++) {
      const at = context.currentTime + 0.4;
      onset.port.postMessage({ type: 'arm', at, threshold });
      const click = new OscillatorNode(context, { frequency: 2000 });
      const gain = new GainNode(context, { gain: 0 });
      gain.gain.setValueAtTime(0.9, at);
      gain.gain.setValueAtTime(0, at + 0.005);
      click.connect(gain).connect(context.destination);
      click.start(at);
      click.stop(at + 0.01);
      try {
        const heard = (await nextMessage(onset.port, 'onset', 2000)) as { at: number };
        const delay = heard.at - at;
        // Under 5 ms is faster than any speaker-air-microphone path: not the click
        if (delay > 0.005) results.push(delay);
      } catch {
        // not heard this time; the others may be
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    input.disconnect();
    if (results.length < 3) throw new Error('the clicks were not heard clearly: turn the speakers up, no headphones');
    return median(results);
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}
