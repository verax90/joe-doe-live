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

// Where each drum shows: the kick's body, the snare's body and snap under
// where hats live, the hats at the top
export const ROLE_BANDS: Record<Role, [number, number]> = {
  kick: [30, 130],
  snare: [200, 2500],
  hat: [7000, 14000],
};
const ROLES: Role[] = ['kick', 'snare', 'hat'];

// The first instant of any drum is a crack that fills the whole spectrum:
// a kick and a snare look the same there. A moment later they do not: the
// kick's low end is still ringing with nothing above it, the snare's is gone
// and its rattle goes on. So a hit waits this long to be told apart
export const TELL_APART_MS = 34;

// Which drums a frame's hits make: hats at once, a kick or a snare once it
// shows which it was, and one drum per hit
type Bands = Record<Role, number>;
export function createDrumSorter(waitMs = TELL_APART_MS) {
  let since: number | undefined;
  let toldAt = -Infinity;
  return (hits: Record<Role, boolean>, energy: Bands, at: number): Role[] => {
    const out: Role[] = [];
    if ((hits.kick || hits.snare) && since === undefined && at - toldAt > waitMs * 2) since = at;
    if (since !== undefined && at - since >= waitMs) {
      since = undefined;
      toldAt = at;
      out.push(energy.kick > energy.snare + 0.12 ? 'kick' : 'snare');
    }
    if (hits.hat) out.push('hat');
    return out;
  };
}

// The slider (0-1) as a gain on the input: ×0.18 to ×5.6, the middle is ×1.
// A line from a mixer is hot, a phone's mic across the room is not
export const gainOf = (slider: number) => 2 ** ((slider - 0.5) * 5);

// Automatic sensitivity: where the slider should go, from the loudest any
// band got in the last few seconds. Too quiet to tell hits apart: up a step;
// pinned at the top: down a step; silence (nothing plugged, a break in the
// set) or a good level: stay
export function autoGainStep(slider: number, loudest: number) {
  if (loudest < 0.08) return slider;
  if (loudest < 0.4) return Math.min(1, slider + 0.06); // far off: bigger steps
  if (loudest < 0.62) return Math.min(1, slider + 0.02);
  if (loudest > 0.93) return Math.max(0, slider - 0.02);
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
    let smoothAt = -1;
    setExtraBand((lowHz, highHz) => {
      const now = performance.now();
      if (now - smoothAt > 8) {
        smooth.getFloatFrequencyData(smoothData);
        smoothAt = now;
      }
      return bandOf(smoothData, nyquist, lowHz, highHz);
    });

    const onsets = Object.fromEntries(ROLES.map((role) => [role, createOnset()])) as Record<Role, ReturnType<typeof createOnset>>;
    const flashUntil: Record<Role, number> = { kick: 0, snare: 0, hat: 0 };
    const sort = createDrumSorter();
    let loudest = 0;
    let checkedAt = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      fast.getFloatFrequencyData(fastData);
      const heard = { kick: false, snare: false, hat: false };
      const energy = { kick: 0, snare: 0, hat: 0 };
      for (const role of ROLES) {
        energy[role] = bandOf(fastData, nyquist, ...ROLE_BANDS[role]);
        heard[role] = onsets[role](energy[role], now);
        meters[role].style.setProperty('--level', energy[role].toFixed(3));
      }
      loudest = Math.max(loudest, energy.kick, energy.snare, energy.hat);
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
