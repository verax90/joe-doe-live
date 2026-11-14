// Machines: the visuals listen to hardware (an MPC, an SP-404, a Roland box…)
// through an audio input, for jams where the studio plays no sound of its
// own. The input is only analysed, never sent to the speakers: bass(), mid(),
// high() and level() follow it (visuals.ts takes the louder of the studio and
// this), and its drum hits move the clips like Clips → Follow the music does
// for Strudel's own sounds (kick, snare and hats told apart by where in the
// spectrum the hit lands). The tempo can follow the machine's MIDI clock.
import { ensureAudio } from './audio';
import { hearRole, type Role } from './clips-react';
import { onLangChange, t } from './i18n';
import { CLOCK_EVENT, requestMidi } from './midi';
import { readStorage, writeStorage } from './storage';
import { bandOf, setExtraBand } from './visuals';

// The spectrum in six parts. Which drum a hit was is read from how they
// compare a moment after it lands, measured on the studio's own kits (its
// default one, the TR-808, the TR-909 and the MPC60; machines.test.ts keeps
// the numbers)
export const BANDS = {
  sub: [30, 100],
  low: [100, 200],
  lowmid: [200, 500],
  mid: [500, 2000],
  himid: [2000, 5000],
  high: [7000, 14000],
} as const;
export type Band = keyof typeof BANDS;
export type Energy = Record<Band, number>;
const BAND_NAMES = Object.keys(BANDS) as Band[];
const ROLES: Role[] = ['kick', 'snare', 'hat'];

// What each drum is made of
export const lowEnd = (e: Energy) => Math.max(e.sub, e.low);
export const body = (e: Energy) => Math.max(e.low, e.lowmid, e.mid);
const upper = (e: Energy) => Math.max(e.mid, e.himid);
// A kick: a sub that rings with little above it. A snare, a clap or a rim
// has a sub too for an instant, but as much or more in the mids
export const kickScore = (e: Energy) => e.sub - 0.5 * upper(e);
export const KICK_SCORE = 0.6;
// A snare (or clap, or rim) has a body well over its own highs; a hi-hat's
// highs are as loud as anything under them, however much it rattles down there
export const snareLike = (e: Energy) => body(e) >= 0.25 && body(e) - e.high >= 0.13;
export const hatLike = (e: Energy) => e.high >= body(e) - 0.13;

// The first instant of any drum is a crack that fills the spectrum: a kick
// and a snare look the same there. So a hit in the low end or the mids waits:
// from LOOK_MS on it is a kick as soon as its score says so, and at DECIDE_MS
// a snare if it looked like one on the way (a TR-909 kick, or any kick with
// a hat on top, takes that long to show its sub: calling the snare sooner
// got those wrong). What was neither (a hat with some thump) is dropped
export const LOOK_MS = 30;
export const DECIDE_MS = 62;

// What rose since a frame from before the hit. The drum before is often
// still ringing (a kick's tail under the next hat): judged on the levels
// alone, that hat would have the kick's lows. The rise is the new hit's own
const ZERO: Energy = { sub: 0, low: 0, lowmid: 0, mid: 0, himid: 0, high: 0 };
export function rise(now: Energy, before: Energy): Energy {
  const out = { ...ZERO };
  for (const name of BAND_NAMES) out[name] = Math.max(0, now[name] - before[name]);
  return out;
}
// A kick over the tail of another: the level says kick, and the sub rose
const SUB_ROSE = 0.15;

