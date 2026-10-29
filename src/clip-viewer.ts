// A big look at a video before taking it (search results) or at a clip of
// yours: the video almost full screen with its own controls, ← → for the
// next one, and Take right there.
import { t } from './i18n';
import { readStorage, writeStorage } from './storage';

export type ViewerItem = {
  title: string;
  meta?: string; // year, source, length
  page?: string; // its page, for the credit and licence
  load: () => Promise<string | null>; // the video's address
  take?: HTMLButtonElement; // the Take button in the list, mirrored here
  done?: () => void; // when the viewer stops using the address
  // A clip of yours: the part to use can be marked here
  range?: { get(): [number, number] | undefined; set(range: [number, number] | undefined, thumb?: string): void };
};

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

let dialog: HTMLDialogElement | undefined;
let items: ViewerItem[] = [];
let index = 0;
let ticket = 0;
let mirror: MutationObserver | undefined;

function build() {
  const element = document.createElement('dialog');
  element.className = 'clip-viewer';
  element.innerHTML = `
    <div class="clip-viewer-stage">
      <video class="clip-viewer-video" controls playsinline loop></video>
      <p class="clip-viewer-loading" hidden></p>
    </div>
    <div class="clip-viewer-bar">
      <button class="control clip-viewer-prev" type="button">←</button>
      <div class="clip-viewer-info">
        <a class="clip-viewer-title" target="_blank" rel="noopener"></a>
        <span class="clip-viewer-meta"></span>
      </div>
      <button class="control control-accent clip-viewer-take" type="button"></button>
      <button class="control clip-viewer-next" type="button">→</button>
      <button class="control clip-viewer-close" type="button">✕</button>
      <div class="clip-viewer-range" hidden>
        <button class="control clip-viewer-in" type="button"></button>
        <span class="clip-viewer-span"></span>
        <button class="control clip-viewer-out" type="button"></button>
        <button class="control clip-viewer-all" type="button"></button>
      </div>
    </div>`;
  document.body.append(element);
  const video = element.querySelector<HTMLVideoElement>('video')!;
  // Sound stays as you left it last time (off at first)
  video.muted = readStorage<boolean>('jdl:viewer-muted', true);
  video.addEventListener('volumechange', () => writeStorage('jdl:viewer-muted', video.muted));
  // A marked part opens at its start; long films a fifth of the way in, past
  // the titles
  video.addEventListener('loadedmetadata', () => {
    const marked = items[index]?.range?.get();
    if (marked) video.currentTime = marked[0];
    else if (video.duration > 20) video.currentTime = video.duration * 0.2;
    showRange();
  });
  // and plays round inside it
  video.addEventListener('timeupdate', () => {
    const marked = items[index]?.range?.get();
    if (marked && video.currentTime > marked[1]) video.currentTime = marked[0];
  });
  const mark = (which: 0 | 1 | null) => {
    const item = items[index];
    if (!item?.range || !Number.isFinite(video.duration)) return;
    if (which === null) {
      item.range.set(undefined);
      return showRange();
    }
    const now = video.currentTime;
    const [from, to] = item.range.get() ?? [0, video.duration];
    const next: [number, number] = which === 0 ? [now, Math.max(to, now + 0.5)] : [Math.min(from, now - 0.5), now];
    next[0] = Math.max(0, next[0]);
    // the frame at the new start becomes its pad's picture
    let thumb: string | undefined;
    if (which === 0) {
      try {
        const picture = document.createElement('canvas');
        picture.width = 160;
        picture.height = 90;
        const c = picture.getContext('2d')!;
        const scale = Math.max(160 / video.videoWidth, 90 / video.videoHeight);
        c.drawImage(video, (160 - video.videoWidth * scale) / 2, (90 - video.videoHeight * scale) / 2, video.videoWidth * scale, video.videoHeight * scale);
        thumb = picture.toDataURL('image/jpeg', 0.7);
      } catch {
        thumb = undefined;
      }
    }
    item.range.set(next, thumb);
    showRange();
  };
  element.querySelector('.clip-viewer-in')!.addEventListener('click', () => mark(0));
  element.querySelector('.clip-viewer-out')!.addEventListener('click', () => mark(1));
  element.querySelector('.clip-viewer-all')!.addEventListener('click', () => mark(null));
  element.querySelector('.clip-viewer-prev')!.addEventListener('click', () => show(index - 1));
  element.querySelector('.clip-viewer-next')!.addEventListener('click', () => show(index + 1));
  element.querySelector('.clip-viewer-close')!.addEventListener('click', () => element.close());
  element.querySelector('.clip-viewer-take')!.addEventListener('click', () => items[index]?.take?.click());
  // A click on the dark around the video closes it
  element.addEventListener('click', (event) => {
    if (event.target === element) element.close();
  });
  element.addEventListener('keydown', (event) => {
    if ((event.target as HTMLElement).closest('input, textarea')) return;
    if (event.key === 'i' && items[index]?.range) (element.querySelector('.clip-viewer-in') as HTMLButtonElement).click();
    else if (event.key === 'o' && items[index]?.range) (element.querySelector('.clip-viewer-out') as HTMLButtonElement).click();
    else if (event.key === 'ArrowLeft') show(index - 1);
    else if (event.key === 'ArrowRight') show(index + 1);
    else if (event.key === ' ' && event.target !== video) {
      event.preventDefault();
      if (video.paused) void video.play();
      else video.pause();
    } else return;
    event.preventDefault();
  });
  element.addEventListener('close', () => {
    video.pause();
    video.removeAttribute('src');
    video.load();
    release();
  });
  return element;
}

