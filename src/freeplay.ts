// Free play: the controller's keys and pads sound straight away, without
// pressing Play. Also while a pattern plays, as long as that pattern does not
// read the keys itself (midikeys), so you can jam over the lofi.
import { onLangChange, pick, type Localized } from './i18n';
import { ensureLimiter } from './limiter';
import { freePlayKnobs } from './knobs';
import { NOTE_EVENT, type NoteDetail } from './midi';

type Global = typeof globalThis & {
  superdough?: (value: Record<string, unknown>, time: number, duration: number) => Promise<void>;
  getAudioContext?: () => AudioContext;
};

const SOUND_KEY = 'jdl:freeplay-sound';

// A short, playable selection out of Strudel's ~1600 sounds
export const freePlaySounds: { id: string; name: Localized }[] = [
  { id: 'piano', name: { en: 'Piano', es: 'Piano' } },
  { id: 'gm_epiano1', name: { en: 'Electric piano', es: 'Piano eléctrico' } },
  { id: 'gm_drawbar_organ', name: { en: 'Drawbar organ', es: 'Órgano Hammond' } },
  { id: 'gm_church_organ', name: { en: 'Church organ', es: 'Órgano de iglesia' } },
  { id: 'gm_string_ensemble_1', name: { en: 'Strings', es: 'Cuerdas' } },
  { id: 'gm_pad_warm', name: { en: 'Warm pad', es: 'Pad cálido' } },
  { id: 'gm_vibraphone', name: { en: 'Vibraphone', es: 'Vibráfono' } },
  { id: 'gm_marimba', name: { en: 'Marimba', es: 'Marimba' } },
  { id: 'gm_acoustic_bass', name: { en: 'Double bass', es: 'Contrabajo' } },
  { id: 'gm_lead_2_sawtooth', name: { en: 'Saw lead', es: 'Lead de sierra' } },
  { id: 'sawtooth', name: { en: 'Saw synth', es: 'Sinte de sierra' } },
];

// Bank B pads of the MPK Mini (notes 32-39), same kit as the MPK pattern
const kit = ['bd', 'sd', 'hh', 'oh', 'cp', 'rim', 'lt', 'ht'];

function readSound() {
  try {
    const stored = localStorage.getItem(SOUND_KEY);
    return freePlaySounds.some((sound) => sound.id === stored) ? stored! : 'piano';
  } catch {
    return 'piano';
  }
}

export function setupFreePlay(patternReadsKeys: () => boolean) {
  const select = document.querySelector<HTMLSelectElement>('#freeplay-sound')!;
  for (const sound of freePlaySounds) select.append(new Option(pick(sound.name), sound.id));
  select.value = readSound();
  onLangChange(() => {
    [...select.options].forEach((option, index) => (option.text = pick(freePlaySounds[index].name)));
  });

  const play = (value: Record<string, unknown>) => {
    const g = globalThis as Global;
    const context = g.getAudioContext?.();
    if (!g.superdough || !context) return;
    // Browsers keep audio off until the page gets a click; a MIDI note does not count
    if (context.state !== 'running') context.resume();
    ensureLimiter();
    g.superdough(value, context.currentTime + 0.01, 0.8).catch(() => {});
  };

  // Load the chosen sound ahead of time, silently, so the first key is not late
  const preload = () => play({ s: select.value, note: 60, gain: 0 });

  select.addEventListener('change', () => {
    try {
      localStorage.setItem(SOUND_KEY, select.value);
    } catch {
      // not remembered, still works
    }
    preload();
  });

  window.addEventListener(NOTE_EVENT, (event) => {
    if (patternReadsKeys()) return;
    const { note, velocity } = (event as CustomEvent<NoteDetail>).detail;
    if (note >= 32 && note < 40) {
      play({ s: kit[note - 32], gain: velocity * 0.8 });
    } else {
      // never below 35%: the arpeggiator repeats soft velocities
      // Knobs 1-3: echo, filter (squared, so the low end of the knob has room) and reverb
      const { echo, filter, reverb } = freePlayKnobs;
      play({
        s: select.value,
        note,
        velocity: 0.35 + velocity * 0.65,
        gain: 0.7,
        cutoff: 300 + filter * filter * 7700,
        room: reverb * 0.8,
        delay: echo * 0.6,
      });
    }
  });
}
