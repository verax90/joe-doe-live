// Backing track: a song under the patterns. Your own file (any audio, or a
// video's sound), or the sound of another tab (YouTube, a playlist) captured
// with the browser's screen sharing. It goes into the studio's master, so the
// volume knob, the limiter, recordings, the audio waves and the Lines visual
// all get it; it is not sent to a live room. A file can start and stop with
// the studio's Play, landing on the first bar you hear.
import { ensureAudio } from './audio';
import { audioTimeOfCycle, whenCycleKnown } from './cycle-clock';
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
// For stems: the track as heard, after its volume
let heard: AudioNode | undefined;
export const backingOutput = () => (playing ? heard : undefined);

// A loaded song, whichever way it plays
type Track = {
  paused(): boolean;
  position(): number;
  duration(): number;
  play(at?: number): void; // from where it is, at an audio clock time
  pause(): void;
  rewind(): void;
  setLoop(on: boolean): void;
  dispose(): void;
};

// Decoded into memory and played by the audio clock: it starts on the exact
// sample asked for, so it lands on the bar. If that moment has just passed,
// it starts at once from where the song should already be
export function bufferTrack(context: BaseAudioContext, buffer: AudioBuffer, output: AudioNode, onEnd: () => void, loop = false): Track {
  let node: AudioBufferSourceNode | undefined;
  let startedAt = 0;
  let offset = 0;
  const stopNode = () => {
    const current = node;
    node = undefined;
    if (!current) return;
    current.onended = null;
    current.stop();
    current.disconnect();
  };
  const position = () => {
    if (!node) return offset;
    const elapsed = Math.max(0, context.currentTime - startedAt);
    return loop ? elapsed % buffer.duration : Math.min(elapsed, buffer.duration);
  };
  return {
    paused: () => !node,
    position,
    duration: () => buffer.duration,
    play(at = context.currentTime) {
      if (node) return;
      const late = Math.max(0, context.currentTime - at);
      const from = (offset + late) % buffer.duration;
      node = new AudioBufferSourceNode(context, { buffer, loop });
      node.connect(output);
      node.start(Math.max(at, context.currentTime), from);
      startedAt = Math.max(at, context.currentTime) - from;
      const started = node;
      node.onended = () => {
        if (started !== node) return;
        node = undefined;
        offset = 0;
        onEnd();
      };
    },
    pause() {
      offset = position();
      stopNode();
    },
    rewind() {
      stopNode();
      offset = 0;
    },
    setLoop(on) {
      loop = on;
      if (node) node.loop = on;
    },
    dispose: stopNode,
  };
}

// A very long song stays a media element (decoding it would take too much
// memory); it starts a little late, as media elements do
function elementTrack(context: AudioContext, url: string, output: AudioNode, onEnd: () => void, loop: boolean): Track {
  const element = new Audio(url);
  element.loop = loop;
  element.addEventListener('ended', onEnd);
  const source = context.createMediaElementSource(element);
  source.connect(output);
  return {
    paused: () => element.paused,
    position: () => element.currentTime,
    duration: () => element.duration,
    play(at = context.currentTime) {
      window.setTimeout(() => void element.play(), Math.max(0, (at - context.currentTime) * 1000));
    },
    pause: () => element.pause(),
    rewind() {
      element.pause();
      element.currentTime = 0;
    },
    setLoop(on) {
      element.loop = on;
    },
    dispose() {
      element.pause();
      source.disconnect();
      URL.revokeObjectURL(url);
    },
  };
}

// Files up to this size are decoded (about 12 minutes of mp3, 4 of wav)
const DECODE_LIMIT = 40 * 1024 * 1024;

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

  let bus: GainNode | undefined; // the track before its volume
  let gain: GainNode | undefined;
  let into: AudioNode | undefined;
  let track: Track | undefined;
  let tab: MediaStream | undefined;
  let tabSource: AudioNode | undefined;
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
    heard = gain;
    if (!bus) {
      bus = context.createGain();
      bus.connect(gain);
    }
    route();
    return context;
  };

  const render = () => {
    const loaded = Boolean(track || tab);
    controls.hidden = !loaded;
    playButton.hidden = !track;
    playButton.textContent = track && !track.paused() ? t('backingPause') : t('backingPlayTrack');
    if (!loaded) status.textContent = t('backingNone');
    else if (tab) status.textContent = t('backingTab', { name });
    else status.textContent = `${name} · ${clockTime(track!.position())} / ${clockTime(track!.duration())}`;
  };

  const clear = () => {
    track?.dispose();
    tab?.getTracks().forEach((media) => media.stop());
    tabSource?.disconnect();
    track = undefined;
    tab = undefined;
    tabSource = undefined;
    playing = undefined;
    render();
  };

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    const context = await ready();
    clear();
    name = file.name.replace(/\.[^.]+$/, '');
    if (file.size <= DECODE_LIMIT) {
      status.textContent = t('backingLoading');
      try {
        const buffer = await context.decodeAudioData(await file.arrayBuffer());
        track = bufferTrack(context, buffer, bus!, render, settings.loop);
      } catch {
        status.textContent = t('backingUnreadable');
        return;
      }
    } else {
      track = elementTrack(context, URL.createObjectURL(file), bus!, render, settings.loop);
    }
    playing = bus;
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
    tabSource = context.createMediaStreamSource(stream);
    tabSource.connect(bus!);
    playing = bus;
    audio.addEventListener('ended', clear);
    render();
  });

  playButton.addEventListener('click', () => {
    if (!track) return;
    if (track.paused()) track.play();
    else track.pause();
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
    track?.setLoop(settings.loop);
    save();
  });

  // With the studio's Play: from the top, when the first bar sounds (read
  // from Strudel's own schedule, cycle-clock.ts); Stop pauses and goes back
  // to the top
  const startOnFirstBar = async () => {
    const song = track;
    if (!song) return;
    const at = (await whenCycleKnown()) ? audioTimeOfCycle(0) : undefined;
    if (song === track && scheduler?.started) song.play(at);
    render();
  };
  let wasPlaying = false;
  window.setInterval(() => {
    const running = Boolean(scheduler?.started);
    if (running !== wasPlaying && track && settings.withPlay) {
      track.rewind();
      if (running) void startOnFirstBar();
      render();
    }
    wasPlaying = running;
  }, 20);
  window.setInterval(() => {
    route();
    if (track) render();
  }, 500);

  render();
  onLangChange(render);
}
