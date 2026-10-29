// Clips: footage played like samples. A pattern names clips with s("…") and
// .video() shows each hit instead of sounding it:
//   $: s("tele ~ calle*2 [~ tele]").video()
// Clips that share a name make a pool: s("tele") picks one of them without
// repeating until all have shown, s("tele:2") picks the third. Per hit:
//   begin(0.5)  start halfway (no begin: somewhere at random)
//   speed(2)    twice as fast; speed(-1) backwards
//   gain(0.5)   half see-through
//   legato(0.5) gone after half the step (without it, it holds to the next hit)
//   coarse(8)   big pixels
//   fx("inv")   inv, bw, mirror, flip, zoom, hue, blur, freeze, strobe; broken
//               signal and light: rgb, slice, echo, glow, flash; several joined
//               with _ (fx("bw_mirror")). On layers 1-3, how they mix: add,
//               screen, diff, mult, lighten, overlay, dodge, hard; and woven
//               with the layer under: bands, cols, tiles, half
// .video(1) draws on a layer over layer 0, up to 3. The layers are drawn on a
// canvas that Hydra reads as s2: the Clips visuals show it, and src(s2) works
// in your own Hydra code. Pads in the panel and MIDI notes fire clips too.

export type Clip = {
  id: string;
  name: string; // what a pattern calls it; clips with the same name are a pool
  title: string; // what it was called where it came from
  thumb?: string; // a small JPEG as a data URL
  duration?: number;
  size?: number;
  credit?: { source: string; page: string };
  range?: [number, number]; // the part to use, in seconds; the rest is left out
  added: number;
};

const DB_NAME = 'jdl-clips';
const META = 'clips';
const BLOBS = 'blobs';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(META, { keyPath: 'id' });
      request.result.createObjectStore(BLOBS);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function inStore<T>(store: string, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const request = run(db.transaction(store, mode).objectStore(store));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// "Duck and Cover (1951)" -> "duck" ; a name that reads well inside s("…")
export function clipName(text: string, maxWords = 1) {
  const words = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,4}$/, '')
    .split(/[^a-z0-9]+/)
    .filter((word) => word && !STOP_WORDS.has(word));
  const name = words.slice(0, maxWords).join('_') || 'clip';
  return /^[0-9]/.test(name) ? `v${name}` : name.slice(0, 16);
}
const STOP_WORDS = new Set(['the', 'a', 'an', 'of', 'and', 'el', 'la', 'los', 'las', 'de', 'del', 'y', 'mp4', 'webm', 'mov', 'video', 'vid', 'img', 'file']);

// ── The pool ────────────────────────────────────────────────────────────────

let clips: Clip[] = [];
const listeners = new Set<() => void>();
export const onClipsChange = (listener: () => void) => listeners.add(listener);
const changed = () => listeners.forEach((listener) => listener());
export const allClips = () => clips;

export async function loadClips() {
  try {
    const saved = await inStore<Clip[]>(META, 'readonly', (store) => store.getAll());
    clips = saved.sort((a, b) => a.added - b.added);
  } catch (error) {
    console.warn('[clips]', error);
    clips = [];
  }
  changed();
}

// A video file into the pool, with a thumbnail and its length; throws if the
// browser cannot play it
export async function addClip(blob: Blob, info: { title: string; name?: string; credit?: Clip['credit'] }) {
  const { thumb, duration } = await describe(blob);
  const clip: Clip = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    name: info.name ?? clipName(info.title),
    title: info.title,
    thumb,
    duration,
    size: blob.size,
    credit: info.credit,
    added: Date.now(),
  };
  await inStore(BLOBS, 'readwrite', (store) => store.put(blob, clip.id));
  await inStore(META, 'readwrite', (store) => store.put(clip));
  clips = [...clips, clip];
  changed();
  return clip;
}

export async function renameClip(id: string, name: string) {
  const clip = clips.find((c) => c.id === id);
  const clean = clipName(name, 4);
  if (!clip || !clean || clean === clip.name) return;
  clip.name = clean;
  await inStore(META, 'readwrite', (store) => store.put(clip));
  bags.clear();
  changed();
}

export async function removeClip(id: string) {
  await inStore(META, 'readwrite', (store) => store.delete(id));
  await inStore(BLOBS, 'readwrite', (store) => store.delete(id));
  const element = videos.get(id);
  if (element) {
    for (const layer of layers) {
      if (layer.video === element) layer.video = undefined;
      if (layer.fallback === element) layer.fallback = undefined;
    }
    element.pause();
    URL.revokeObjectURL(element.src);
    element.removeAttribute('src');
    videos.delete(id);
  }
  clips = clips.filter((c) => c.id !== id);
  bags.clear();
  changed();
}

