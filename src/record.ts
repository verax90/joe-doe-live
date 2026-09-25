// Recording: the studio's output as a WAV (full quality, for Reaper or
// Audacity) or the visuals plus sound as a WebM video. It taps the signal
// after the limiter, so it records exactly what you hear: patterns and free play.
import { onLangChange, t } from './i18n';
import { ensureLimiter, getLimiter } from './limiter';

type Mode = 'audio' | 'video';

// Copies every block of audio to the main thread; kept tiny on purpose
const TAP_PROCESSOR = `
class Tap extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input.length) this.port.postMessage(input.map((channel) => channel.slice()));
    return true;
  }
}
registerProcessor('jdl-tap', Tap);
`;

export function encodeWav(channels: Float32Array[][], sampleRate: number) {
  const channelCount = 2;
  const length = channels.reduce((sum, block) => sum + block[0].length, 0);
  const buffer = new ArrayBuffer(44 + length * channelCount * 2);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + length * channelCount * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channelCount * 2, true);
  view.setUint16(32, channelCount * 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, length * channelCount * 2, true);
  let offset = 44;
  for (const block of channels) {
    const left = block[0];
    const right = block[1] ?? block[0];
    for (let i = 0; i < left.length; i++) {
      for (const sample of [left[i], right[i]]) {
        const clamped = Math.max(-1, Math.min(1, sample));
        view.setInt16(offset, Math.round(clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff), true);
        offset += 2;
      }
    }
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

function download(blob: Blob, extension: string) {
  // Local time, so the file name matches the clock on your screen
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `joe-doe-live-${stamp}.${extension}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 60_000);
}

export function setupRecorder() {
  const button = document.querySelector<HTMLButtonElement>('#record')!;
  const label = button.querySelector<HTMLElement>('.record-label')!;
  const modeSelect = document.querySelector<HTMLSelectElement>('#record-mode')!;
  const status = document.querySelector<HTMLElement>('#record-status')!;

  let stop: (() => Promise<void>) | null = null;
  let startedAt = 0;
  let timer: number | undefined;

  const setIdle = () => {
    button.classList.remove('is-recording');
    button.setAttribute('aria-pressed', 'false');
    label.textContent = t('record');
    button.setAttribute('aria-label', t('record'));
    modeSelect.disabled = false;
    clearInterval(timer);
  };

  const setRecording = () => {
    button.classList.add('is-recording');
    button.setAttribute('aria-pressed', 'true');
    modeSelect.disabled = true;
    startedAt = performance.now();
    const tick = () => {
      const seconds = Math.floor((performance.now() - startedAt) / 1000);
      label.textContent = `${t('stopRecording')} ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
      button.setAttribute('aria-label', label.textContent);
    };
    tick();
    timer = window.setInterval(tick, 500);
  };

  const startAudio = async (output: AudioNode, context: BaseAudioContext) => {
    const url = URL.createObjectURL(new Blob([TAP_PROCESSOR], { type: 'text/javascript' }));
    await context.audioWorklet.addModule(url);
    const tap = new AudioWorkletNode(context, 'jdl-tap', { numberOfInputs: 1, numberOfOutputs: 0, channelCount: 2, channelCountMode: 'explicit' });
    const blocks: Float32Array[][] = [];
    tap.port.onmessage = (event) => blocks.push(event.data);
    output.connect(tap);
    return async () => {
      output.disconnect(tap);
      tap.port.onmessage = null;
      download(encodeWav(blocks, context.sampleRate), 'wav');
    };
  };

  const startVideo = async (output: AudioNode, context: AudioContext) => {
    const canvas = document.getElementById('hydra-canvas') as HTMLCanvasElement | null;
    if (!canvas) throw new Error(t('recordNoVisual'));
    // Visuals normally draw at half resolution to spare CPU; a video deserves
    // the full window, so bump it while recording and put it back afterwards
    const hydra = (await (globalThis as { initHydra?: () => Promise<unknown> }).initHydra?.()) as
      | { setResolution?: (width: number, height: number) => void }
      | undefined;
    const previous = { width: canvas.width, height: canvas.height };
    const full = { width: Math.round(window.innerWidth), height: Math.round(window.innerHeight) };
    canvas.width = full.width;
    canvas.height = full.height;
    hydra?.setResolution?.(full.width, full.height);
    const restore = () => {
      canvas.width = previous.width;
      canvas.height = previous.height;
      hydra?.setResolution?.(previous.width, previous.height);
    };
    // One drawn frame first, so the video does not open on black
    // (a hidden tab draws no frames, hence the 200 ms cap)
    await Promise.race([
      new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      new Promise((resolve) => setTimeout(resolve, 200)),
    ]);
    const audio = context.createMediaStreamDestination();
    output.connect(audio);
    const stream = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...audio.stream.getAudioTracks()]);
    const type = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((candidate) =>
      MediaRecorder.isTypeSupported(candidate),
    );
    const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 6_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => event.data.size && chunks.push(event.data);
    recorder.start(1000);
    return () =>
      new Promise<void>((resolve) => {
        recorder.onstop = () => {
          restore();
          output.disconnect(audio);
          stream.getTracks().forEach((track) => track.stop());
          download(new Blob(chunks, { type: 'video/webm' }), 'webm');
          resolve();
        };
        recorder.stop();
      });
  };

  onLangChange(() => {
    if (!stop) setIdle();
  });

  button.addEventListener('click', async () => {
    if (stop) {
      const finish = stop;
      stop = null;
      setIdle();
      status.textContent = t('recordSaving');
      await finish();
      status.textContent = t('recordSaved');
      return;
    }
    const context = (globalThis as { getAudioContext?: () => AudioContext }).getAudioContext?.();
    if (!context) return;
    try {
      if (context.state !== 'running') await context.resume();
      ensureLimiter();
      const limiter = getLimiter();
      if (!limiter) throw new Error(t('recordNoAudio'));
      const mode = modeSelect.value as Mode;
      stop = mode === 'video' ? await startVideo(limiter.limiter, context) : await startAudio(limiter.limiter, context);
      status.textContent = '';
      setRecording();
    } catch (error) {
      stop = null;
      setIdle();
      status.textContent = error instanceof Error ? error.message : String(error);
    }
  });
}
