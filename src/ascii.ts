// ASCII filter over any visual (webcam included): each frame Hydra draws is
// shrunk to a character grid and written as text, denser characters where the
// image is brighter. One fillText per row, not per character, so it stays cheap
// on the thread the notes are scheduled from.

// Hydra copies the global afterUpdate into its settings on every frame
type Globals = { afterUpdate?: (dt: number) => void };

const RAMP = ' .:-=+*#%@';
const CELL_WIDTH = 9;
const CELL_HEIGHT = 16;
const STORAGE_KEY = 'jdl:ascii';

let enabled = false;
let overlay: HTMLCanvasElement | undefined;
let sampler: CanvasRenderingContext2D | undefined;

function ensureOverlay(source: HTMLCanvasElement) {
  if (overlay) return overlay;
  overlay = document.createElement('canvas');
  overlay.id = 'ascii-canvas';
  overlay.className = 'ascii-canvas';
  overlay.setAttribute('aria-hidden', 'true');
  source.after(overlay);
  sampler = document.createElement('canvas').getContext('2d', { willReadFrequently: true }) ?? undefined;
  return overlay;
}

function draw(source: HTMLCanvasElement) {
  const target = ensureOverlay(source);
  const context = target.getContext('2d');
  if (!context || !sampler) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.round(window.innerWidth * ratio);
  const height = Math.round(window.innerHeight * ratio);
  if (target.width !== width || target.height !== height) {
    target.width = width;
    target.height = height;
  }
  const cols = Math.max(1, Math.floor(window.innerWidth / CELL_WIDTH));
  const rows = Math.max(1, Math.floor(window.innerHeight / CELL_HEIGHT));
  sampler.canvas.width = cols;
  sampler.canvas.height = rows;
  sampler.drawImage(source, 0, 0, cols, rows);
  const pixels = sampler.getImageData(0, 0, cols, rows).data;

  const styles = getComputedStyle(document.documentElement);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.fillStyle = styles.getPropertyValue('--bg').trim() || '#12151c';
  context.fillRect(0, 0, window.innerWidth, window.innerHeight);
  context.fillStyle = styles.getPropertyValue('--accent').trim() || '#d6ff4b';
  context.font = `${CELL_HEIGHT - 2}px 'IBM Plex Mono', monospace`;
  context.textBaseline = 'top';
  // Auto contrast: the darkest cell becomes a space and the brightest an @, so
  // dark visuals (and dim webcams) still use the whole ramp
  // Float64: with Float32 storage a cell could land a hair below `darkest`
  // and index the ramp at -1 ("undefined" on screen)
  const light = new Float64Array(cols * rows);
  let darkest = 1;
  let brightest = 0;
  for (let cell = 0; cell < light.length; cell++) {
    const i = cell * 4;
    const value = (0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]) / 255;
    light[cell] = value;
    darkest = Math.min(darkest, value);
    brightest = Math.max(brightest, value);
  }
  const range = Math.max(brightest - darkest, 0.08);
  for (let row = 0; row < rows; row++) {
    let line = '';
    for (let col = 0; col < cols; col++) {
      const value = (light[row * cols + col] - darkest) / range;
      line += RAMP[Math.max(0, Math.min(RAMP.length - 1, Math.floor(value * RAMP.length)))];
    }
    context.fillText(line, 0, row * CELL_HEIGHT, window.innerWidth);
  }
}

// Hook into Hydra right after it renders, while its frame is still readable
export function attachAscii(_hydra?: unknown) {
  const source = document.getElementById('hydra-canvas') as HTMLCanvasElement | null;
  if (!source) return;
  (globalThis as Globals).afterUpdate = enabled ? () => draw(source) : () => {};
  source.style.visibility = enabled ? 'hidden' : '';
  if (overlay) overlay.hidden = !enabled;
}

export function readAsciiSetting() {
  try {
    enabled = localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    enabled = false;
  }
  return enabled;
}

export function setAscii(on: boolean, hydra: unknown) {
  enabled = on;
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    // not remembered, still works
  }
  attachAscii(hydra);
}

export const isAsciiOn = () => enabled;