// A first look at a video: its length and a frame from a tenth of the way in
function describe(blob: Blob): Promise<{ thumb?: string; duration?: number }> {
  return new Promise((resolve, reject) => {
    const element = document.createElement('video');
    element.muted = true;
    element.playsInline = true;
    element.preload = 'auto';
    const url = URL.createObjectURL(blob);
    const done = (result: { thumb?: string; duration?: number } | Error) => {
      clearTimeout(timer);
      element.removeAttribute('src');
      element.load();
      URL.revokeObjectURL(url);
      if (result instanceof Error) reject(result);
      else resolve(result);
    };
    const timer = setTimeout(() => done({ duration: Number.isFinite(element.duration) ? element.duration : undefined }), 8000);
    element.onerror = () => done(new Error('unreadable video'));
    element.onloadedmetadata = () => {
      element.currentTime = Number.isFinite(element.duration) ? element.duration * 0.1 : 0;
    };
    element.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 90;
      const context = canvas.getContext('2d')!;
      cover(context, element, 160, 90);
      let thumb: string | undefined;
      try {
        thumb = canvas.toDataURL('image/jpeg', 0.7);
      } catch {
        thumb = undefined;
      }
      done({ thumb, duration: element.duration });
    };
    element.src = url;
  });
}

// Draws a video filling the whole box, cropping what sticks out
function cover(context: CanvasRenderingContext2D, element: HTMLVideoElement, width: number, height: number, zoom = 1) {
  const vw = element.videoWidth;
  const vh = element.videoHeight;
  if (!vw || !vh) return;
  const scale = Math.max(width / vw, height / vh) * zoom;
  const w = vw * scale;
  const h = vh * scale;
  context.drawImage(element, (width - w) / 2, (height - h) / 2, w, h);
}

// ── Picking a clip for a hit ────────────────────────────────────────────────

// Each pool deals its clips like cards: all of them once, in a new order each
// round, never the same one twice in a row across rounds
const bags = new Map<string, string[]>();
const lastPicked = new Map<string, string>();

export function pickFromPool(pool: string[], bag: string[] | undefined, last: string | undefined, random = Math.random) {
  let next = bag?.filter((id) => pool.includes(id)) ?? [];
  if (!next.length) {
    next = [...pool];
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    if (next.length > 1 && next[0] === last) next.push(next.shift()!);
  }
  const [picked, ...rest] = next;
  return { picked, bag: rest };
}

export function findClip(name: string, n?: number): Clip | undefined {
  const pool = clips.filter((clip) => clip.name === name);
  if (!pool.length) return undefined;
  if (n !== undefined && Number.isFinite(n)) return pool[((Math.floor(n) % pool.length) + pool.length) % pool.length];
  const { picked, bag } = pickFromPool(
    pool.map((clip) => clip.id),
    bags.get(name),
    lastPicked.get(name),
  );
  bags.set(name, bag);
  lastPicked.set(name, picked);
  return pool.find((clip) => clip.id === picked);
}

// fx("bw_mirror") -> ['bw', 'mirror'], unknown words left out
export const FX = [
  // the picture
  'inv', 'bw', 'mirror', 'flip', 'zoom', 'hue', 'blur', 'freeze', 'strobe',
  // signal damage and light
  'rgb', 'slice', 'echo', 'glow', 'flash',
  // only pieces of the layer, so the one under it shows between them
  'bands', 'cols', 'tiles', 'half',
  // glitches: datamosh, displaced blocks, pixel-sort drips, VHS tracking,
  // a stuttering loop, burnt colour, scan lines; glitch picks one per hit
  'mosh', 'blocks', 'melt', 'vhs', 'stutter', 'burn', 'scan', 'glitch',
  // keys: the dark parts (key) or the light parts (dark) let the layers
  // under show through: fire, smoke or light over other footage
  'key', 'dark',
  // how a layer mixes with the ones under it
  'add', 'screen', 'diff', 'mult', 'lighten', 'overlay', 'dodge', 'hard',
] as const;
export type Fx = (typeof FX)[number];
export function parseFx(value: unknown): Fx[] {
  if (typeof value !== 'string') return [];
  return value
    .toLowerCase()
    .split(/[_\s,+]+/)
    .filter((word): word is Fx => (FX as readonly string[]).includes(word));
}

const BLENDS: Partial<Record<Fx, GlobalCompositeOperation>> = {
  add: 'lighter',
  screen: 'screen',
  diff: 'difference',
  mult: 'multiply',
  lighten: 'lighten',
  overlay: 'overlay',
  dodge: 'color-dodge',
  hard: 'hard-light',
};

// ── The layers and the canvas Hydra reads ───────────────────────────────────

export const WIDTH = 640;
export const HEIGHT = 360;
export const LAYERS = 4;