// Which drums a frame makes: hats at once, a kick or a snare once it shows
// which it was, one drum per hit
export type Onsets = { low: boolean; mid: boolean; high: boolean };
export function createDrumSorter() {
  let since: number | undefined;
  let base = ZERO; // the levels just before the hit being told apart
  let snareSeen = false;
  let toldAt = -Infinity;
  const past: Energy[] = []; // the last frames, oldest first
  return (onsets: Onsets, e: Energy, at: number): Role[] => {
    const out: Role[] = [];
    // two frames back: the frame before may already hold a little of the hit
    const before = past[0] ?? ZERO;
    past.push({ ...e });
    if (past.length > 2) past.shift();
    if (onsets.high && hatLike(rise(e, before))) out.push('hat');
    if ((onsets.low || onsets.mid) && since === undefined && at - toldAt > DECIDE_MS) {
      since = at;
      base = before;
      snareSeen = false;
    }
    if (since === undefined || at - since < LOOK_MS) return out;
    const risen = rise(e, base);
    const isKick = kickScore(e) >= KICK_SCORE && risen.sub >= SUB_ROSE;
    snareSeen ||= snareLike(risen);
    const late = at - since >= DECIDE_MS;
    const told: Role | undefined | null = isKick ? 'kick' : !late ? undefined : snareSeen ? 'snare' : null;
    if (told === undefined) return out; // not yet
    since = undefined;
    if (told) {
      toldAt = at;
      out.push(told);
    }
    return out;
  };
}

// The slider (0-1) as a gain on the input: ×0.18 to ×5.6, the middle is ×1.
// A line from a mixer is hot, a phone's mic across the room is not
export const gainOf = (slider: number) => 2 ** ((slider - 0.5) * 5);

// Automatic sensitivity: where the slider should go, from the signal's peak
// (after the gain) over the last second. The drums are told apart best at
// the level the studio itself plays at, a peak of 0.8 or so: far under it,
// up; over the top, down; silence (nothing plugged in, a break in the set)
// or a good level, stay
export function autoGainStep(slider: number, peak: number) {
  if (peak < 0.01) return slider;
  if (peak < 0.25) return Math.min(1, slider + 0.06); // far off: bigger steps
  if (peak < 0.5) return Math.min(1, slider + 0.02);
  if (peak > 1.2) return Math.max(0, slider - 0.02);
  return slider;
}

// A hit is the band jumping above its own recent average: the average moves
// slowly (so a loud passage raises the bar by itself), the band must be
// rising, loud enough to matter, and a moment must have passed since the last
type OnsetOptions = { jump?: number; floor?: number; gapMs?: number; tauMs?: number };
export function createOnset({ jump = 0.09, floor = 0.22, gapMs = 110, tauMs = 350 }: OnsetOptions = {}) {
  let average: number | undefined;
  let previous = 0;
  let lastHit = -Infinity;
  let lastAt: number | undefined;
  return (energy: number, at: number) => {
    const elapsed = lastAt === undefined ? 16 : Math.max(0, at - lastAt);
    lastAt = at;
    average ??= energy;
    const hit = energy > floor && energy - average > jump && energy > previous && at - lastHit >= gapMs;
    average += (energy - average) * (1 - Math.exp(-elapsed / tauMs));
    previous = energy;
    if (hit) lastHit = at;
    return hit;
  };
}

type Listening = {
  stream: MediaStream;
  source: MediaStreamAudioSourceNode;
  gain: GainNode;
  smooth: AnalyserNode; // for the visuals: eased, like Strudel's own
  fast: AnalyserNode; // for the hits: hardly eased, so a kick is a spike
  nyquist: number;
  timer: number;
};
let listening: Listening | undefined;
export const machinesOn = () => Boolean(listening);

