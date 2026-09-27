// Microphone with effects: your voice (or a guitar, or anything on an input
// such as the SP-404MKII's) through volume, pitch, distortion, lo-fi, a
// filter, robot, tremolo, chorus, echo and reverb, into the recordings. While
// the studio plays, the echo follows its tempo (a dotted eighth). "Hear me" also sends it to the studio output,
// into the limiter; off by default, since with speakers instead of headphones
// it feeds back. The browser's own voice-call processing (echo cancelling,
// noise suppression, auto gain) is off: it ruins a voice for music.
import { ensureAudio } from './audio';
import { onLangChange, pick, t, type Localized } from './i18n';
import { ensureLimiter, getLimiter } from './limiter';
import { readStorage, writeStorage } from './storage';

export type MicControl = 'volume' | 'pitch' | 'drive' | 'lofi' | 'filter' | 'robot' | 'tremolo' | 'chorus' | 'echo' | 'reverb';

export const MIC_CONTROLS: { id: MicControl; name: Localized }[] = [
  { id: 'volume', name: { en: 'Volume', es: 'Volumen' } },
  { id: 'pitch', name: { en: 'Pitch (low ↔ high)', es: 'Tono (grave ↔ agudo)' } },
  { id: 'drive', name: { en: 'Distortion', es: 'Distorsión' } },
  { id: 'lofi', name: { en: 'Lo-fi (bits)', es: 'Lo-fi (bits)' } },
  { id: 'filter', name: { en: 'Filter (radio)', es: 'Filtro (radio)' } },
  { id: 'robot', name: { en: 'Robot', es: 'Robot' } },
  { id: 'tremolo', name: { en: 'Tremolo', es: 'Trémolo' } },
  { id: 'chorus', name: { en: 'Chorus', es: 'Coro' } },
  { id: 'echo', name: { en: 'Echo', es: 'Eco' } },
  { id: 'reverb', name: { en: 'Reverb', es: 'Reverb' } },
];

type Settings = Record<MicControl, number>;

// Every control at rest; pitch rests in the middle
export const MIC_NEUTRAL: Settings = { volume: 0.7, pitch: 0.5, drive: 0, lofi: 0, filter: 0, robot: 0, tremolo: 0, chorus: 0, echo: 0, reverb: 0 };
const preset = (changes: Partial<Settings>): Settings => ({ ...MIC_NEUTRAL, ...changes });

export const MIC_PRESETS: { id: string; name: Localized; settings: Settings }[] = [
  { id: 'clean', name: { en: 'Clean', es: 'Limpia' }, settings: preset({ reverb: 0.1 }) },
  { id: 'echo', name: { en: 'Echo', es: 'Eco' }, settings: preset({ echo: 0.55, reverb: 0.2 }) },
  { id: 'cathedral', name: { en: 'Cathedral', es: 'Catedral' }, settings: preset({ volume: 0.65, echo: 0.1, reverb: 0.85 }) },
  { id: 'dub', name: { en: 'Dub', es: 'Dub' }, settings: preset({ filter: 0.3, echo: 0.85, reverb: 0.4 }) },
  { id: 'radio', name: { en: 'Radio', es: 'Radio' }, settings: preset({ volume: 0.8, drive: 0.25, filter: 0.85 }) },
  { id: 'megaphone', name: { en: 'Megaphone', es: 'Megáfono' }, settings: preset({ volume: 0.75, drive: 0.7, filter: 0.6, echo: 0.1, reverb: 0.1 }) },
  { id: 'lofi', name: { en: 'Lo-fi', es: 'Lo-fi' }, settings: preset({ lofi: 0.65, filter: 0.45, echo: 0.2, reverb: 0.15 }) },
  { id: 'robot', name: { en: 'Robot', es: 'Robot' }, settings: preset({ volume: 0.8, drive: 0.2, filter: 0.2, robot: 1, echo: 0.2, reverb: 0.1 }) },
  { id: 'chipmunk', name: { en: 'Chipmunk', es: 'Ardilla' }, settings: preset({ pitch: 0.5 + 8 / 24, reverb: 0.1 }) },
  { id: 'monster', name: { en: 'Monster', es: 'Monstruo' }, settings: preset({ pitch: 0.5 - 7 / 24, drive: 0.2, reverb: 0.35 }) },
  { id: 'choir', name: { en: 'Choir', es: 'Coro' }, settings: preset({ chorus: 0.85, echo: 0.15, reverb: 0.45 }) },
  { id: 'tremolo', name: { en: 'Tremolo', es: 'Trémolo' }, settings: preset({ tremolo: 0.75, echo: 0.2, reverb: 0.3 }) },
];

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
  const oscillators = [robotLfo, tremoloLfo];
  for (const [base, depth, rate] of [[0.022, 0.005, 0.8], [0.031, 0.007, 1.13]]) {
    const delay = new DelayNode(context, { delayTime: base, maxDelayTime: 0.1 });
    const lfo = new OscillatorNode(context, { frequency: rate });
    lfo.connect(new GainNode(context, { gain: depth })).connect(delay.delayTime);
    chorusSend.connect(delay).connect(sum);
    oscillators.push(lfo);
  }
  const analyser = new AnalyserNode(context, { fftSize: 1024 });

  source.connect(input);
  const pitch = pitchShifter(context, input, lowCut);
  oscillators.push(...pitch.oscillators);
  lowCut.connect(drive).connect(crush).connect(highCut).connect(robot).connect(tremolo);
  tremolo.connect(sum);
  tremolo.connect(echoSend).connect(echoDelay).connect(sum);
  echoDelay.connect(echoFeedback).connect(echoDelay);
  tremolo.connect(reverbSend).connect(reverb).connect(sum);
  tremolo.connect(chorusSend);
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

// While the studio plays, the echo lands on a dotted eighth of its tempo
let echoSeconds = echoTime();
function syncEcho(cps?: number) {
  const seconds = echoTime(cps);
  if (!chain || Math.abs(seconds - echoSeconds) < 0.001) return;
  echoSeconds = seconds;
  chain.echoDelay.delayTime.setTargetAtTime(seconds, chain.context.currentTime, 0.1);
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

  const render = () => {
    presetsBox.replaceChildren(
      ...MIC_PRESETS.map((preset) => {
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
      }),
    );
    slidersBox.replaceChildren(
      ...MIC_CONTROLS.map((control) => {
        const label = document.createElement('label');
        label.className = 'vj-slider';
        const name = document.createElement('span');
        name.textContent = pick(control.name);
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
        });
        label.append(name, input);
        return label;
      }),
    );
  };

  document.querySelector('#toggle-mic')!.addEventListener('click', () => void listDevices().catch(() => undefined));
  render();
  onLangChange(() => {
    render();
    if (!chain) onButton.textContent = t('micOn');
  });
}
