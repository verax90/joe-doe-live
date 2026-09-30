// The voice, live: while the mic is on, its pitch is read 40 times a second
// (YIN, the same as humming a riff, hum.ts) on the voice before any effect.
// The Tuner tab shows the note you sing and how far off it is; "Your voice
// plays a synth" makes an oscillator follow it, free, to the nearest semitone
// or to the key (Play in a key), an octave or two away if you like, and only
// while you sing. Patterns and visuals get it too: voiceNote() is the MIDI
// note (0 when silent), voiceHeld() the last note sung (it stays when you
// stop), voiceLevel() the loudness, 0 to 1 (quick up, slow down), and
// voiceColor(0|1|2) the red, green and blue of the note (the twelve notes
// around the colour wheel, gliding from one to the next):
//   $: s("sawtooth*8").note(ref(() => voiceNote() || 48))
import { downsample, framePitch, midiOf } from './hum';
import { t } from './i18n';
import { getLimiter } from './limiter';
import { micInput } from './mic';
import { SCALES, scaleSetting, snap } from './scale';
import { readStorage, writeStorage } from './storage';

export type Tuning = 'free' | 'semitone' | 'key';
export type VoiceSettings = { on: boolean; wave: OscillatorType; octave: number; tuning: Tuning; volume: number };
const DEFAULTS: VoiceSettings = { on: false, wave: 'sawtooth', octave: 0, tuning: 'semitone', volume: 0.5 };