type Layer = {
  video?: HTMLVideoElement;
  fallback?: HTMLVideoElement; // the previous picture, while video seeks
  clipId?: string;
  until: number; // performance.now() when it goes dark; Infinity holds
  opacity: number;
  rate: number; // negative plays backwards
  fx: Fx[];
  coarse: number;
  hitAt: number;
  trail?: HTMLCanvasElement; // echo: what this layer showed, fading
  mosh?: HTMLCanvasElement; // mosh: the picture the new one smears into
  startAt: number; // where the hit started in its video, for stutter
  stutterAt: number;
  span?: [number, number]; // the clip's marked part: playback stays inside it
};
// The keys are SVG filters the canvas borrows: the picture's brightness
// becomes how solid it is (key), or the opposite (dark)
let keyFilters: string | undefined;
function ensureKeyFilters() {
  if (keyFilters) return keyFilters;
  keyFilters = 'jdl-clips-key';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  svg.innerHTML = `
    <filter id="${keyFilters}-key" color-interpolation-filters="sRGB">
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0.9 1.8 0.3 0 -0.35" />
    </filter>
    <filter id="${keyFilters}-dark" color-interpolation-filters="sRGB">
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -0.9 -1.8 -0.3 0 2.2" />
    </filter>`;
  document.body.append(svg);
  return keyFilters;
}

const layers: Layer[] = Array.from({ length: LAYERS }, () => ({ until: 0, opacity: 1, rate: 1, fx: [], coarse: 0, hitAt: 0, startAt: 0, stutterAt: 0 }));

const canvas = document.createElement('canvas');
canvas.width = WIDTH;
canvas.height = HEIGHT;
const context = canvas.getContext('2d')!;
// A small canvas for coarse(): drawn tiny, then scaled up without smoothing
const tiny = document.createElement('canvas');
const tinyContext = tiny.getContext('2d')!;

export const clipsCanvas = () => canvas;

const videos = new Map<string, HTMLVideoElement>();

// For the ?debug panel: hits fired, and layer frames drawn while the video
// was still seeking (a cut that showed the old picture for a moment)
export const clipStats = { hits: 0, frames: 0, waiting: 0 };

async function videoFor(clip: Clip) {
  const existing = videos.get(clip.id);
  if (existing) return existing;
  const blob = await inStore<Blob | undefined>(BLOBS, 'readonly', (store) => store.get(clip.id));
  if (!blob) return undefined;
  if (videos.has(clip.id)) return videos.get(clip.id);
  const element = document.createElement('video');
  element.muted = true;
  element.playsInline = true;
  element.loop = true;
  element.preload = 'auto';
  element.src = URL.createObjectURL(blob);
  videos.set(clip.id, element);
  return element;
}

// A clip's video as an address of its own, for the big viewer; free it with
// URL.revokeObjectURL when done
export async function clipAddress(clip: Clip) {
  const blob = await inStore<Blob | undefined>(BLOBS, 'readonly', (store) => store.get(clip.id));
  return blob ? URL.createObjectURL(blob) : null;
}

// Videos the patterns use are opened ahead, so the first hit does not wait
export function warmUp(names: string[]) {
  for (const clip of clips) if (names.includes(clip.name)) void videoFor(clip);
}

const inUse = (element: HTMLVideoElement) => layers.some((layer) => layer.video === element && layer.until > performance.now());

export type Hit = {
  layer?: number;
  begin?: number;
  speed?: number;
  gain?: number;
  fx?: Fx[];
  coarse?: number;
  holdMs?: number; // how long it shows; undefined holds to the next hit
};

// Where a hit starts in its video, in seconds. No begin: somewhere at random,
// leaving a second before the end
function startTime(element: HTMLVideoElement, clip: Clip, hit: Hit) {
  const duration = Number.isFinite(element.duration) ? element.duration : clip.duration ?? 0;
  if (!(duration > 0)) return undefined;
  const [from, to] = clipSpan(clip, duration);
  const length = to - from;
  const begin = hit.begin ?? Math.random() * Math.max(0, 1 - 1 / length);
  return Math.min(to - 0.05, Math.max(from, from + begin * length));
}

// The part of a clip that plays: its marked range, or all of it
export function clipSpan(clip: Pick<Clip, 'range'>, duration: number): [number, number] {
  if (!clip.range) return [0, duration];
  const from = Math.max(0, Math.min(clip.range[0], duration - 0.5));
  const to = Math.min(duration, Math.max(clip.range[1], from + 0.5));
  return [from, to];
}

// Marks the part of a clip to use (none: all of it), with a new thumbnail
// from that part if one is given
export async function setClipRange(id: string, range: [number, number] | undefined, thumb?: string) {
  const clip = clips.find((c) => c.id === id);
  if (!clip) return;
  clip.range = range && range[1] > range[0] ? range : undefined;
  if (thumb) clip.thumb = thumb;
  await inStore(META, 'readwrite', (store) => store.put(clip));
  changed();
}

