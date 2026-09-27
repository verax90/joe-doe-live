// Recording: the studio's output as a WAV (full quality, for Reaper or
// Audacity), the visuals plus sound as a video of the screen, or a vertical
// 9:16 video for socials, with the code on top if you like. It taps the signal
// after the limiter, so it records exactly what you hear: patterns and free play.
import { onLangChange, t } from './i18n';
import { ensureAudio } from './audio';
import { onHydraFrame } from './ascii';
import { scopeCanvas } from './scope';
import { ensureLimiter, getLimiter } from './limiter';
import { micForRecording } from './mic';

type Mode = 'audio' | 'video' | 'vertical' | 'vertical-code';

// MP4 plays everywhere (Instagram, TikTok, phones) and Chrome records it since
// version 126; older browsers get WebM
export function videoFormat(isSupported: (type: string) => boolean) {
  const candidates: [string, string][] = [
    ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'mp4'],
    ['video/mp4;codecs=avc1,mp4a', 'mp4'],
    ['video/mp4', 'mp4'],
    ['video/webm;codecs=vp9,opus', 'webm'],
    ['video/webm;codecs=vp8,opus', 'webm'],
  ];
  const [mimeType, extension] = candidates.find(([type]) => isSupported(type)) ?? ['video/webm', 'webm'];
  return { mimeType, extension };
}

// Vertical video: 1080 × 1920, what phones and socials expect
export const VERTICAL = { width: 1080, height: 1920 };
const CODE_FONT = 30;
const CODE_LINE = 40;
const CODE_MARGIN = 48;

// The code as it fits on the video: long lines cut with …, and if there are
// too many, the first ones and a … line
export function codeLines(code: string, maxChars: number, maxLines: number) {
  const lines = code.replace(/\s+$/, '').split('\n');
  const cut = lines.map((line) => (line.length > maxChars ? `${line.slice(0, maxChars - 1)}…` : line));
  return cut.length > maxLines ? [...cut.slice(0, maxLines - 1), '…'] : cut;
}

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

