// The phone as a controller: More → Phone as controller shows a QR code and a
// link; the phone opens mando.html, a light page with an XY pad, 8 pads and
// 8 knobs, and talks to the studio directly over WebRTC (PeerJS, like the
// live room). Pads arrive as the MPK's bank B pads (notes 32-39: they play
// the drums or your kit), knobs as its knobs (CC 1-8: echo, filter, reverb…
// 7 the master volume, 1-6 the VJ when it takes them), so whatever works
// with the MPK works with the phone. The XY pad is phoneX() and phoneY(),
// 0 to 1, for patterns and Hydra: .lpf(ref(() => 200 + phoneX() * 5000))
import type { DataConnection, Peer } from 'peerjs';
import { t } from './i18n';
import { CC_EVENT, NOTE_EVENT, type CcDetail, type NoteDetail } from './midi';
import { roomId } from './room';
import { readStorage, writeStorage } from './storage';
import { toast } from './toast';

export type RemoteMessage =
  | { t: 'pad'; i: number; v: number }
  | { t: 'cc'; cc: number; v: number }
  | { t: 'xy'; x: number; y: number };

const PREFIX = 'jdl-mando-';
const clamp = (value: number) => Math.min(1, Math.max(0, Number(value) || 0));

const xy = { x: 0.5, y: 0.5 };
const g = globalThis as { phoneX?: () => number; phoneY?: () => number };
g.phoneX = () => xy.x;
g.phoneY = () => xy.y;

// A message from the phone, as the MPK would have sent it
export function applyRemote(message: RemoteMessage, target: EventTarget = window) {
  if (message.t === 'pad' && message.i >= 0 && message.i < 8) {
    target.dispatchEvent(new CustomEvent<NoteDetail>(NOTE_EVENT, { detail: { note: 32 + message.i, velocity: clamp(message.v) } }));
  } else if (message.t === 'cc' && message.cc >= 1 && message.cc <= 8) {
    target.dispatchEvent(new CustomEvent<CcDetail>(CC_EVENT, { detail: { cc: message.cc, value: clamp(message.v), channel: 1 } }));
  } else if (message.t === 'xy') {
    xy.x = clamp(message.x);
    xy.y = clamp(message.y);
  }
}

// The link the phone opens: the same address for this studio every time, so
// a phone that has it bookmarked finds it again
export const remoteLink = (origin: string, id: string) => `${origin}/mando.html?id=${id}`;

// A bass whose filter follows the finger: left to right opens it, bottom to
// top makes it ring
export const XY_EXAMPLE = 'note("<c2 eb2 g1 bb1>*2").s("sawtooth").lpf(ref(() => 150 + phoneX() * 5000)).lpq(ref(() => phoneY() * 15)).gain(0.5)';

export function setupRemote({ addTrack }: { addTrack: (pattern: string) => void }) {
  const onButton = document.querySelector<HTMLButtonElement>('#remote-on')!;
  const box = document.querySelector<HTMLElement>('#remote-box')!;
  const qr = document.querySelector<HTMLElement>('#remote-qr')!;
  const linkInput = document.querySelector<HTMLInputElement>('#remote-link')!;
  const status = document.querySelector<HTMLElement>('#remote-status')!;

  const id = readStorage<string>('jdl:mando-id', '') || roomId();
  writeStorage('jdl:mando-id', id);
  const link = remoteLink(location.origin, id);
  let peer: Peer | undefined;
  const phones = new Set<DataConnection>();

  const render = () => {
    const on = Boolean(peer && !peer.destroyed);
    box.hidden = !on;
    onButton.textContent = on ? t('remoteOff') : t('remoteOn');
    if (on) status.textContent = phones.size ? t('remoteConnected', { n: phones.size }) : t('remoteWaiting');
  };

  const start = async () => {
    status.textContent = t('roomOpening');
    const { Peer } = await import('peerjs');
    const qrcode = (await import('qrcode-generator')).default;
    const code = qrcode(0, 'M');
    code.addData(link);
    code.make();
    qr.innerHTML = code.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    linkInput.value = link;
    peer = new Peer(PREFIX + id);
    peer.on('open', render);
    peer.on('connection', (connection) => {
      connection.on('open', () => {
        phones.add(connection);
        render();
        toast(t('remoteJoined'));
      });
      connection.on('data', (data) => applyRemote(data as RemoteMessage));
      connection.on('close', () => {
        phones.delete(connection);
        render();
      });
    });
    peer.on('error', (error) => {
      // the id is still held from a moment ago (a reload): try again shortly
      if (error.type === 'unavailable-id') {
        peer?.destroy();
        window.setTimeout(() => void start(), 3000);
        return;
      }
      status.textContent = t('roomError', { error: error.type ?? error.message });
    });
    writeStorage('jdl:mando-on', true);
    render();
  };

  const stop = () => {
    peer?.destroy();
    peer = undefined;
    phones.clear();
    writeStorage('jdl:mando-on', false);
    status.textContent = '';
    render();
  };

  onButton.addEventListener('click', () => (peer ? stop() : void start()));
  document.querySelector('#remote-example')!.addEventListener('click', () => addTrack(XY_EXAMPLE));
  document.querySelector('#remote-copy')!.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast(t('roomCopied'));
    } catch {
      linkInput.select();
    }
  });

  // On again after a reload, if it was on: the phone reconnects by itself
  if (readStorage<boolean>('jdl:mando-on', false)) void start();
  render();
}