// The marked part, under the bar, for clips of yours
function showRange() {
  if (!dialog) return;
  const item = items[index];
  const box = dialog.querySelector<HTMLElement>('.clip-viewer-range')!;
  box.hidden = !item?.range;
  if (!item?.range) return;
  const video = dialog.querySelector<HTMLVideoElement>('video')!;
  const marked = item.range.get();
  dialog.querySelector('.clip-viewer-in')!.textContent = t('clipsMarkIn');
  dialog.querySelector('.clip-viewer-out')!.textContent = t('clipsMarkOut');
  const all = dialog.querySelector<HTMLButtonElement>('.clip-viewer-all')!;
  all.textContent = t('clipsMarkAll');
  all.hidden = !marked;
  dialog.querySelector('.clip-viewer-span')!.textContent = marked
    ? t('clipsMarked', { from: clock(marked[0]), to: clock(marked[1]) })
    : Number.isFinite(video.duration)
      ? t('clipsMarkedAll', { length: clock(video.duration) })
      : '';
}

function release() {
  mirror?.disconnect();
  mirror = undefined;
  items[index]?.done?.();
}

async function show(next: number) {
  if (!dialog || !items.length) return;
  release();
  index = (next + items.length) % items.length;
  const item = items[index];
  const mine = ++ticket;
  const video = dialog.querySelector<HTMLVideoElement>('video')!;
  const loading = dialog.querySelector<HTMLElement>('.clip-viewer-loading')!;
  const title = dialog.querySelector<HTMLAnchorElement>('.clip-viewer-title')!;
  const take = dialog.querySelector<HTMLButtonElement>('.clip-viewer-take')!;
  title.textContent = item.title;
  if (item.page) title.href = item.page;
  else title.removeAttribute('href');
  dialog.querySelector('.clip-viewer-meta')!.textContent = [item.meta, `${index + 1}/${items.length}`].filter(Boolean).join(' · ');
  for (const button of dialog.querySelectorAll<HTMLButtonElement>('.clip-viewer-prev, .clip-viewer-next')) button.hidden = items.length < 2;
  // Take here does what the list's button does, and says what it says
  take.hidden = !item.take;
  if (item.take) {
    const copy = () => {
      take.textContent = item.take!.textContent;
      take.disabled = item.take!.disabled;
      take.classList.toggle('is-done', item.take!.classList.contains('is-done'));
    };
    copy();
    mirror = new MutationObserver(copy);
    mirror.observe(item.take, { childList: true, characterData: true, subtree: true, attributes: true });
  }
  video.pause();
  video.removeAttribute('src');
  showRange();
  loading.hidden = false;
  loading.textContent = t('clipsLoadingVideo');
  try {
    const url = await item.load();
    if (mine !== ticket) return;
    if (!url) throw new Error('no video');
    video.src = url;
    loading.hidden = true;
    void video.play().catch(() => undefined);
  } catch {
    if (mine === ticket) loading.textContent = t('clipsNoVideo');
  }
}

export function openViewer(list: ViewerItem[], start: number) {
  dialog ??= build();
  dialog.querySelector('.clip-viewer-prev')!.setAttribute('aria-label', t('clipsViewerPrev'));
  dialog.querySelector('.clip-viewer-next')!.setAttribute('aria-label', t('clipsViewerNext'));
  dialog.querySelector('.clip-viewer-close')!.setAttribute('aria-label', t('clipsViewerClose'));
  dialog.setAttribute('aria-label', t('clipsPreview'));
  items = list;
  if (!dialog.open) dialog.showModal();
  void show(start);
}