// Hits planned but not shown yet, per video
const pending = new Map<HTMLVideoElement, number>();
export type Plan = { element: HTMLVideoElement; start?: number; seeked: boolean };

// Readies a hit: Strudel hands the hits over a moment before they sound, so a
// video nobody is watching can jump to its spot ahead and be there on the beat.
// One on screen, or with another hit waiting, jumps on the beat instead
export async function prepare(clip: Clip, hit: Hit = {}): Promise<Plan | undefined> {
  const element = await videoFor(clip);
  if (!element) return undefined;
  const start = startTime(element, clip, hit);
  const busy = inUse(element) || (pending.get(element) ?? 0) > 0;
  pending.set(element, (pending.get(element) ?? 0) + 1);
  if (start !== undefined && !busy) {
    element.currentTime = start;
    return { element, start, seeked: true };
  }
  return { element, start, seeked: false };
}

// Shows a clip on a layer now
export async function fire(clip: Clip, hit: Hit = {}, ready?: Plan) {
  const plan = ready ?? (await prepare(clip, hit));
  if (!plan) return;
  const { element } = plan;
  pending.set(element, Math.max(0, (pending.get(element) ?? 1) - 1));
  const index = Math.min(LAYERS - 1, Math.max(0, Math.floor(hit.layer ?? 0)));
  const layer = layers[index];
  const previous = layer.video;
  const now = performance.now();
  const somethingShowing = layers.some((l) => l.video && l.until > now);
  layer.video = element;
  // While the new one is still jumping to its spot, the old picture stays
  layer.fallback = previous !== element && previous?.readyState && previous.readyState >= 2 ? previous : undefined;
  layer.clipId = clip.id;
  layer.span = Number.isFinite(element.duration) ? clipSpan(clip, element.duration) : undefined;
  layer.until = hit.holdMs === undefined ? Infinity : now + hit.holdMs;
  layer.opacity = Math.min(1, Math.max(0, hit.gain ?? 1));
  layer.rate = hit.speed ?? 1;
  layer.fx = withGlitch(hit.fx ?? []);
  layer.coarse = hit.coarse ?? 0;
  layer.hitAt = now;
  if (!layer.fx.includes('echo')) layer.trail = undefined;
  layer.startAt = plan.start ?? element.currentTime;
  // Datamosh starts from what was on screen, so the new clip melts out of it
  if (!layer.fx.includes('mosh')) layer.mosh = undefined;
  else if (!layer.mosh && somethingShowing) {
    layer.mosh = makeCanvas();
    layer.mosh.getContext('2d')!.drawImage(canvas, 0, 0);
  }
  layer.stutterAt = now;
  clipStats.hits++;
  if (!plan.seeked && plan.start !== undefined) element.currentTime = plan.start;
  const freeze = layer.fx.includes('freeze');
  if (layer.rate > 0 && !freeze) {
    element.playbackRate = Math.min(16, Math.max(0.0625, layer.rate));
    void element.play().catch(() => undefined);
  } else {
    element.pause();
  }
  if (previous && previous !== element && !inUse(previous)) {
    // paused after the fallback is no longer needed (see draw)
    if (!layer.fallback) previous.pause();
  }
  startDrawing();
}

// Pads and MIDI: a clip by its place in the pool list
export function fireIndex(index: number, hit: Hit = {}) {
  const clip = clips[((index % clips.length) + clips.length) % clips.length];
  if (clip) void fire(clip, hit);
}

// The layer mixer in the panel: how solid each layer is, and how layers 2-4
// mix with the ones under them. auto leaves it to each hit's fx; any other
// mode replaces the hit's own way of mixing
export type MixMode = 'auto' | 'normal' | 'screen' | 'add' | 'diff' | 'mult' | 'overlay' | 'lighten' | 'key' | 'dark' | 'tiles' | 'bands' | 'cols' | 'half';
export const MIX_MODES: MixMode[] = ['auto', 'normal', 'screen', 'add', 'diff', 'mult', 'overlay', 'lighten', 'key', 'dark', 'tiles', 'bands', 'cols', 'half'];
const MIXING = new Set<string>(['add', 'screen', 'diff', 'mult', 'lighten', 'overlay', 'dodge', 'hard', 'bands', 'cols', 'tiles', 'half', 'key', 'dark']);
export const mixer = Array.from({ length: LAYERS }, () => ({ opacity: 1, mode: 'auto' as MixMode }));

