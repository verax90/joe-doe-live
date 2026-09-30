// YouTube behind the code, as a queue: paste a link and Add (or Enter) and it
// joins the end without touching what plays; the queue shows each video by
// its title, with ▶ to play it now and ✕ to take it out; Next skips; when a
// video ends the next one starts, and after the last, the first again. A
// playlist link (list=…) plays that list instead. A video that may not be
// embedded is skipped with a word. The queue is remembered.
// It drives YouTube's own player (the IFrame API, loaded on first use), so
// adding or skipping never reloads the video that is on.
import { keepingFocus } from './a11y';
import { t } from './i18n';
import { shortName } from './samples';
import { readStorage, writeStorage } from './storage';
import { youtubeId } from './video';

export type Queue = { ids: string[]; index: number; list?: string };
export const EMPTY: Queue = { ids: [], index: 0 };

// Every video link (or id) in what was pasted, in order; a playlist link
// becomes the queue's list instead
export function addToQueue(queue: Queue, text: string): Queue {
  const list = text.match(/[?&]list=([\w-]+)/)?.[1];
  const ids = text
    .split(/[\s,]+/)
    .map(youtubeId)
    .filter((id): id is string => id !== null);
  if (list && !ids.length) return { ids: [], index: 0, list };
  if (!ids.length) return queue;
  // a list was playing: the videos start a queue of their own
  if (queue.list) return { ids, index: 0 };
  return { ...queue, ids: [...queue.ids, ...ids] };
}

// Without the video at i; the one playing stays the one playing
export function removeFromQueue(queue: Queue, i: number): Queue {
  const ids = queue.ids.filter((_, j) => j !== i);
  let index = queue.index;
  if (i < index) index--;
  if (index >= ids.length) index = 0;
  return { ...queue, ids, index };
}

export const nextIndex = (queue: Queue) => (queue.ids.length ? (queue.index + 1) % queue.ids.length : 0);

// The IFrame API: its script once, then its YT namespace
type Player = {
  loadVideoById(id: string): void;
  loadPlaylist(options: { list: string; listType: 'playlist' }): void;
  nextVideo(): void;
  setLoop(loop: boolean): void;
  mute(): void;
  playVideo(): void;
  destroy(): void;
  getIframe(): HTMLIFrameElement;
  getVideoData(): { video_id?: string; title?: string };
  unloadModule?(name: string): void;
};
type YT = { Player: new (element: HTMLElement, options: Record<string, unknown>) => Player; PlayerState: { ENDED: number } };
let api: Promise<YT> | undefined;
function loadApi() {
  api ??= new Promise<YT>((resolve) => {
    const g = window as unknown as { YT?: YT; onYouTubeIframeAPIReady?: () => void };
    if (g.YT?.Player) return resolve(g.YT);
    g.onYouTubeIframeAPIReady = () => resolve(g.YT!);
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.append(script);
  });
  return api;
}

// Titles, asked once each from YouTube's oEmbed (public, no key)
const titles = new Map<string, string>();
async function titleOf(id: string) {
  if (titles.has(id)) return titles.get(id)!;
  try {
    const response = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://youtu.be/${id}`)}`);
    const title = response.ok ? ((await response.json()) as { title?: string }).title : undefined;
    if (title) titles.set(id, title);
    return title ?? id;
  } catch {
    return id;
  }
}

const KEY = 'jdl:youtube-queue';

