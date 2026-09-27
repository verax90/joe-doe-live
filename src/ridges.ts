// "Lines": stacked lines with mountains in the middle, after the Unknown
// Pleasures cover (and Silvio Paganini's FLUUUID Lines, which made it move to
// music). Each new line is what sounds now, entering at the front (bottom)
// and moving back (up); the front lines hide what is behind their peaks.
// Drawn on a 2D canvas that Hydra reads as s1, so the theme's tint, ASCII
// and VJ work on it like on any visual. The sound comes off the studio's
// limiter, so any pattern moves it, without .analyze(1).
import { getLimiter } from './limiter';

const LINES = 44;
const POINTS = 110;
const ROWS_PER_SECOND = 20;

// Where the mountains rise: a bell in the middle, flat at the sides
export const ridgeWindow = (x: number) => Math.exp(-(((x - 0.5) / 0.16) ** 2));

// x (0-1 across the line) to a frequency: the middle half of the line spans
// 60 Hz to 8 kHz on a log scale, so the bass is left of centre, the highs right
export const ridgeFrequency = (x: number) => 60 * (8000 / 60) ** Math.min(1, Math.max(0, (x - 0.25) / 0.5));

// One line: the loudness around each point's frequency, shaped by the bell,
// plus a slow wobble so it breathes when nothing plays
export function ridgeRow(
  bins: Float32Array | undefined,
  sampleRate: number,
  time: number,
  phase: number,
  points = POINTS,
) {
  const raw = Float32Array.from({ length: points }, (_, i) => {
    const x = i / (points - 1);
    let energy = 0;
    if (bins?.length) {
      const bin = Math.min(bins.length - 1, Math.round((ridgeFrequency(x) / (sampleRate / 2)) * bins.length));
      const db = Number.isFinite(bins[bin]) ? bins[bin] : -100;
      energy = Math.min(1, Math.max(0, (db + 85) / 60)) ** 1.6;
    }
    const wobble = 0.5 + 0.5 * Math.sin(x * 23 + time * 1.3 + phase) * Math.sin(x * 9.7 - time * 0.7 + phase * 2.1);
    return ridgeWindow(x) * (0.12 * wobble + energy);
  });
  // Neighbouring bins jump around: a little smoothing makes hills, not spikes
  return raw.map((value, i) => ((raw[i - 1] ?? value) + value * 2 + (raw[i + 1] ?? value)) / 4);
}

type Hydra = { init(options: { src: HTMLCanvasElement; dynamic: boolean }): void };

let canvas: HTMLCanvasElement | undefined;
let context: CanvasRenderingContext2D | null = null;
let analyser: AnalyserNode | undefined;
let listening: AudioNode | undefined;
let bins: Float32Array<ArrayBuffer> | undefined;
let rows: Float32Array[] = [];
let frame = 0;
let running = false;
let lastRow = 0;
let rowCount = 0;
let fedTo: unknown;

// The analyser hangs off the current limiter (Strudel rebuilds its output
// now and then, and the limiter with it)
function listen() {
  const limiter = getLimiter()?.limiter;
  if (!limiter || limiter === listening) return;
  analyser = limiter.context.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.55;
  bins = new Float32Array(analyser.frequencyBinCount);
  limiter.connect(analyser);
  listening = limiter;
}

// The canvas keeps the shape of Hydra's, so the lines are not stretched
function fit() {
  const shown = document.getElementById('hydra-canvas');
  const box = shown?.getBoundingClientRect();
  const width = 960;
  const height = Math.round(box && box.width ? (width * box.height) / box.width : 540);
  if (canvas!.width !== width || canvas!.height !== height) {
    canvas!.width = width;
    canvas!.height = height;
  }
}

function draw(now: number) {
  if (!running || !canvas || !context) return;
  frame = requestAnimationFrame(draw);
  listen();
  if (now - lastRow >= 1000 / ROWS_PER_SECOND) {
    lastRow = now;
    if (analyser && bins) analyser.getFloatFrequencyData(bins);
    const sampleRate = analyser?.context.sampleRate ?? 48000;
    rows.push(ridgeRow(analyser ? bins : undefined, sampleRate, now / 1000, rowCount++ * 0.37));
    if (rows.length > LINES) rows = rows.slice(-LINES);
  }
  fit();
  const { width, height } = canvas;
  context.fillStyle = '#000';
  context.fillRect(0, 0, width, height);
  const left = width * 0.2;
  const right = width * 0.8;
  const top = height * 0.2;
  const gap = (height * 0.68) / LINES;
  const lift = gap * 9; // how high a full peak reaches: several lines up
  context.lineWidth = Math.max(1, width / 800);
  context.lineJoin = 'round';
  context.strokeStyle = '#fff';
  // Back to front: the oldest line at the top, the newest at the bottom, each
  // filling black under itself to hide the lines behind its peaks
  const offset = LINES - rows.length;
  const trace = (row: Float32Array, base: number) => {
    row.forEach((value, i) => {
      const x = left + ((right - left) * i) / (row.length - 1);
      const y = base - value * lift;
      if (i === 0) context!.moveTo(x, y);
      else context!.lineTo(x, y);
    });
  };
  rows.forEach((row, index) => {
    const base = top + (offset + index) * gap;
    context!.beginPath();
    trace(row, base);
    context!.lineTo(right, height);
    context!.lineTo(left, height);
    context!.closePath();
    context!.fill();
    context!.beginPath();
    trace(row, base);
    context!.stroke();
  });
}

// Called by the visual's code: starts drawing and feeds the canvas to s1
export function ridges() {
  if (!canvas) {
    canvas = document.createElement('canvas');
    context = canvas.getContext('2d');
    fit();
  }
  const source = (globalThis as { s1?: Hydra }).s1;
  if (source && source !== fedTo) {
    source.init({ src: canvas, dynamic: true });
    fedTo = source;
  }
  if (running) return;
  running = true;
  frame = requestAnimationFrame(draw);
}

// Any other visual stops the drawing
export function stopRidges() {
  running = false;
  cancelAnimationFrame(frame);
}

(globalThis as { ridges?: typeof ridges }).ridges = ridges;
