// The studio plays a MIDI device: the Roland SP-404MKII first, any other too.
// Patterns end in .sp() and their events go out as MIDI instead of sound:
//   s("a1 ~ a5 a1").sp()      pads by bank and number, as printed on the SP
//   n("1 5 9 13").sp("b")     pads 1-16 of one bank
//   note("c3 e3 g3").sp()     the chromatic sample (channel 16, C2-C4)
//   ccn(16).ccv(…).sp()       a control change, on midichan (1-4: the SP's
//                             effect buses; CC 16-18 and 80-82 are Ctrl 1-6)
// Every message carries a Web MIDI timestamp, so it leaves on time whatever
// the main thread is doing (Strudel's own .midi() sends when a timer fires).
// "Send the tempo" adds 24 clock ticks per beat, plus Start and Stop, drawn
// from the same scheduler as the notes, so they cannot drift apart.
import { t } from './i18n';
import { readStorage, writeStorage } from './storage';
import type { StrudelMirror } from './strudel';

export type SpMode = 'A' | 'B';
type SpMessage = { data: number[]; at: number };

const BANKS = 'abcdefghij';

// A pad's note and channel. The SP numbers its pads 1-16 from the top left;
// the notes rise from the bottom row: pad 13 is the lowest note, pad 4 the
// highest. Mode A: a bank per channel (A = 1 … J = 10), notes 36-51. Mode B:
// banks A-E on channel 1 and F-J on 2, each 16 notes above the last, from 12
export function padMessage(bank: string, pad: number, mode: SpMode) {
  const index = BANKS.indexOf(bank.toLowerCase());
  if (index < 0 || !Number.isInteger(pad) || pad < 1 || pad > 16) return null;
  const row = Math.floor((pad - 1) / 4);
  const column = (pad - 1) % 4;
  const offset = 12 - 4 * row + column; // 0-15 within the bank
  if (mode === 'A') return { channel: index + 1, note: 36 + offset };
  return { channel: index < 5 ? 1 : 2, note: 12 + (index % 5) * 16 + offset };
}

// "a1", "J16": a pad by name
export function parsePad(name: unknown) {
  const match = typeof name === 'string' ? /^([a-j])(\d{1,2})$/i.exec(name) : null;
  return match ? { bank: match[1].toLowerCase(), pad: Number(match[2]) } : null;
}

type Value = Record<string, unknown>;
type Options = { bank: string; mode: SpMode; noteToMidi: (note: string) => number };

// The MIDI messages (without their times) for one event
export function spMessages(raw: unknown, { bank, mode, noteToMidi }: Options) {
  const value: Value = typeof raw === 'object' && raw !== null ? (raw as Value) : { n: raw };
  const out: { note?: { channel: number; note: number; velocity: number }; cc?: number[] } = {};
  const velocity = Math.max(1, Math.min(127, Math.round(Number(value.velocity ?? 0.9) * Number(value.gain ?? 1) * 127)));
  const named = parsePad(value.s);
  if (named) {
    const pad = padMessage(named.bank, named.pad, mode);
    if (pad) out.note = { ...pad, velocity };
  } else if (value.note !== undefined) {
    const note = typeof value.note === 'number' ? value.note : noteToMidi(String(value.note));
    if (Number.isFinite(note)) out.note = { channel: 16, note: Math.round(note), velocity };
  } else if (typeof value.n === 'number') {
    const pad = padMessage(bank, value.n, mode);
    if (pad) out.note = { ...pad, velocity };
  }
  if (typeof value.ccn === 'number' && typeof value.ccv === 'number') {
    const channel = Math.max(1, Math.min(16, Number(value.midichan ?? 1)));
    out.cc = [0xb0 + channel - 1, value.ccn, Math.max(0, Math.min(127, Math.round(value.ccv * 127)))];
  }
  return out;
}

// Notes sent lately, to recognise them if they come back: a device that
// echoes its MIDI input (or Linux's Midi Through) would otherwise play them
// again through free play. Your own playing on that device still gets in
const sentNotes: { key: number; at: number }[] = [];
export function isEcho(data: ArrayLike<number>, at: number) {
  if ((data[0] & 0xf0) !== 0x90) return false;
  const key = ((data[0] & 0x0f) << 8) | data[1];
  while (sentNotes.length && sentNotes[0].at < at - 1000) sentNotes.shift();
  return sentNotes.some((sent) => sent.key === key && Math.abs(sent.at - at) < 40);
}
const rememberNote = (data: number[], at: number) => {
  sentNotes.push({ key: ((data[0] & 0x0f) << 8) | data[1], at });
  if (sentNotes.length > 512) sentNotes.shift();
};

