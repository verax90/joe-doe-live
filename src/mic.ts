// Microphone with effects: your voice (or a guitar, or anything on an input
// such as the SP-404MKII's) through volume, pitch, distortion, lo-fi, a
// filter, muffle, auto-wah, robot, tremolo, vibrato, flanger, chorus, echo,
// ping-pong and reverb, into the recordings. A noise gate first silences the
// input between phrases. While
// the studio plays, the echo follows its tempo (a dotted eighth). "Hear me" also sends it to the studio output,
// into the limiter; off by default, since with speakers instead of headphones
// it feeds back. The browser's own voice-call processing (echo cancelling,
// noise suppression, auto gain) is off: it ruins a voice for music.
import { ensureAudio } from './audio';
import { onLangChange, pick, t, type Localized } from './i18n';
import { ensureLimiter, getLimiter } from './limiter';
import { readStorage, writeStorage } from './storage';

export type MicControl =
  | 'volume'
  | 'gate'
  | 'pitch'
  | 'drive'
  | 'lofi'
  | 'filter'
  | 'muffle'
  | 'wah'
  | 'robot'
  | 'tremolo'
  | 'vibrato'
  | 'flanger'
  | 'chorus'
  | 'echo'
  | 'pingpong'
  | 'reverb';

// Short names on one line; what each one does, on hover
export const MIC_CONTROLS: { id: MicControl; name: Localized; hint?: Localized }[] = [
  { id: 'volume', name: { en: 'Volume', es: 'Volumen' } },
  { id: 'gate', name: { en: 'Noise gate', es: 'Puerta de ruido' }, hint: { en: 'Silence between words', es: 'Silencio entre frases' } },
  { id: 'pitch', name: { en: 'Pitch', es: 'Tono' }, hint: { en: 'Low ↔ high, up to an octave', es: 'Grave ↔ agudo, hasta una octava' } },
  { id: 'drive', name: { en: 'Distortion', es: 'Distorsión' } },
  { id: 'lofi', name: { en: 'Lo-fi', es: 'Lo-fi' }, hint: { en: 'Fewer bits', es: 'Menos bits' } },
  { id: 'filter', name: { en: 'Radio', es: 'Radio' }, hint: { en: 'A thin, telephone-like band', es: 'Una banda estrecha, como un teléfono' } },
  { id: 'muffle', name: { en: 'Muffle', es: 'Apagado' }, hint: { en: 'Underwater', es: 'Bajo el agua' } },
  { id: 'wah', name: { en: 'Auto-wah', es: 'Auto-wah' }, hint: { en: 'Opens as you sing louder', es: 'Se abre al cantar más fuerte' } },
  { id: 'robot', name: { en: 'Robot', es: 'Robot' } },
  { id: 'tremolo', name: { en: 'Tremolo', es: 'Trémolo' } },
  { id: 'vibrato', name: { en: 'Vibrato', es: 'Vibrato' }, hint: { en: 'A warped tape', es: 'Una cinta deformada' } },
  { id: 'flanger', name: { en: 'Flanger', es: 'Flanger' }, hint: { en: 'A jet', es: 'Un avión' } },
  { id: 'chorus', name: { en: 'Chorus', es: 'Coro' } },
  { id: 'echo', name: { en: 'Echo', es: 'Eco' } },
  { id: 'pingpong', name: { en: 'Ping-pong', es: 'Ping-pong' }, hint: { en: 'Echo left ↔ right', es: 'Eco izquierda ↔ derecha' } },
  { id: 'reverb', name: { en: 'Reverb', es: 'Reverb' } },
];

type Settings = Record<MicControl, number>;

// Every control at rest; pitch rests in the middle
export const MIC_NEUTRAL: Settings = {
  volume: 0.7,
  gate: 0,
  pitch: 0.5,
  drive: 0,
  lofi: 0,
  filter: 0,
  muffle: 0,
  wah: 0,
  robot: 0,
  tremolo: 0,
  vibrato: 0,
  flanger: 0,
  chorus: 0,
  echo: 0,
  pingpong: 0,
  reverb: 0,
};
const preset = (changes: Partial<Settings>): Settings => ({ ...MIC_NEUTRAL, ...changes });
const semitones = (n: number) => 0.5 + n / 24;

export type MicGroup = 'space' | 'radio' | 'character' | 'machine';
export const MIC_GROUPS: { id: MicGroup; name: Localized }[] = [
  { id: 'space', name: { en: 'Space', es: 'Espacio' } },
  { id: 'radio', name: { en: 'Radio and tape', es: 'Radio y cinta' } },
  { id: 'character', name: { en: 'Characters', es: 'Personajes' } },
  { id: 'machine', name: { en: 'Machines', es: 'Máquinas' } },
];

