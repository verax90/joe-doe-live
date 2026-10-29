// The phone's page (mando.html): an XY pad, 8 pads and 8 knobs that drive the
// studio over WebRTC (see remote.ts). Deliberately light: no Strudel, no
// Hydra, only PeerJS and this.
import './mando.css';
import type { DataConnection } from 'peerjs';
import type { RemoteMessage, StudioMessage } from './remote';

// Same choice as the studio: the jd-lang cookie, or the phone's language
const code = (document.cookie.match(/jd-lang=(\w+)/)?.[1] ?? navigator.language).slice(0, 2).toLowerCase();
const lang = code === 'es' || code === 'ca' ? code : 'en';
const say = (en: string, es: string, ca: string) => ({ en, es, ca })[lang];
document.documentElement.lang = lang;

const KNOBS = [
  say('Echo', 'Eco', 'Eco'),
  say('Filter', 'Filtro', 'Filtre'),
  say('Reverb', 'Reverb', 'Reverb'),
  'K4',
  'K5',
  'K6',
  say('Volume', 'Volumen', 'Volum'),
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

// Video: the studio sends its clips; each is a pad with its picture, lit
// while it is on screen, and the A/B crossfader of the scenes. The tab only
// shows once the studio has clips.
const tabs = document.querySelector<HTMLElement>('#tabs')!;
const tabMusic = document.querySelector<HTMLButtonElement>('#tab-music')!;
const tabVideo = document.querySelector<HTMLButtonElement>('#tab-video')!;
const music = document.querySelector<HTMLElement>('#music')!;
const video = document.querySelector<HTMLElement>('#video')!;
const clips = document.querySelector<HTMLElement>('#clips')!;
const fader = document.querySelector<HTMLInputElement>('#fader')!;
tabMusic.textContent = say('Music', 'Música', 'Música');
tabVideo.textContent = say('Video', 'Vídeo', 'Vídeo');
const showTab = (onVideo: boolean) => {
  music.hidden = onVideo;
  video.hidden = !onVideo;
  tabMusic.setAttribute('aria-pressed', String(!onVideo));
  tabVideo.setAttribute('aria-pressed', String(onVideo));
};
tabMusic.addEventListener('click', () => showTab(false));
tabVideo.addEventListener('click', () => showTab(true));
fader.addEventListener('input', () => send({ t: 'fader', v: Number(fader.value) }));

const showClips = (items: { name: string; thumb?: string }[]) => {
  tabs.hidden = !items.length;
  if (!items.length) showTab(false);
  clips.replaceChildren(
    ...items.map((item, i) => {
      const pad = document.createElement('button');
      pad.type = 'button';
      pad.className = 'clip';
      if (item.thumb) pad.style.backgroundImage = `url("${item.thumb}")`;
      const name = document.createElement('span');
      name.textContent = item.name;
      pad.append(name);
      pad.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        pad.setPointerCapture(event.pointerId);
        pad.classList.add('is-on');
        send({ t: 'clip', i, on: true });
        navigator.vibrate?.(8);
      });
      const up = () => {
        if (!pad.classList.contains('is-on')) return;
        pad.classList.remove('is-on');
        send({ t: 'clip', i, on: false });
      };
      pad.addEventListener('pointerup', up);
      pad.addEventListener('pointercancel', up);
      return pad;
    }),
  );
};
const fromStudio = (message: StudioMessage) => {
  if (message.t === 'clips') {
    showClips(message.items);
    fader.value = String(message.fader);
  } else if (message.t === 'fader') fader.value = String(message.v);
  else if (message.t === 'live') {
    const on = new Set(message.on);
    clips.querySelectorAll('.clip').forEach((pad, i) => pad.classList.toggle('is-live', on.has(i)));
  }
};

// Connect, and again whenever it drops (the studio reloaded, the phone slept)
async function connect() {
  if (!id) {
    state.textContent = say('No studio in the link', 'Falta el estudio en el enlace', "Falta l'estudi a l'enllaç");
    return;
  }
  state.textContent = say('Connecting…', 'Conectando…', 'Connectant…');
  const { Peer } = await import('peerjs');
  const peer = new Peer();
  const retry = () => {
    state.textContent = say('Reconnecting…', 'Reconectando…', 'Reconnectant…');
    state.classList.remove('is-on');
    peer.destroy();
    window.setTimeout(() => void connect(), 2000);
  };
  peer.on('open', () => {
    connection = peer.connect(`jdl-mando-${id}`, { reliable: true });
    connection.on('open', () => {
      state.textContent = say('Connected', 'Conectado', 'Connectat');
      state.classList.add('is-on');
    });
    connection.on('data', (data) => fromStudio(data as StudioMessage));
    connection.on('close', retry);
  });
  peer.on('error', retry);
}
void connect();
