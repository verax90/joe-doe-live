// Video in the studio, two ways:
// - Source of the webcam visuals: the webcam, a video file of yours or a
//   browser tab you capture (YouTube playing there, say). Hydra reads its
//   pixels, so effects, the ASCII filter and recording all apply.
// - YouTube behind everything: an embedded player, muted and looped, under the
//   visuals. YouTube does not let a page read its pixels, so no effect touches
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
  if (old.src.startsWith('blob:')) URL.revokeObjectURL(old.src);
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

export async function useFile(file: File) {
  const next = makeVideo();
  next.loop = true;
  next.src = URL.createObjectURL(file);
  // Hydra needs the first frame before it can make a texture of it
  await new Promise<void>((resolve, reject) => {
    next.onloadeddata = () => resolve();
    next.onerror = () => reject(new Error('unreadable video'));
  }).catch((error) => {
    dispose(next);
    throw error;
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

const YOUTUBE_KEY = 'jdl:youtube';

function setYoutube(id: string | null) {
  document.getElementById('youtube-bg')?.remove();
  document.body.classList.toggle('has-youtube', Boolean(id));
  try {
    if (id) localStorage.setItem(YOUTUBE_KEY, id);
    else localStorage.removeItem(YOUTUBE_KEY);
  } catch {
    // not remembered, still shown
  }
  if (!id) return;
  const frame = document.createElement('iframe');
  frame.id = 'youtube-bg';
  frame.className = 'youtube-bg';
  frame.title = 'YouTube';
  frame.tabIndex = -1;
  frame.setAttribute('aria-hidden', 'true');
  frame.allow = 'autoplay; encrypted-media';
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  // Muted so it may autoplay; playlist=id is what makes a single video loop
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    loop: '1',
    playlist: id,
    controls: '0',
    playsinline: '1',
    disablekb: '1',
    rel: '0',
    iv_load_policy: '3',
  });
  frame.src = `https://www.youtube-nocookie.com/embed/${id}?${params}`;
  document.body.prepend(frame);
}

export function setupVideo(options: { showSource: () => void }) {
  const status = document.querySelector<HTMLElement>('#video-status')!;
  const form = document.querySelector<HTMLFormElement>('#youtube-form')!;
  const input = document.querySelector<HTMLInputElement>('#youtube-url')!;
  const off = document.querySelector<HTMLButtonElement>('#youtube-off')!;
  const fileInput = document.querySelector<HTMLInputElement>('#video-file')!;
  const tab = document.querySelector<HTMLButtonElement>('#video-tab')!;
  const webcam = document.querySelector<HTMLButtonElement>('#video-webcam')!;

  const say = (text: string) => (status.textContent = text);
  const showOff = () => (off.hidden = !document.getElementById('youtube-bg'));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const id = youtubeId(input.value);
    if (!id) return say(t('youtubeBad'));
    setYoutube(id);
    showOff();
    say(t('youtubeOn'));
  });
  off.addEventListener('click', () => {
    setYoutube(null);
    input.value = '';
    showOff();
    say('');
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    try {
      await useFile(file);
      options.showSource();
      say(t('videoUsingFile', { name: file.name }));
    } catch {
      say(t('videoBadFile', { name: file.name }));
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

  // The YouTube video you left on comes back
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(YOUTUBE_KEY);
  } catch {
    // nothing saved
  }
  if (saved && youtubeId(saved)) {
    setYoutube(saved);
    input.value = `https://youtu.be/${saved}`;
  }
  showOff();
}