export const MIC_PRESETS: { id: string; group: MicGroup; name: Localized; settings: Settings }[] = [
  { id: 'clean', group: 'space', name: { en: 'Clean', es: 'Limpia' }, settings: preset({ reverb: 0.1 }) },
  { id: 'echo', group: 'space', name: { en: 'Echo', es: 'Eco' }, settings: preset({ echo: 0.55, reverb: 0.2 }) },
  { id: 'adlib', group: 'space', name: { en: 'Ad-lib', es: 'Ad-lib' }, settings: preset({ volume: 0.75, drive: 0.3, filter: 0.2, echo: 0.45, reverb: 0.15 }) },
  { id: 'dub', group: 'space', name: { en: 'Dub', es: 'Dub' }, settings: preset({ filter: 0.3, echo: 0.85, reverb: 0.4 }) },
  { id: 'stadium', group: 'space', name: { en: 'Stadium', es: 'Estadio' }, settings: preset({ volume: 0.8, chorus: 0.2, echo: 0.35, reverb: 0.7 }) },
  { id: 'cathedral', group: 'space', name: { en: 'Cathedral', es: 'Catedral' }, settings: preset({ volume: 0.65, echo: 0.1, reverb: 0.85 }) },
  { id: 'pingpong', group: 'space', name: { en: 'Ping-pong', es: 'Ping-pong' }, settings: preset({ pingpong: 0.7, reverb: 0.2 }) },
  { id: 'underwater', group: 'space', name: { en: 'Underwater', es: 'Bajo el agua' }, settings: preset({ muffle: 0.85, vibrato: 0.4, chorus: 0.3, reverb: 0.4 }) },
  { id: 'radio', group: 'radio', name: { en: 'Radio', es: 'Radio' }, settings: preset({ volume: 0.8, drive: 0.25, filter: 0.85 }) },
  { id: 'phone', group: 'radio', name: { en: 'Phone', es: 'Teléfono' }, settings: preset({ volume: 0.8, drive: 0.15, lofi: 0.3, filter: 1 }) },
  { id: 'walkie', group: 'radio', name: { en: 'Walkie-talkie', es: 'Walkie' }, settings: preset({ volume: 0.8, drive: 0.5, lofi: 0.45, filter: 0.9 }) },
  { id: 'megaphone', group: 'radio', name: { en: 'Megaphone', es: 'Megáfono' }, settings: preset({ volume: 0.75, drive: 0.7, filter: 0.6, echo: 0.1, reverb: 0.1 }) },
  { id: 'lofi', group: 'radio', name: { en: 'Lo-fi', es: 'Lo-fi' }, settings: preset({ lofi: 0.65, filter: 0.45, echo: 0.2, reverb: 0.15 }) },
  { id: 'tape', group: 'radio', name: { en: 'Old tape', es: 'Cinta vieja' }, settings: preset({ drive: 0.15, lofi: 0.35, muffle: 0.45, vibrato: 0.35, reverb: 0.1 }) },
  { id: 'chipmunk', group: 'character', name: { en: 'Chipmunk', es: 'Ardilla' }, settings: preset({ pitch: semitones(8), reverb: 0.1 }) },
  { id: 'helium', group: 'character', name: { en: 'Helium', es: 'Helio' }, settings: preset({ pitch: semitones(12), chorus: 0.2, reverb: 0.1 }) },
  { id: 'monster', group: 'character', name: { en: 'Monster', es: 'Monstruo' }, settings: preset({ pitch: semitones(-7), drive: 0.2, reverb: 0.35 }) },
  { id: 'giant', group: 'character', name: { en: 'Giant', es: 'Gigante' }, settings: preset({ pitch: semitones(-12), drive: 0.15, echo: 0.15, reverb: 0.5 }) },
  { id: 'demon', group: 'character', name: { en: 'Demon', es: 'Demonio' }, settings: preset({ pitch: semitones(-9), drive: 0.6, robot: 0.3, reverb: 0.5 }) },
  { id: 'ghost', group: 'character', name: { en: 'Ghost', es: 'Fantasma' }, settings: preset({ volume: 0.65, pitch: semitones(-3), muffle: 0.3, tremolo: 0.4, echo: 0.3, reverb: 0.9 }) },
  { id: 'alien', group: 'character', name: { en: 'Alien', es: 'Alien' }, settings: preset({ pitch: semitones(5), robot: 0.5, flanger: 0.7, echo: 0.3 }) },
  { id: 'robot', group: 'machine', name: { en: 'Robot', es: 'Robot' }, settings: preset({ volume: 0.8, drive: 0.2, filter: 0.2, robot: 1, echo: 0.2, reverb: 0.1 }) },
  { id: 'helmet', group: 'machine', name: { en: 'Helmet', es: 'Casco' }, settings: preset({ volume: 0.8, filter: 0.3, robot: 0.6, flanger: 0.3, chorus: 0.5, reverb: 0.15 }) },
  { id: 'jet', group: 'machine', name: { en: 'Jet', es: 'Avión' }, settings: preset({ flanger: 0.9, reverb: 0.2 }) },
  { id: 'choir', group: 'machine', name: { en: 'Choir', es: 'Coro' }, settings: preset({ chorus: 0.85, echo: 0.15, reverb: 0.45 }) },
  { id: 'tremolo', group: 'machine', name: { en: 'Tremolo', es: 'Trémolo' }, settings: preset({ tremolo: 0.75, echo: 0.2, reverb: 0.3 }) },
  { id: 'wah', group: 'machine', name: { en: 'Wah', es: 'Wah' }, settings: preset({ volume: 0.75, drive: 0.15, wah: 0.8, echo: 0.15, reverb: 0.15 }) },
  { id: 'vibrato', group: 'machine', name: { en: 'Vibrato', es: 'Vibrato' }, settings: preset({ vibrato: 0.8, reverb: 0.25 }) },
];