export function mixedFx(fx: Fx[], index: number): Fx[] {
  const mode = mixer[index]?.mode ?? 'auto';
  if (index === 0 || mode === 'auto') return fx;
  const rest = fx.filter((f) => !MIXING.has(f));
  return mode === 'normal' ? rest : [...rest, mode];
}

// Empties one layer: what was under it shows again
export function clearLayer(index: number) {
  const layer = layers[index];
  if (!layer) return;
  const element = layer.video;
  layer.video = undefined;
  layer.until = 0;
  if (element && !inUse(element)) element.pause();
}

// The clips on screen now, and on which layer, for the pads to light up
export function liveClips() {
  const now = performance.now();
  const live = new Map<string, number>();
  layers.forEach((layer, index) => {
    if (layer.video && layer.clipId && layer.until > now && !live.has(layer.clipId)) live.set(layer.clipId, index);
  });
  return live;
}

export function clearLayers() {
  for (const layer of layers) {
    layer.video?.pause();
    layer.video = undefined;
    layer.until = 0;
  }
}

const FILTERS: Partial<Record<Fx, string>> = {
  burn: 'contrast(2.4) saturate(2.8) brightness(1.1)',
  inv: 'invert(1)',
  bw: 'grayscale(1) contrast(1.5)',
  hue: 'hue-rotate(180deg) saturate(1.6)',
  blur: 'blur(6px)',
};

// Scratch canvases: one layer's picture before it is mixed in, and its
// colour channels for rgb
const makeCanvas = () => {
  const made = document.createElement('canvas');
  made.width = WIDTH;
  made.height = HEIGHT;
  return made;
};
const scratch = makeCanvas();
const scratchContext = scratch.getContext('2d')!;
const channel = makeCanvas();
const channelContext = channel.getContext('2d')!;
const split = makeCanvas();
const splitContext = split.getContext('2d')!;

// One layer's picture: framing, filters, pixels, colour split and echo
function renderLayer(layer: Layer, shown: HTMLVideoElement): HTMLCanvasElement {
  const c = scratchContext;
  c.save();
  c.fillStyle = '#000';
  c.fillRect(0, 0, WIDTH, HEIGHT);
  c.filter = layer.fx.map((fx) => FILTERS[fx]).filter(Boolean).join(' ') || 'none';
  const mirror = layer.fx.includes('mirror');
  const flip = layer.fx.includes('flip');
  if (mirror || flip) {
    c.translate(mirror ? WIDTH : 0, flip ? HEIGHT : 0);
    c.scale(mirror ? -1 : 1, flip ? -1 : 1);
  }
  const zoom = layer.fx.includes('zoom') ? 2 : 1;
  if (layer.coarse > 1) {
    const w = Math.max(2, Math.round(WIDTH / layer.coarse));
    const h = Math.max(2, Math.round(HEIGHT / layer.coarse));
    if (tiny.width !== w || tiny.height !== h) {
      tiny.width = w;
      tiny.height = h;
    }
    cover(tinyContext, shown, w, h, zoom);
    c.imageSmoothingEnabled = false;
    c.drawImage(tiny, 0, 0, WIDTH, HEIGHT);
    c.imageSmoothingEnabled = true;
  } else {
    cover(c, shown, WIDTH, HEIGHT, zoom);
  }
  c.restore();
  let picture = scratch;
  if (layer.fx.includes('rgb')) picture = rgbSplit(picture, 6 + Math.round(Math.random() * 6));
  if (layer.fx.includes('echo')) picture = echo(layer, picture);
  picture = glitches(layer, picture, performance.now());
  return picture;
}

// Red, green and blue pulled apart sideways, like a badly tuned TV
function rgbSplit(source: HTMLCanvasElement, offset: number) {
  splitContext.globalCompositeOperation = 'source-over';
  splitContext.fillStyle = '#000';
  splitContext.fillRect(0, 0, WIDTH, HEIGHT);
  (['#f00', '#0f0', '#00f'] as const).forEach((colour, i) => {
    channelContext.globalCompositeOperation = 'source-over';
    channelContext.drawImage(source, 0, 0);
    channelContext.globalCompositeOperation = 'multiply';
    channelContext.fillStyle = colour;
    channelContext.fillRect(0, 0, WIDTH, HEIGHT);
    splitContext.globalCompositeOperation = 'lighter';
    splitContext.drawImage(channel, (i - 1) * offset, 0);
  });
  splitContext.globalCompositeOperation = 'source-over';
  return split;
}

// Each frame laid at a quarter over the ones before: movement leaves ghosts
function echo(layer: Layer, source: HTMLCanvasElement) {
  if (!layer.trail) {
    layer.trail = makeCanvas();
    layer.trail.getContext('2d')!.drawImage(source, 0, 0);
  }
  const t = layer.trail.getContext('2d')!;
  t.globalAlpha = 0.25;
  t.drawImage(source, 0, 0);
  t.globalAlpha = 1;
  return layer.trail;
}

