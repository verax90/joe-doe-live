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

// Keep following a finger that slides off; a pointer the browser no longer
// knows (it lifted already) is simply not captured
const capture = (element: HTMLElement, pointer: number) => {
  try {
    element.setPointerCapture(pointer);
  } catch {
    // nothing to follow
  }
};

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
  capture(area, event.pointerId);
  area.classList.add('is-on');
  moveXY(event);
});
area.addEventListener('pointermove', (event) => {
  if (area.hasPointerCapture(event.pointerId)) moveXY(event);
});
const releaseXY = () => {
  if (!area.classList.contains('is-on')) return;
  area.classList.remove('is-on');
  send({ t: 'xyup' });
};
area.addEventListener('pointerup', releaseXY);
area.addEventListener('pointercancel', releaseXY);
document.querySelector('#xy-hint')!.textContent = say(
  'Filter: ← fewer highs · fewer lows → · ↑ resonance',
  'Filtro: ← menos agudos · menos graves → · ↑ resonancia',
  'Filtre: ← menys aguts · menys greus → · ↑ ressonància',
);

// Pads: hit on touch, several fingers at once
const pads = document.querySelector<HTMLElement>('#pads')!;
for (let i = 0; i < 8; i++) {
  const pad = document.createElement('button');
  pad.type = 'button';
  pad.className = 'pad';
  const number = document.createElement('b');
  number.textContent = String(i + 1);
  const sound = document.createElement('small');
  pad.append(number, sound);
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
        capture(pad, event.pointerId);
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
// Layer the pads fire on, and the glitch
const layers = document.querySelector<HTMLElement>('#layers')!;
const glitch = document.querySelector<HTMLInputElement>('#glitch')!;
const layerButtons = [0, 1, 2, 3].map((i) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'layer';
  button.textContent = String(i + 1);
  button.setAttribute('aria-label', say(`Layer ${i + 1}`, `Capa ${i + 1}`, `Capa ${i + 1}`));
  button.addEventListener('click', () => {
    showMix(i, Number(glitch.value));
    send({ t: 'layer', i });
  });
  return button;
});
layers.append(...layerButtons);
document.querySelector('#layers-label')!.textContent = say('Layer the clips go to', 'Capa donde salen los clips', 'Capa on surten els clips');
glitch.addEventListener('input', () => send({ t: 'glitch', v: Number(glitch.value) }));
function showMix(layer: number, amount: number) {
  layerButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === layer)));
  glitch.value = String(amount);
}

// Play, Stop and Tap, with the studio's state and tempo
const tPlay = document.querySelector<HTMLButtonElement>('#t-play')!;
const tStop = document.querySelector<HTMLButtonElement>('#t-stop')!;
const tTap = document.querySelector<HTMLButtonElement>('#t-tap')!;
const tBpm = document.querySelector<HTMLElement>('#t-bpm')!;
tPlay.textContent = '▶ Play';
tStop.textContent = '■ Stop';
for (const [button, t] of [
  [tPlay, 'play'],
  [tStop, 'stop'],
  [tTap, 'tap'],
] as const) {
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    send({ t });
    navigator.vibrate?.(8);
  });
}

const fromStudio = (message: StudioMessage) => {
  if (message.t === 'transport') {
    tPlay.classList.toggle('is-on', message.playing);
    tPlay.textContent = message.playing ? say('▶ Playing · apply', '▶ Sonando · aplicar', '▶ Sonant · aplicar') : '▶ Play';
    tBpm.textContent = message.bpm ? String(Math.round(message.bpm)) : '–';
    return;
  }
  if (message.t === 'clips') {
    showClips(message.items);
    fader.value = String(message.fader);
    showMix(message.layer, message.glitch);
  } else if (message.t === 'mix') showMix(message.layer, message.glitch);
  else if (message.t === 'pads') {
    pads.querySelectorAll('.pad small').forEach((small, i) => (small.textContent = message.names[i] ?? ''));
  } else if (message.t === 'beat') {
    // the whole page blinks on the beat, the first of the bar brighter
    document.body.classList.remove('beat', 'beat-one');
    void document.body.offsetWidth;
    document.body.classList.add(message.b === 0 ? 'beat-one' : 'beat');
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
