// Retro: old things floating, drawn on a 2D canvas that Hydra reads as s1
// (like ridges.ts), so the tint, the VJ and the finish work on them.
// 'vapor' is a vaporwave sunset: a striped sun, a magenta grid floor
// running to the beat, and cassettes, old computers, floppies, CDs, palms
// and columns floating in the sky. 'web' is a home page from the nineties:
// stars, a scrolling welcome, rainbow rules, a visit counter, and error
// windows piling up on the kicks while the same things float by.
import { lang } from './i18n';

type Hydra = { init(options: { src: HTMLCanvasElement; dynamic: boolean }): void };
type Mode = 'vapor' | 'web' | 'hifi' | 'desk';
type Thing = { kind: number; x: number; y: number; size: number; speed: number; spin: number; phase: number };

const g = globalThis as {
  kickHit?: () => number;
  snareHit?: () => number;
  kickCount?: () => number;
  level?: () => number;
  bass?: () => number;
  high?: () => number;
  spec?: (step: number) => number;
  s1?: Hydra;
  retro?: typeof retro;
};
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

// ---- the hi-fi: two needle meters, an LED equaliser with the peaks held,
// and a cassette deck whose reels turn while it plays
const needles = [0, 0];
const peaks = Array.from({ length: 8 }, () => ({ v: 0, at: 0 }));
function hifi(c: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const wood = c.createLinearGradient(0, 0, 0, h);
  wood.addColorStop(0, '#3b2414');
  wood.addColorStop(0.5, '#5a3820');
  wood.addColorStop(1, '#3b2414');
  c.fillStyle = wood;
  c.fillRect(0, 0, w, h);
  // the brushed aluminium front
  const front = { x: w * 0.05, y: h * 0.12, w: w * 0.9, h: h * 0.76 };
  const metal = c.createLinearGradient(0, front.y, 0, front.y + front.h);
  metal.addColorStop(0, '#c9ccd1');
  metal.addColorStop(1, '#8d9096');
  c.fillStyle = metal;
  c.fillRect(front.x, front.y, front.w, front.h);
  c.fillStyle = 'rgba(255,255,255,0.06)';
  for (let y = front.y; y < front.y + front.h; y += 3) c.fillRect(front.x, y, front.w, 1);
  // two VU meters, left the low end, right the top
  const read = [g.bass?.() ?? 0, Math.max(g.high?.() ?? 0, g.level?.() ?? 0)];
  for (let m = 0; m < 2; m++) {
    needles[m] += ((Math.min(1, read[m] * 1.3)) - needles[m]) * (read[m] > needles[m] ? 0.35 : 0.08);
    const cx = front.x + front.w * (0.16 + m * 0.24);
    const cy = front.y + front.h * 0.42;
    const mw = front.w * 0.2;
    const mh = front.h * 0.34;
    c.fillStyle = '#1a1a1a';
    c.fillRect(cx - mw / 2 - 4, cy - mh / 2 - 4, mw + 8, mh + 8);
    const face = c.createLinearGradient(0, cy - mh / 2, 0, cy + mh / 2);
    face.addColorStop(0, '#fff3c4');
    face.addColorStop(1, '#f2c66b');
    c.fillStyle = face;
    c.fillRect(cx - mw / 2, cy - mh / 2, mw, mh);
    const px = cx;
    const py = cy + mh * 0.42;
    const r = mh * 0.72;
    c.lineWidth = 2;
    for (let i = 0; i <= 10; i++) {
      const a = -Math.PI * 0.78 + (i / 10) * Math.PI * 0.56;
      c.strokeStyle = i >= 8 ? '#c4161c' : '#222';
      c.beginPath();
      c.moveTo(px + Math.cos(a) * r * 0.86, py + Math.sin(a) * r * 0.86);
      c.lineTo(px + Math.cos(a) * r, py + Math.sin(a) * r);
      c.stroke();
    }
    c.strokeStyle = '#c4161c';
    c.lineWidth = 4;
    c.beginPath();
    c.arc(px, py, r * 0.93, -Math.PI * 0.78 + Math.PI * 0.56 * 0.8, -Math.PI * 0.22);
    c.stroke();
    c.fillStyle = '#222';
    c.font = `bold ${Math.round(mh * 0.12)}px sans-serif`;
    c.textAlign = 'center';
    c.fillText('VU', px, cy + mh * 0.1);
    const a = -Math.PI * 0.78 + needles[m] * Math.PI * 0.56;
    c.strokeStyle = '#111';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(px, py);
    c.lineTo(px + Math.cos(a) * r * 1.02, py + Math.sin(a) * r * 1.02);
    c.stroke();
    // the red light when it peaks
    c.fillStyle = needles[m] > 0.85 ? '#ff2a2a' : '#5a1010';
    c.beginPath();
    c.arc(cx + mw * 0.4, cy - mh * 0.35, 5, 0, Math.PI * 2);
    c.fill();
  }
  // the LED equaliser: eight bands of twelve lights, each holding its peak
  const ex = front.x + front.w * 0.55;
  const ey = front.y + front.h * 0.12;
  const ew = front.w * 0.4;
  const eh = front.h * 0.5;
  c.fillStyle = '#0b0b0b';
  c.fillRect(ex, ey, ew, eh);
  const bandW = ew / 8;
  const segH = eh / 13;
  for (let b = 0; b < 8; b++) {
    const v = Math.min(1, (g.spec?.(b) ?? 0) * 1.25);
    const lit = Math.round(v * 12);
    const peak = peaks[b];
    if (lit >= peak.v) {
      peak.v = lit;
      peak.at = t;
    } else if (t - peak.at > 0.6) peak.v = Math.max(lit, peak.v - 0.25);
    for (let s = 0; s < 12; s++) {
      const on = s < lit || s === Math.round(peak.v) - 1;
      const colour = s >= 10 ? '#ff3030' : s >= 7 ? '#ffd030' : '#3dff5a';
      c.fillStyle = on ? colour : 'rgba(255,255,255,0.05)';
      c.fillRect(ex + b * bandW + bandW * 0.15, ey + eh - (s + 1) * segH, bandW * 0.7, segH * 0.7);
    }
  }
  // the cassette deck
  const dx = front.x + front.w * 0.06;
  const dy = front.y + front.h * 0.7;
  const dw = front.w * 0.42;
  const dh = front.h * 0.24;
  c.fillStyle = '#151515';
  c.fillRect(dx, dy, dw, dh);
  c.fillStyle = '#2a2a2a';
  c.fillRect(dx + dw * 0.1, dy + dh * 0.15, dw * 0.8, dh * 0.7);
  for (const side of [-1, 1]) {
    c.save();
    c.translate(dx + dw / 2 + side * dw * 0.2, dy + dh / 2);
    c.rotate(t * 2.5);
    c.fillStyle = '#ddd';
    c.beginPath();
    c.arc(0, 0, dh * 0.24, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#222';
    for (let k = 0; k < 6; k++) {
      c.rotate(Math.PI / 3);
      c.fillRect(-2, dh * 0.08, 4, dh * 0.1);
    }
    c.restore();
  }
  // the tape counter: one more on every kick
  const count = String((g.kickCount?.() ?? 0) % 1000).padStart(3, '0');
  c.fillStyle = '#000';
  c.fillRect(front.x + front.w * 0.55, dy + dh * 0.2, front.w * 0.12, dh * 0.6);
  c.fillStyle = '#ff9a2a';
  c.font = `bold ${Math.round(dh * 0.45)}px monospace`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(count, front.x + front.w * 0.61, dy + dh * 0.52);
  // and the knobs
  for (let k = 0; k < 3; k++) {
    const kx = front.x + front.w * (0.74 + k * 0.08);
    const ky = dy + dh * 0.5;
    c.fillStyle = '#3a3a3a';
    c.beginPath();
    c.arc(kx, ky, dh * 0.34, 0, Math.PI * 2);
    c.fill();
    const a = -Math.PI * 0.75 + ((Math.sin(t * 0.3 + k) + 1) / 2) * Math.PI * 1.5;
    c.strokeStyle = '#eee';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(kx, ky);
    c.lineTo(kx + Math.cos(a) * dh * 0.3, ky + Math.sin(a) * dh * 0.3);
    c.stroke();
  }
  c.fillStyle = '#333';
  c.font = `bold ${Math.round(h * 0.03)}px sans-serif`;
  c.textAlign = 'left';
  c.fillText('STEREO  ·  HI-FI', front.x + 14, front.y + 20);
}

// ---- an old desktop: icons, a drawing program that draws by itself to
// the beat, a clock in the corner and the pointer wandering
const ICONS = [
  { en: 'My disk', es: 'Mi disco', ca: 'El meu disc' },
  { en: 'Music', es: 'Música', ca: 'Música' },
  { en: 'Games', es: 'Juegos', ca: 'Jocs' },
  { en: 'Bin', es: 'Papelera', ca: 'Paperera' },
];
const PAINT = { en: 'Paint', es: 'Pintar', ca: 'Pintar' };
let paper: HTMLCanvasElement | undefined;
let pen = { x: 0.5, y: 0.5, hue: 0 };
function desk(c: CanvasRenderingContext2D, w: number, h: number, t: number, kick: number) {
  c.fillStyle = '#008080';
  c.fillRect(0, 0, w, h);
  const s = h * 0.06;
  c.textAlign = 'center';
  c.textBaseline = 'top';
  c.font = `${Math.round(h * 0.024)}px sans-serif`;
  ICONS.forEach((label, i) => {
    const x = w * 0.07;
    const y = h * 0.06 + i * h * 0.17;
    c.save();
    c.translate(x, y + s / 2);
    if (i === 0) {
      c.fillStyle = '#c0c0c0';
      c.fillRect(-s / 2, -s / 3, s, s * 0.66);
      c.fillStyle = '#2d6';
      c.fillRect(s * 0.25, s * 0.1, s * 0.12, s * 0.08);
    } else if (i === 1) {
      c.fillStyle = '#ffd400';
      c.beginPath();
      c.arc(-s * 0.15, s * 0.2, s * 0.18, 0, Math.PI * 2);
      c.fill();
      c.fillRect(-s * 0.01, -s * 0.4, s * 0.06, s * 0.6);
      c.fillRect(-s * 0.01, -s * 0.4, s * 0.3, s * 0.08);
    } else if (i === 2) {
      c.fillStyle = '#ddd';
      c.fillRect(-s / 2, -s / 4, s, s / 2);
      c.fillStyle = '#d22';
      c.beginPath();
      c.arc(s * 0.25, 0, s * 0.08, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#333';
      c.fillRect(-s * 0.35, -s * 0.04, s * 0.25, s * 0.08);
      c.fillRect(-s * 0.26, -s * 0.13, s * 0.08, s * 0.26);
    } else {
      c.fillStyle = '#bbb';
      c.fillRect(-s * 0.3, -s * 0.3, s * 0.6, s * 0.7);
      c.fillStyle = '#888';
      c.fillRect(-s * 0.36, -s * 0.38, s * 0.72, s * 0.1);
    }
    c.restore();
    c.fillStyle = '#fff';
    c.fillText(say(label), x, y + s * 1.1);
  });
  // the drawing program's window
  const win = { x: w * 0.25, y: h * 0.08, w: w * 0.6, h: h * 0.7 };
  c.fillStyle = '#c0c0c0';
  c.fillRect(win.x, win.y, win.w, win.h);
  c.fillStyle = '#fff';
  c.fillRect(win.x, win.y, win.w, 2);
  c.fillRect(win.x, win.y, 2, win.h);
  c.fillStyle = '#404040';
  c.fillRect(win.x, win.y + win.h - 2, win.w, 2);
  c.fillRect(win.x + win.w - 2, win.y, 2, win.h);
  const bar = c.createLinearGradient(win.x, 0, win.x + win.w, 0);
  bar.addColorStop(0, '#000080');
  bar.addColorStop(1, '#1084d0');
  c.fillStyle = bar;
  c.fillRect(win.x + 3, win.y + 3, win.w - 6, h * 0.04);
  c.fillStyle = '#fff';
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  c.font = `bold ${Math.round(h * 0.025)}px sans-serif`;
  c.fillText(say(PAINT), win.x + 10, win.y + 3 + h * 0.02);
  // the palette down the left of the window
  const colours = ['#000', '#fff', '#f00', '#ff0', '#0f0', '#0ff', '#00f', '#f0f'];
  colours.forEach((colour, i) => {
    c.fillStyle = colour;
    c.fillRect(win.x + 8 + (i % 2) * 18, win.y + h * 0.07 + Math.floor(i / 2) * 18, 16, 16);
  });
  // the picture, kept between frames on its own canvas
  const area = { x: win.x + 52, y: win.y + h * 0.06, w: win.w - 60, h: win.h - h * 0.06 - 8 };
  if (!paper || paper.width !== Math.round(area.w) || paper.height !== Math.round(area.h)) {
    paper = document.createElement('canvas');
    paper.width = Math.round(area.w);
    paper.height = Math.round(area.h);
    const pc = paper.getContext('2d')!;
    pc.fillStyle = '#fff';
    pc.fillRect(0, 0, paper.width, paper.height);
  }
  const pc = paper.getContext('2d')!;
  const next = {
    x: 0.5 + 0.4 * Math.sin(t * 0.9) * Math.cos(t * 0.37),
    y: 0.5 + 0.4 * Math.sin(t * 1.3 + 1) * Math.sin(t * 0.21 + 2),
  };
  if (kick > 0.9) pen.hue = (pen.hue + 47) % 360;
  pc.strokeStyle = `hsl(${pen.hue}, 90%, 50%)`;
  pc.lineWidth = 3 + kick * 14;
  pc.lineCap = 'round';
  pc.beginPath();
  pc.moveTo(pen.x * paper.width, pen.y * paper.height);
  pc.lineTo(next.x * paper.width, next.y * paper.height);
  pc.stroke();
  // a slow fade, so the picture keeps changing
  pc.fillStyle = 'rgba(255,255,255,0.004)';
  pc.fillRect(0, 0, paper.width, paper.height);
  pen = { ...next, hue: pen.hue };
  c.drawImage(paper, area.x, area.y);
  // the pointer, drawing
  const cx = area.x + next.x * area.w;
  const cy = area.y + next.y * area.h;
  c.fillStyle = '#fff';
  c.strokeStyle = '#000';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(cx, cy);
  c.lineTo(cx, cy + 18);
  c.lineTo(cx + 5, cy + 13);
  c.lineTo(cx + 9, cy + 21);
  c.lineTo(cx + 12, cy + 19);
  c.lineTo(cx + 8, cy + 12);
  c.lineTo(cx + 14, cy + 12);
  c.closePath();
  c.fill();
  c.stroke();
  // the bar at the bottom with the clock
  c.fillStyle = '#c0c0c0';
  c.fillRect(0, h - h * 0.06, w, h * 0.06);
  c.fillStyle = '#fff';
  c.fillRect(0, h - h * 0.06, w, 2);
  const now = new Date();
  c.fillStyle = '#000';
  c.textAlign = 'right';
  c.font = `${Math.round(h * 0.026)}px sans-serif`;
  c.fillText(now.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' }), w - 12, h - h * 0.03);
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
  if (mode === 'hifi') {
    hifi(c, w, h, t);
    c.restore();
    return;
  }
  if (mode === 'desk') {
    desk(c, w, h, t, kick);
    c.restore();
    return;
  }
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
