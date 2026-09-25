// Compose: build a song layer by layer without writing code. Each layer is a
// named track in the code (drums: …, bass: …) so you can read what it does;
// all of them share the style's tempo, the key and the chord progression, so
// whatever you add fits. "Another" swaps a layer for a variant, "Mute" puts _
// in front of its name, "Remove" deletes it.
import { onLangChange, pick, t, type Localized } from './i18n';
import { withTempo } from './tempo';
import { applyChanges, bareTracks, findLabel, trackInsertPoint, type Change } from './tracks';

// Music theory, just enough: natural minor keys and their seventh chords
const NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const QUALITY = ['m7', 'm7b5', '^7', 'm7', 'm7', '^7', '7'];
// Degrees from 0 (i) to 6 (VII), four bars each
export const PROGRESSIONS = [
  [0, 5, 2, 6], // i VI III VII
  [0, 3, 6, 2], // i iv VII III
  [0, 6, 5, 6], // i VII VI VII
  [0, 3, 4, 0], // i iv v i
  [0, 5, 3, 4], // i VI iv v
];
export const KEYS = ['A', 'C', 'D', 'E', 'F', 'G'];

export type Song = { style: string; key: string; progression: number };

export function chords(song: Song) {
  const root = NAMES.indexOf(song.key);
  return PROGRESSIONS[song.progression].map((degree) => NAMES[(root + MINOR[degree]) % 12] + QUALITY[degree]);
}

// Bass roots between E1 and Eb2, where a bass sits
export function bassNotes(song: Song) {
  const root = NAMES.indexOf(song.key);
  return PROGRESSIONS[song.progression].map((degree) => {
    const pc = (root + MINOR[degree]) % 12;
    return `${NAMES[pc].toLowerCase()}${pc >= 4 ? 1 : 2}`;
  });
}

type Style = {
  id: string;
  name: Localized;
  bpm: number;
  drums: string[];
  hats: string[];
  bass: { sound: string; rhythms: string[] };
  chords: { sound: string; rhythms: string[] };
  melody: string[];
  pad: string;
};

const boom = (pattern: string, bank: string, extra = '') => `s("${pattern}").bank("${bank}")${extra}`;

