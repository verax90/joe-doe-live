// One pen per phone: with several phones on the Visual square, each draws
// its own stroke in its own colour (Light painting, Smoke), all at once.
// The strokes of this frame are drawn on a 2D canvas that Hydra reads as s3,
// and the visual's shader adds them to what it keeps from before; the
// mouse and the webcam still draw through brush(), in the theme's colours.
type Hydra = { init(options: { src: HTMLCanvasElement; dynamic: boolean }): void };
type Pen = { colour: string; x0: number; y0: number; x1: number; y1: number; on: boolean; fresh: boolean };

// Far apart from each other, and from the lime of the theme
export const PEN_COLOURS = ['#ff4fd8', '#4fd8ff', '#ffd84f', '#ff7a4f', '#a36bff', '#4fff9a'];

const pens = new Map<unknown, Pen>();
let given = 0;
let canvas: HTMLCanvasElement | undefined;
let context: CanvasRenderingContext2D | null = null;
let running = false;
let frame = 0;
let fedTo: unknown;
const g = globalThis as { s3?: Hydra; pens?: typeof startPens };

// A phone that connects gets the next colour, and keeps it while connected
export function penFor(id: unknown) {
  let pen = pens.get(id);
  if (!pen) {
    pen = { colour: PEN_COLOURS[given++ % PEN_COLOURS.length], x0: 0, y0: 0, x1: 0, y1: 0, on: false, fresh: true };
    pens.set(id, pen);
  }
  return pen;
}

// Where its finger is now (0-1, y down), or null when it lifts
export function movePen(id: unknown, point: { x: number; y: number } | null) {
  const pen = penFor(id);
  if (!point) {
    pen.on = false;
    return;
  }
  if (!pen.on) {
    // a new touch starts where it lands, without a line from the last one
    pen.x0 = point.x;
    pen.y0 = point.y;
  }
  pen.x1 = point.x;
  pen.y1 = point.y;
  pen.on = true;
}

export const forgetPen = (id: unknown) => pens.delete(id);
export const anyPenDown = () => [...pens.values()].some((pen) => pen.on);

function fit() {
  const shown = document.getElementById('hydra-canvas');
  const box = shown?.getBoundingClientRect();
  const width = 640;
  const height = Math.round(box && box.width ? (width * box.height) / box.width : 360);
  if (canvas!.width !== width || canvas!.height !== height) {
    canvas!.width = width;
    canvas!.height = height;
  }
}

function draw() {
  if (!running || !canvas || !context) return;
  frame = requestAnimationFrame(draw);
  fit();
  const c = context;
  const { width, height } = canvas;
  // what was drawn fades over a few frames instead of going at once: Hydra
  // reads the canvas at its own pace, and a stroke there for one frame
  // only came out in dashes
  c.fillStyle = 'rgba(0, 0, 0, 0.55)';
  c.fillRect(0, 0, width, height);
  c.lineCap = 'round';
  for (const pen of pens.values()) {
    if (!pen.on) continue;
    c.strokeStyle = pen.colour;
    c.shadowColor = pen.colour;
    c.shadowBlur = 10;
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(pen.x0 * width, pen.y0 * height);
    c.lineTo(pen.x1 * width + 0.01, pen.y1 * height);
    c.stroke();
    pen.x0 = pen.x1;
    pen.y0 = pen.y1;
  }
  c.shadowBlur = 0;
}

// Called by the visual's code: starts drawing and feeds the canvas to s3
export function startPens() {
  if (!canvas) {
    canvas = document.createElement('canvas');
    context = canvas.getContext('2d');
    fit();
  }
  const source = g.s3;
  if (source && source !== fedTo) {
    source.init({ src: canvas, dynamic: true });
    fedTo = source;
  }
  if (running) return;
  running = true;
  frame = requestAnimationFrame(draw);
}

export function stopPens() {
  running = false;
  cancelAnimationFrame(frame);
}

g.pens = startPens;