export function setupRecorder(getCode: () => string) {
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
    // The mic, when it is not already in the studio output
    const mic = micForRecording();
    mic?.connect(tap);
    return async () => {
      output.disconnect(tap);
      mic?.disconnect(tap);
      tap.port.onmessage = null;
      download(encodeWav(blocks, context.sampleRate), 'wav');
    };
  };

  // Records a canvas (the visuals, or the vertical composite) with the sound
  const recordCanvas = (source: HTMLCanvasElement, output: AudioNode, context: AudioContext, onStop: () => void) => {
    const audio = context.createMediaStreamDestination();
    output.connect(audio);
    const mic = micForRecording();
    mic?.connect(audio);
    const stream = new MediaStream([...source.captureStream(30).getVideoTracks(), ...audio.stream.getAudioTracks()]);
    const { mimeType, extension } = videoFormat((type) => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => event.data.size && chunks.push(event.data);
    recorder.start(1000);
    return () =>
      new Promise<void>((resolve) => {
        recorder.onstop = () => {
          onStop();
          output.disconnect(audio);
          mic?.disconnect(audio);
          stream.getTracks().forEach((track) => track.stop());
          download(new Blob(chunks, { type: mimeType.split(';')[0] }), extension);
          resolve();
        };
        recorder.stop();
      });
  };

  // Hydra at a given size while recording, then back to how it was
  const resizeVisuals = async (canvas: HTMLCanvasElement, size: { width: number; height: number }) => {
    const hydra = (await (globalThis as { initHydra?: () => Promise<unknown> }).initHydra?.()) as
      | { setResolution?: (width: number, height: number) => void }
      | undefined;
    const previous = { width: canvas.width, height: canvas.height };
    canvas.width = size.width;
    canvas.height = size.height;
    hydra?.setResolution?.(size.width, size.height);
    // One drawn frame first, so the video does not open on black
    // (a hidden tab draws no frames, hence the 200 ms cap)
    await Promise.race([
      new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      new Promise((resolve) => setTimeout(resolve, 200)),
    ]);
    return () => {
      canvas.width = previous.width;
      canvas.height = previous.height;
      hydra?.setResolution?.(previous.width, previous.height);
    };
  };

  // With the ASCII filter on, what you see (and record) is its overlay
  const shownCanvas = (canvas: HTMLCanvasElement) => {
    const ascii = document.getElementById('ascii-canvas') as HTMLCanvasElement | null;
    return ascii && !ascii.hidden ? ascii : canvas;
  };

  const startVideo = async (output: AudioNode, context: AudioContext) => {
    const canvas = document.getElementById('hydra-canvas') as HTMLCanvasElement | null;
    if (!canvas) throw new Error(t('recordNoVisual'));
    // Visuals normally draw at half resolution to spare CPU; a video deserves
    // the full window
    const restore = await resizeVisuals(canvas, { width: Math.round(window.innerWidth), height: Math.round(window.innerHeight) });
    return recordCanvas(shownCanvas(canvas), output, context, restore);
  };

  // Vertical: the visuals render natively at 1080 × 1920 in a 9:16 frame in
  // the middle of the screen (what you see is what is recorded), and each
  // frame is copied to a composite with the code and the site's name on top
  const startVertical = async (output: AudioNode, context: AudioContext, withCode: boolean) => {
    const canvas = document.getElementById('hydra-canvas') as HTMLCanvasElement | null;
    if (!canvas) throw new Error(t('recordNoVisual'));
    document.body.classList.add('is-vertical');
    const restore = await resizeVisuals(canvas, VERTICAL);
    const composite = document.createElement('canvas');
    composite.width = VERTICAL.width;
    composite.height = VERTICAL.height;
    const draw2d = composite.getContext('2d')!;
    const colours = getComputedStyle(document.documentElement);
    const accent = colours.getPropertyValue('--accent').trim() || '#d6ff4b';
    const fg = colours.getPropertyValue('--fg').trim() || '#eceae4';
    const muted = colours.getPropertyValue('--muted').trim() || '#9a9aa3';
    const maxChars = Math.floor((VERTICAL.width - CODE_MARGIN * 2) / (CODE_FONT * 0.6));
    const maxLines = Math.floor((VERTICAL.height - CODE_MARGIN * 2 - 120) / CODE_LINE);
    // Drawn right after each Hydra frame (see onHydraFrame), at its 30 fps
    const draw = () => {
      draw2d.fillStyle = '#000';
      draw2d.fillRect(0, 0, VERTICAL.width, VERTICAL.height);
      draw2d.drawImage(shownCanvas(canvas), 0, 0, VERTICAL.width, VERTICAL.height);
      // The audio waves, if on, along the bottom as on screen
      const scope = scopeCanvas();
      if (scope) draw2d.drawImage(scope, 0, VERTICAL.height - 260, VERTICAL.width, 200);
      if (withCode) {
        draw2d.font = `${CODE_FONT}px 'IBM Plex Mono', monospace`;
        draw2d.textBaseline = 'top';
        codeLines(getCode(), maxChars, maxLines).forEach((line, i) => {
          if (!line.trim()) return;
          const y = CODE_MARGIN + i * CODE_LINE;
          // a dark band behind each line, like the editor, so it reads on any visual
          draw2d.fillStyle = 'rgba(0, 0, 0, 0.6)';
          draw2d.fillRect(CODE_MARGIN - 8, y - 4, draw2d.measureText(line).width + 16, CODE_LINE);
          draw2d.fillStyle = line.trimStart().startsWith('//') ? muted : fg;
          draw2d.fillText(line, CODE_MARGIN, y);
        });
      }
      draw2d.font = `600 28px 'IBM Plex Mono', monospace`;
      draw2d.textBaseline = 'alphabetic';
      draw2d.textAlign = 'right';
      draw2d.globalAlpha = 0.85;
      draw2d.fillStyle = accent;
      draw2d.fillText('live.joedoe.dev', VERTICAL.width - CODE_MARGIN, VERTICAL.height - CODE_MARGIN);
      draw2d.globalAlpha = 1;
      draw2d.textAlign = 'left';
    };
    const stopDrawing = onHydraFrame(draw);
    return recordCanvas(composite, output, context, () => {
      stopDrawing();
      document.body.classList.remove('is-vertical');
      restore();
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
      await ensureAudio();
      ensureLimiter();
      const limiter = getLimiter();
      if (!limiter) throw new Error(t('recordNoAudio'));
      const mode = modeSelect.value as Mode;
      stop =
        mode === 'video'
          ? await startVideo(limiter.limiter, context)
          : mode === 'vertical' || mode === 'vertical-code'
            ? await startVertical(limiter.limiter, context, mode === 'vertical-code')
            : await startAudio(limiter.limiter, context);
      status.textContent = '';
      setRecording();
    } catch (error) {
      stop = null;
      setIdle();
      status.textContent = error instanceof Error ? error.message : String(error);
    }
  });
}