export function setupMachines() {
  const deviceSelect = document.querySelector<HTMLSelectElement>('#machines-device')!;
  const onButton = document.querySelector<HTMLButtonElement>('#machines-on')!;
  const gainInput = document.querySelector<HTMLInputElement>('#machines-gain')!;
  const status = document.querySelector<HTMLElement>('#machines-status')!;
  const clockBox = document.querySelector<HTMLInputElement>('#machines-clock')!;
  const clockStatus = document.querySelector<HTMLElement>('#machines-clock-status')!;
  const meters = Object.fromEntries(
    ROLES.map((role) => [role, document.querySelector<HTMLElement>(`#machines-meters [data-role="${role}"]`)!]),
  ) as Record<Role, HTMLElement>;

  const autoBox = document.querySelector<HTMLInputElement>('#machines-auto')!;
  const liveButton = document.querySelector<HTMLButtonElement>('#machines-live')!;
  const setGain = (slider: number) => {
    gainInput.value = String(slider);
    writeStorage('jdl:machines-gain', slider);
    listening?.gain.gain.setTargetAtTime(gainOf(slider), listening.gain.context.currentTime, 0.05);
  };
  gainInput.value = String(readStorage<number>('jdl:machines-gain', 0.5));
  // moving it yourself means you want it there
  gainInput.addEventListener('input', () => {
    setGain(Number(gainInput.value));
    if (autoBox.checked) {
      autoBox.checked = false;
      writeStorage('jdl:machines-auto', false);
    }
  });
  autoBox.checked = readStorage<boolean>('jdl:machines-auto', true);
  autoBox.addEventListener('change', () => writeStorage('jdl:machines-auto', autoBox.checked));

  // Inputs, a USB interface or the SP first; the one used last time if it is there
  const listDevices = async () => {
    const inputs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'audioinput');
    const keep = deviceSelect.value || readStorage<string>('jdl:machines-device', '');
    deviceSelect.replaceChildren(...inputs.map((d, i) => new Option(d.label || t('micInput', { n: i + 1 }), d.deviceId)));
    const preferred = inputs.find((d) => /sp-?404|usb|line/i.test(d.label));
    deviceSelect.value = inputs.some((d) => d.deviceId === keep) ? keep : (preferred?.deviceId ?? inputs[0]?.deviceId ?? '');
  };

  const stop = () => {
    if (!listening) return;
    clearInterval(listening.timer);
    listening.stream.getTracks().forEach((track) => track.stop());
    listening.source.disconnect();
    listening = undefined;
    setExtraBand(undefined);
    onButton.textContent = t('machinesOn');
    onButton.setAttribute('aria-pressed', 'false');
    status.textContent = t('machinesOff');
    for (const role of ROLES) meters[role].style.setProperty('--level', '0');
  };

  const start = async () => {
    await ensureAudio();
    const context = (globalThis as { getAudioContext?: () => AudioContext }).getAudioContext!();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceSelect.value ? { exact: deviceSelect.value } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    const source = context.createMediaStreamSource(stream);
    const gain = new GainNode(context, { gain: gainOf(Number(gainInput.value)) });
    const smooth = new AnalyserNode(context, { fftSize: 2048, smoothingTimeConstant: 0.8 });
    const fast = new AnalyserNode(context, { fftSize: 2048, smoothingTimeConstant: 0.15 });
    // analysed only: nothing goes on to the output, so it cannot feed back
    source.connect(gain);
    gain.connect(smooth);
    gain.connect(fast);
    const nyquist = context.sampleRate / 2;

    const smoothData = new Float32Array(smooth.frequencyBinCount);
    const fastData = new Float32Array(fast.frequencyBinCount);
    const wave = new Float32Array(fast.fftSize);
    let smoothAt = -1;
    setExtraBand((lowHz, highHz) => {
      const now = performance.now();
      if (now - smoothAt > 8) {
        smooth.getFloatFrequencyData(smoothData);
        smoothAt = now;
      }
      return bandOf(smoothData, nyquist, lowHz, highHz);
    });

    const onsets = { low: createOnset(), mid: createOnset(), high: createOnset() };
    const flashUntil: Record<Role, number> = { kick: 0, snare: 0, hat: 0 };
    const sort = createDrumSorter();
    let loudest = 0;
    let checkedAt = performance.now();
    const energy = Object.fromEntries(BAND_NAMES.map((name) => [name, 0])) as Energy;
    const timer = window.setInterval(() => {
      const now = performance.now();
      fast.getFloatFrequencyData(fastData);
      for (const name of BAND_NAMES) energy[name] = bandOf(fastData, nyquist, BANDS[name][0], BANDS[name][1]);
      // each meter shows what its drum is listened for in
      const shown: Record<Role, number> = { kick: lowEnd(energy), snare: Math.max(energy.lowmid, energy.mid), hat: energy.high };
      for (const role of ROLES) meters[role].style.setProperty('--level', shown[role].toFixed(3));
      const heard = { low: onsets.low(shown.kick, now), mid: onsets.mid(energy.mid, now), high: onsets.high(energy.high, now) };
      fast.getFloatTimeDomainData(wave);
      for (const sample of wave) loudest = Math.max(loudest, Math.abs(sample));
      if (now - checkedAt > 1000) {
        if (autoBox.checked) {
          const next = autoGainStep(Number(gainInput.value), loudest);
          if (next !== Number(gainInput.value)) setGain(next);
        }
        loudest = 0;
        checkedAt = now;
      }
      for (const role of sort(heard, energy, now)) {
        flashUntil[role] = now + 90;
        hearRole(role, now);
      }
      for (const role of ROLES) meters[role].classList.toggle('is-hit', now < flashUntil[role]);
    }, 16);

    listening = { stream, source, gain, smooth, fast, nyquist, timer };
    // the track ends by itself when the interface is unplugged
    stream.getAudioTracks()[0]?.addEventListener('ended', stop);
    await listDevices(); // labels only show once permission is granted
    writeStorage('jdl:machines-device', deviceSelect.value);
    onButton.textContent = t('machinesStop');
    onButton.setAttribute('aria-pressed', 'true');
    status.textContent = t('machinesLive', { input: stream.getAudioTracks()[0]?.label ?? '' });
  };

  onButton.addEventListener('click', async () => {
    if (listening) return stop();
    try {
      await start();
    } catch (error) {
      status.textContent = t('micError', { error: error instanceof Error ? error.name : String(error) });
    }
  });
  deviceSelect.addEventListener('change', async () => {
    writeStorage('jdl:machines-device', deviceSelect.value);
    if (!listening) return;
    stop();
    await start().catch(() => undefined);
  });
  document.querySelector('#toggle-vj')!.addEventListener('click', () => void listDevices().catch(() => undefined));

  // Go live: one click for the gig. Listening on, the Auto visual (it moves
  // on every sixteen kicks while the studio itself is stopped), the code and
  // this panel out of the way, full screen. Leaving full screen (Esc) brings
  // the code back if this is what hid it
  let hidCode = false;
  liveButton.addEventListener('click', async () => {
    if (!listening) {
      try {
        await start();
      } catch (error) {
        status.textContent = t('micError', { error: error instanceof Error ? error.name : String(error) });
        return;
      }
    }
    const visual = document.querySelector<HTMLSelectElement>('#visual')!;
    visual.value = 'auto';
    visual.dispatchEvent(new Event('change', { bubbles: true }));
    const codeToggle = document.querySelector<HTMLButtonElement>('#toggle-code')!;
    if (codeToggle.getAttribute('aria-pressed') === 'true') {
      codeToggle.click();
      hidCode = true;
    }
    document.querySelector<HTMLButtonElement>('#vj .panel-close')?.click();
    void document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).catch(() => undefined);
  });
  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement || !hidCode) return;
    hidCode = false;
    const codeToggle = document.querySelector<HTMLButtonElement>('#toggle-code')!;
    if (codeToggle.getAttribute('aria-pressed') === 'false') codeToggle.click();
  });

  // The tempo follows the machine's MIDI clock (midi.ts measures it, main.ts
  // sets it); ticking the box asks for MIDI if the studio has not yet
  clockBox.checked = readStorage<boolean>('jdl:machines-clock', false);
  const showClock = (bpm?: number) => {
    clockStatus.textContent = !clockBox.checked ? '' : bpm ? t('machinesClockBpm', { bpm }) : t('machinesClockWaiting');
  };
  clockBox.addEventListener('change', () => {
    writeStorage('jdl:machines-clock', clockBox.checked);
    if (clockBox.checked) void requestMidi();
    showClock();
  });
  window.addEventListener(CLOCK_EVENT, (event) => showClock((event as CustomEvent<number>).detail));
  showClock();

  onLangChange(() => {
    onButton.textContent = t(listening ? 'machinesStop' : 'machinesOn');
    if (!listening) status.textContent = '';
    showClock();
  });
}

// Whether the tempo should follow an incoming MIDI clock
export const followsClock = () => readStorage<boolean>('jdl:machines-clock', false);
