// Free play: the controller's keys and pads sound straight away, without
// pressing Play. Also while a pattern plays, as long as that pattern does not
// read the keys itself (midikeys), so you can jam over the lofi.
import { ensureAudio } from './audio';
import { onLangChange, pick, t, type Localized } from './i18n';
import { ensureLimiter } from './limiter';
import { freePlayKnobs } from './knobs';
import { NOTE_EVENT, currentBend, type NoteDetail } from './midi';
import { playedNotes } from './scale';
import { loadedKits } from './samples';
import { readStorage, writeStorage } from './storage';

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
  { id: 'supersaw', name: { en: 'Supersaw synth', es: 'Sinte supersaw' } },
];

// Bank B pads of the MPK Mini (notes 32-39): this drum kit, same as the MPK
// pattern, or one of your kits, eight sounds at a time (like MPC pad banks)
const kit = ['bd', 'sd', 'hh', 'oh', 'cp', 'rim', 'lt', 'ht'];
const PADS_KEY = 'jdl:pads-kit';
type PadsKit = { name: string; page: number }; // name '' = the drum kit

// Which sound a pad plays: the drum kit, or sound page*8 + pad of your kit
export function padSound(pad: number, pads: PadsKit) {
  return pads.name ? { s: pads.name, n: pads.page * 8 + pad } : { s: kit[pad] };
}

function readSound() {
  try {
    const stored = localStorage.getItem(SOUND_KEY);
    return freePlaySounds.some((sound) => sound.id === stored) ? stored! : 'piano';
  } catch {
    return 'piano';
  }
}

export function setupFreePlay(patternReadsKeys: () => boolean) {
  const padsSelect = document.querySelector<HTMLSelectElement>('#pads-kit')!;
  const pageSelect = document.querySelector<HTMLSelectElement>('#pads-page')!;
  let pads = readStorage<PadsKit>(PADS_KEY, { name: '', page: 0 });

  // Your kits change as you load or remove them: listed when the select opens
  const fillPads = () => {
    const kits = loadedKits().filter((k) => k.count > 1);
    padsSelect.replaceChildren(new Option(t('padsDrums'), ''), ...kits.map((k) => new Option(`${k.name} (${k.count})`, k.name)));
    if (pads.name && !kits.some((k) => k.name === pads.name)) padsSelect.append(new Option(pads.name, pads.name));
    padsSelect.value = pads.name;
    const count = kits.find((k) => k.name === pads.name)?.count ?? 0;
    const pages = Math.ceil(count / 8);
    pageSelect.hidden = pages < 2;
    pageSelect.replaceChildren(
      ...Array.from({ length: pages }, (_, i) => new Option(t('padsPage', { from: i * 8, to: Math.min(count, i * 8 + 8) - 1 }), String(i))),
    );
    pageSelect.value = String(Math.min(pads.page, Math.max(pages - 1, 0)));
  };
  const savePads = () => writeStorage(PADS_KEY, pads);
  padsSelect.addEventListener('focus', fillPads);
  padsSelect.addEventListener('pointerdown', fillPads);
  padsSelect.addEventListener('change', () => {
    pads = { name: padsSelect.value, page: 0 };
    savePads();
    fillPads();
  });
  pageSelect.addEventListener('change', () => {
    pads = { ...pads, page: Number(pageSelect.value) };
    savePads();
  });
  fillPads();
  onLangChange(fillPads);

  const select = document.querySelector<HTMLSelectElement>('#freeplay-sound')!;
  for (const sound of freePlaySounds) select.append(new Option(pick(sound.name), sound.id));
  select.value = readSound();
  onLangChange(() => {
    [...select.options].forEach((option, index) => (option.text = pick(freePlaySounds[index].name)));
  });

  const play = async (value: Record<string, unknown>) => {
    const g = globalThis as Global;
    const context = g.getAudioContext?.();
    if (!g.superdough || !context) return;
    // Browsers keep audio off until the page gets a click; a MIDI note does not
    // count, and Strudel's effects only load on that click, so load them here
    await ensureAudio();
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
      play({ ...padSound(note - 32, pads), gain: velocity * 0.8 });
    } else {
      // never below 35%: the arpeggiator repeats soft velocities
      // Knobs 1-3: echo, filter (squared, so the low end of the knob has room) and reverb;
      // the joystick bends each new note up to two semitones
      const { echo, filter, reverb } = freePlayKnobs;
      // in a key, the nearest note of the scale, or a chord of it (scale.ts)
      for (const played of playedNotes(note)) {
        play({
          s: select.value,
          note: played + currentBend() * 2,
          velocity: 0.35 + velocity * 0.65,
          gain: 0.7,
          cutoff: 300 + filter * filter * 7700,
          room: reverb * 0.8,
          delay: echo * 0.6,
        });
      }
    }
  });
}
