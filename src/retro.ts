// Retro: old things floating, drawn on a 2D canvas that Hydra reads as s1
// (like ridges.ts), so the tint, the VJ and the finish work on them.
// 'vapor' is a vaporwave sunset: a striped sun, a magenta grid floor
// running to the beat, and cassettes, old computers, floppies, CDs, palms
// and columns floating in the sky. 'web' is a home page from the nineties:
// stars, a scrolling welcome, rainbow rules, a visit counter, and error
// windows piling up on the kicks while the same things float by.
import { lang } from './i18n';

type Hydra = { init(options: { src: HTMLCanvasElement; dynamic: boolean }): void };
type Mode = 'vapor' | 'web';
type Thing = { kind: number; x: number; y: number; size: number; speed: number; spin: number; phase: number };

const g = globalThis as { kickHit?: () => number; kickCount?: () => number; s1?: Hydra; retro?: typeof retro };
let canvas: HTMLCanvasElement | undefined;
let context: CanvasRenderingContext2D | null = null;
let running = false;
let frame = 0;
let fedTo: unknown;
let mode: Mode = 'vapor';
let things: Thing[] = [];
let windows: { x: number; y: number; vx: number; vy: number; title: number; born: number }[] = [];
let lastKicks = -1;
let stars: { x: number; y: number; s: number }[] = [];