export const STYLES: Style[] = [
  {
    id: 'boombap',
    name: { en: 'Boom bap', es: 'Boom bap' },
    bpm: 90,
    drums: [
      boom('bd ~ ~ ~ ~ ~ ~ bd ~ ~ bd ~ ~ ~ ~ ~, ~ sd', 'AkaiMPC60'),
      boom('bd ~ ~ bd ~ ~ ~ ~ ~ ~ bd ~ ~ bd ~ ~, ~ sd', 'AkaiMPC60'),
      boom('bd ~ ~ ~ ~ ~ bd ~ ~ bd bd ~ ~ ~ ~ ~, ~ sd ~ [sd ~ ~ sd?]', 'EmuSP12'),
    ],
    hats: [
      boom('hh*8', 'AkaiMPC60', '.gain("0.45 0.3").swing(4)'),
      boom('[~ hh]*4, hh*8?', 'AkaiMPC60', '.gain(0.35)'),
      boom('hh*16?', 'EmuSP12', '.gain(0.3).swing(4)'),
    ],
    bass: { sound: 'gm_acoustic_bass', rhythms: ['x ~ ~ ~ ~ ~ ~ x ~ ~ x ~ ~ ~ ~ ~', 'x ~ ~ ~ x ~ ~ ~ x ~ ~ ~ x ~ ~ ~', 'x'] },
    chords: { sound: 'gm_epiano1', rhythms: ['x', '~ x ~ ~ ~ x ~ ~', 'x ~ ~ x ~ ~ x ~'] },
    melody: ['gm_vibraphone', 'gm_flute', 'piano'],
    pad: 'gm_string_ensemble_1',
  },
  {
    id: 'lofi',
    name: { en: 'Lo-fi', es: 'Lo-fi' },
    bpm: 78,
    drums: [
      boom('bd ~ ~ ~ ~ ~ ~ bd ~ ~ bd ~ ~ ~ ~ ~, ~ sd', 'EmuSP12', '.lpf(2500).swing(4)'),
      boom('bd ~ ~ ~ ~ ~ bd ~ ~ ~ ~ ~ ~ ~ ~ ~, ~ [sd,rim]', 'EmuSP12', '.lpf(2500)'),
      boom('bd ~ ~ bd ~ ~ ~ ~ ~ ~ bd ~ ~ ~ ~ ~, ~ rim ~ sd', 'AkaiMPC60', '.lpf(2500).swing(4)'),
    ],
    hats: [
      boom('hh*8', 'EmuSP12', '.gain("0.3 0.2").lpf(4000).swing(4)'),
      boom('[~ hh]*4', 'EmuSP12', '.gain(0.3).lpf(4000)'),
      's("crackle*4").gain(0.25)',
    ],
    bass: { sound: 'gm_electric_bass_finger', rhythms: ['x', 'x ~ ~ ~ ~ ~ ~ x ~ ~ ~ ~ ~ ~ ~ ~', 'x ~ ~ ~ ~ ~ x ~'] },
    chords: { sound: 'gm_epiano2', rhythms: ['x', '~ x ~ ~ ~ x ~ ~', 'x ~ ~ ~ ~ ~ x ~'] },
    melody: ['gm_kalimba', 'gm_music_box', 'gm_vibraphone'],
    pad: 'gm_pad_warm',
  },
  {
    id: 'trap',
    name: { en: 'Trap', es: 'Trap' },
    bpm: 140,
    drums: [
      boom('bd ~ ~ ~ ~ ~ ~ ~ ~ ~ bd ~ ~ ~ ~ ~, ~ ~ ~ ~ ~ ~ ~ ~ [sd,cp] ~ ~ ~ ~ ~ ~ ~', 'RolandTR808', '.gain(1.1)'),
      boom('bd ~ ~ bd ~ ~ ~ ~ ~ ~ bd ~ ~ ~ bd ~, ~ ~ ~ ~ ~ ~ ~ ~ [sd,cp] ~ ~ ~ ~ ~ ~ ~', 'RolandTR808', '.gain(1.1)'),
      boom('bd ~ ~ ~ ~ ~ bd ~ ~ ~ ~ ~ ~ ~ ~ ~, ~ ~ ~ ~ ~ ~ ~ ~ [sd,cp] ~ ~ ~ ~ ~ ~ <~ sd>', 'RolandTR808', '.gain(1.1)'),
    ],
    hats: [
      boom('hh*8', 'RolandTR808', '.gain(0.45).ply("<1 1 2 [1 3]>")'),
      boom('hh*16', 'RolandTR808', '.gain("0.45 0.25")'),
      boom('hh*12', 'RolandTR808', '.gain("0.45 0.3 0.3").ply("<1 [1 1 2 1]>")'),
    ],
    bass: { sound: 'sine', rhythms: ['x ~ ~ ~ ~ ~ ~ ~ ~ ~ x ~ ~ ~ ~ ~', 'x ~ ~ x ~ ~ ~ ~ ~ ~ x ~ ~ ~ x ~', 'x'] },
    chords: { sound: 'gm_pad_choir', rhythms: ['x', 'x ~ ~ ~ ~ ~ ~ ~ x ~ ~ ~ ~ ~ ~ ~', 'x'] },
    melody: ['gm_music_box', 'gm_pizzicato_strings', 'gm_flute'],
    pad: 'gm_synth_strings_1',
  },
  {
    id: 'drill',
    name: { en: 'Drill', es: 'Drill' },
    bpm: 142,
    drums: [
      boom('bd ~ ~ ~ ~ ~ ~ bd ~ ~ bd ~ ~ ~ ~ ~, ~ ~ ~ ~ ~ ~ ~ ~ sd ~ ~ ~ ~ ~ ~ <~ sd>', 'RolandTR808', '.gain(1.1)'),
      boom('bd ~ ~ ~ ~ ~ ~ ~ ~ ~ bd ~ ~ bd ~ ~, ~ ~ ~ ~ ~ ~ ~ ~ sd ~ ~ sd? ~ ~ ~ ~', 'RolandTR808', '.gain(1.1)'),
      boom('bd ~ ~ ~ ~ ~ ~ bd ~ ~ ~ ~ bd ~ ~ ~, ~ ~ ~ ~ ~ ~ ~ ~ sd ~ ~ ~ ~ ~ ~ ~', 'RolandTR808', '.gain(1.1)'),
    ],
    hats: [
      boom('hh*12', 'RolandTR808', '.gain("0.5 0.3 0.35").ply("<1 [1 1 2 1] 1 [1 3 1 1]>")'),
      boom('hh*12?', 'RolandTR808', '.gain("0.5 0.3 0.35")'),
      boom('[hh hh hh ~]*4', 'RolandTR808', '.gain(0.4)'),
    ],
    bass: { sound: 'sine', rhythms: ['x ~ ~ ~ ~ ~ ~ x ~ ~ x ~ ~ ~ ~ ~', 'x ~ ~ ~ ~ ~ ~ ~ ~ ~ x ~ ~ x ~ ~', 'x ~ ~ ~ ~ ~ ~ x'] },
    chords: { sound: 'gm_string_ensemble_1', rhythms: ['x', 'x ~ ~ x ~ ~ x ~', 'x'] },
    melody: ['gm_string_ensemble_1', 'piano', 'gm_choir_aahs'],
    pad: 'gm_choir_aahs',
  },
];

