// Video in the studio, two ways:
// - Source of the webcam visuals: the webcam, video files of yours (in turn) or a
//   browser tab you capture (YouTube playing there, say). Hydra reads its
//   pixels, so effects, the ASCII filter and recording all apply.
// - YouTube behind everything: an embedded player, muted and looped, under the
//   visuals; several links or a YouTube playlist play one after another. YouTube does not let a page read its pixels, so no effect touches
//   it and recordings leave it out; capture its tab for that.
import { t } from './i18n';

type Source = {
  initCam?: (index?: number) => void;
  clear?: () => void;
  init?: (options: { src: HTMLVideoElement; dynamic: boolean }) => void;
  src?: unknown;
};
export type SourceKind = 'webcam' | 'file' | 'tab';

let kind: SourceKind = 'webcam';
let video: HTMLVideoElement | undefined; // the file or the captured tab
let active: SourceKind | null = null; // what s0 is showing right now

const s0 = () => (globalThis as { s0?: Source }).s0;

// Called by the visuals: on while a webcam visual is picked. The camera light
// and a video's playback stay off otherwise; a captured tab stays shared so
// coming back to it does not ask again
export function connectSource(on: boolean) {
  const source = s0();
  if (!source) return;
  const want = on ? kind : null;
  if (want === active) return;
  if (active === 'webcam') source.clear?.();
  else if (active) {
    source.src = null;
    if (active === 'file') video?.pause();
  }
  if (want === 'webcam') source.initCam?.();
  else if (want && video) {
    if (want === 'file') void video.play();
    source.init?.({ src: video, dynamic: true });
  }
  active = want;
}

function dispose(old?: HTMLVideoElement) {
  if (!old) return;
  old.pause();
  (old.srcObject as MediaStream | null)?.getTracks().forEach((track) => track.stop());
  fileUrls.get(old)?.forEach((url) => URL.revokeObjectURL(url));
  old.srcObject = null;
  old.removeAttribute('src');
}

// reconnect: false when the tab capture ended on its own, so the webcam does
// not switch on by surprise
function replace(nextKind: SourceKind, next: HTMLVideoElement | undefined, reconnect = true) {
  const wasOn = active !== null;
  connectSource(false);
  dispose(video);
  video = next;
  kind = nextKind;
  if (wasOn && reconnect) connectSource(true);
}

function makeVideo() {
  const element = document.createElement('video');
  element.muted = true;
  element.playsInline = true;
  return element;
}

// Blob URLs of each file video, freed when it is replaced
const fileUrls = new WeakMap<HTMLVideoElement, string[]>();

// One or more files: several play one after another and the list loops
export async function useFiles(files: File[]) {
  const next = makeVideo();
  const urls = files.map((file) => URL.createObjectURL(file));
  fileUrls.set(next, urls);
  let index = 0;
  next.loop = urls.length === 1;
  next.src = urls[0];
  // Hydra needs the first frame before it can make a texture of it
  await new Promise<void>((resolve, reject) => {
    next.onloadeddata = () => resolve();
    next.onerror = () => reject(new Error('unreadable video'));
  }).catch((error) => {
    dispose(next);
    throw error;
  });
  // Same element, new source: Hydra keeps reading it and resizes to the new video
  next.onerror = null;
  // autoplay: a play() right after changing src can land before it loads
  next.autoplay = true;
  next.addEventListener('ended', () => {
    index = (index + 1) % urls.length;
    next.src = urls[index];
  });
  replace('file', next);
}

export async function useTab(onEnded: () => void) {
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false });
  const next = makeVideo();
  next.srcObject = stream;
  await next.play();
  // "Stop sharing" in the browser bar
  stream.getVideoTracks()[0]?.addEventListener('ended', () => {
    if (video !== next) return;
    replace('webcam', undefined, false);
    onEnded();
  });
  replace('tab', next);
}

export function useWebcam() {
  replace('webcam', undefined);
}

// The 11-character id from any YouTube link (watch, youtu.be, shorts, live,
// embed, music) or the id on its own; null if it is not one
export function youtubeId(input: string) {
  const text = input.trim();
  const valid = (id: string | null | undefined) => (id && /^[\w-]{11}$/.test(id) ? id : null);
  if (valid(text)) return text;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, '');
  if (host === 'youtu.be') return valid(url.pathname.split('/')[1]);
  if (host !== 'youtube.com' && host !== 'youtube-nocookie.com') return null;
  const [, first, second] = url.pathname.split('/');
  if (['shorts', 'live', 'embed', 'v'].includes(first)) return valid(second);
  return valid(url.searchParams.get('v'));
}