// Noise gate: 0 is off; up the slider, the level the voice must pass to be
// let through rises from -54 dB (a hiss) to -18 dB (only loud singing)
export const gateThreshold = (amount: number) => (amount < 0.01 ? 0 : 10 ** ((-54 + amount * 36) / 20));

// Auto-wah: the filter rests low and rises with the voice's level
export const WAH_REST = 300;
export const wahDepth = (amount: number) => amount * 12000;

// Muffle: a low-pass sliding from out of hearing (20 kHz) down to 350 Hz
export const muffleFrequency = (amount: number) => (amount < 0.01 ? 20000 : 20000 * (350 / 20000) ** amount);

// Pitch slider to a shift: the middle is none, the ends an octave down or up
// (in whole semitones). The shifter reads the voice through a delay that
// sweeps `window` seconds at `rate` sweeps per second: a delay that shrinks
// raises the pitch, one that grows lowers it
export function pitchSettings(position: number, window = 0.08) {
  const semitones = Math.round((position - 0.5) * 24);
  const ratio = 2 ** (semitones / 12);
  return { semitones, ratio, rate: Math.abs(ratio - 1) / window, direction: ratio > 1 ? -1 : 1 };
}

// Lo-fi: fewer bits, a staircase curve; 0 is a straight line (no change)
export function crushCurve(amount: number, size = 4096) {
  const steps = 2 ** Math.round(12 - amount * 9) / 2; // 12 bits down to 3
  return Float32Array.from({ length: size }, (_, i) => {
    const x = (i / (size - 1)) * 2 - 1;
    return amount < 0.02 ? x : Math.round(x * steps) / steps;
  });
}

// Echo time in seconds: a dotted eighth of the playing tempo (cycles per
// second, one cycle a bar), or a fixed slap when nothing plays
export const echoTime = (cps?: number) => (cps && cps > 0 ? Math.min(0.95, 3 / (16 * cps)) : 0.32);

// Distortion curve: amount 0 is a straight line (no change)
export function driveCurve(amount: number, size = 1024) {
  const k = amount * 60;
  return Float32Array.from({ length: size }, (_, i) => {
    const x = (i / (size - 1)) * 2 - 1;
    return k ? ((1 + k) * x) / (1 + k * Math.abs(x)) : x;
  });
}

// 0.97·tanh(2u) for u in -1…1: gentle near zero, flat before ±0.97
export function softClipCurve(size = 2048) {
  return Float32Array.from({ length: size }, (_, i) => 0.97 * Math.tanh(2 * ((i / (size - 1)) * 2 - 1)));
}

// Filter position to a band-pass: 0 lets everything through, 1 is a thin,
// telephone-like band around 1.5 kHz
export function filterSettings(position: number) {
  return { lowCut: 60 + position * 440, highCut: 18000 - position * 15000 };
}

// A room's echo tail, made up: noise fading away over `seconds`
function impulse(context: BaseAudioContext, seconds = 2.8) {
  const length = Math.floor(context.sampleRate * seconds);
  const buffer = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
  }
  return buffer;
}