export const LAYERS = ['drums', 'hats', 'bass', 'chords', 'melody', 'pad'] as const;
export type Layer = (typeof LAYERS)[number];

export const LAYER_NAMES: Record<Layer, Localized> = {
  drums: { en: 'Kick and snare', es: 'Bombo y caja' },
  hats: { en: 'Hi-hats', es: 'Charles' },
  bass: { en: 'Bass', es: 'Bajo' },
  chords: { en: 'Chords', es: 'Acordes' },
  melody: { en: 'Melody', es: 'Melodía' },
  pad: { en: 'Background', es: 'Ambiente' },
};

// A two-bar tune in scale degrees: mostly chord tones (0 2 4 7), some rests
export function randomMotif(random = Math.random) {
  const tones = [0, 2, 4, 7, 0, 2, 4, 1, 3, 5, 6];
  const bar = () =>
    Array.from({ length: 8 }, (_, i) => (i > 0 && random() < 0.35 ? '~' : String(tones[Math.floor(random() * tones.length)]))).join(' ');
  return `<[${bar()}] [${bar()}]>`;
}

export type LayerState = { variant: number; motif: string };

const quoted = (items: string[]) => `"<${items.join(' ')}>"`;

// The code of one layer, without its name
export function layerCode(layer: Layer, song: Song, state: LayerState) {
  const style = STYLES.find((s) => s.id === song.style) ?? STYLES[0];
  const pick = <T>(list: T[]) => list[state.variant % list.length];
  const scale = (octave: number) => `"${song.key}${octave}:minor"`;
  switch (layer) {
    case 'drums':
      return pick(style.drums);
    case 'hats':
      return pick(style.hats);
    case 'bass': {
      const sound = style.bass.sound;
      const tone = sound === 'sine' ? '.decay(0.8).sustain(0).shape(0.35).lpf(500).gain(0.9)' : '.lpf(1200).gain(0.8)';
      return `note(${quoted(bassNotes(song))}).struct("${pick(style.bass.rhythms)}").s("${sound}")${tone}`;
    }
    case 'chords':
      return `chord(${quoted(chords(song))}).struct("${pick(style.chords.rhythms)}").voicing().s("${style.chords.sound}").gain(0.35).room(0.3)`;
    case 'melody':
      return `n("${state.motif}").scale(${scale(4)}).s("${pick(style.melody)}").gain(0.35).room(0.3)`;
    case 'pad':
      // root and fifth of each chord, held for the bar
      return `n(${quoted(PROGRESSIONS[song.progression].map((d) => `[${d},${d + 4}]`))}).scale(${scale(3)}).s("${style.pad}").gain(0.2).room(0.5)`;
  }
}