const KINDS = 6; // cassette, computer, floppy, CD, palm, column
const random = (seed: number) => {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

// A fixed, scattered set: bigger ones are nearer and move faster
export function retroThings(count: number): Thing[] {
  return Array.from({ length: count }, (_, i) => ({
    kind: i % KINDS,
    x: random(i + 1),
    y: 0.08 + random(i + 7) * 0.42,
    size: 0.07 + random(i + 13) * 0.08,
    speed: 0.01 + random(i + 19) * 0.025,
    spin: (random(i + 23) - 0.5) * 0.8,
    phase: random(i + 29) * Math.PI * 2,
  }));
}

const WELCOME = { en: 'WELCOME TO MY HOME PAGE', es: 'BIENVENIDO A MI PÁGINA', ca: 'BENVINGUT A LA MEVA PÀGINA' };
const UNDER = { en: 'UNDER CONSTRUCTION', es: 'EN CONSTRUCCIÓN', ca: 'EN CONSTRUCCIÓ' };
const ERRORS = [
  { en: 'Error', es: 'Error', ca: 'Error' },
  { en: 'Not responding', es: 'No responde', ca: 'No respon' },
  { en: 'Out of memory', es: 'Sin memoria', ca: 'Sense memòria' },
  { en: 'Are you sure?', es: '¿Seguro?', ca: 'Segur?' },
];
const say = (text: Record<'en' | 'es' | 'ca', string>) => text[lang] ?? text.en;

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

// ---- the things, each drawn around (0, 0) at a width of about s
function cassette(c: CanvasRenderingContext2D, s: number, t: number) {
  const w = s;
  const h = s * 0.64;
  c.fillStyle = '#222';
  c.fillRect(-w / 2, -h / 2, w, h);
  c.fillStyle = '#ff5fa2';
  c.fillRect(-w * 0.44, -h * 0.42, w * 0.88, h * 0.5);
  c.fillStyle = '#ffe36b';
  c.fillRect(-w * 0.44, -h * 0.42, w * 0.88, h * 0.1);
  c.fillStyle = '#111';
  c.fillRect(-w * 0.28, -h * 0.22, w * 0.56, h * 0.24);
  for (const side of [-1, 1]) {
    c.save();
    c.translate(side * w * 0.17, -h * 0.1);
    c.rotate(t * 3);
    c.fillStyle = '#eee';
    c.beginPath();
    c.arc(0, 0, h * 0.09, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#111';
    for (let k = 0; k < 6; k++) {
      c.rotate(Math.PI / 3);
      c.fillRect(-h * 0.012, h * 0.03, h * 0.024, h * 0.05);
    }
    c.restore();
  }
  c.fillStyle = '#444';
  c.beginPath();
  c.moveTo(-w * 0.3, h / 2);
  c.lineTo(-w * 0.24, h * 0.22);
  c.lineTo(w * 0.24, h * 0.22);
  c.lineTo(w * 0.3, h / 2);
  c.fill();
}

function computer(c: CanvasRenderingContext2D, s: number, t: number) {
  const w = s;
  const h = s * 0.8;
  c.fillStyle = '#d8d0b8';
  c.fillRect(-w / 2, -h / 2, w, h * 0.82);
  c.fillStyle = '#b5ac93';
  c.fillRect(-w * 0.3, h * 0.32, w * 0.6, h * 0.08);
  c.fillRect(-w * 0.55, h * 0.4, w * 1.1, h * 0.12);
  c.fillStyle = '#0b1a0b';
  c.fillRect(-w * 0.4, -h * 0.4, w * 0.8, h * 0.56);
  c.fillStyle = '#4bff6b';
  const lines = 5;
  for (let i = 0; i < lines; i++) {
    const len = 0.2 + random(i * 3 + Math.floor(t * 0.5)) * 0.5;
    c.fillRect(-w * 0.35, -h * 0.34 + i * h * 0.09, w * 0.7 * len, h * 0.04);
  }
  if (Math.floor(t * 2) % 2) c.fillRect(-w * 0.35, -h * 0.34 + lines * h * 0.09, w * 0.05, h * 0.05);
  c.fillStyle = '#7a735f';
  c.fillRect(w * 0.3, h * 0.22, w * 0.08, h * 0.03);
}

function floppy(c: CanvasRenderingContext2D, s: number) {
  const w = s * 0.8;
  c.fillStyle = '#2a3fd6';
  c.fillRect(-w / 2, -w / 2, w, w);
  c.fillStyle = '#c9ced6';
  c.fillRect(-w * 0.22, -w / 2, w * 0.44, w * 0.32);
  c.fillStyle = '#2a3fd6';
  c.fillRect(w * 0.06, -w * 0.45, w * 0.1, w * 0.22);
  c.fillStyle = '#f4f1e8';
  c.fillRect(-w * 0.38, w * 0.02, w * 0.76, w * 0.44);
  c.fillStyle = '#ff5fa2';
  c.fillRect(-w * 0.38, w * 0.02, w * 0.76, w * 0.06);
}

function cd(c: CanvasRenderingContext2D, s: number, t: number) {
  const r = s * 0.45;
  c.save();
  c.rotate(t);
  const gradient = c.createConicGradient(0, 0, 0);
  ['#ff9ad5', '#9df', '#bfa', '#ffe36b', '#d9a6ff', '#ff9ad5'].forEach((colour, i) => gradient.addColorStop(i / 5, colour));
  c.fillStyle = gradient;
  c.beginPath();
  c.arc(0, 0, r, 0, Math.PI * 2);
  c.arc(0, 0, r * 0.16, 0, Math.PI * 2, true);
  c.fill();
  c.restore();
  c.strokeStyle = 'rgba(255,255,255,0.7)';
  c.lineWidth = 1;
  c.beginPath();
  c.arc(0, 0, r * 0.3, 0, Math.PI * 2);
  c.stroke();
}

function palm(c: CanvasRenderingContext2D, s: number, t: number) {
  c.strokeStyle = '#1b0a2e';
  c.fillStyle = '#1b0a2e';
  c.lineWidth = s * 0.06;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(0, s * 0.6);
  c.quadraticCurveTo(s * 0.12, s * 0.1, -s * 0.02, -s * 0.3);
  c.stroke();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.55 + Math.sin(t * 1.5 + i) * 0.06;
    c.beginPath();
    c.moveTo(-s * 0.02, -s * 0.3);
    c.quadraticCurveTo(Math.cos(a) * s * 0.3, -s * 0.3 + Math.sin(a) * s * 0.3 - s * 0.05, Math.cos(a) * s * 0.5, -s * 0.3 + Math.sin(a) * s * 0.2 + s * 0.15);
    c.lineWidth = s * 0.09;
    c.stroke();
  }
}

function column(c: CanvasRenderingContext2D, s: number) {
  const w = s * 0.3;
  const h = s * 0.9;
  c.fillStyle = '#f3eef7';
  c.fillRect(-w * 0.8, -h / 2, w * 1.6, h * 0.08);
  c.fillRect(-w * 0.8, h * 0.42, w * 1.6, h * 0.08);
  c.fillRect(-w / 2, -h * 0.42, w, h * 0.84);
  c.fillStyle = '#c7b9d6';
  for (let i = -2; i <= 2; i++) c.fillRect(i * w * 0.18 - w * 0.03, -h * 0.4, w * 0.06, h * 0.8);
}

function drawThing(c: CanvasRenderingContext2D, thing: Thing, x: number, y: number, size: number, t: number) {
  c.save();
  c.translate(x, y);
  c.rotate(Math.sin(t * thing.spin + thing.phase) * 0.35);
  // a soft shadow behind, so they stand out of the sky
  c.shadowColor = 'rgba(0,0,0,0.35)';
  c.shadowBlur = size * 0.15;
  c.shadowOffsetY = size * 0.06;
  if (thing.kind === 0) cassette(c, size, t);
  else if (thing.kind === 1) computer(c, size, t);
  else if (thing.kind === 2) floppy(c, size);
  else if (thing.kind === 3) cd(c, size, t);
  else if (thing.kind === 4) palm(c, size, t);
  else column(c, size);
  c.restore();
}

// ---- the two scenes
function vapor(c: CanvasRenderingContext2D, w: number, h: number, t: number, kick: number) {
  const horizon = h * 0.62;
  const sky = c.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, '#1a0638');
  sky.addColorStop(0.55, '#7b1fa2');
  sky.addColorStop(1, '#ff6fb5');
  c.fillStyle = sky;
  c.fillRect(0, 0, w, horizon);
  // the sun, cut by stripes that get thicker towards the horizon
  const r = h * 0.24 * (1 + kick * 0.04);
  const sun = c.createLinearGradient(0, horizon - r, 0, horizon);
  sun.addColorStop(0, '#ffe36b');
  sun.addColorStop(1, '#ff3d8b');
  c.fillStyle = sun;
  c.beginPath();
  c.arc(w / 2, horizon, r, Math.PI, 0);
  c.fill();
  c.fillStyle = sky;
  for (let i = 0; i < 7; i++) {
    const y = horizon - r * 0.55 + i * r * 0.085 + ((t * 12) % (r * 0.085));
    c.fillRect(w / 2 - r, y, r * 2, 1 + i * 1.4);
  }
  // the floor: a grid running towards you, faster on a kick
  c.fillStyle = '#12021f';
  c.fillRect(0, horizon, w, h - horizon);
  c.strokeStyle = '#ff2fd0';
  c.lineWidth = 1.5;
  c.shadowColor = '#ff2fd0';
  c.shadowBlur = 8;
  const run = (t * 0.6 + kick * 0.05) % 1;
  for (let i = 0; i < 14; i++) {
    const z = (i + 1 - run) / 14;
    const y = horizon + (h - horizon) * z * z;
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(w, y);
    c.stroke();
  }
  for (let i = -12; i <= 12; i++) {
    c.beginPath();
    c.moveTo(w / 2 + i * w * 0.02, horizon);
    c.lineTo(w / 2 + i * w * 0.16, h);
    c.stroke();
  }
  c.shadowBlur = 0;
}

