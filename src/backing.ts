// Backing track: a song under the patterns. Your own file (any audio, or a
// video's sound), or the sound of another tab (YouTube, a playlist) captured
// with the browser's screen sharing. It goes into the studio's master, so the
// volume knob, the limiter, recordings, the audio waves and the Lines visual
// all get it; it is not sent to a live room. A file can start and stop with
// the studio's Play, landing on the first bar you hear.
import { ensureAudio } from './audio';
import { onLangChange, t } from './i18n';
import { ensureLimiter, getLimiter } from './limiter';
import { readStorage, writeStorage } from './storage';
import type { Scheduler } from './strudel';

// 75 → "1:15"
export const clockTime = (seconds: number) => {
  const whole = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

type Settings = { volume: number; withPlay: boolean; loop: boolean };

// For the sampler: the track before its volume, so it can be sampled even
// with the volume down
let playing: AudioNode | undefined;
export const backingInput = () => playing;

export function setupBacking(scheduler: Scheduler | undefined) {
  const fileInput = document.querySelector<HTMLInputElement>('#backing-file')!;
  const tabButton = document.querySelector<HTMLButtonElement>('#backing-tab')!;
  const playButton = document.querySelector<HTMLButtonElement>('#backing-play')!;
  const clearButton = document.querySelector<HTMLButtonElement>('#backing-clear')!;
  const volumeInput = document.querySelector<HTMLInputElement>('#backing-volume')!;
  const withPlayBox = document.querySelector<HTMLInputElement>('#backing-with-play')!;
  const loopBox = document.querySelector<HTMLInputElement>('#backing-loop')!;
  const status = document.querySelector<HTMLElement>('#backing-status')!;
  const controls = document.querySelector<HTMLElement>('#backing-controls')!;

  let settings = readStorage<Settings>('jdl:backing', { volume: 0.7, withPlay: true, loop: false });
  const save = () => writeStorage('jdl:backing', settings);

  let gain: GainNode | undefined;
  let into: AudioNode | undefined;
  let element: HTMLAudioElement | undefined;
  let tab: MediaStream | undefined;
  let source: AudioNode | undefined;
  let name = '';

  // Into the master (before the limiter). Strudel rebuilds its output now and
  // then, so the connection is checked again every second
  const route = () => {
    const master = getLimiter()?.master;
    if (!gain || !master || master === into) return;
    if (into) gain.disconnect(into);
    gain.connect(master);
    into = master;
  };

  const ready = async () => {
    await ensureAudio();
    ensureLimiter();
    const context = (globalThis as { getAudioContext?: () => AudioContext }).getAudioContext!();
    gain ??= new GainNode(context, { gain: settings.volume });
    route();
    return context;
  };

  const render = () => {
    const loaded = Boolean(element || tab);
    controls.hidden = !loaded;
    playButton.hidden = !element;
    playButton.textContent = element && !element.paused ? t('backingPause') : t('backingPlayTrack');
    if (!loaded) status.textContent = t('backingNone');
    else if (tab) status.textContent = t('backingTab', { name });
    else status.textContent = `${name} · ${clockTime(element!.currentTime)} / ${clockTime(element!.duration)}`;
  };

  const clear = () => {
    element?.pause();
    if (element) URL.revokeObjectURL(element.src);
    tab?.getTracks().forEach((track) => track.stop());
    source?.disconnect();
    element = undefined;
    tab = undefined;
    source = undefined;
    playing = undefined;
    render();
  };

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    const context = await ready();
    clear();
    element = new Audio(URL.createObjectURL(file));
    element.loop = settings.loop;
    element.addEventListener('ended', render);
    source = context.createMediaElementSource(element);
    source.connect(gain!);
    playing = source;
    name = file.name.replace(/\.[^.]+$/, '');
    render();
  });

  // The tab's sound: the browser asks which tab, and "Share tab audio" must be
  // ticked. Its own playback is muted (suppressLocalAudioPlayback), or you
  // would hear it twice; the picture is not needed, so it stops at once
  tabButton.addEventListener('click', async () => {
    const context = await ready();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: { suppressLocalAudioPlayback: true } as MediaTrackConstraints,
        selfBrowserSurface: 'exclude',
      } as DisplayMediaStreamOptions);
    } catch {
      return; // cancelled
    }
    stream.getVideoTracks().forEach((track) => track.stop());
    const audio = stream.getAudioTracks()[0];
    if (!audio) {
      status.textContent = t('backingNoTabAudio');
      return;
    }
    clear();
    tab = stream;
    name = audio.label || t('backingTabName');
    source = context.createMediaStreamSource(stream);
    source.connect(gain!);
    playing = source;
    audio.addEventListener('ended', clear);
    render();
  });

  playButton.addEventListener('click', () => {
    if (!element) return;
    if (element.paused) void element.play();
    else element.pause();
    render();
  });
  clearButton.addEventListener('click', clear);

  volumeInput.value = String(settings.volume);
  withPlayBox.checked = settings.withPlay;
  loopBox.checked = settings.loop;
  volumeInput.addEventListener('input', () => {
    settings = { ...settings, volume: Number(volumeInput.value) };
    if (gain) gain.gain.setTargetAtTime(settings.volume, gain.context.currentTime, 0.03);
    save();
  });
  withPlayBox.addEventListener('change', () => {
    settings = { ...settings, withPlay: withPlayBox.checked };
    save();
  });
  loopBox.addEventListener('change', () => {
    settings = { ...settings, loop: loopBox.checked };
    if (element) element.loop = settings.loop;
    save();
  });

  // With the studio's Play: from the top, when the first bar is heard (the
  // scheduler plays a little ahead); Stop pauses and goes back to the top
  let wasPlaying = false;
  window.setInterval(() => {
    const playing = Boolean(scheduler?.started);
    if (playing !== wasPlaying && element && settings.withPlay) {
      if (playing) {
        element.currentTime = 0;
        const lead = (scheduler?.latency ?? 0.1) * 1000;
        window.setTimeout(() => void element?.play().then(render), lead);
      } else {
        element.pause();
        element.currentTime = 0;
      }
    }
    wasPlaying = playing;
  }, 20);
  window.setInterval(() => {
    route();
    if (element) render();
  }, 500);

  render();
  onLangChange(render);
}
