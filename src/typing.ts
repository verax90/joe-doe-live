// The computer keyboard as an instrument, for when the MPK is not around:
// A W S E D F T G Y H U J K O L P Ñ play a piano's keys (white on the middle
// row, black above, as in Ableton), Z and X move the octave, 1-8 hit the
// pads (unless the pattern uses parts: then they switch parts, scenes.ts).
// Keys are read by position (event.code), so any layout works. Notes go out
// as the MPK's would, so free play sounds them and the riff recorder takes
// them. Never while typing in the editor or a field.
import { NOTE_EVENT, type NoteDetail } from './midi';
import { t } from './i18n';
import { readStorage, writeStorage } from './storage';

const KEYS = ['KeyA', 'KeyW', 'KeyS', 'KeyE', 'KeyD', 'KeyF', 'KeyT', 'KeyG', 'KeyY', 'KeyH', 'KeyU', 'KeyJ', 'KeyK', 'KeyO', 'KeyL', 'KeyP', 'Semicolon'];

// The note a key plays: A is C of the octave (C4 = 60 at octave 0)
export function keyToNote(code: string, octave: number) {
  const index = KEYS.indexOf(code);
  return index < 0 ? null : 60 + octave * 12 + index;
}

// Digit1-Digit8 → pad 0-7
export function keyToPad(code: string) {
  const match = /^Digit([1-8])$/.exec(code);
  return match ? Number(match[1]) - 1 : null;
}

export function setupTyping(getCode: () => string) {
  const box = document.querySelector<HTMLInputElement>('#typing-on')!;
  const status = document.querySelector<HTMLElement>('#typing-status')!;
  let on = readStorage<boolean>('jdl:typing', false);
  let octave = 0;
  box.checked = on;
  const render = () => (status.textContent = on ? t('typingOctave', { octave: 4 + octave }) : '');
  box.addEventListener('change', () => {
    on = box.checked;
    writeStorage('jdl:typing', on);
    render();
  });
  const play = (note: number) => window.dispatchEvent(new CustomEvent<NoteDetail>(NOTE_EVENT, { detail: { note, velocity: 0.8 } }));

  window.addEventListener('keydown', (event) => {
    if (!on || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    if ((event.target as HTMLElement).closest?.('.cm-editor, input, select, textarea, [contenteditable]')) return;
    if (event.code === 'KeyZ' || event.code === 'KeyX') {
      octave = Math.max(-3, Math.min(3, octave + (event.code === 'KeyX' ? 1 : -1)));
      render();
      return;
    }
    const note = keyToNote(event.code, octave);
    if (note !== null) {
      event.preventDefault();
      play(note);
      return;
    }
    const pad = keyToPad(event.code);
    if (pad !== null && !getCode().includes('part(')) play(32 + pad);
  });
  render();
}
