// The stream overlay: your name, the song's title and live.joedoe.dev over
// the visuals, bottom right (the code sits on the left), like a TV caption.
// The title can follow what plays: the live set's song, or else the picked
// pattern's name. OBS captures it with the screen; the vertical recording
// draws it into its frames (overlayText).
import { t } from './i18n';
import { liveSetSong } from './live-set';
import { readStorage, writeStorage } from './storage';

type Settings = { on: boolean; artist: string; title: string; auto: boolean };

let settings = readStorage<Settings>('jdl:overlay', { on: false, artist: 'joe doe', title: '', auto: true });

// The title to show: typed, or what plays when automatic
export function overlayTitle(current: Settings, song: string | undefined, pattern: string | undefined) {
  if (!current.auto) return current.title.trim();
  return (song ?? pattern ?? current.title).trim();
}

const patternName = () => {
  const select = document.querySelector<HTMLSelectElement>('#preset');
  return select?.value ? select.selectedOptions[0]?.text : undefined;
};

// For recordings: what the overlay says, or null when it is off
export const overlayText = () =>
  settings.on ? { artist: settings.artist.trim(), title: overlayTitle(settings, liveSetSong(), patternName()) } : null;

export function setupOverlay() {
  const box = document.querySelector<HTMLElement>('#overlay')!;
  const artistView = box.querySelector<HTMLElement>('.overlay-artist')!;
  const titleView = box.querySelector<HTMLElement>('.overlay-title')!;
  const onBox = document.querySelector<HTMLInputElement>('#overlay-on')!;
  const artistInput = document.querySelector<HTMLInputElement>('#overlay-artist')!;
  const titleInput = document.querySelector<HTMLInputElement>('#overlay-title')!;
  const autoBox = document.querySelector<HTMLInputElement>('#overlay-auto')!;

  onBox.checked = settings.on;
  artistInput.value = settings.artist;
  titleInput.value = settings.title;
  autoBox.checked = settings.auto;

  // with a side panel open, the caption sits left of its real edge (panels
  // are not all the same width; on phones the panel covers the screen)
  const dodgePanel = () => {
    const panel = document.querySelector<HTMLElement>('.stage > .panel:not([hidden])');
    const left = panel && innerWidth > 700 ? panel.getBoundingClientRect().left : 0;
    box.style.right = left > 0 ? `${document.documentElement.clientWidth - left + 16}px` : '';
  };
  const render = () => {
    const text = overlayText();
    box.hidden = !text;
    dodgePanel();
    // with the title automatic, the field shows what it says now (greyed);
    // it is never locked: typing in it makes the title yours (below)
    titleInput.classList.toggle('is-auto', settings.auto);
    titleInput.title = settings.auto ? t('overlayAutoHint') : '';
    if (settings.auto && document.activeElement !== titleInput) titleInput.value = overlayTitle(settings, liveSetSong(), patternName()) ?? '';
    if (!text) return;
    artistView.textContent = text.artist;
    titleView.textContent = text.title;
    titleView.hidden = !text.title;
  };
  const save = () => {
    // while automatic, the field shows the studio's title: your own stays kept
    settings = { on: onBox.checked, artist: artistInput.value, title: autoBox.checked ? settings.title : titleInput.value, auto: autoBox.checked };
    writeStorage('jdl:overlay', settings);
    render();
  };
  for (const input of [onBox, artistInput, titleInput, autoBox]) input.addEventListener('input', save);
  // clicking into the title to write it: no longer automatic, starting from what it said
  titleInput.addEventListener('focus', () => {
    if (!autoBox.checked) return;
    autoBox.checked = false;
    save();
    titleInput.select();
  });
  // back to automatic: the field shows the studio's title again
  autoBox.addEventListener('change', () => {
    if (autoBox.checked) titleInput.value = overlayTitle({ ...settings, auto: true }, liveSetSong(), patternName()) ?? '';
  });
  // the song or pattern changes on its own
  setInterval(render, 500);
  addEventListener('resize', dodgePanel);
  render();
}