function web(c: CanvasRenderingContext2D, w: number, h: number, t: number, kick: number) {
  c.fillStyle = '#000018';
  c.fillRect(0, 0, w, h);
  if (!stars.length) stars = Array.from({ length: 140 }, (_, i) => ({ x: random(i + 101), y: random(i + 303), s: random(i + 505) }));
  for (const star of stars) {
    const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(t * (1 + star.s * 3) + star.s * 10));
    c.fillStyle = `rgba(255,255,255,${twinkle})`;
    const size = star.s > 0.9 ? 2 : 1;
    c.fillRect(star.x * w, star.y * h, size, size);
  }
  // the welcome, scrolling across in rainbow letters
  const text = say(WELCOME);
  c.font = `bold ${Math.round(h * 0.07)}px "Comic Sans MS", "Comic Neue", cursive`;
  c.textBaseline = 'middle';
  const width = c.measureText(text).width;
  const start = w - ((t * 220) % (w + width));
  let x = start;
  for (let i = 0; i < text.length; i++) {
    const letter = text[i];
    c.fillStyle = `hsl(${(i * 24 + t * 200) % 360}, 100%, 60%)`;
    c.fillText(letter, x, h * 0.15 + Math.sin(t * 6 + i * 0.6) * h * 0.015);
    x += c.measureText(letter).width;
  }
  // rainbow rules
  for (const y of [h * 0.2, h * 0.86]) {
    const rule = c.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i <= 6; i++) rule.addColorStop(i / 6, `hsl(${(i * 60 + t * 90) % 360}, 100%, 55%)`);
    c.fillStyle = rule;
    c.fillRect(w * 0.08, y, w * 0.84, 4);
  }
  // under construction tape and the visit counter
  c.save();
  c.translate(w * 0.17, h * 0.93);
  c.fillStyle = '#ffd400';
  c.fillRect(-w * 0.15, -h * 0.03, w * 0.3, h * 0.06);
  c.fillStyle = '#000';
  for (let i = -8; i < 8; i++) {
    c.beginPath();
    c.moveTo(i * 20, -h * 0.03);
    c.lineTo(i * 20 + 10, -h * 0.03);
    c.lineTo(i * 20 - 2, h * 0.03);
    c.lineTo(i * 20 - 12, h * 0.03);
    c.fill();
  }
  c.fillStyle = '#ffd400';
  c.fillRect(-w * 0.12, -h * 0.017, w * 0.24, h * 0.034);
  c.fillStyle = '#000';
  c.font = `bold ${Math.round(h * 0.025)}px monospace`;
  c.textAlign = 'center';
  c.fillText(say(UNDER), 0, 1);
  c.restore();
  const visits = String(1337 + (g.kickCount?.() ?? 0)).padStart(6, '0');
  c.font = `bold ${Math.round(h * 0.04)}px monospace`;
  c.textAlign = 'left';
  for (let i = 0; i < visits.length; i++) {
    c.fillStyle = '#111';
    c.fillRect(w * 0.72 + i * h * 0.035, h * 0.9, h * 0.032, h * 0.05);
    c.fillStyle = '#4bff6b';
    c.fillText(visits[i], w * 0.72 + i * h * 0.035 + h * 0.004, h * 0.927);
  }
  if (Math.floor(t * 3) % 2) {
    c.fillStyle = '#ff2020';
    c.font = `bold ${Math.round(h * 0.035)}px sans-serif`;
    c.fillText('NEW!', w * 0.62, h * 0.93);
  }
  void kick;
}

