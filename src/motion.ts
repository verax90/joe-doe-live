// Motion: the webcam as a controller. Nothing is recognised (no faces, no
// hands, no model to download): each small frame is compared with the one
// before, and where the picture changed is where someone moved. motionX()
// and motionY() are the middle of that movement (0-1, as in a mirror: move
// to your right and it goes right), easing towards it, and motion() is how
// much moved, falling back to 0 when all is still. For Hydra code and for
// the visuals under Motion; it can also play the VJ effects. The camera's
// picture stays in this page: it is read and thrown away, never sent.
import { t, onLangChange } from './i18n';
import { readStorage, writeStorage } from './storage';
import { VJ_CONTROLS, setVjControl, type VjControl } from './vj';

export const GRID = { width: 48, height: 27 };

// Brightness of each pixel (0-255) of an RGBA frame
export function toGrey(rgba: ArrayLike<number>, out: Uint8Array) {
  for (let i = 0, p = 0; i < out.length; i++, p += 4) out[i] = (rgba[p] * 3 + rgba[p + 1] * 6 + rgba[p + 2]) / 10;
  return out;
}

// Where two frames differ: the middle of the change (0-1 each way, x as the
// camera sees it) and how much of the picture changed (0-1). Small changes
// (the sensor's noise, a lamp flickering) are under the threshold; null when
// hardly anything moved, so the point stays where it was
export function findMotion(before: ArrayLike<number>, now: ArrayLike<number>, width: number, height: number, threshold = 22) {
  let mass = 0;
  let sumX = 0;
  let sumY = 0;
  let moved = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const change = Math.abs(now[y * width + x] - before[y * width + x]);
      if (change < threshold) continue;
      mass += change;
      sumX += x * change;
      sumY += y * change;
      moved++;
    }
  }
  const amount = moved / (width * height);
  if (amount < 0.004) return null;
  return { x: (sumX / mass + 0.5) / width, y: (sumY / mass + 0.5) / height, amount };
}

// The slider (0-1) as how much of the picture has to move for motion() to
// reach 1: a whole arm far from the camera, or a finger close to it
export const fullAt = (slider: number) => 0.3 * 0.08 ** slider; // 30 % down to 2.4 %

const ease = (value: number, target: number, elapsedMs: number, tauMs: number) =>
  value + (target - value) * (1 - Math.exp(-Math.max(0, elapsedMs) / tauMs));

const state = { x: 0.5, y: 0.5, amount: 0, targetX: 0.5, targetY: 0.5, targetAmount: 0, at: 0, held: false };
function read() {
  const now = performance.now();
  const elapsed = now - state.at;
  state.at = now;
  state.x = ease(state.x, state.targetX, elapsed, 140);
  state.y = ease(state.y, state.targetY, elapsed, 140);
  // up fast, down slowly: a wave of the hand lingers
  state.amount = ease(state.amount, state.targetAmount, elapsed, state.targetAmount > state.amount ? 60 : 450);
  return state;
}
export const motionX = () => read().x;
export const motionY = () => read().y;
export const motion = () => read().amount;
Object.assign(globalThis, { motionX, motionY, motion });

// A finger on the phone's Visual tab is the point while it is down (x and y
// as on the screen, y from the top), webcam or not; null when it lifts
export function holdMotionPoint(point: { x: number; y: number } | null) {
  read();
  state.held = Boolean(point);
  if (point) Object.assign(state, { targetX: point.x, targetY: point.y, targetAmount: 0.7 });
  else state.targetAmount = 0;
}

// What the movement plays on the VJ: side to side the colour, up and down
// the zoom, how much the warp
const VJ_MAP: [VjControl, () => number][] = [
  ['hue', () => state.x],
  ['zoom', () => 1 - state.y],
  ['warp', () => state.amount],
];

type Watching = { stream: MediaStream; video: HTMLVideoElement; timer: number };
let watching: Watching | undefined;
export const motionOn = () => Boolean(watching);

