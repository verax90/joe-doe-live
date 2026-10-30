// Broken glass on the drop: during the last bar of a build-up cracks spread
// from a point near the middle of the picture, on the drop it bursts into
// shards that fly out and fall, and over the next bar they fly back into
// place. Drawn on a canvas laid exactly over the visuals (it shares the ASCII
// filter's place), from a frozen copy of the picture at the drop; the
// projector and the video recorder lay it over their copy too.
import { onHydraFrame } from './ascii';

type Point = [number, number];
export type Shard = { points: Point[]; cx: number; cy: number; vx: number; vy: number; spin: number };

// A pane broken from (ix, iy): rays out of the impact, cut by rings, so each
// shard is a triangle (inner ring) or a quad. Neighbours share their corners,
// and the outer ring is beyond the corners, so together they cover it all
export function makeShards(width: number, height: number, ix: number, iy: number, random = Math.random): Shard[] {
  const rays = 11 + Math.floor(random() * 4);
  const rings = 4;
  const reach = Math.hypot(Math.max(ix, width - ix), Math.max(iy, height - iy)) * 1.05;
  const angles = Array.from({ length: rays }, (_, i) => ((i + 0.2 + random() * 0.6) / rays) * Math.PI * 2);
  // radius of each ray at each ring, jittered, the last one past the corners
  const radius = angles.map(() =>
    Array.from({ length: rings + 1 }, (_, k) => (k === 0 ? 0 : k === rings ? reach : reach * Math.pow(k / rings, 1.5) * (0.8 + random() * 0.4))),
  );
  const at = (ray: number, ring: number): Point => {
    const i = ray % rays;
    const r = radius[i][ring];
    return [ix + Math.cos(angles[i]) * r, iy + Math.sin(angles[i]) * r];
  };
  const shards: Shard[] = [];
  for (let ray = 0; ray < rays; ray++) {
    for (let ring = 1; ring <= rings; ring++) {
      const points = ring === 1 ? [at(ray, 0), at(ray, 1), at(ray + 1, 1)] : [at(ray, ring - 1), at(ray, ring), at(ray + 1, ring), at(ray + 1, ring - 1)];
      const cx = points.reduce((sum, p) => sum + p[0], 0) / points.length;
      const cy = points.reduce((sum, p) => sum + p[1], 0) / points.length;
      // out from the impact, faster near it, and a little upwards first
      const dx = cx - ix;
      const dy = cy - iy;
      const distance = Math.hypot(dx, dy) || 1;
      const speed = height * (0.25 + random() * 0.5) * (1.6 - ring / rings);
      shards.push({
        points,
        cx,
        cy,
        vx: (dx / distance) * speed,
        vy: (dy / distance) * speed - height * (0.2 + random() * 0.3),
        spin: (random() - 0.5) * 6,
      });
    }
  }
  return shards;
}

// Where a shard is p of the way through the bar after the drop: falling until
// FALL, then easing back into place
export const FALL = 0.55;
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export function shardOffset(shard: Shard, p: number, barSeconds: number, gravity: number) {
  const fall = (time: number) => ({
    x: shard.vx * time,
    y: shard.vy * time + 0.5 * gravity * time * time,
    angle: shard.spin * time,
  });
  if (p <= FALL) return fall(p * barSeconds);
  const end = fall(FALL * barSeconds);
  const back = 1 - ease(Math.min(1, (p - FALL) / (1 - FALL)));
  return { x: end.x * back, y: end.y * back, angle: end.angle * back };
}

let canvas: HTMLCanvasElement | undefined;
let state:
  | { phase: 'cracks'; from: number; to: number; ix: number; iy: number; shards: Shard[] }
  | { phase: 'burst'; from: number; bar: number; snapshot?: HTMLCanvasElement; shards: Shard[] }
  | undefined;
let frame = 0;
let timer = 0;

// The canvas while there is glass to show, for the projector and recordings
export const shatterCanvas = () => (state && canvas && !canvas.hidden ? canvas : undefined);

function source() {
  const ascii = document.getElementById('ascii-canvas') as HTMLCanvasElement | null;
  if (ascii && !ascii.hidden) return ascii;
  return document.getElementById('hydra-canvas') as HTMLCanvasElement | null;
}

function ensureCanvas() {
  const under = source();
  if (!under) return undefined;
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.className = 'ascii-canvas shatter-canvas'; // the same place as the visuals
    canvas.setAttribute('aria-hidden', 'true');
  }
  // right above whatever shows the visuals
  if (canvas.previousElementSibling !== under) under.after(canvas);
  // its own pixels match the picture's, at most 1280 wide: plenty for glass
  const scale = Math.min(1, 1280 / Math.max(1, under.width));
  const width = Math.max(1, Math.round(under.width * scale));
  const height = Math.max(1, Math.round(under.height * scale));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  canvas.hidden = false;
  return canvas;
}

