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
};

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
    </div>`;
  document.body.append(element);
  const video = element.querySelector<HTMLVideoElement>('video')!;
  // Sound stays as you left it last time (off at first)
  video.muted = readStorage<boolean>('jdl:viewer-muted', true);
  video.addEventListener('volumechange', () => writeStorage('jdl:viewer-muted', video.muted));
  // Long films open a fifth of the way in, past the titles
  video.addEventListener('loadedmetadata', () => {
    if (video.duration > 20) video.currentTime = video.duration * 0.2;
  });
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
    if (event.key === 'ArrowLeft') show(index - 1);
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
