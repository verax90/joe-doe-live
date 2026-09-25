// MIDI panel: lists the devices and shows the latest messages, to find out
// which number each pad or knob sends. Strudel opens its own connections with
// midin()/midikeys(); the studio listens alongside for the knobs, pitch bend,
// program changes and free play.

import { t } from './i18n';

const MAX_LOG = 12;

// Strudel's midin() only reads CC messages. The pitch bend (the MPK joystick
// sideways) is read here and offered as bend(), from -1 to 1, for patterns and
// Hydra: note("c3").speed(ref(() => 1 + bend() * 0.06))
let bendValue = 0;

// For the ?debug panel: how many notes arrive
export const midiStats = { notes: 0 };
(globalThis as { bend?: () => number }).bend = () => bendValue;

let connectMidi: (() => Promise<void>) | undefined;

// Program change from any controller (the MPK pads in PROG CHANGE mode):
// main.ts turns it into a visual change
export const PROGRAM_EVENT = 'jdl:program-change';

// Every note-on, for free play (keys sounding without pressing Play)
export const NOTE_EVENT = 'jdl:note-on';
export type NoteDetail = { note: number; velocity: number };

// Every knob or slider move (control change), value from 0 to 1
export const CC_EVENT = 'jdl:cc';
export type CcDetail = { cc: number; value: number; channel: number };

// Once MIDI permission exists (a pattern with midin() asks for it too), start
// listening without asking again
export async function connectMidiIfAllowed() {
  try {
    const permission = await navigator.permissions?.query({ name: 'midi' as PermissionName });
    if (permission?.state === 'granted') await connectMidi?.();
  } catch {
    // browsers without the Permissions API for MIDI: the button still works
  }
}

export function setupMidiPanel() {
  const enable = document.querySelector<HTMLButtonElement>('#midi-enable')!;
  const deviceList = document.querySelector<HTMLUListElement>('#midi-devices')!;
  const log = document.querySelector<HTMLOListElement>('#midi-log')!;
  const dot = document.querySelector<HTMLElement>('#midi-dot')!;

  if (!('requestMIDIAccess' in navigator)) {
    deviceList.innerHTML = `<li class="muted">${t('noWebMidi')}</li>`;
    enable.hidden = true;
    return;
  }

  let flashTimer: number | undefined;
  const flash = () => {
    dot.classList.add('is-active');
    clearTimeout(flashTimer);
    flashTimer = window.setTimeout(() => dot.classList.remove('is-active'), 120);
  };

  const describe = ([status, a, b]: Uint8Array) => {
    const type = status & 0xf0;
    const channel = (status & 0x0f) + 1;
    if (type === 0x90 && b > 0) return t('midiNote', { note: a, velocity: b, channel });
    if (type === 0x80 || type === 0x90) return null; // note off: ruido para el monitor
    if (type === 0xb0) return t('midiCc', { cc: a, value: b, channel });
    if (type === 0xe0) return t('midiBend', { value: (b << 7) | a, channel });
    if (type === 0xd0 || type === 0xa0) return t('midiTouch', { value: a, channel });
    if (type === 0xc0) return t('midiProgram', { program: a, channel });
    return null;
  };

  const addLog = (device: string, text: string) => {
    const item = document.createElement('li');
    item.innerHTML = `<span class="midi-device"></span> <span class="midi-text"></span>`;
    item.querySelector('.midi-device')!.textContent = device;
    item.querySelector('.midi-text')!.textContent = text;
    log.prepend(item);
    while (log.children.length > MAX_LOG) log.lastElementChild!.remove();
  };

  let connected = false;
  const connect = async () => {
    if (connected) return;
    try {
      const access = await navigator.requestMIDIAccess();
      const onMessage = (event: Event) => {
        const { data, target } = event as MIDIMessageEvent;
        if (!data) return;
        const [status, low, high] = data;
        if ((status & 0xf0) === 0xe0) bendValue = (((high << 7) | low) - 8192) / 8192;
        if ((status & 0xf0) === 0x90 && high > 0) {
          midiStats.notes++;
          window.dispatchEvent(new CustomEvent<NoteDetail>(NOTE_EVENT, { detail: { note: low, velocity: high / 127 } }));
        }
        if ((status & 0xf0) === 0xc0) window.dispatchEvent(new CustomEvent(PROGRAM_EVENT, { detail: low }));
        if ((status & 0xf0) === 0xb0) {
          const detail: CcDetail = { cc: low, value: high / 127, channel: (status & 0x0f) + 1 };
          window.dispatchEvent(new CustomEvent<CcDetail>(CC_EVENT, { detail }));
        }
        const text = describe(data);
        if (!text) return;
        flash();
        addLog((target as MIDIInput | null)?.name ?? '', text);
      };
      const render = () => {
        deviceList.replaceChildren();
        if (!access.inputs.size) {
          deviceList.innerHTML = `<li class="muted">${t('noDevices')}</li>`;
        }
        access.inputs.forEach((input) => {
          const item = document.createElement('li');
          item.textContent = input.name ?? input.id;
          deviceList.append(item);
          // A listener, not onmidimessage: Strudel's midin (WebMidi.js) assigns
          // onmidimessage too, and whichever came last would silence the other.
          // The same function added twice is ignored, so re-renders are safe
          input.addEventListener('midimessage', onMessage);
        });
      };
      connected = true;
      render();
      access.onstatechange = render;
      enable.hidden = true;
      dot.classList.add('is-on');
    } catch {
      deviceList.innerHTML = `<li class="muted">${t('midiDenied')}</li>`;
    }
  };

  enable.addEventListener('click', connect);
  connectMidi = connect;
  connectMidiIfAllowed();
}