export function setupYoutube(say: (text: string) => void) {
  const form = document.querySelector<HTMLFormElement>('#youtube-form')!;
  const input = document.querySelector<HTMLInputElement>('#youtube-url')!;
  const list = document.querySelector<HTMLOListElement>('#youtube-queue')!;
  const next = document.querySelector<HTMLButtonElement>('#youtube-next')!;
  const off = document.querySelector<HTMLButtonElement>('#youtube-off')!;

  let queue: Queue = { ...EMPTY, ...readStorage<Queue>(KEY, EMPTY) };
  // the old way kept the pasted text: it becomes the queue
  const legacy = readStorage<string | null>('jdl:youtube', null);
  if (legacy && !queue.ids.length && !queue.list) queue = addToQueue(EMPTY, legacy);

  // one player, made once (even if two links come in before it is ready)
  let ready: Promise<Player> | undefined;
  let playing: string | undefined; // the id (or list) the player is on

  const save = () => writeStorage(KEY, queue);
  const active = () => Boolean(queue.list || queue.ids.length);

  const render = () =>
    keepingFocus(list, () => {
      list.replaceChildren(
        ...(queue.list
          ? [Object.assign(document.createElement('li'), { className: 'youtube-item is-now', textContent: t('youtubeList') })]
          : queue.ids.map((id, i) => {
              const item = document.createElement('li');
              item.className = 'youtube-item';
              item.classList.toggle('is-now', i === queue.index);
              const name = document.createElement('span');
              name.className = 'youtube-name';
              name.textContent = shortName(titles.get(id) ?? id, 34);
              name.title = titles.get(id) ?? id;
              const play = document.createElement('button');
              play.type = 'button';
              play.className = 'cheat-icon';
              play.textContent = '▶';
              play.setAttribute('aria-label', t('youtubePlayNow', { name: titles.get(id) ?? id }));
              play.addEventListener('click', () => {
                queue = { ...queue, index: i };
                void go();
              });
              const remove = document.createElement('button');
              remove.type = 'button';
              remove.className = 'cheat-icon';
              remove.textContent = '✕';
              remove.setAttribute('aria-label', t('youtubeRemove', { name: titles.get(id) ?? id }));
              remove.addEventListener('click', () => {
                const wasOn = i === queue.index;
                queue = removeFromQueue(queue, i);
                if (wasOn || !active()) void go();
                else {
                  save();
                  render();
                }
              });
              item.append(name, play, remove);
              return item;
            })),
      );
      next.hidden = !(queue.ids.length > 1 || queue.list);
      off.hidden = !active();
      document.body.classList.toggle('has-youtube', active());
    });

  const names = () => {
    for (const id of queue.ids) {
      if (!titles.has(id))
        void titleOf(id).then((title) => {
          if (title !== id) render();
        });
    }
  };

  const vars = () => ({
    autoplay: 1,
    mute: 1,
    controls: 0,
    playsinline: 1,
    disablekb: 1,
    rel: 0,
    iv_load_policy: 3,
    cc_load_policy: 0,
  });

  // no subtitles over a background (YouTube may switch on automatic ones)
  const noCaptions = (player: Player) => {
    try {
      player.unloadModule?.('captions');
      player.unloadModule?.('cc');
    } catch {
      // an older player: nothing to take off
    }
  };

  const makePlayer = (first: string) =>
    loadApi().then(
      (YT) =>
        new Promise<Player>((resolve) => {
          const holder = document.createElement('div');
          document.body.prepend(holder);
          const player: Player = new YT.Player(holder, {
            host: 'https://www.youtube-nocookie.com',
            videoId: queue.list ? undefined : first,
            playerVars: { ...vars(), ...(queue.list ? { listType: 'playlist', list: queue.list, loop: 1 } : {}) },
            events: {
              onReady: () => {
                const frame = player.getIframe();
                frame.id = 'youtube-bg';
                frame.className = 'youtube-bg';
                frame.tabIndex = -1;
                frame.setAttribute('aria-hidden', 'true');
                player.mute();
                player.playVideo();
                noCaptions(player);
                resolve(player);
              },
              onStateChange: (event: { data: number }) => {
                // each new video brings its captions module back
                if (event.data === 1) noCaptions(player);
                if (event.data !== YT.PlayerState.ENDED || queue.list) return;
                // the end: the next one, or this one again when it is alone
                queue = { ...queue, index: nextIndex(queue) };
                playing = undefined;
                void go();
              },
              onError: () => {
                if (queue.list) return;
                const id = queue.ids[queue.index];
                say(t('youtubeSkipped', { name: titles.get(id) ?? id }));
                if (queue.ids.length > 1) {
                  queue = removeFromQueue(queue, queue.index);
                  playing = undefined;
                  void go();
                }
              },
            },
          });
        }),
    );

  // Puts the player on what the queue says, only if it is not already there
  async function go() {
    save();
    render();
    names();
    const want = queue.list ?? queue.ids[queue.index];
    if (!want) {
      const old = ready;
      ready = undefined;
      playing = undefined;
      (await old)?.destroy();
      document.getElementById('youtube-bg')?.remove();
      return;
    }
    if (want === playing) return;
    playing = want;
    const fresh = !ready;
    ready ??= makePlayer(want);
    const player = await ready;
    // made just now with this very video: nothing more to do
    if (fresh || playing !== want) return;
    if (queue.list) {
      player.loadPlaylist({ list: queue.list, listType: 'playlist' });
      player.setLoop(true);
    } else player.loadVideoById(want);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const before = queue;
    queue = addToQueue(queue, input.value);
    if (queue === before) return say(t('youtubeBad'));
    input.value = '';
    say(queue.list ? t('youtubeList') : before.ids.length && !before.list ? t('youtubeAdded') : t('youtubeOn'));
    void go();
  });
  next.addEventListener('click', () => {
    if (queue.list) return void ready?.then((player) => player.nextVideo());
    queue = { ...queue, index: nextIndex(queue) };
    void go();
  });
  off.addEventListener('click', () => {
    queue = { ...EMPTY };
    say('');
    void go();
  });

  // what was on comes back
  render();
  if (active()) void go();
}
