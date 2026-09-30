// MIDI panel: lists the devices and shows the latest messages, to find out
// which number each pad or knob sends. Strudel opens its own connections with
// midin()/midikeys(); the studio listens alongside for the knobs, pitch bend,
// program changes and free play.

import { t } from './i18n';
import { isEcho } from './sp';

const MAX_LOG = 12;

// Strudel's midin() only reads CC messages. The pitch bend (the MPK joystick
// sideways) is read here and offered as bend(), from -1 to 1, for patterns and
// Hydra: note("c3").speed(ref(() => 1 + bend() * 0.06))
let bendValue = 0;

// For the ?debug panel: how many notes arrive
export const midiStats = { notes: 0 };
export const currentBend = () => bendValue;
(globalThis as { bend?: () => number }).bend = currentBend;

// TouchMe (Playtronica): skin contact as MIDI. It plays notes (more contact,
// higher in its scale) and sends CC 90, how strong the touch is, with each
// new note. touch() is that strength from 0 to 1 while someone touches,
// easing back to 0 when they let go; touching() says whether anyone does.
// For patterns and Hydra: .lpf(ref(() => 300 + touch() * 5000))
const TOUCH_CC = 90;
const TOUCH_NAME = /touch\s*me|playtronica/i;
let touchTarget = 0;
let touchValue = 0;
let touchAt = 0;
let touchInput: string | undefined; // the device that sends CC 90
// Notes held on each device: the TouchMe's note comes just before its CC 90,
// so which device it is may only be known a moment later
const held = new Map<string, { name: string; notes: Set<number> }>();
const isTouch = (id: string) => id === touchInput || TOUCH_NAME.test(held.get(id)?.name ?? '');
const touchHeld = () => [...held].some(([id, device]) => isTouch(id) && device.notes.size > 0);

// Many TouchMe units send no CC 90 (it is a setting): then the note tells
// the touch, as more contact plays higher. The range is learnt from the notes
// seen (at least 6 semitones wide), so the lowest is 0 and the highest 1
let touchCc = false;
const noteRange = { low: 127, high: 0 };
export function touchFromNote(note: number, range: { low: number; high: number }) {
  range.low = Math.min(range.low, note);
  range.high = Math.max(range.high, note);
  const span = Math.max(6, range.high - range.low);
  return Math.min(1, Math.max(0, (note - range.low) / span));
}

// A value easing towards its target: a little smoothing, so it glides
export const easeTowards = (value: number, target: number, elapsedMs: number, tauMs = 60) =>
  value + (target - value) * (1 - Math.exp(-Math.max(0, elapsedMs) / tauMs));

export function currentTouch() {
  const now = performance.now();
  touchValue = easeTowards(touchValue, touchTarget, now - touchAt);
  touchAt = now;
  return touchValue;
}
const g = globalThis as { touch?: () => number; touching?: () => boolean };
g.touch = currentTouch;
g.touching = touchHeld;

let connectMidi: (() => Promise<void>) | undefined;

// Program change from any controller (the MPK pads in PROG CHANGE mode):
// main.ts turns it into a visual change
export const PROGRAM_EVENT = 'jdl:program-change';

// Every note-on, for free play (keys sounding without pressing Play)
export const NOTE_EVENT = 'jdl:note-on';
export type NoteDetail = { note: number; velocity: number };

// Every pitch bend move (the MPK joystick sideways), from -1 to 1
export const BEND_EVENT = 'jdl:bend';

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

  // Short, so each message fits on one line; the channel only when it is
  // not the usual 1 (the MPK's pads in CC mode send on 10)
  const describe = ([status, a, b]: Uint8Array) => {
    const type = status & 0xf0;
    const channel = (status & 0x0f) + 1;
    const on = channel === 1 ? '' : ` · ${t('midiChannel', { channel })}`;
    if (type === 0x90 && b > 0) return t('midiNote', { note: a, velocity: b }) + on;
    if (type === 0x80 || type === 0x90) return null; // note off: noise for the monitor
    if (type === 0xb0) return t('midiCc', { cc: a, value: b }) + on;
    if (type === 0xe0) return t('midiBend', { value: (b << 7) | a }) + on;
    if (type === 0xd0 || type === 0xa0) return t('midiTouch', { value: a }) + on;
    if (type === 0xc0) return t('midiProgram', { program: a }) + on;
    return null;
  };

  const addLog = (device: string, text: string) => {
    const item = document.createElement('li');
    item.innerHTML = `<span class="midi-device"></span> <span class="midi-text"></span>`;
    // "TouchMe MIDI 1" → "TouchMe": the port suffix only takes room
    item.querySelector('.midi-device')!.textContent = device.replace(/\s*(MIDI\s*\d*|Port-\d+)\s*$/i, '');
    item.title = device;
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
        const input = target as MIDIInput | null;
        const id = input?.id ?? '';
        if (!held.has(id)) held.set(id, { name: input?.name ?? '', notes: new Set() });
        const device = held.get(id)!;
        // The TouchMe, by its name or as the device sending CC 90
        if ((status & 0xf0) === 0xb0 && low === TOUCH_CC) {
          touchInput = id;
          touchCc = true;
          currentTouch();
          touchTarget = high / 127;
        }
        if ((status & 0xf0) === 0x90 && high > 0) {
          device.notes.add(low);
          if (isTouch(id) && !touchCc) {
            currentTouch();
            touchTarget = touchFromNote(low, noteRange);
          }
        }
        if ((status & 0xf0) === 0x80 || ((status & 0xf0) === 0x90 && high === 0)) {
          device.notes.delete(low);
          if (isTouch(id) && !device.notes.size) {
            currentTouch();
            touchTarget = 0;
          }
        }
        if ((status & 0xf0) === 0xe0) {
          bendValue = (((high << 7) | low) - 8192) / 8192;
          window.dispatchEvent(new CustomEvent<number>(BEND_EVENT, { detail: bendValue }));
        }
        if ((status & 0xf0) === 0x90 && high > 0 && !isEcho(data, event.timeStamp)) {
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
