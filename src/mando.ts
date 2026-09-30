// The phone's page (mando.html): an XY pad, 8 pads and 8 knobs that drive the
// studio over WebRTC (see remote.ts). Deliberately light: no Strudel, no
// Hydra, only PeerJS and this.
import './mando.css';
import type { DataConnection } from 'peerjs';
import type { RemoteMessage } from './remote';

const es = (document.cookie.match(/jd-lang=(\w+)/)?.[1] ?? navigator.language).startsWith('es');
const say = (en: string, spanish: string) => (es ? spanish : en);
document.documentElement.lang = es ? 'es' : 'en';

const KNOBS = [
  say('Echo', 'Eco'),
  say('Filter', 'Filtro'),
  say('Reverb', 'Reverb'),
  'K4',
  'K5',
  'K6',
  say('Volume', 'Volumen'),
  'ASCII',
];

const state = document.querySelector<HTMLElement>('#state')!;
const id = new URLSearchParams(location.search).get('id') ?? '';
let connection: DataConnection | undefined;

const send = (message: RemoteMessage) => {
  if (connection?.open) connection.send(message);
};

// XY: a finger anywhere on the square; x left to right, y bottom to top
const area = document.querySelector<HTMLElement>('#xy')!;
const dot = document.querySelector<HTMLElement>('#xy-dot')!;
let pending: { x: number; y: number } | undefined;
const moveXY = (event: PointerEvent) => {
  const box = area.getBoundingClientRect();
  const x = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
  const y = Math.min(1, Math.max(0, 1 - (event.clientY - box.top) / box.height));
  dot.style.left = `${x * 100}%`;
  dot.style.top = `${(1 - y) * 100}%`;
  // at most once a frame
  if (!pending) requestAnimationFrame(() => {
    if (pending) send({ t: 'xy', ...pending });
    pending = undefined;
  });
  pending = { x, y };
};
area.addEventListener('pointerdown', (event) => {
  area.setPointerCapture(event.pointerId);
  area.classList.add('is-on');
  moveXY(event);
});
area.addEventListener('pointermove', (event) => {
  if (area.hasPointerCapture(event.pointerId)) moveXY(event);
});
area.addEventListener('pointerup', () => area.classList.remove('is-on'));

// Pads: hit on touch, several fingers at once
const pads = document.querySelector<HTMLElement>('#pads')!;
for (let i = 0; i < 8; i++) {
  const pad = document.createElement('button');
  pad.type = 'button';
  pad.className = 'pad';
  pad.textContent = String(i + 1);
  pad.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    pad.classList.add('is-on');
    send({ t: 'pad', i, v: 1 });
    navigator.vibrate?.(8);
  });
  pad.addEventListener('pointerup', () => pad.classList.remove('is-on'));
  pad.addEventListener('pointerleave', () => pad.classList.remove('is-on'));
  pads.append(pad);
}

// Knobs, as sliders: K1-K8 like the MPK's
const knobs = document.querySelector<HTMLElement>('#knobs')!;
KNOBS.forEach((name, i) => {
  const label = document.createElement('label');
  label.className = 'knob';
  const text = document.createElement('span');
  text.textContent = `K${i + 1} · ${name}`;
  const input = document.createElement('input');
  input.type = 'range';
  input.min = '0';
  input.max = '1';
  input.step = '0.01';
  input.value = i === 1 || i === 6 ? '0.8' : '0';
  input.addEventListener('input', () => send({ t: 'cc', cc: i + 1, v: Number(input.value) }));
  label.append(text, input);
  knobs.append(label);
});

// Connect, and again whenever it drops (the studio reloaded, the phone slept)
async function connect() {
  if (!id) {
    state.textContent = say('No studio in the link', 'Falta el estudio en el enlace');
    return;
  }
  state.textContent = say('Connecting…', 'Conectando…');
  const { Peer } = await import('peerjs');
  const peer = new Peer();
  const retry = () => {
    state.textContent = say('Reconnecting…', 'Reconectando…');
    state.classList.remove('is-on');
    peer.destroy();
    window.setTimeout(() => void connect(), 2000);
  };
  peer.on('open', () => {
    connection = peer.connect(`jdl-mando-${id}`, { reliable: true });
    connection.on('open', () => {
      state.textContent = say('Connected', 'Conectado');
      state.classList.add('is-on');
    });
    connection.on('close', retry);
  });
  peer.on('error', retry);
}
void connect();