type Chain = {
  context: AudioContext;
  stream: MediaStream;
  input: GainNode;
  drive: WaveShaperNode;
  lowCut: BiquadFilterNode;
  highCut: BiquadFilterNode;
  echoSend: GainNode;
  echoDelay: DelayNode;
  reverbSend: GainNode;
  robot: GainNode;
  robotDepth: GainNode;
  tremolo: GainNode;
  tremoloDepth: GainNode;
  muffle: BiquadFilterNode;
  vibrato: { dry: GainNode; wet: GainNode; depth: GainNode };
  flangerSend: GainNode;
  gate: AudioWorkletNode;
  wah: { dry: GainNode; wet: GainNode; depth: GainNode };
  pingpong: { send: GainNode; left: DelayNode; right: DelayNode };
  crush: WaveShaperNode;
  chorusSend: GainNode;
  pitch: ReturnType<typeof pitchShifter>;
  oscillators: OscillatorNode[];
  out: GainNode;
  analyser: AnalyserNode;
};

let chain: Chain | undefined;
let monitoring = false;
let monitoredInto: AudioNode | undefined;

// For record.ts: the voice when it is not already going through the studio
// output (which recordings tap); undefined when off or when heard
export const micForRecording = () => (chain && !monitoring ? chain.out : undefined);

// For the sampler: the voice with its effects, whenever the mic is on
export const micOutput = () => chain?.out;

// The gate, in an AudioWorklet so it acts sample by sample: it follows the
// input's level quickly (1 ms up, 25 ms down), opens above the threshold,
// closes a little below it after 80 ms, and fades in 3 ms and out 60 ms. Its
// second output is a smoother level (5 ms up, 120 ms down) for the auto-wah
const GATE_PROCESSOR = `
class Gate extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'threshold', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' }];
  }
  constructor() {
    super();
    this.level = 0;
    this.smooth = 0;
    this.gain = 1;
    this.open = true;
    this.hold = 0;
    const rate = (seconds) => 1 - Math.exp(-1 / (sampleRate * seconds));
    this.rates = { up: rate(0.001), down: rate(0.025), smoothUp: rate(0.005), smoothDown: rate(0.12), fadeIn: rate(0.003), fadeOut: rate(0.06) };
  }
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const out = outputs[0];
    const level = outputs[1][0];
    const threshold = parameters.threshold[0];
    const { up, down, smoothUp, smoothDown, fadeIn, fadeOut } = this.rates;
    for (let i = 0; i < level.length; i++) {
      let x = 0;
      for (const channel of input) x = Math.max(x, Math.abs(channel[i]));
      this.level += (x - this.level) * (x > this.level ? up : down);
      this.smooth += (x - this.smooth) * (x > this.smooth ? smoothUp : smoothDown);
      level[i] = this.smooth;
      if (threshold <= 0 || this.level > threshold) {
        this.open = true;
        this.hold = sampleRate * 0.08;
      } else if (this.level < threshold * 0.6) {
        if (this.hold > 0) this.hold--;
        else this.open = false;
      }
      const target = this.open ? 1 : 0;
      this.gain += (target - this.gain) * (target > this.gain ? fadeIn : fadeOut);
      for (let c = 0; c < out.length; c++) out[c][i] = (input[c] ?? input[0] ?? [])[i] * this.gain || 0;
    }
    return true;
  }
}
registerProcessor('jdl-gate', Gate);
`;
const gateLoaded = new WeakSet<BaseAudioContext>();
async function loadGate(context: AudioContext) {
  if (gateLoaded.has(context)) return;
  const url = URL.createObjectURL(new Blob([GATE_PROCESSOR], { type: 'text/javascript' }));
  await context.audioWorklet.addModule(url);
  URL.revokeObjectURL(url);
  gateLoaded.add(context);
}

// A band-limited wave from Fourier terms, as numbers not normalised
const wave = (context: BaseAudioContext, real: number[], imag: number[]) =>
  context.createPeriodicWave(Float32Array.from(real), Float32Array.from(imag), { disableNormalization: true });