// The edits that put a layer into the code: swapped in place if it is there
// (muted stays muted), otherwise added before all(...). Bare patterns become
// $: tracks, or Strudel would drop them once named tracks exist
export function layerChanges(code: string, layer: Layer, line: string): Change[] {
  const found = findLabel(code, layer);
  if (found) return [{ from: found.from, to: found.to, insert: `${found.muted ? '_' : ''}${layer}: ${line}` }];
  const at = trackInsertPoint(code);
  const before = at > 0 && code[at - 1] !== '\n' ? '\n' : '';
  const prefixes = (bareTracks(code) ?? []).map((from) => ({ from, insert: '$: ' }));
  return [...prefixes, { from: at, insert: `${before}${layer}: ${line}\n` }];
}

export function removeChanges(code: string, layer: Layer): Change[] {
  const found = findLabel(code, layer);
  if (!found) return [];
  const to = code[found.to] === '\n' ? found.to + 1 : found.to;
  return [{ from: found.from, to, insert: '' }];
}

export function muteChanges(code: string, layer: Layer): Change[] {
  const found = findLabel(code, layer);
  if (!found) return [];
  return found.muted ? [{ from: found.from, to: found.from + 1, insert: '' }] : [{ from: found.from, insert: '_' }];
}

// A fresh song: tempo, the chosen layers and all(...) so the visuals hear it
export function newSong(song: Song, layers: Partial<Record<Layer, LayerState>>, header: string) {
  const style = STYLES.find((s) => s.id === song.style) ?? STYLES[0];
  const lines = LAYERS.filter((layer) => layers[layer]).map((layer) => `${layer}: ${layerCode(layer, song, layers[layer]!)}`);
  return `${header}\n${withTempo('', style.bpm).trim()}\n\n${lines.join('\n')}\n\nall(x => x.analyze(1))\n`;
}


const KEY_NAMES: Record<string, Localized> = {
  A: { en: 'A minor', es: 'La menor' },
  C: { en: 'C minor', es: 'Do menor' },
  D: { en: 'D minor', es: 'Re menor' },
  E: { en: 'E minor', es: 'Mi menor' },
  F: { en: 'F minor', es: 'Fa menor' },
  G: { en: 'G minor', es: 'Sol menor' },
};

const STORAGE_KEY = 'jdl:compose';

type Editor = {
  code: string;
  setCode(code: string): void;
  evaluate(): Promise<void>;
  repl?: { scheduler?: { started?: boolean } };
};

// Every layer already in the code, written again for the current song
function rewrite(code: string, song: Song, state: (layer: Layer) => LayerState) {
  let next = code;
  for (const layer of LAYERS) {
    if (findLabel(next, layer)) next = applyChanges(next, layerChanges(next, layer, layerCode(layer, song, state(layer))));
  }
  return next;
}