// The error windows: one more on each kick, each bouncing off the edges
// like a screen saver; the oldest go when there are too many
function errorWindows(c: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const kicks = g.kickCount?.() ?? 0;
  if (kicks !== lastKicks) {
    if (lastKicks >= 0 && mode === 'web') {
      windows.push({ x: random(kicks) * w * 0.7, y: h * 0.25 + random(kicks + 9) * h * 0.4, vx: (random(kicks + 3) - 0.5) * 3, vy: (random(kicks + 5) - 0.5) * 2, title: kicks % ERRORS.length, born: t });
      if (windows.length > 7) windows.shift();
    }
    lastKicks = kicks;
  }
  const ww = w * 0.24;
  const wh = h * 0.16;
  for (const box of windows) {
    box.x += box.vx;
    box.y += box.vy;
    if (box.x < 0 || box.x > w - ww) box.vx *= -1;
    if (box.y < h * 0.2 || box.y > h * 0.85 - wh) box.vy *= -1;
    c.fillStyle = '#c0c0c0';
    c.fillRect(box.x, box.y, ww, wh);
    c.fillStyle = '#fff';
    c.fillRect(box.x, box.y, ww, 2);
    c.fillRect(box.x, box.y, 2, wh);
    c.fillStyle = '#404040';
    c.fillRect(box.x, box.y + wh - 2, ww, 2);
    c.fillRect(box.x + ww - 2, box.y, 2, wh);
    const bar = c.createLinearGradient(box.x, 0, box.x + ww, 0);
    bar.addColorStop(0, '#000080');
    bar.addColorStop(1, '#1084d0');
    c.fillStyle = bar;
    c.fillRect(box.x + 3, box.y + 3, ww - 6, wh * 0.18);
    c.fillStyle = '#fff';
    c.font = `bold ${Math.round(wh * 0.12)}px sans-serif`;
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.fillText(say(ERRORS[box.title]), box.x + 8, box.y + 3 + wh * 0.09);
    c.fillStyle = '#ff0000';
    c.beginPath();
    c.arc(box.x + ww * 0.13, box.y + wh * 0.55, wh * 0.13, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#fff';
    c.font = `bold ${Math.round(wh * 0.18)}px sans-serif`;
    c.textAlign = 'center';
    c.fillText('×', box.x + ww * 0.13, box.y + wh * 0.56);
    c.fillStyle = '#c0c0c0';
    c.strokeStyle = '#000';
    c.lineWidth = 1;
    c.fillRect(box.x + ww * 0.38, box.y + wh * 0.72, ww * 0.24, wh * 0.18);
    c.strokeRect(box.x + ww * 0.38, box.y + wh * 0.72, ww * 0.24, wh * 0.18);
    c.fillStyle = '#000';
    c.font = `${Math.round(wh * 0.11)}px sans-serif`;
    c.fillText('OK', box.x + ww * 0.5, box.y + wh * 0.81);
  }
}

function draw(now: number) {
  if (!running || !canvas || !context) return;
  frame = requestAnimationFrame(draw);
  fit();
  const c = context;
  const { width: w, height: h } = canvas;
  const t = now / 1000;
  const kick = g.kickHit?.() ?? 0;
  c.save();
  if (mode === 'vapor') vapor(c, w, h, t, kick);
  else web(c, w, h, t, kick);
  // the things drift sideways and bob; nearer ones in front, a kick lifts them
  const sorted = [...things].sort((a, b) => a.size - b.size);
  for (const thing of sorted) {
    const x = (((thing.x + t * thing.speed) % 1.2) - 0.1) * w;
    const top = mode === 'vapor' ? thing.y : 0.25 + thing.y * 0.9;
    const y = (top + Math.sin(t * 0.8 + thing.phase) * 0.03) * h - kick * h * 0.02 * thing.size * 10;
    drawThing(c, thing, x, y, thing.size * h * 1.6, t);
  }
  if (mode === 'web') errorWindows(c, w, h, t);
  else windows = [];
  c.restore();
}

// Called by the visual's code: starts drawing and feeds the canvas to s1
export function retro(which: Mode = 'vapor') {
  if (!canvas) {
    canvas = document.createElement('canvas');
    context = canvas.getContext('2d');
    fit();
  }
  if (which !== mode) windows = [];
  mode = which;
  if (!things.length) things = retroThings(9);
  const source = g.s1;
  if (source && source !== fedTo) {
    source.init({ src: canvas, dynamic: true });
    fedTo = source;
  }
  if (running) return;
  running = true;
  frame = requestAnimationFrame(draw);
}

// Any other visual stops the drawing
export function stopRetro() {
  running = false;
  cancelAnimationFrame(frame);
}

g.retro = retro;