// Pitch shifter: two taps on the voice, each through a delay swept by a
// sawtooth, half a sweep apart; each tap fades out around its jump, so one is
// always heard while the other resets. dry and wet switch it in and out
const PITCH_WINDOW = 0.08;
const HARMONICS = 48;
function pitchShifter(context: AudioContext, from: AudioNode, to: AudioNode) {
  const dry = context.createGain();
  const wet = new GainNode(context, { gain: 0 });
  from.connect(dry).connect(to);
  wet.connect(to);
  const zeros = Array<number>(HARMONICS).fill(0);
  // 2φ-1 for φ from 0 to 1, jumping at 0: -(2/π)·Σ sin(2πnφ)/n; the second
  // tap's, half a turn later, flips the sign of the odd terms
  const saw = (shifted: boolean) => zeros.map((_, n) => (n === 0 ? 0 : (-2 / Math.PI / n) * (shifted && n % 2 ? -1 : 1)));
  const oscillators: OscillatorNode[] = [];
  const depths: GainNode[] = [];
  for (const shifted of [false, true]) {
    const delay = new DelayNode(context, { delayTime: 0.01 + PITCH_WINDOW / 2, maxDelayTime: 0.2 });
    const sweep = new OscillatorNode(context, { frequency: 0 });
    sweep.setPeriodicWave(wave(context, zeros, saw(shifted)));
    const depth = new GainNode(context, { gain: PITCH_WINDOW / 2 });
    sweep.connect(depth).connect(delay.delayTime);
    // fade: sin²(πφ) = ½ - ½cos(2πφ), zero where this tap jumps
    const fade = new GainNode(context, { gain: 0.5 });
    const fader = new OscillatorNode(context, { frequency: 0 });
    fader.setPeriodicWave(wave(context, [0, shifted ? 0.5 : -0.5], [0, 0]));
    fader.connect(fade.gain);
    from.connect(delay).connect(fade).connect(wet);
    oscillators.push(sweep, fader);
    depths.push(depth);
  }
  return { dry, wet, oscillators, depths, on: false };
}