function stop() {
  cancelAnimationFrame(frame);
  window.clearTimeout(timer);
  state = undefined;
  if (canvas) {
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    canvas.hidden = true;
  }
}

function drawCracks(g: CanvasRenderingContext2D, progress: number, width: number, shards: Shard[]) {
  g.clearRect(0, 0, g.canvas.width, g.canvas.height);
  g.lineJoin = 'round';
  // a dark edge under a light line, so it reads on bright and dark visuals
  // the edges of the shards, nearest first: each appears when the crack
  // reaches it, the outer ones only near the end
  const rings = 4;
  shards.forEach((shard, index) => {
    const ring = (index % rings) + 1;
    const shown = Math.min(1, Math.max(0, progress * (rings + 1) - (ring - 1)));
    if (shown <= 0) return;
    g.globalAlpha = shown;
    g.beginPath();
    shard.points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.strokeStyle = 'rgba(0,0,0,0.6)';
    g.lineWidth = Math.max(2, width / 260);
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.85)';
    g.lineWidth = Math.max(1, width / 600);
    g.stroke();
  });
  g.globalAlpha = 1;
}

function drawBurst(g: CanvasRenderingContext2D, now: number) {
  if (state?.phase !== 'burst' || !state.snapshot) return;
  const { width, height } = g.canvas;
  const elapsed = (now - state.from) / 1000;
  const p = elapsed / state.bar;
  if (p >= 1) return stop();
  g.clearRect(0, 0, width, height);
  // the hole behind: the live visuals, darkened, lighter as the glass returns
  const back = p <= FALL ? 1 : 1 - (p - FALL) / (1 - FALL);
  g.fillStyle = `rgba(0,0,0,${0.85 * back})`;
  g.fillRect(0, 0, width, height);
  const gravity = height * 3;
  g.lineWidth = Math.max(1.5, width / 450);
  g.strokeStyle = `rgba(255,255,255,${0.7 * back})`;
  for (const shard of state.shards) {
    const { x, y, angle } = shardOffset(shard, p, state.bar, gravity);
    g.save();
    g.translate(shard.cx + x, shard.cy + y);
    g.rotate(angle);
    g.translate(-shard.cx, -shard.cy);
    g.beginPath();
    shard.points.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
    g.closePath();
    g.save();
    g.clip();
    g.drawImage(state.snapshot, 0, 0, width, height);
    g.restore();
    g.stroke();
    g.restore();
  }
  // the hit itself: a white flash that fades in a tenth of a second
  if (elapsed < 0.12) {
    g.fillStyle = `rgba(255,255,255,${0.7 * (1 - elapsed / 0.12)})`;
    g.fillRect(0, 0, width, height);
  }
}

function tick() {
  frame = requestAnimationFrame(tick);
  if (!state || !canvas) return;
  const g = canvas.getContext('2d')!;
  const now = performance.now();
  if (state.phase === 'cracks') {
    if (now < state.from) return;
    drawCracks(g, Math.min(1, (now - state.from) / (state.to - state.from)), canvas.width, state.shards);
  } else drawBurst(g, now);
}

// Plans the glass for a drop at dropAt (performance.now() time), with bars of
// barSeconds: cracks over the last bar, the burst on the drop, back in place
// a bar later. Stop or a cancelled build calls cancelShatter()
export function shatterAt(dropAt: number, barSeconds: number) {
  stop();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const target = ensureCanvas();
  if (!target) return;
  const { width, height } = target;
  const ix = width * (0.5 + (Math.random() - 0.5) * 0.3);
  const iy = height * (0.5 + (Math.random() - 0.5) * 0.3);
  const shards = makeShards(width, height, ix, iy);
  state = { phase: 'cracks', from: dropAt - barSeconds * 1000, to: dropAt, ix, iy, shards };
  frame = requestAnimationFrame(tick);
  // The picture is frozen on the first visuals frame after the drop, while
  // the WebGL canvas can still be read (see onHydraFrame)
  timer = window.setTimeout(() => {
    state = { phase: 'burst', from: performance.now(), bar: barSeconds, shards };
    const take = () => {
      const under = source();
      if (state?.phase !== 'burst' || !under || !canvas) return;
      const snapshot = document.createElement('canvas');
      snapshot.width = canvas.width;
      snapshot.height = canvas.height;
      snapshot.getContext('2d')!.drawImage(under, 0, 0, snapshot.width, snapshot.height);
      state.snapshot = snapshot;
      off();
    };
    const off = onHydraFrame(take);
    // no visuals running (none chosen): nothing to break
    window.setTimeout(() => {
      off();
      if (state?.phase === 'burst' && !state.snapshot) stop();
    }, 400);
  }, Math.max(0, dropAt - performance.now()));
}

export const cancelShatter = stop;
