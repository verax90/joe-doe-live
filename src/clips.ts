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
//   fx("inv")   inv, bw, mirror, flip, zoom, hue, blur, freeze, strobe; several
//               joined with _ (fx("bw_mirror")); on layers 1-3 also add, screen,
//               diff, mult for how they mix
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
export const FX = ['inv', 'bw', 'mirror', 'flip', 'zoom', 'hue', 'blur', 'freeze', 'strobe', 'add', 'screen', 'diff', 'mult'] as const;
export type Fx = (typeof FX)[number];
export function parseFx(value: unknown): Fx[] {
  if (typeof value !== 'string') return [];
  return value
    .toLowerCase()
    .split(/[_\s,+]+/)
    .filter((word): word is Fx => (FX as readonly string[]).includes(word));
}

const BLENDS: Partial<Record<Fx, GlobalCompositeOperation>> = { add: 'lighter', screen: 'screen', diff: 'difference', mult: 'multiply' };

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
};
const layers: Layer[] = Array.from({ length: LAYERS }, () => ({ until: 0, opacity: 1, rate: 1, fx: [], coarse: 0, hitAt: 0 }));

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
  const begin = hit.begin ?? Math.random() * Math.max(0, 1 - 1 / duration);
  return Math.min(duration - 0.05, Math.max(0, begin * duration));
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
  layer.video = element;
  // While the new one is still jumping to its spot, the old picture stays
  layer.fallback = previous !== element && previous?.readyState && previous.readyState >= 2 ? previous : undefined;
  layer.clipId = clip.id;
  layer.until = hit.holdMs === undefined ? Infinity : now + hit.holdMs;
  layer.opacity = Math.min(1, Math.max(0, hit.gain ?? 1));
  layer.rate = hit.speed ?? 1;
  layer.fx = hit.fx ?? [];
  layer.coarse = hit.coarse ?? 0;
  layer.hitAt = now;
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

export function clearLayers() {
  for (const layer of layers) {
    layer.video?.pause();
    layer.video = undefined;
    layer.until = 0;
  }
}

const FILTERS: Partial<Record<Fx, string>> = {
  inv: 'invert(1)',
  bw: 'grayscale(1) contrast(1.5)',
  hue: 'hue-rotate(180deg) saturate(1.6)',
  blur: 'blur(6px)',
};

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
    context.save();
    context.globalAlpha = layer.opacity;
    const blend = layer.fx.map((fx) => BLENDS[fx]).find(Boolean);
    context.globalCompositeOperation = index === 0 ? 'source-over' : blend ?? 'screen';
    context.filter = layer.fx.map((fx) => FILTERS[fx]).filter(Boolean).join(' ') || 'none';
    const mirror = layer.fx.includes('mirror');
    const flip = layer.fx.includes('flip');
    if (mirror || flip) {
      context.translate(mirror ? WIDTH : 0, flip ? HEIGHT : 0);
      context.scale(mirror ? -1 : 1, flip ? -1 : 1);
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
      context.imageSmoothingEnabled = false;
      context.drawImage(tiny, 0, 0, WIDTH, HEIGHT);
      context.imageSmoothingEnabled = true;
    } else {
      cover(context, shown, WIDTH, HEIGHT, zoom);
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