function build(context: AudioContext, stream: MediaStream): Chain {
  const source = context.createMediaStreamSource(stream);
  const input = context.createGain();
  const lowCut = new BiquadFilterNode(context, { type: 'highpass', frequency: 60 });
  const drive = new WaveShaperNode(context, { curve: driveCurve(0), oversample: '2x' });
  const crush = new WaveShaperNode(context, { curve: crushCurve(0) });
  const highCut = new BiquadFilterNode(context, { type: 'lowpass', frequency: 18000 });
  // Robot: the voice multiplied by a 50 Hz tone (ring modulation), blended
  // with itself: gain = 1 - depth + depth·tone
  const robot = context.createGain();
  const robotLfo = new OscillatorNode(context, { frequency: 50 });
  const robotDepth = new GainNode(context, { gain: 0 });
  robotLfo.connect(robotDepth).connect(robot.gain);
  // Tremolo: the volume wobbling 5.5 times a second
  const tremolo = context.createGain();
  const tremoloLfo = new OscillatorNode(context, { frequency: 5.5 });
  const tremoloDepth = new GainNode(context, { gain: 0 });
  tremoloLfo.connect(tremoloDepth).connect(tremolo.gain);
  const muffle = new BiquadFilterNode(context, { type: 'lowpass', frequency: 20000, Q: 1 });
  // Gate on the way in; its level output sweeps the wah's resonant low-pass
  const gate = new AudioWorkletNode(context, 'jdl-gate', {
    numberOfInputs: 1,
    numberOfOutputs: 2,
    outputChannelCount: [2, 1],
  });
  const wahFilter = new BiquadFilterNode(context, { type: 'lowpass', frequency: WAH_REST, Q: 6 });
  const wah = { dry: context.createGain(), wet: new GainNode(context, { gain: 0 }), depth: new GainNode(context, { gain: 0 }) };
  gate.connect(wah.depth, 1).connect(wahFilter.frequency);
  // Vibrato: the voice through a delay wobbling 4.5 times a second, which
  // bends its pitch up and down like a warped tape; bypassed at 0
  const vibratoDelay = new DelayNode(context, { delayTime: 0.012, maxDelayTime: 0.05 });
  const vibratoLfo = new OscillatorNode(context, { frequency: 4.5 });
  const vibrato = { dry: context.createGain(), wet: new GainNode(context, { gain: 0 }), depth: new GainNode(context, { gain: 0 }) };
  vibratoLfo.connect(vibrato.depth).connect(vibratoDelay.delayTime);
  // Everything after the voice effects, before the mix
  const voice = context.createGain();
  // Dry, echo and reverb meet here, then a limiter of its own: without "Hear
  // me" the voice goes to recordings without passing the studio's limiter
  const sum = context.createGain();
  const compressor = new DynamicsCompressorNode(context, { threshold: -6, knee: 6, ratio: 12, attack: 0.003, release: 0.1 });
  // …and a soft clip after it (the compressor adds its own make-up gain):
  // y = 0.97·tanh(x), so it can never pass 0.97. A WaveShaper reads its input
  // between -1 and 1, hence halving first and tanh(2u) in the curve
  const half = new GainNode(context, { gain: 0.5 });
  const clip = new WaveShaperNode(context, { curve: softClipCurve(), oversample: '2x' });
  const out = context.createGain();
  sum.connect(compressor).connect(half).connect(clip).connect(out);
  const echoSend = context.createGain();
  const echoDelay = new DelayNode(context, { delayTime: echoTime(), maxDelayTime: 1 });
  const echoFeedback = new GainNode(context, { gain: 0.45 });
  const reverbSend = context.createGain();
  const reverb = new ConvolverNode(context, { buffer: impulse(context) });
  // Chorus: two copies a few milliseconds late, each wobbling slowly
  const chorusSend = context.createGain();
  const oscillators = [robotLfo, tremoloLfo, vibratoLfo];
  // Ping-pong: the voice (in mono) echoes left, then right, then left…
  const pingpong = {
    send: new GainNode(context, { gain: 0, channelCount: 1, channelCountMode: 'explicit' }),
    left: new DelayNode(context, { delayTime: echoTime(), maxDelayTime: 1 }),
    right: new DelayNode(context, { delayTime: echoTime(), maxDelayTime: 1 }),
  };
  const sides = new ChannelMergerNode(context, { numberOfInputs: 2 });
  pingpong.send.connect(pingpong.left);
  pingpong.left.connect(sides, 0, 0);
  pingpong.left.connect(pingpong.right);
  pingpong.right.connect(sides, 0, 1);
  pingpong.right.connect(new GainNode(context, { gain: 0.5 })).connect(pingpong.left);
  sides.connect(sum);
  // Flanger: a copy 0.5 to 5.5 ms late, sweeping slowly, fed back into itself
  const flangerSend = new GainNode(context, { gain: 0 });
  const flangerDelay = new DelayNode(context, { delayTime: 0.003, maxDelayTime: 0.02 });
  const flangerLfo = new OscillatorNode(context, { frequency: 0.25 });
  flangerLfo.connect(new GainNode(context, { gain: 0.0025 })).connect(flangerDelay.delayTime);
  flangerSend.connect(flangerDelay).connect(sum);
  flangerDelay.connect(new GainNode(context, { gain: 0.6 })).connect(flangerDelay);
  oscillators.push(flangerLfo);
  for (const [base, depth, rate] of [[0.022, 0.005, 0.8], [0.031, 0.007, 1.13]]) {
    const delay = new DelayNode(context, { delayTime: base, maxDelayTime: 0.1 });
    const lfo = new OscillatorNode(context, { frequency: rate });
    lfo.connect(new GainNode(context, { gain: depth })).connect(delay.delayTime);
    chorusSend.connect(delay).connect(sum);
    oscillators.push(lfo);
  }
  const analyser = new AnalyserNode(context, { fftSize: 1024 });

  source.connect(input).connect(gate);
  const pitch = pitchShifter(context, gate, lowCut);
  oscillators.push(...pitch.oscillators);
  lowCut.connect(drive).connect(crush).connect(highCut).connect(muffle);
  muffle.connect(wah.dry).connect(robot);
  muffle.connect(wahFilter).connect(wah.wet).connect(robot);
  robot.connect(tremolo);
  tremolo.connect(vibrato.dry).connect(voice);
  tremolo.connect(vibratoDelay).connect(vibrato.wet).connect(voice);
  voice.connect(sum);
  voice.connect(echoSend).connect(echoDelay).connect(sum);
  echoDelay.connect(echoFeedback).connect(echoDelay);
  voice.connect(reverbSend).connect(reverb).connect(sum);
  voice.connect(chorusSend);
  voice.connect(flangerSend);
  voice.connect(pingpong.send);
  out.connect(analyser);
  // all at once, so the pitch shifter's sweeps and fades stay in step
  const at = context.currentTime + 0.05;
  for (const oscillator of oscillators) oscillator.start(at);
  return {
    context,
    stream,
    input,
    drive,
    lowCut,
    highCut,
    echoSend,
    echoDelay,
    reverbSend,
    robot,
    robotDepth,
    tremolo,
    tremoloDepth,
    muffle,
    vibrato,
    flangerSend,
    gate,
    wah,
    pingpong,
    crush,
    chorusSend,
    pitch,
    oscillators,
    out,
    analyser,
  };
}

