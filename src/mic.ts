// Microphone with effects: your voice (or a guitar, or anything on an input
// such as the SP-404MKII's) through volume, distortion, a filter, echo and
// reverb, into the recordings. "Hear me" also sends it to the studio output,
// into the limiter; off by default, since with speakers instead of headphones
// it feeds back. The browser's own voice-call processing (echo cancelling,
// noise suppression, auto gain) is off: it ruins a voice for music.
import { ensureAudio } from './audio';
import { onLangChange, pick, t, type Localized } from './i18n';
import { ensureLimiter, getLimiter } from './limiter';
import { readStorage, writeStorage } from './storage';

export type MicControl = 'volume' | 'drive' | 'filter' | 'echo' | 'reverb';

export const MIC_CONTROLS: { id: MicControl; name: Localized }[] = [
  { id: 'volume', name: { en: 'Volume', es: 'Volumen' } },
  { id: 'drive', name: { en: 'Distortion', es: 'Distorsión' } },
  { id: 'filter', name: { en: 'Filter (radio)', es: 'Filtro (radio)' } },
  { id: 'echo', name: { en: 'Echo', es: 'Eco' } },
  { id: 'reverb', name: { en: 'Reverb', es: 'Reverb' } },
];

type Settings = Record<MicControl, number>;

export const MIC_PRESETS: { id: string; name: Localized; settings: Settings; robot?: boolean }[] = [
  { id: 'clean', name: { en: 'Clean', es: 'Limpia' }, settings: { volume: 0.7, drive: 0, filter: 0, echo: 0, reverb: 0.1 } },
  { id: 'echo', name: { en: 'Echo', es: 'Eco' }, settings: { volume: 0.7, drive: 0, filter: 0, echo: 0.55, reverb: 0.2 } },
  { id: 'cathedral', name: { en: 'Cathedral', es: 'Catedral' }, settings: { volume: 0.65, drive: 0, filter: 0, echo: 0.1, reverb: 0.85 } },
  { id: 'radio', name: { en: 'Radio', es: 'Radio' }, settings: { volume: 0.8, drive: 0.25, filter: 0.85, echo: 0, reverb: 0 } },
  { id: 'megaphone', name: { en: 'Megaphone', es: 'Megáfono' }, settings: { volume: 0.75, drive: 0.7, filter: 0.6, echo: 0.1, reverb: 0.1 } },
  { id: 'robot', name: { en: 'Robot', es: 'Robot' }, settings: { volume: 0.8, drive: 0.2, filter: 0.2, echo: 0.2, reverb: 0.1 }, robot: true },
];

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
  robotLfo: OscillatorNode;
  out: GainNode;
  analyser: AnalyserNode;
};

let chain: Chain | undefined;
let monitoring = false;
let monitoredInto: AudioNode | undefined;
let robotOn = false;

// For record.ts: the voice when it is not already going through the studio
// output (which recordings tap); undefined when off or when heard
export const micForRecording = () => (chain && !monitoring ? chain.out : undefined);

function build(context: AudioContext, stream: MediaStream): Chain {
  const source = context.createMediaStreamSource(stream);
  const input = context.createGain();
  const lowCut = new BiquadFilterNode(context, { type: 'highpass', frequency: 60 });
  const drive = new WaveShaperNode(context, { curve: driveCurve(0), oversample: '2x' });
  const highCut = new BiquadFilterNode(context, { type: 'lowpass', frequency: 18000 });
  // Robot: the voice multiplied by a 50 Hz tone (ring modulation)
  const robot = context.createGain();
  const robotLfo = new OscillatorNode(context, { frequency: 50 });
  robot.gain.value = 1;
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
  const echoDelay = new DelayNode(context, { delayTime: 0.32, maxDelayTime: 1 });
  const echoFeedback = new GainNode(context, { gain: 0.45 });
  const reverbSend = context.createGain();
  const reverb = new ConvolverNode(context, { buffer: impulse(context) });
  const analyser = new AnalyserNode(context, { fftSize: 1024 });

  source.connect(input).connect(lowCut).connect(drive).connect(highCut).connect(robot);
  robot.connect(sum);
  robot.connect(echoSend).connect(echoDelay).connect(sum);
  echoDelay.connect(echoFeedback).connect(echoDelay);
  robot.connect(reverbSend).connect(reverb).connect(sum);
  out.connect(analyser);
  robotLfo.start();
  return { context, stream, input, drive, lowCut, highCut, echoSend, echoDelay, reverbSend, robot, robotLfo, out, analyser };
}

function applySettings(settings: Settings) {
  if (!chain) return;
  const now = chain.context.currentTime;
  chain.input.gain.setTargetAtTime(settings.volume * 1.6, now, 0.02);
  chain.drive.curve = driveCurve(settings.drive);
  const { lowCut, highCut } = filterSettings(settings.filter);
  chain.lowCut.frequency.setTargetAtTime(lowCut, now, 0.02);
  chain.highCut.frequency.setTargetAtTime(highCut, now, 0.02);
  chain.echoSend.gain.setTargetAtTime(settings.echo * 0.8, now, 0.02);
  chain.reverbSend.gain.setTargetAtTime(settings.reverb * 0.9, now, 0.02);
}

function setRobot(on: boolean) {
  if (!chain || on === robotOn) return;
  robotOn = on;
  // The tone drives the gain: voice × tone. Off, the gain is a plain 1
  if (on) {
    chain.robot.gain.value = 0;
    chain.robotLfo.connect(chain.robot.gain);
  } else {
    chain.robotLfo.disconnect();
    chain.robot.gain.value = 1;
  }
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

export function setupMic() {
  const deviceSelect = document.querySelector<HTMLSelectElement>('#mic-device')!;
  const onButton = document.querySelector<HTMLButtonElement>('#mic-on')!;
  const monitorBox = document.querySelector<HTMLInputElement>('#mic-monitor')!;
  const presetsBox = document.querySelector<HTMLElement>('#mic-presets')!;
  const slidersBox = document.querySelector<HTMLElement>('#mic-sliders')!;
  const meter = document.querySelector<HTMLElement>('#mic-meter span')!;
  const status = document.querySelector<HTMLElement>('#mic-status')!;

  let settings: Settings = readStorage<Settings>('jdl:mic', MIC_PRESETS[0].settings);
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
    chain.robotLfo.stop();
    chain = undefined;
    monitoredInto = undefined;
    robotOn = false;
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
    applySettings(settings);
    setRobot(Boolean(MIC_PRESETS.find((p) => p.id === presetId)?.robot));
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
  setInterval(syncMonitor, 1000);

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
          setRobot(Boolean(preset.robot));
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
