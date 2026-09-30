// The stream overlay: your name, the song's title and live.joedoe.dev over
// the visuals, bottom right (the code sits on the left), like a TV caption.
// The title can follow what plays: the live set's song, or else the picked
// pattern's name. OBS captures it with the screen; the vertical recording
// draws it into its frames (overlayText).
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

  const render = () => {
    const text = overlayText();
    box.hidden = !text;
    titleInput.disabled = settings.auto;
    if (!text) return;
    artistView.textContent = text.artist;
    titleView.textContent = text.title;
    titleView.hidden = !text.title;
  };
  const save = () => {
    settings = { on: onBox.checked, artist: artistInput.value, title: titleInput.value, auto: autoBox.checked };
    writeStorage('jdl:overlay', settings);
    render();
  };
  for (const input of [onBox, artistInput, titleInput, autoBox]) input.addEventListener('input', save);
  // the song or pattern changes on its own
  setInterval(render, 500);
  render();
}