function applySettings(settings: Settings) {
  if (!chain) return;
  const now = chain.context.currentTime;
  const glide = (param: AudioParam, value: number) => param.setTargetAtTime(value, now, 0.02);
  glide(chain.input.gain, settings.volume * 1.6);
  chain.drive.curve = driveCurve(settings.drive);
  chain.crush.curve = crushCurve(settings.lofi);
  const { lowCut, highCut } = filterSettings(settings.filter);
  glide(chain.lowCut.frequency, lowCut);
  glide(chain.highCut.frequency, highCut);
  glide(chain.robot.gain, 1 - settings.robot);
  glide(chain.robotDepth.gain, settings.robot);
  glide(chain.tremolo.gain, 1 - settings.tremolo / 2);
  glide(chain.tremoloDepth.gain, settings.tremolo / 2);
  glide(chain.muffle.frequency, muffleFrequency(settings.muffle));
  const vibratoOn = settings.vibrato >= 0.01;
  glide(chain.vibrato.dry.gain, vibratoOn ? 0 : 1);
  glide(chain.vibrato.wet.gain, vibratoOn ? 1 : 0);
  glide(chain.vibrato.depth.gain, settings.vibrato * 0.004);
  glide(chain.flangerSend.gain, settings.flanger * 0.8);
  chain.gate.parameters.get('threshold')!.setValueAtTime(gateThreshold(settings.gate), now);
  const wahOn = settings.wah >= 0.01;
  glide(chain.wah.dry.gain, wahOn ? 0 : 1);
  glide(chain.wah.wet.gain, wahOn ? 1.4 : 0); // the filter takes some level away
  glide(chain.wah.depth.gain, wahDepth(settings.wah));
  glide(chain.pingpong.send.gain, settings.pingpong * 0.8);
  glide(chain.chorusSend.gain, settings.chorus * 0.9);
  glide(chain.echoSend.gain, settings.echo * 0.8);
  glide(chain.reverbSend.gain, settings.reverb * 0.9);
  // Pitch: the four oscillators change together, so they stay in step
  const { semitones, rate, direction } = pitchSettings(settings.pitch, PITCH_WINDOW);
  const pitch = chain.pitch;
  pitch.on = semitones !== 0;
  for (const oscillator of pitch.oscillators) oscillator.frequency.setValueAtTime(pitch.on ? rate : 0, now);
  for (const depth of pitch.depths) depth.gain.setValueAtTime((direction * PITCH_WINDOW) / 2, now);
  glide(pitch.dry.gain, pitch.on ? 0 : 1);
  glide(pitch.wet.gain, pitch.on ? 1 : 0);
}

// While the studio plays, the echo and the ping-pong land on a dotted eighth
// of its tempo
let echoSeconds = echoTime();
function syncEcho(cps?: number) {
  const seconds = echoTime(cps);
  if (!chain || Math.abs(seconds - echoSeconds) < 0.001) return;
  echoSeconds = seconds;
  const now = chain.context.currentTime;
  for (const delay of [chain.echoDelay, chain.pingpong.left, chain.pingpong.right]) delay.delayTime.setTargetAtTime(seconds, now, 0.1);
}

// Into the studio output while "Hear me" is on. Strudel rebuilds its output
// now and then, so the connection is checked again every second
function syncMonitor() {
  const limiter = getLimiter()?.limiter;
  const target = chain && monitoring ? limiter : undefined;
  if (target === monitoredInto) return;
  if (monitoredInto && chain) chain.out.disconnect(monitoredInto);
  if (target && chain) chain.out.connect(target);
  monitoredInto = target;
}

type Options = { tempo: () => number | undefined };