// Horizontal bands shifted sideways, new ones every 70 ms: a torn signal
function drawSliced(source: HTMLCanvasElement, now: number) {
  const bands = 12;
  const height = HEIGHT / bands;
  let seed = Math.floor(now / 70) * 9301 + 49297;
  const random = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < bands; i++) {
    const torn = random() < 0.45;
    const dx = torn ? (random() - 0.5) * WIDTH * 0.25 : 0;
    context.drawImage(source, 0, i * height, WIDTH, height, dx, i * height, WIDTH, height);
  }
}

// Pieces of a layer: the rest is left out, so the layers under it show
// through and two videos weave together. Tiles change on every hit; bands
// and columns drift with time
function clipToPieces(fx: Fx[], hitAt: number, now: number) {
  if (!fx.some((f) => f === 'bands' || f === 'cols' || f === 'tiles' || f === 'half')) return;
  let seed = Math.floor(hitAt) * 7919 + 13;
  const random = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  context.beginPath();
  if (fx.includes('bands')) {
    const size = HEIGHT / 8;
    const drift = ((now / 40) % (size * 2)) - size * 2;
    for (let y = drift; y < HEIGHT; y += size * 2) context.rect(0, y, WIDTH, size);
  } else if (fx.includes('cols')) {
    const size = WIDTH / 10;
    const drift = ((now / 30) % (size * 2)) - size * 2;
    for (let x = drift; x < WIDTH; x += size * 2) context.rect(x, 0, size, HEIGHT);
  } else if (fx.includes('tiles')) {
    const columns = 8;
    const rows = 5;
    const w = WIDTH / columns;
    const h = HEIGHT / rows;
    for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) if (random() < 0.5) context.rect(x * w, y * h, w + 0.5, h + 0.5);
  } else {
    context.rect(random() < 0.5 ? 0 : WIDTH / 2, 0, WIDTH / 2, HEIGHT);
  }
  context.clip();
}

// glitch: one of the glitches at random on each hit. The Glitch slider in the
// panel adds one at random to any hit, as often as it is turned up
export const GLITCHES: Fx[] = ['mosh', 'blocks', 'melt', 'vhs', 'stutter', 'rgb', 'slice', 'burn', 'scan'];
let glitchAmount = 0;
export const setGlitchAmount = (amount: number) => (glitchAmount = Math.min(1, Math.max(0, amount)));
export const getGlitchAmount = () => glitchAmount;
const anyGlitch = () => GLITCHES[Math.floor(Math.random() * GLITCHES.length)];
export function withGlitch(fx: Fx[], random = Math.random): Fx[] {
  const out = fx.map((f) => (f === 'glitch' ? anyGlitch() : f));
  if (glitchAmount > 0 && random() < glitchAmount) out.push(anyGlitch());
  return out;
}

const glitchA = makeCanvas();
const glitchB = makeCanvas();

// A seeded random, so a glitch holds still for a few frames instead of
// boiling every frame
function seeded(seed: number) {
  let value = Math.abs(Math.floor(seed)) % 233280;
  return () => ((value = (value * 9301 + 49297) % 233280) / 233280);
}

// The glitches that rework a layer's finished picture, one after another
function glitches(layer: Layer, source: HTMLCanvasElement, now: number): HTMLCanvasElement {
  let picture = source;
  let target = glitchA;
  const step = (run: (c: CanvasRenderingContext2D, from: HTMLCanvasElement) => void) => {
    const c = target.getContext('2d')!;
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    c.drawImage(picture, 0, 0);
    run(c, picture);
    picture = target;
    target = target === glitchA ? glitchB : glitchA;
  };
  if (layer.fx.includes('mosh')) picture = mosh(layer, picture, now);
  if (layer.fx.includes('blocks')) {
    // Rectangles of the picture copied to the wrong place
    step((c, from) => {
      const random = seeded(now / 70);
      for (let i = 0; i < 9; i++) {
        const w = 30 + random() * 220;
        const h = 8 + random() * 70;
        c.drawImage(from, random() * (WIDTH - w), random() * (HEIGHT - h), w, h, random() * (WIDTH - w), random() * (HEIGHT - h), w, h);
      }
    });
  }
  if (layer.fx.includes('melt')) {
    // Pixel-sort drips: a row of each column stretched down to the bottom
    step((c, from) => {
      const random = seeded(now / 140);
      const columns = 32;
      const w = WIDTH / columns;
      for (let i = 0; i < columns; i++) {
        if (random() < 0.45) continue;
        const y = random() * HEIGHT * 0.8;
        c.drawImage(from, i * w, y, w, 2, i * w, y, w, HEIGHT - y);
      }
    });
  }
  if (layer.fx.includes('vhs')) {
    // Tracking: bands wobbling sideways, a bright noisy band rolling down
    step((c, from) => {
      const random = seeded(now / 400);
      const kick = random() < 0.3 ? 30 : 6;
      c.fillStyle = '#000';
      c.fillRect(0, 0, WIDTH, HEIGHT);
      const bands = 45;
      const h = HEIGHT / bands;
      for (let i = 0; i < bands; i++) {
        const dx = Math.sin(i * 0.4 + now / 90) * kick * (0.3 + random());
        c.drawImage(from, 0, i * h, WIDTH, h, dx, i * h, WIDTH, h);
      }
      const roll = (now / 6) % (HEIGHT + 40) - 20;
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.18;
      c.fillStyle = '#fff';
      c.fillRect(0, roll, WIDTH, 14);
      c.drawImage(from, 0, roll, WIDTH, 14, 18, roll, WIDTH, 14);
    });
  }
  if (layer.fx.includes('scan')) {
    // Dark lines like an old screen, over a slightly green phosphor
    step((c) => {
      c.globalCompositeOperation = 'multiply';
      c.fillStyle = 'rgb(200, 255, 210)';
      c.fillRect(0, 0, WIDTH, HEIGHT);
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = 'rgba(0, 0, 0, 0.45)';
      for (let y = 0; y < HEIGHT; y += 3) c.fillRect(0, y, WIDTH, 1);
    });
  }
  return picture;
}

