// Live room: share what you play with friends, who hear it made in their own
// browser. You open a room and pass its link (?sala=<id>); every play sends
// your code, the visual you pick and when you stop. Browsers talk directly
// (WebRTC through PeerJS; its free public server only introduces them), so it
// needs no server of ours and costs next to no bandwidth.
// Not sent: your voice, the MPK played without Play. It is the same music,
// not the same instant: each browser keeps its own bar line.
import type { DataConnection, Peer } from 'peerjs';
import { t } from './i18n';
import { kitsUsedBy, useSentKit } from './samples';
import type { StrudelMirror } from './strudel';
import { toast } from './toast';

type Message =
  | { type: 'state'; code: string; visual: string; playing: boolean }
  | { type: 'visual'; visual: string }
  | { type: 'stop' }
  | { type: 'kit'; name: string; files: ArrayBuffer[] };

const PREFIX = 'jdl-room-';

// Short, easy to read out: no 0/o or 1/l
export function roomId(random = Math.random) {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
  return Array.from({ length: 6 }, () => alphabet[Math.floor(random() * alphabet.length)]).join('');
}

export const roomFromUrl = (search = location.search) => {
  const id = new URLSearchParams(search).get('sala');
  return id && /^[a-z0-9]{4,12}$/.test(id) ? id : null;
};

// PeerJS (about 100 KB) only loads when a room is used
const loadPeer = async () => (await import('peerjs')).Peer;

type Options = {
  editor: StrudelMirror;
  currentVisual: () => string;
  // A visual from the room; webcam ones arrive as Lime, so no one's camera
  // turns on from a link
  showVisual: (id: string) => void;
};

export function setupRoom({ editor, currentVisual, showVisual }: Options) {
  const openButton = document.querySelector<HTMLButtonElement>('#room-open')!;
  const closeButton = document.querySelector<HTMLButtonElement>('#room-close')!;
  const hosting = document.querySelector<HTMLElement>('#room-hosting')!;
  const linkInput = document.querySelector<HTMLInputElement>('#room-link')!;
  const listeners = document.querySelector<HTMLElement>('#room-listeners')!;
  const status = document.querySelector<HTMLElement>('#room-status')!;

  let peer: Peer | undefined;
  const guests = new Set<DataConnection>();
  let playing = false;

  const renderHost = () => {
    const open = Boolean(peer && !peer.destroyed);
    openButton.hidden = open;
    hosting.hidden = !open;
    listeners.textContent = t('roomListeners', { n: guests.size });
  };

  const state = (): Message => ({ type: 'state', code: editor.code, visual: currentVisual(), playing });

  const send = (message: Message, to: Iterable<DataConnection> = guests) => {
    for (const connection of to) if (connection.open) connection.send(message);
  };

  // Your samples go before the code that uses them: only the kits the code
  // uses, each once per listener (also those it starts using mid-session)
  const sentKits = new WeakMap<DataConnection, Set<string>>();
  const sendKits = async (connection: DataConnection) => {
    const sent = sentKits.get(connection) ?? new Set<string>();
    sentKits.set(connection, sent);
    for (const kit of await kitsUsedBy(editor.code)) {
      if (sent.has(kit.name)) continue;
      sent.add(kit.name);
      send({ type: 'kit', ...kit }, [connection]);
    }
  };
  const welcome = async (connection: DataConnection) => {
    await sendKits(connection);
    send(state(), [connection]);
  };

  openButton.addEventListener('click', async () => {
    status.textContent = t('roomOpening');
    const Peer = await loadPeer();
    const id = roomId();
    peer = new Peer(PREFIX + id);
    peer.on('open', () => {
      linkInput.value = `${location.origin}/?sala=${id}`;
      status.textContent = '';
      renderHost();
    });
    peer.on('connection', (connection) => {
      connection.on('open', () => {
        guests.add(connection);
        renderHost();
        void welcome(connection);
        toast(t('roomJoined', { n: guests.size }));
      });
      connection.on('close', () => {
        guests.delete(connection);
        renderHost();
      });
    });
    peer.on('error', (error) => {
      status.textContent = t('roomError', { error: error.type ?? error.message });
    });
  });

  closeButton.addEventListener('click', () => {
    peer?.destroy();
    peer = undefined;
    guests.clear();
    renderHost();
    status.textContent = t('roomClosed');
  });

  document.querySelector('#room-copy')!.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(linkInput.value);
      toast(t('roomCopied'));
    } catch {
      linkInput.select();
    }
  });

  renderHost();

  // Joining from a ?sala= link: a bar at the top to start listening (the
  // browser needs a click before any sound) and to leave
  const joinId = roomFromUrl();
  if (joinId) void listen(joinId);

  async function listen(id: string) {
    const bar = document.querySelector<HTMLElement>('#room-bar')!;
    const text = bar.querySelector<HTMLElement>('.room-bar-text')!;
    const start = bar.querySelector<HTMLButtonElement>('#room-listen')!;
    bar.hidden = false;
    text.textContent = t('roomConnecting');
    let started = false;
    let last: Extract<Message, { type: 'state' }> | undefined;
    let guestPeer: Peer | undefined;

    const apply = async (message: Extract<Message, { type: 'state' }>) => {
      last = message;
      editor.setCode(message.code);
      showVisual(message.visual);
      if (started && message.playing) await editor.evaluate();
      else if (started) await editor.stop();
    };

    start.addEventListener('click', async () => {
      started = true;
      start.hidden = true;
      text.textContent = t('roomListening');
      if (last) await apply(last);
    });
    document.querySelector('#room-leave')!.addEventListener('click', () => {
      guestPeer?.destroy();
      void editor.stop();
      history.replaceState(null, '', location.pathname);
      bar.hidden = true;
    });

    const Peer = await loadPeer();
    const peerOfMine = new Peer();
    guestPeer = peerOfMine;
    peerOfMine.on('open', () => {
      const connection = peerOfMine.connect(PREFIX + id, { reliable: true });
      connection.on('open', () => (text.textContent = started ? t('roomListening') : t('roomReady')));
      connection.on('data', async (data) => {
        const message = data as Message;
        if (message.type === 'kit') await useSentKit(message.name, message.files);
        else if (message.type === 'state') await apply(message);
        else if (message.type === 'visual') showVisual(message.visual);
        else if (message.type === 'stop' && started) await editor.stop();
      });
      connection.on('close', () => (text.textContent = t('roomEnded')));
    });
    peerOfMine.on('error', (error) => {
      text.textContent = error.type === 'peer-unavailable' ? t('roomNotFound') : t('roomError', { error: error.type ?? error.message });
    });
  }

  return {
    // From main.ts: every play, stop and visual change while hosting
    async played() {
      playing = true;
      for (const connection of guests) await sendKits(connection);
      send(state());
    },
    stopped() {
      playing = false;
      send({ type: 'stop' });
    },
    visual(visual: string) {
      send({ type: 'visual', visual });
    },
  };
}
