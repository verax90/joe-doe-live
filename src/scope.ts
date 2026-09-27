// Waves of what is playing: an oscilloscope along the bottom of the screen,
// over any visual (More → Audio waves, remembered). It hangs an analyser off
// the studio's output, after the limiter, so it shows exactly what you hear,
// and draws the wave in the theme's colour at 30 frames a second.
import { ensureAudio } from './audio';
import { ensureLimiter, getLimiter } from './limiter';
import { readStorage, writeStorage } from './storage';

const STORAGE_KEY = 'jdl:scope';

let canvas: HTMLCanvasElement | undefined;
let analyser: AnalyserNode | undefined;
let samples: Float32Array<ArrayBuffer> | undefined;
let frame = 0;
let last = 0;

// The canvas, so a vertical video can draw it in too; undefined while off
export const scopeCanvas = () => (canvas && !canvas.hidden ? canvas : undefined);

// Where the wave starts: the first rise through zero, so it stands still
// instead of sliding sideways every frame
export function triggerPoint(data: ArrayLike<number>, span: number) {
  for (let i = 1; i < data.length - span; i++) if (data[i - 1] < 0 && data[i] >= 0) return i;
  return 0;
}

function draw(time: number) {
  frame = requestAnimationFrame(draw);
  if (!canvas || !analyser || !samples || time - last < 33) return;
  last = time;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const { width, height } = canvas.getBoundingClientRect();
  if (canvas.width !== Math.round(width * ratio)) canvas.width = Math.round(width * ratio);
  if (canvas.height !== Math.round(height * ratio)) canvas.height = Math.round(height * ratio);
  const context = canvas.getContext('2d')!;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  analyser.getFloatTimeDomainData(samples);
  const span = Math.floor(samples.length / 2);
  const start = triggerPoint(samples, span);
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#d6ff4b';
  context.strokeStyle = accent;
  context.lineWidth = 2;
  context.shadowColor = accent;
  context.shadowBlur = 8;
  context.beginPath();
  for (let i = 0; i < span; i++) {
    const x = (i / (span - 1)) * width;
    const y = height / 2 - samples[start + i] * (height / 2) * 0.9;
    if (i) context.lineTo(x, y);
    else context.moveTo(x, y);
  }
  context.stroke();
}

async function turnOn() {
  await ensureAudio();
  ensureLimiter();
  const limiter = getLimiter();
  if (!limiter) return false;
  if (!analyser) {
    analyser = limiter.limiter.context.createAnalyser();
    analyser.fftSize = 2048;
    samples = new Float32Array(analyser.fftSize);
    limiter.limiter.connect(analyser);
  }
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.className = 'scope';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.append(canvas);
  }
  canvas.hidden = false;
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(draw);
  return true;
}

function turnOff() {
  cancelAnimationFrame(frame);
  if (canvas) canvas.hidden = true;
}

export function setupScope() {
  const button = document.querySelector<HTMLButtonElement>('#toggle-scope')!;
  const set = async (on: boolean) => {
    const shown = on ? await turnOn() : (turnOff(), false);
    button.setAttribute('aria-pressed', String(shown));
    writeStorage(STORAGE_KEY, on);
  };
  button.addEventListener('click', () => void set(button.getAttribute('aria-pressed') !== 'true'));
  // Remembered: back on at the first play, once the audio exists
  if (readStorage<boolean>(STORAGE_KEY, false)) {
    button.setAttribute('aria-pressed', 'true');
    const once = () => {
      window.removeEventListener('pointerdown', once);
      void set(true);
    };
    window.addEventListener('pointerdown', once);
  }
}