// Datamosh, faked: the new picture only gets through in some blocks each
// frame, the rest keeps the old one sliding along, so one shot melts into
// the next instead of cutting
function mosh(layer: Layer, source: HTMLCanvasElement, now: number) {
  if (!layer.mosh) {
    layer.mosh = makeCanvas();
    layer.mosh.getContext('2d')!.drawImage(source, 0, 0);
  }
  const c = layer.mosh.getContext('2d')!;
  const columns = 16;
  const rows = 9;
  const w = WIDTH / columns;
  const h = HEIGHT / rows;
  const random = seeded(now / 33);
  const drift = seeded(layer.hitAt);
  const dx = (drift() - 0.5) * 6;
  const dy = (drift() - 0.5) * 6;
  // fewer blocks get through right after a hit: that is when it smears most
  const through = Math.min(0.5, 0.04 + (now - layer.hitAt) / 4000);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      if (random() < through) c.drawImage(source, x * w, y * h, w, h, x * w, y * h, w, h);
      else c.drawImage(layer.mosh, x * w, y * h, w, h, x * w + dx, y * h + dy, w, h);
    }
  }
  return layer.mosh;
}

let drawing = false;
let lastFrame = performance.now();

function startDrawing() {
  if (drawing) return;
  drawing = true;
  lastFrame = performance.now();
  requestAnimationFrame(draw);
}

