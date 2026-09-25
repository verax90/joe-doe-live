// Measures real round-trip latency: clicks out of the speakers, back in through
// the microphone. Chrome's own figure (outputLatency) can be off on Linux, and
// this is the delay you actually feel. Needs speakers, not headphones.

// Timestamps the first loud sample after being armed, in AudioContext time
const ONSET_PROCESSOR = `
class Onset extends AudioWorkletProcessor {
  constructor() {
    super();
    this.armedAt = Infinity;
    this.port.onmessage = (event) => (this.armedAt = event.data);
  }
  process(inputs) {
    const channel = inputs[0][0];
    if (channel && currentTime >= this.armedAt) {
      for (let i = 0; i < channel.length; i++) {
        if (Math.abs(channel[i]) > 0.1) {
          this.port.postMessage(currentTime + i / sampleRate);
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

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

export async function measureLatency(context: AudioContext, clicks = 5): Promise<number> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  try {
    const url = URL.createObjectURL(new Blob([ONSET_PROCESSOR], { type: 'text/javascript' }));
    await context.audioWorklet.addModule(url);
    const input = context.createMediaStreamSource(stream);
    const onset = new AudioWorkletNode(context, 'jdl-onset', { numberOfOutputs: 0 });
    input.connect(onset);

    const results: number[] = [];
    for (let i = 0; i < clicks; i++) {
      const at = context.currentTime + 0.4;
      const heard = new Promise<number>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('no click heard: turn the speakers up')), 2000);
        onset.port.onmessage = (event) => {
          clearTimeout(timeout);
          resolve(event.data as number);
        };
      });
      // Listen from a bit before the click so nothing is missed
      onset.port.postMessage(at - 0.005);
      const click = new OscillatorNode(context, { frequency: 2000 });
      const gain = new GainNode(context, { gain: 0 });
      gain.gain.setValueAtTime(0.8, at);
      gain.gain.setValueAtTime(0, at + 0.005);
      click.connect(gain).connect(context.destination);
      click.start(at);
      click.stop(at + 0.01);
      results.push((await heard) - at);
      await new Promise((r) => setTimeout(r, 300));
    }
    input.disconnect();
    return median(results);
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}