export function setupMic({ tempo }: Options) {
  const deviceSelect = document.querySelector<HTMLSelectElement>('#mic-device')!;
  const onButton = document.querySelector<HTMLButtonElement>('#mic-on')!;
  const monitorBox = document.querySelector<HTMLInputElement>('#mic-monitor')!;
  const presetsBox = document.querySelector<HTMLElement>('#mic-presets')!;
  const slidersBox = document.querySelector<HTMLElement>('#mic-sliders')!;
  const meter = document.querySelector<HTMLElement>('#mic-meter span')!;
  const status = document.querySelector<HTMLElement>('#mic-status')!;

  let settings: Settings = { ...MIC_NEUTRAL, ...readStorage<Partial<Settings>>('jdl:mic', MIC_PRESETS[0].settings) };
  let presetId = readStorage<string>('jdl:mic-preset', 'clean');
  const save = () => {
    writeStorage('jdl:mic', settings);
    writeStorage('jdl:mic-preset', presetId);
  };

  // Inputs, with the SP-404MKII (or any USB interface) first when there is one
  const listDevices = async () => {
    const inputs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'audioinput');
    const keep = deviceSelect.value;
    deviceSelect.replaceChildren(...inputs.map((d, i) => new Option(d.label || t('micInput', { n: i + 1 }), d.deviceId)));
    const preferred = inputs.find((d) => /sp-?404|usb/i.test(d.label));
    deviceSelect.value = inputs.some((d) => d.deviceId === keep) ? keep : (preferred?.deviceId ?? inputs[0]?.deviceId ?? '');
  };

  const stop = () => {
    if (!chain) return;
    chain.stream.getTracks().forEach((track) => track.stop());
    chain.out.disconnect();
    for (const oscillator of chain.oscillators) oscillator.stop();
    chain = undefined;
    monitoredInto = undefined;
    onButton.textContent = t('micOn');
    status.textContent = t('micOff');
    meter.style.width = '0';
  };

  const start = async () => {
    await ensureAudio();
    ensureLimiter();
    const context = (globalThis as { getAudioContext?: () => AudioContext }).getAudioContext!();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceSelect.value ? { exact: deviceSelect.value } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    await loadGate(context);
    chain = build(context, stream);
    echoSeconds = echoTime();
    applySettings(settings);
    syncEcho(tempo());
    syncMonitor();
    await listDevices(); // labels only show once permission is granted
    onButton.textContent = t('micStop');
    status.textContent = t('micLive', { input: stream.getAudioTracks()[0]?.label ?? '' });
  };

  onButton.addEventListener('click', async () => {
    if (chain) return stop();
    try {
      await start();
    } catch (error) {
      status.textContent = t('micError', { error: error instanceof Error ? error.name : String(error) });
    }
  });
  deviceSelect.addEventListener('change', async () => {
    if (!chain) return;
    stop();
    await start().catch(() => undefined);
  });

  monitoring = readStorage<boolean>('jdl:mic-monitor', false);
  monitorBox.checked = monitoring;
  monitorBox.addEventListener('change', () => {
    monitoring = monitorBox.checked;
    writeStorage('jdl:mic-monitor', monitoring);
    syncMonitor();
  });
  setInterval(() => {
    syncMonitor();
    syncEcho(tempo());
  }, 1000);

  // Level meter, while the mic is on
  const levels = new Float32Array(1024);
  setInterval(() => {
    if (!chain) return;
    chain.analyser.getFloatTimeDomainData(levels);
    let peak = 0;
    for (const value of levels) peak = Math.max(peak, Math.abs(value));
    meter.style.width = `${Math.min(100, peak * 100)}%`;
    meter.classList.toggle('is-hot', peak > 0.9);
  }, 80);

  // The preset in use shows filled; once a slider moves away from it, only
  // outlined (you started from it, but it is yours now)
  const markModified = () => {
    const preset = MIC_PRESETS.find((p) => p.id === presetId);
    const changed = Boolean(preset) && MIC_CONTROLS.some((c) => Math.abs(settings[c.id] - preset!.settings[c.id]) > 0.005);
    presetsBox.querySelector('[aria-pressed="true"]')?.toggleAttribute('data-modified', changed);
  };

  const render = () => {
    const presetButton = (preset: (typeof MIC_PRESETS)[number]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'cheat-action';
        button.textContent = pick(preset.name);
        button.setAttribute('aria-pressed', String(preset.id === presetId));
        button.addEventListener('click', () => {
          presetId = preset.id;
          settings = { ...preset.settings };
          applySettings(settings);
          save();
          render();
        });
        return button;
    };
    presetsBox.replaceChildren(
      ...MIC_GROUPS.map((group) => {
        const box = document.createElement('div');
        box.className = 'mic-group';
        const title = document.createElement('span');
        title.className = 'mic-group-name';
        title.textContent = pick(group.name);
        const buttons = document.createElement('div');
        buttons.className = 'cheat-actions';
        buttons.append(...MIC_PRESETS.filter((preset) => preset.group === group.id).map(presetButton));
        box.append(title, buttons);
        return box;
      }),
    );
    slidersBox.replaceChildren(
      ...MIC_CONTROLS.map((control) => {
        const label = document.createElement('label');
        label.className = 'vj-slider';
        const name = document.createElement('span');
        name.textContent = pick(control.name);
        if (control.hint) label.title = pick(control.hint);
        const input = document.createElement('input');
        input.type = 'range';
        input.min = '0';
        input.max = '1';
        input.step = '0.01';
        input.value = String(settings[control.id]);
        input.addEventListener('input', () => {
          settings = { ...settings, [control.id]: Number(input.value) };
          applySettings(settings);
          save();
          markModified();
        });
        label.append(name, input);
        return label;
      }),
    );
    markModified();
  };

  document.querySelector('#toggle-mic')!.addEventListener('click', () => void listDevices().catch(() => undefined));
  render();
  onLangChange(() => {
    render();
    if (!chain) onButton.textContent = t('micOn');
  });
}