function draw(now: number) {
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  context.globalCompositeOperation = 'source-over';
  context.globalAlpha = 1;
  context.filter = 'none';
  context.fillStyle = '#000';
  context.fillRect(0, 0, WIDTH, HEIGHT);
  let any = false;
  layers.forEach((layer, index) => {
    const element = layer.video;
    if (!element) return;
    if (now > layer.until) {
      if (!inUse(element)) element.pause();
      layer.video = undefined;
      return;
    }
    any = true;
    // Backwards: the browser cannot play in reverse, so it steps back each frame
    if (layer.rate < 0 && !layer.fx.includes('freeze') && element.duration > 0 && !element.seeking) {
      const back = element.currentTime + layer.rate * dt;
      element.currentTime = back > 0 ? back : element.duration - 0.05;
    }
    if (layer.fx.includes('strobe') && Math.floor((now - layer.hitAt) / 60) % 2 === 1) return;
    // A marked part loops inside itself
    if (layer.span && !element.seeking) {
      if (layer.rate >= 0 && element.currentTime >= layer.span[1]) element.currentTime = layer.span[0];
      else if (layer.rate < 0 && element.currentTime <= layer.span[0]) element.currentTime = layer.span[1] - 0.05;
    }
    // Stutter: back to where the hit started, about nine times a second
    if (layer.fx.includes('stutter') && now - layer.stutterAt > 110 && !element.seeking) {
      layer.stutterAt = now;
      element.currentTime = layer.startAt;
    }
    clipStats.frames++;
    let shown = element;
    if (element.seeking || element.readyState < 2) {
      clipStats.waiting++;
      // The old picture (another video, or this one before its jump)
      if (layer.fallback) shown = layer.fallback;
      else if (element.readyState < 2) return;
    } else if (layer.fallback) {
      if (!inUse(layer.fallback)) layer.fallback.pause();
      layer.fallback = undefined;
    }
    const picture = renderLayer(layer, shown);
    const mix = mixer[index];
    const fx = mixedFx(layer.fx, index);
    context.save();
    context.globalAlpha = layer.opacity * mix.opacity;
    const blend = fx.map((f) => BLENDS[f]).find(Boolean);
    // Layers above mix in with screen, unless they are cut into pieces: then
    // the pieces show whole, woven into the picture under them
    const pieces = fx.some((f) => f === 'bands' || f === 'cols' || f === 'tiles' || f === 'half' || f === 'key' || f === 'dark');
    context.globalCompositeOperation = index === 0 || mix.mode === 'normal' ? 'source-over' : blend ?? (pieces ? 'source-over' : 'screen');
    clipToPieces(fx, layer.hitAt, now);
    const key = fx.includes('key') ? 'key' : fx.includes('dark') ? 'dark' : undefined;
    if (key) context.filter = `url(#${ensureKeyFilters()}-${key})`;
    if (layer.fx.includes('slice')) drawSliced(picture, now);
    else context.drawImage(picture, 0, 0);
    context.filter = 'none';
    // Light: a blurred, brighter copy added on top, so highlights bloom
    if (layer.fx.includes('glow')) {
      context.globalCompositeOperation = 'lighter';
      context.globalAlpha = layer.opacity * 0.55;
      context.filter = 'blur(10px) brightness(1.5)';
      context.drawImage(picture, 0, 0);
      context.filter = 'none';
    }
    // A white burst on the hit that fades out in a fifth of a second
    if (layer.fx.includes('flash')) {
      const left = 1 - (now - layer.hitAt) / 200;
      if (left > 0) {
        context.globalCompositeOperation = 'lighter';
        context.globalAlpha = left * 0.85;
        context.fillStyle = '#fff';
        context.fillRect(0, 0, WIDTH, HEIGHT);
      }
    }
    context.restore();
  });
  if (any) requestAnimationFrame(draw);
  else drawing = false;
}

// ── Hydra and Strudel ───────────────────────────────────────────────────────

type HydraSource = { init(options: { src: HTMLCanvasElement; dynamic: boolean }): void; src?: unknown };

// The clips canvas as Hydra's s2, for the Clips visuals and src(s2) in code
export function attachClips() {
  const source = (globalThis as { s2?: HydraSource }).s2;
  if (source && source.src !== canvas) source.init({ src: canvas, dynamic: true });
}

type Hap = { value: Record<string, unknown>; duration: { valueOf(): number } };
type PatternLike = { onTrigger(fn: (hap: Hap, now: number, cps: number, target: number) => void, dominant?: boolean): PatternLike };
type Globals = {
  Pattern: { prototype: Record<string, unknown> };
  getAudioContext: () => AudioContext;
  registerControl?: (...names: unknown[]) => Record<string, unknown>;
};

const numberOr = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);

// A hit as Strudel sends it, to what fire() needs
export function hitFromValue(value: Record<string, unknown>, stepSeconds: number, layer: number): { name?: string; n?: number; hit: Hit } {
  const legato = numberOr(value.legato) ?? numberOr(value.clip);
  return {
    name: typeof value.s === 'string' ? value.s : undefined,
    n: numberOr(value.n),
    hit: {
      layer,
      begin: numberOr(value.begin),
      speed: numberOr(value.speed),
      gain: numberOr(value.gain),
      coarse: numberOr(value.coarse),
      fx: parseFx(value.fx),
      holdMs: legato === undefined ? undefined : Math.max(30, stepSeconds * legato * 1000),
    },
  };
}

// Names that .video() has asked for and that are not in the pool, for the panel
export const missingNames = new Set<string>();

export function setupClipPatterns() {
  const g = globalThis as unknown as Globals;
  // fx("…") as a control of its own, so it works in patterns like gain()
  if (!('fx' in g.Pattern.prototype)) {
    try {
      const made = g.registerControl?.('fx');
      if (made?.fx) (globalThis as Record<string, unknown>).fx = made.fx;
    } catch (error) {
      console.warn('[clips] fx', error);
    }
  }
  g.Pattern.prototype.video = function (this: PatternLike, layer = 0) {
    return this.onTrigger((hap, _now, cps, target) => {
      const { name, n, hit } = hitFromValue(hap.value ?? {}, Number(hap.duration.valueOf()) / cps, Number(layer) || 0);
      if (!name) return;
      const clip = findClip(name, n);
      if (!clip) {
        missingNames.add(name);
        return;
      }
      const at = performance.now() + (target - g.getAudioContext().currentTime) * 1000;
      void prepare(clip, hit).then((plan) => {
        if (plan) setTimeout(() => void fire(clip, hit, plan), Math.max(0, at - performance.now()));
      });
    }, true);
  };
}