const NAMES = { en: ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'], es: ['Do', 'Do#', 'Re', 'Mib', 'Mi', 'Fa', 'Fa#', 'Sol', 'Lab', 'La', 'Sib', 'Si'] };

// A sung pitch as a note name and how many cents it is off: 57.3 → La2 +30
export function describe(midi: number, lang: 'en' | 'es') {
  const nearest = Math.round(midi);
  return { name: `${NAMES[lang][((nearest % 12) + 12) % 12]}${Math.floor(nearest / 12) - 1}`, cents: Math.round((midi - nearest) * 100) };
}

// The note the synth plays for a sung pitch
export function synthNote(midi: number, tuning: Tuning, octave: number, key = scaleSetting()) {
  let note = midi;
  if (tuning !== 'free') note = Math.round(midi);
  const steps = SCALES[key.scale];
  if (tuning === 'key' && steps) note = snap(note, key.root, steps);
  return note + 12 * octave;
}

// A note's colour: C red, then round the colour wheel a semitone at a time
// (E green, G azure, A violet), full and bright, as red, green, blue 0-1
export function noteColour(midi: number): [number, number, number] {
  const hue = ((((Math.round(midi) % 12) + 12) % 12) / 12) * 6;
  const x = 1 - Math.abs((hue % 2) - 1);
  const sector = Math.floor(hue);
  const table: [number, number, number][] = [
    [1, x, 0],
    [x, 1, 0],
    [0, 1, x],
    [0, x, 1],
    [x, 0, 1],
    [1, 0, x],
  ];
  return table[sector];
}

// Whether a reading is the synth itself coming back through the mic (from
// the speakers): with the synth an octave or more away it can be told apart
export function isEcho(midi: number, playing: number, octave: number) {
  return octave !== 0 && playing > 0 && Math.abs(midi - playing) < 0.5;
}

// The middle of the last few readings: one octave slip does not jump
export function steady(history: number[]) {
  const voiced = history.filter((p) => p > 0);
  if (voiced.length < Math.ceil(history.length / 2)) return 0;
  const sorted = [...voiced].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

const reading = { note: 0, held: 0, level: 0, colour: [0.5, 0.5, 0.5] as number[] };
const g = globalThis as {
  voiceNote?: () => number;
  voiceHeld?: () => number;
  voiceLevel?: () => number;
  voiceColor?: (channel: number) => number;
};
g.voiceNote = () => reading.note;
g.voiceHeld = () => reading.held;
g.voiceLevel = () => reading.level;
g.voiceColor = (channel) => reading.colour[channel] ?? 0;

let settings: VoiceSettings = { ...DEFAULTS, ...readStorage<Partial<VoiceSettings>>('jdl:voice', {}) };
const save = (next: Partial<VoiceSettings>) => {
  settings = { ...settings, ...next };
  writeStorage('jdl:voice', settings);
};

type Synth = { osc: OscillatorNode; gain: GainNode; master: AudioNode };

export function setupVoice(lang: () => 'en' | 'es') {
  const noteView = document.querySelector<HTMLElement>('#voice-note')!;
  const centsBar = document.querySelector<HTMLElement>('#voice-cents span')!;
  const status = document.querySelector<HTMLElement>('#voice-status')!;
  const onBox = document.querySelector<HTMLInputElement>('#voice-on')!;
  const wave = document.querySelector<HTMLSelectElement>('#voice-wave')!;
  const octave = document.querySelector<HTMLSelectElement>('#voice-octave')!;
  const tuning = document.querySelector<HTMLSelectElement>('#voice-tuning')!;
  const volume = document.querySelector<HTMLInputElement>('#voice-volume')!;
  onBox.checked = settings.on;
  wave.value = settings.wave;
  octave.value = String(settings.octave);
  tuning.value = settings.tuning;
  volume.value = String(settings.volume);

  let source: AudioNode | undefined;
  let analyser: AnalyserNode | undefined;
  let synth: Synth | undefined;
  let playing = 0; // the note the synth is on
  let buffer = new Float32Array(2048);
  const history: number[] = [];

  const stopSynth = () => {
    if (!synth) return;
    const { osc, gain } = synth;
    gain.gain.setTargetAtTime(0, osc.context.currentTime, 0.02);
    osc.stop(osc.context.currentTime + 0.2);
    synth = undefined;
  };

  onBox.addEventListener('change', () => {
    save({ on: onBox.checked });
    if (!onBox.checked) stopSynth();
  });
  wave.addEventListener('change', () => {
    save({ wave: wave.value as OscillatorType });
    if (synth) synth.osc.type = settings.wave;
  });
  octave.addEventListener('change', () => save({ octave: Number(octave.value) }));
  tuning.addEventListener('change', () => save({ tuning: tuning.value as Tuning }));
  volume.addEventListener('input', () => save({ volume: Number(volume.value) }));

  const tick = () => {
    const mic = micInput();
    // follow the mic as it is turned on, off or switched
    if (mic !== source) {
      try {
        if (source && analyser) source.disconnect(analyser);
      } catch {
        // that mic's chain is gone already
      }
      source = mic;
      analyser = undefined;
      if (mic) {
        analyser = new AnalyserNode(mic.context, { fftSize: 2048 });
        buffer = new Float32Array(analyser.fftSize);
        mic.connect(analyser);
      }
    }
    if (!analyser || !mic) {
      reading.note = 0;
      reading.level = 0;
      stopSynth();
      status.textContent = t('voiceNeedsMic');
      noteView.textContent = '–';
      return;
    }
    const context = mic.context as AudioContext;
    analyser.getFloatTimeDomainData(buffer);
    let energy = 0;
    for (const v of buffer) energy += v * v;
    const rms = Math.sqrt(energy / buffer.length);
    const { samples, sampleRate } = downsample(buffer, context.sampleRate);
    const hz = rms > 0.01 ? framePitch(samples.subarray(samples.length - 512), sampleRate) : 0;
    const midi = hz ? midiOf(hz) : 0;
    history.push(midi && !(synth && isEcho(midi, playing, settings.octave)) ? midi : 0);
    if (history.length > 5) history.shift();
    reading.note = steady(history);
    if (reading.note) reading.held = reading.note;
    // quick up, slow down, so visuals breathe instead of flicker
    const level = Math.min(1, rms * 5);
    reading.level = level > reading.level ? level : reading.level * 0.9 + level * 0.1;
    // the colour glides towards the note's
    if (reading.held) {
      const target = noteColour(reading.held);
      reading.colour = reading.colour.map((value, i) => value + (target[i] - value) * 0.2);
    }
    status.textContent = '';
    noteView.dataset.silent = String(!reading.note); // the last note stays, dimmed

    if (reading.note) {
      const { name, cents } = describe(reading.note, lang());
      noteView.textContent = name;
      centsBar.style.left = `calc(${50 + cents}% - 3px)`; // -50 cents at the left end, +50 at the right
      centsBar.dataset.inTune = String(Math.abs(cents) <= 10);
    }

    // the synth: on while it is ticked and the studio's output exists
    const master = getLimiter()?.master;
    // Strudel rebuilds its output now and then: follow it
    if (synth && synth.master !== master) stopSynth();
    if (settings.on && master && !synth) {
      const osc = new OscillatorNode(context, { type: settings.wave });
      const filter = new BiquadFilterNode(context, { type: 'lowpass', frequency: 2400, Q: 0.7 });
      const gain = new GainNode(context, { gain: 0 });
      osc.connect(filter).connect(gain).connect(master);
      osc.start();
      synth = { osc, gain, master };
    }
    if (synth) {
      const now = context.currentTime;
      if (reading.note) {
        playing = synthNote(reading.note, settings.tuning, settings.octave);
        const hzOut = 440 * 2 ** ((playing - 69) / 12);
        synth.osc.frequency.setTargetAtTime(hzOut, now, settings.tuning === 'free' ? 0.01 : 0.004);
      }
      synth.gain.gain.setTargetAtTime(reading.note ? settings.volume * (0.4 + 0.6 * reading.level) : 0, now, 0.03);
    }
  };
  // a timer, not animation frames: it keeps going in a hidden tab
  window.setInterval(tick, 25);
}