export function setupCompose(editor: Editor) {
  const styleSelect = document.querySelector<HTMLSelectElement>('#compose-style')!;
  const keySelect = document.querySelector<HTMLSelectElement>('#compose-key')!;
  const list = document.querySelector<HTMLElement>('#compose-layers')!;
  const progressionText = document.querySelector<HTMLElement>('#compose-progression')!;
  const status = document.querySelector<HTMLElement>('#compose-status')!;
  const panel = document.querySelector<HTMLElement>('#compose')!;

  let song: Song = { style: STYLES[0].id, key: 'A', progression: 0 };
  try {
    song = { ...song, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') };
  } catch {
    // defaults
  }
  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(song));
    } catch {
      // not remembered
    }
  };

  const states: Partial<Record<Layer, LayerState>> = {};
  const state = (layer: Layer) => (states[layer] ??= { variant: 0, motif: randomMotif() });
  const style = () => STYLES.find((s) => s.id === song.style) ?? STYLES[0];

  // One setCode per action, so a single ↶ undoes it. While it plays (or when
  // a new song starts) it is heard at once
  const update = (next: string, start = false) => {
    status.textContent = '';
    if (next !== editor.code) editor.setCode(next);
    if (start || editor.repl?.scheduler?.started) void editor.evaluate();
    render();
  };
  // Layers are found by parsing the code: while it has a mistake, hands off
  const parses = () => bareTracks(editor.code) !== null;
  const guarded = (action: () => void) => () => (parses() ? action() : (status.textContent = t('composeCantParse')));

  const setLayer = (layer: Layer) =>
    update(applyChanges(editor.code, layerChanges(editor.code, layer, layerCode(layer, song, state(layer)))));

  const songChanged = (tempo: boolean) => {
    save();
    let next = rewrite(editor.code, song, state);
    // Only once the song has layers: a pattern of yours keeps its own tempo
    if (tempo && LAYERS.some((layer) => findLabel(next, layer))) next = withTempo(next, style().bpm);
    update(next);
  };

  const fillSelects = () => {
    styleSelect.replaceChildren(...STYLES.map((s) => new Option(pick(s.name), s.id)));
    keySelect.replaceChildren(...KEYS.map((key) => new Option(pick(KEY_NAMES[key]), key)));
    styleSelect.value = song.style;
    keySelect.value = song.key;
  };

  styleSelect.addEventListener('change', guarded(() => ((song.style = styleSelect.value), songChanged(true))));
  keySelect.addEventListener('change', guarded(() => ((song.key = keySelect.value), songChanged(false))));
  document.querySelector('#compose-chords')!.addEventListener(
    'click',
    guarded(() => ((song.progression = (song.progression + 1) % PROGRESSIONS.length), songChanged(false))),
  );
  document.querySelector('#compose-new')!.addEventListener('click', () =>
    update(newSong(song, { drums: state('drums'), hats: state('hats') }, t('composeHeader')), true),
  );
  document.querySelector('#compose-surprise')!.addEventListener('click', () => {
    const random = (n: number) => Math.floor(Math.random() * n);
    song = { style: song.style, key: KEYS[random(KEYS.length)], progression: random(PROGRESSIONS.length) };
    for (const layer of LAYERS) states[layer] = { variant: random(3), motif: randomMotif() };
    save();
    fillSelects();
    update(newSong(song, states, t('composeHeader')), true);
  });

  const button = (label: string, onClick: () => void) => {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = 'cheat-action';
    element.textContent = label;
    element.addEventListener('click', guarded(onClick));
    return element;
  };

  let rendered = '';
  function render() {
    const code = editor.code;
    rendered = code;
    progressionText.textContent = t('composeProgression', { chords: chords(song).join(' → ').replaceAll('^7', 'maj7') });
    list.replaceChildren(
      ...LAYERS.map((layer) => {
        const found = findLabel(code, layer);
        const item = document.createElement('li');
        item.className = 'compose-layer';
        item.classList.toggle('is-muted', Boolean(found?.muted));
        const name = document.createElement('span');
        name.className = 'compose-name';
        name.textContent = pick(LAYER_NAMES[layer]);
        const label = document.createElement('code');
        label.className = 'compose-label';
        label.textContent = `${found?.muted ? '_' : ''}${layer}:`;
        const actions = document.createElement('div');
        actions.className = 'cheat-actions';
        actions.append(
          button(t(found ? 'composeAnother' : 'composeAdd'), () => {
            if (found) {
              const current = state(layer);
              states[layer] = { variant: current.variant + 1, motif: layer === 'melody' ? randomMotif() : current.motif };
            }
            setLayer(layer);
          }),
        );
        if (found) {
          actions.append(
            button(t(found.muted ? 'composeUnmute' : 'composeMute'), () => update(applyChanges(editor.code, muteChanges(editor.code, layer)))),
            button(t('composeRemove'), () => update(applyChanges(editor.code, removeChanges(editor.code, layer)))),
          );
        }
        item.append(name, label, actions);
        return item;
      }),
    );
  }

  fillSelects();
  render();
  // Follows edits made by hand while the panel is open
  setInterval(() => {
    if (!panel.hidden && editor.code !== rendered) render();
  }, 700);
  onLangChange(() => {
    fillSelects();
    render();
  });
}