// 24 ticks a beat, 4 beats a cycle (the studio counts a cycle as a bar)
export const TICKS_PER_CYCLE = 96;

type Settings = { port: string; mode: SpMode; clock: boolean; offset: number };
type Hap = { value: unknown; duration: { valueOf(): number }; whole?: { begin: { valueOf(): number } } };
type PatternLike = {
  onTrigger(fn: (hap: Hap, now: number, cps: number, target: number) => void, dominant?: boolean): PatternLike;
  fast(n: number): PatternLike;
};
type Scheduler = {
  started?: boolean;
  setPattern(pattern: unknown, autostart?: boolean): Promise<void>;
  stop(): void;
  pause(): void;
};
type StrudelGlobals = {
  Pattern: { prototype: Record<string, unknown> };
  stack: (...patterns: unknown[]) => unknown;
  pure: (value: unknown) => PatternLike;
  noteToMidi: (note: string) => number;
  getAudioContext: () => AudioContext;
};

export function setupSp({ editor, addTrack }: { editor: StrudelMirror; addTrack: (pattern: string) => void }) {
  const outputSelect = document.querySelector<HTMLSelectElement>('#sp-output')!;
  const modeSelect = document.querySelector<HTMLSelectElement>('#sp-mode')!;
  const clockBox = document.querySelector<HTMLInputElement>('#sp-clock')!;
  const offsetInput = document.querySelector<HTMLInputElement>('#sp-offset')!;
  const offsetText = document.querySelector<HTMLElement>('#sp-offset-value')!;
  const enable = document.querySelector<HTMLButtonElement>('#sp-enable')!;
  const status = document.querySelector<HTMLElement>('#sp-status')!;
  const g = globalThis as unknown as StrudelGlobals;

  let settings = readStorage<Settings>('jdl:sp', { port: '', mode: 'A', clock: false, offset: 0 });
  const save = () => writeStorage('jdl:sp', settings);
  let access: MIDIAccess | undefined;
  const output = () => (access && settings.port ? access.outputs.get(settings.port) : undefined);

  // Scheduler time (the audio clock, seconds) to a Web MIDI timestamp. The
  // audio clock moves in steps (a block of samples at a time) while
  // performance.now() runs smoothly, so their gap wobbles by a block: the
  // smallest gap is the steady one. It may only creep up slowly, 0.2 % (the
  // two clocks drift apart a little: 0.08 % measured on the studio's laptop),
  // unless it jumps by a lot (audio paused)
  let steadyGap: number | undefined;
  let lastStamp = 0;
  const stamp = (target: number) => {
    const now = performance.now();
    const gap = now - g.getAudioContext().currentTime * 1000;
    const allowed = (steadyGap ?? gap) + (now - lastStamp) * 0.002;
    steadyGap = steadyGap === undefined || gap - steadyGap > 50 ? gap : Math.min(gap, allowed);
    lastStamp = now;
    return Math.max(now, steadyGap + target * 1000 + settings.offset);
  };
  const send = (messages: SpMessage[]) => {
    const port = output();
    if (!port) return;
    for (const { data, at } of messages) {
      if ((data[0] & 0xf0) === 0x90) rememberNote(data, at);
      port.send(data, at);
    }
  };

  // .sp(bank): the events go out as MIDI, and make no sound in the studio
  g.Pattern.prototype.sp = function (this: PatternLike, bank = 'a') {
    return this.onTrigger((hap, _now, cps, target) => {
      const { note, cc } = spMessages(hap.value, { bank: String(bank), mode: settings.mode, noteToMidi: g.noteToMidi });
      const at = stamp(target);
      const messages: SpMessage[] = [];
      if (cc) messages.push({ data: cc, at });
      if (note) {
        const length = Math.max(10, (Number(hap.duration.valueOf()) / cps) * 1000 - 10);
        messages.push({ data: [0x90 + note.channel - 1, note.note, note.velocity], at });
        messages.push({ data: [0x80 + note.channel - 1, note.note, 0], at: at + length });
      }
      send(messages);
    }, true);
  };

  // The clock: a silent pattern of ticks stacked onto whatever plays. Start
  // goes out with the tick on cycle 0, where Strudel begins on every Play
  const clockTicks = () =>
    g
      .pure(1)
      .fast(TICKS_PER_CYCLE)
      .onTrigger((hap, _now, _cps, target) => {
        const at = stamp(target);
        const first = Number(hap.whole?.begin.valueOf()) === 0;
        send(first ? [{ data: [0xfa], at }, { data: [0xf8], at }] : [{ data: [0xf8], at }]);
      }, true);
  const scheduler = editor.repl?.scheduler as unknown as Scheduler | undefined;
  let playing: unknown;
  const withClock = (pattern: unknown) => (settings.clock && output() && pattern ? g.stack(pattern, clockTicks()) : pattern);
  if (scheduler) {
    const setPattern = scheduler.setPattern.bind(scheduler);
    scheduler.setPattern = (pattern, autostart) => {
      playing = pattern;
      return setPattern(withClock(pattern), autostart);
    };
    for (const method of ['stop', 'pause'] as const) {
      const original = scheduler[method].bind(scheduler);
      scheduler[method] = () => {
        original();
        if (settings.clock) send([{ data: [0xfc], at: performance.now() }]);
      };
    }
  }
  // Clock on or off mid-song: the same pattern again, with or without ticks
  const reclock = () => {
    if (!scheduler?.started || !playing) return;
    void scheduler.setPattern(playing);
    if (!settings.clock) send([{ data: [0xfc], at: performance.now() }]);
  };

  const render = () => {
    const outputs = access ? [...access.outputs.values()] : [];
    enable.hidden = Boolean(access);
    outputSelect.replaceChildren(...outputs.map((port) => new Option(port.name ?? port.id, port.id)));
    // The SP-404 first, or what was chosen last time
    const kept = outputs.find((port) => port.id === settings.port);
    const preferred = outputs.find((port) => /sp-?404/i.test(port.name ?? ''));
    const chosen = kept ?? preferred ?? outputs.find((port) => !/through/i.test(port.name ?? '')) ?? outputs[0];
    settings.port = chosen?.id ?? '';
    outputSelect.value = settings.port;
    outputSelect.disabled = !outputs.length;
    status.textContent = !access ? '' : chosen ? t('spReady', { name: chosen.name ?? '' }) : t('spNoDevice');
  };

  const connect = async () => {
    try {
      access = await navigator.requestMIDIAccess();
      access.addEventListener('statechange', render);
    } catch {
      status.textContent = t('midiDenied');
    }
    render();
  };

  modeSelect.value = settings.mode;
  clockBox.checked = settings.clock;
  offsetInput.value = String(settings.offset);
  offsetText.textContent = String(settings.offset);

  enable.addEventListener('click', () => void connect());
  outputSelect.addEventListener('change', () => {
    settings = { ...settings, port: outputSelect.value };
    save();
    render();
    reclock();
  });
  modeSelect.addEventListener('change', () => {
    settings = { ...settings, mode: modeSelect.value === 'B' ? 'B' : 'A' };
    save();
  });
  clockBox.addEventListener('change', () => {
    settings = { ...settings, clock: clockBox.checked };
    save();
    reclock();
  });
  offsetInput.addEventListener('input', () => {
    settings = { ...settings, offset: Number(offsetInput.value) };
    offsetText.textContent = offsetInput.value;
    save();
  });
  document.querySelector('#sp-test')!.addEventListener('click', () => {
    const pad = padMessage('a', 1, settings.mode)!;
    const at = performance.now();
    send([
      { data: [0x90 + pad.channel - 1, pad.note, 110], at },
      { data: [0x80 + pad.channel - 1, pad.note, 0], at: at + 300 },
    ]);
  });
  const examples: Record<string, string> = {
    pads: 's("a1 ~ a5 ~ a1 a1 a5 ~").sp()',
    chromatic: 'note("<c3 eb3 g3 bb3>*2").sp()',
    fx: 'ccn(16).ccv(sine.range(0.1, 0.9).slow(4).segment(16)).midichan(1).sp()',
  };
  document.querySelectorAll<HTMLButtonElement>('[data-sp-example]').forEach((button) => {
    button.addEventListener('click', () => addTrack(examples[button.dataset.spExample!]));
  });

  // Already allowed (by the MIDI panel or midin()): connect without asking
  void navigator.permissions
    ?.query({ name: 'midi' as PermissionName })
    .then((permission) => (permission.state === 'granted' ? connect() : undefined))
    .catch(() => undefined);
  document.querySelector('#toggle-sp')!.addEventListener('click', () => {
    if (!access) void connect();
  });
}