// What plays behind: a YouTube playlist link (list=…) plays that list; else
// every video link or id in the text, one after another. Either way it loops
export type YoutubeSource = { list: string } | { ids: string[] };

export function youtubeSource(text: string): YoutubeSource | null {
  const list = text.match(/[?&]list=([\w-]+)/)?.[1];
  if (list) return { list };
  const ids = text
    .split(/[\s,]+/)
    .map(youtubeId)
    .filter((id): id is string => id !== null);
  return ids.length ? { ids } : null;
}

export function youtubeEmbedUrl(source: YoutubeSource) {
  // Muted so it may autoplay; loop=1 needs playlist= even for a single video
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    loop: '1',
    controls: '0',
    playsinline: '1',
    disablekb: '1',
    rel: '0',
    iv_load_policy: '3',
  });
  if ('list' in source) {
    params.set('list', source.list);
    return `https://www.youtube-nocookie.com/embed/videoseries?${params}`;
  }
  params.set('playlist', source.ids.join(','));
  return `https://www.youtube-nocookie.com/embed/${source.ids[0]}?${params}`;
}

// The text you pasted is remembered, so the same list comes back next time
const YOUTUBE_KEY = 'jdl:youtube';

function setYoutube(text: string | null) {
  document.getElementById('youtube-bg')?.remove();
  const source = text ? youtubeSource(text) : null;
  document.body.classList.toggle('has-youtube', Boolean(source));
  try {
    if (source) localStorage.setItem(YOUTUBE_KEY, text!);
    else localStorage.removeItem(YOUTUBE_KEY);
  } catch {
    // not remembered, still shown
  }
  if (!source) return null;
  const frame = document.createElement('iframe');
  frame.id = 'youtube-bg';
  frame.className = 'youtube-bg';
  frame.title = 'YouTube';
  frame.tabIndex = -1;
  frame.setAttribute('aria-hidden', 'true');
  frame.allow = 'autoplay; encrypted-media';
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  frame.src = youtubeEmbedUrl(source);
  document.body.prepend(frame);
  return source;
}

export function setupVideo(options: { showSource: () => void }) {
  const status = document.querySelector<HTMLElement>('#video-status')!;
  const form = document.querySelector<HTMLFormElement>('#youtube-form')!;
  const input = document.querySelector<HTMLTextAreaElement>('#youtube-url')!;
  const off = document.querySelector<HTMLButtonElement>('#youtube-off')!;
  const fileInput = document.querySelector<HTMLInputElement>('#video-file')!;
  const tab = document.querySelector<HTMLButtonElement>('#video-tab')!;
  const webcam = document.querySelector<HTMLButtonElement>('#video-webcam')!;

  const say = (text: string) => (status.textContent = text);
  const showOff = () => (off.hidden = !document.getElementById('youtube-bg'));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const source = setYoutube(input.value);
    showOff();
    if (!source) return say(t('youtubeBad'));
    say('list' in source ? t('youtubeList') : source.ids.length > 1 ? t('youtubeMany', { count: source.ids.length }) : t('youtubeOn'));
  });
  off.addEventListener('click', () => {
    setYoutube(null);
    input.value = '';
    showOff();
    say('');
  });

  fileInput.addEventListener('change', async () => {
    const files = [...(fileInput.files ?? [])];
    fileInput.value = '';
    if (!files.length) return;
    const names = files.map((file) => file.name).join(', ');
    try {
      await useFiles(files);
      options.showSource();
      say(files.length > 1 ? t('videoUsingFiles', { count: files.length, names }) : t('videoUsingFile', { name: names }));
    } catch {
      say(t('videoBadFile', { name: names }));
    }
  });

  tab.addEventListener('click', async () => {
    try {
      await useTab(() => say(t('videoTabEnded')));
      options.showSource();
      say(t('videoUsingTab'));
    } catch {
      say(t('videoTabCancelled'));
    }
  });

  webcam.addEventListener('click', () => {
    useWebcam();
    say(t('videoUsingWebcam'));
  });

  // The YouTube video or list you left on comes back
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(YOUTUBE_KEY);
  } catch {
    // nothing saved
  }
  if (saved && setYoutube(saved)) input.value = saved;
  showOff();
}
