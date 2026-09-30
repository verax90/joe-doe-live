// Playing in a key: free play (the MPK's keys, the computer keyboard, the
// TouchMe…) can move every note to the nearest one of a scale, so nothing
// sounds wrong, and one key can play a chord of that scale (the note, the
// third and the fifth above it in the scale). The riff recorder writes down
// what sounded, so it uses the same.
import { readStorage, writeStorage } from './storage';

export const SCALES: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  pentaMinor: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
};

type Setting = { root: number; scale: string; chords: boolean }; // scale '' = free

let setting = readStorage<Setting>('jdl:scale', { root: 9, scale: '', chords: false });
export const scaleSetting = () => setting;
export function setScale(next: Setting) {
  setting = next;
  writeStorage('jdl:scale', next);
}

const inScale = (note: number, root: number, steps: number[]) => steps.includes((((note - root) % 12) + 12) % 12);

// The nearest note of the scale; on a tie, the one below
export function snap(note: number, root: number, steps: number[]) {
  for (let distance = 0; distance < 12; distance++) {
    if (inScale(note - distance, root, steps)) return note - distance;
    if (inScale(note + distance, root, steps)) return note + distance;
  }
  return note;
}

// The scale's notes counted up from a note already in it: 0 is itself
function degreeAbove(note: number, root: number, steps: number[], degrees: number) {
  let found = note;
  for (let count = 0; count < degrees; ) {
    found++;
    if (inScale(found, root, steps)) count++;
  }
  return found;
}

// What a key plays: itself, its nearest scale note, or a chord of the scale
export function playedNotes(note: number, current: Setting = setting) {
  const steps = SCALES[current.scale];
  if (!steps) return [note];
  const base = snap(note, current.root, steps);
  if (!current.chords) return [base];
  // pentatonic and blues have few notes: the third and fifth are 2 and 4
  // steps up in a seven-note scale, 1 and 3 in the others would clash less
  const [third, fifth] = steps.length === 7 ? [2, 4] : [1, 3];
  return [base, degreeAbove(base, current.root, steps, third), degreeAbove(base, current.root, steps, fifth)];
}

const ROOTS = { en: ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'], es: ['Do', 'Do#', 'Re', 'Mib', 'Mi', 'Fa', 'Fa#', 'Sol', 'Lab', 'La', 'Sib', 'Si'] };

// The key and scale pickers in MIDI → Play without Play
export function setupScalePicker(lang: () => 'en' | 'es') {
  const root = document.querySelector<HTMLSelectElement>('#scale-root')!;
  const type = document.querySelector<HTMLSelectElement>('#scale-type')!;
  const chords = document.querySelector<HTMLInputElement>('#scale-chords')!;
  const render = () => {
    root.replaceChildren(...ROOTS[lang()].map((name, i) => new Option(name, String(i))));
    root.value = String(setting.root);
  };
  render();
  type.value = setting.scale;
  chords.checked = setting.chords;
  const sync = () => {
    root.disabled = !type.value;
    chords.disabled = !type.value;
  };
  sync();
  const save = () => {
    setScale({ root: Number(root.value), scale: type.value, chords: chords.checked });
    sync();
  };
  root.addEventListener('change', save);
  type.addEventListener('change', save);
  chords.addEventListener('change', save);
  return render;
}