export function setupMotion() {
  const deviceSelect = document.querySelector<HTMLSelectElement>('#motion-device')!;
  const onButton = document.querySelector<HTMLButtonElement>('#motion-on')!;
  const gainInput = document.querySelector<HTMLInputElement>('#motion-gain')!;
  const status = document.querySelector<HTMLElement>('#motion-status')!;
  const vjBox = document.querySelector<HTMLInputElement>('#motion-vj')!;
  const preview = document.querySelector<HTMLCanvasElement>('#motion-preview')!;
  const dot = document.querySelector<HTMLElement>('#motion-dot')!;

  gainInput.value = String(readStorage<number>('jdl:motion-gain', 0.5));
  gainInput.addEventListener('input', () => writeStorage('jdl:motion-gain', Number(gainInput.value)));
  vjBox.checked = readStorage<boolean>('jdl:motion-vj', false);
  vjBox.addEventListener('change', () => writeStorage('jdl:motion-vj', vjBox.checked));

  const listDevices = async () => {
    const cameras = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
    const keep = deviceSelect.value || readStorage<string>('jdl:motion-device', '');
    deviceSelect.replaceChildren(...cameras.map((d, i) => new Option(d.label || t('motionCamera', { n: i + 1 }), d.deviceId)));
    deviceSelect.value = cameras.some((d) => d.deviceId === keep) ? keep : (cameras[0]?.deviceId ?? '');
  };

  const stop = () => {
    if (!watching) return;
    clearInterval(watching.timer);
    watching.stream.getTracks().forEach((track) => track.stop());
    watching.video.srcObject = null;
    watching = undefined;
    Object.assign(state, { targetX: 0.5, targetY: 0.5, targetAmount: 0 });
    onButton.textContent = t('motionOn');
    onButton.setAttribute('aria-pressed', 'false');
    status.textContent = t('motionOff');
    preview.getContext('2d')?.clearRect(0, 0, preview.width, preview.height);
    dot.hidden = true;
  };

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: deviceSelect.value ? { exact: deviceSelect.value } : undefined, width: 320, height: 180, frameRate: 30 },
    });
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();

    const { width, height } = GRID;
    const small = document.createElement('canvas');
    small.width = width;
    small.height = height;
    const pen = small.getContext('2d', { willReadFrequently: true })!;
    const shown = preview.getContext('2d')!;
    preview.width = width;
    preview.height = height;
    let before = new Uint8Array(width * height);
    let now = new Uint8Array(width * height);
    let first = true;
    let onScreen = true;
    let lookedAt = 0;
    const picture = shown.createImageData(width, height);

    const timer = window.setInterval(() => {
      if (video.readyState < 2) return;
      pen.drawImage(video, 0, 0, width, height);
      toGrey(pen.getImageData(0, 0, width, height).data, now);
      const found = first ? null : findMotion(before, now, width, height);
      // the preview only while it can be seen: on stage this loop only tracks
      if (performance.now() - lookedAt > 300) {
        lookedAt = performance.now();
        onScreen = preview.offsetParent !== null;
      }
      if (onScreen) {
        // what moved, lit, in the preview (mirrored like the point)
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const from = y * width + x;
            const to = (y * width + (width - 1 - x)) * 4;
            const lit = !first && Math.abs(now[from] - before[from]) >= 22;
            const grey = now[from] * 0.35;
            picture.data[to] = lit ? 215 : grey;
            picture.data[to + 1] = lit ? 255 : grey;
            picture.data[to + 2] = lit ? 60 : grey;
            picture.data[to + 3] = 255;
          }
        }
        shown.putImageData(picture, 0, 0);
      }
      first = false;
      [before, now] = [now, before];

      read(); // ease up to this moment before the targets move
      if (state.held) return; // a finger on the phone has the point
      if (found) {
        state.targetX = 1 - found.x; // a mirror
        state.targetY = found.y;
      }
      state.targetAmount = found ? Math.min(1, found.amount / fullAt(Number(gainInput.value))) : 0;
      if (onScreen) {
        dot.hidden = false;
        dot.style.left = `${state.x * 100}%`;
        dot.style.top = `${state.y * 100}%`;
        dot.style.setProperty('--size', String(0.4 + state.amount * 1.6));
      }
      if (vjBox.checked) for (const [control, value] of VJ_MAP) setVjControl(control, value());
    }, 40);

    watching = { stream, video, timer };
    stream.getVideoTracks()[0]?.addEventListener('ended', stop);
    await listDevices(); // labels only show once permission is granted
    writeStorage('jdl:motion-device', deviceSelect.value);
    onButton.textContent = t('motionStop');
    onButton.setAttribute('aria-pressed', 'true');
    status.textContent = t('motionLive', { camera: stream.getVideoTracks()[0]?.label ?? '' });
  };

  onButton.addEventListener('click', async () => {
    if (watching) return stop();
    try {
      await start();
    } catch (error) {
      status.textContent = t('motionError', { error: error instanceof Error ? error.name : String(error) });
    }
  });
  deviceSelect.addEventListener('change', async () => {
    writeStorage('jdl:motion-device', deviceSelect.value);
    if (!watching) return;
    stop();
    await start().catch(() => undefined);
  });
  document.querySelector('#toggle-vj')!.addEventListener('click', () => void listDevices().catch(() => undefined));
  // leaving the VJ controls where the movement left them would be a surprise
  vjBox.addEventListener('change', () => {
    if (!vjBox.checked) for (const [control] of VJ_MAP) setVjControl(control, VJ_CONTROLS.find((c) => c.id === control)!.neutral);
  });

  onLangChange(() => {
    onButton.textContent = t(watching ? 'motionStop' : 'motionOn');
    if (!watching) status.textContent = '';
  });
}
