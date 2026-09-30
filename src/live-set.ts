// Live set: a running order of songs for a gig. Each song is a copy of a
// pattern's code with the visual that goes with it. During the set a bar at
// the bottom shows where you are; ← → (or a presentation clicker, or the MPK
// pads in PROG CHANGE mode) move through it, and while it plays the next song
// comes in on the bar line, with its own tempo and visual.
import { keepingFocus } from './a11y';
import { askText } from './ask';
import { onLangChange, pick, t, type Localized } from './i18n';
import { prepareSounds } from './offline';
import type { Preset } from './presets';
import { readStorage, writeStorage } from './storage';
import type { StrudelMirror } from './strudel';
import { toast } from './toast';

// preset: the pattern it was copied from, if any, to show it in the pattern list
export type Song = { name: string; code: string; visual: string; preset?: string };

const STORAGE_KEY = 'jdl:set';
const HIDE_KEY = 'jdl:set-hide-code';

// When to swap so the new pattern starts on the next bar line. Strudel queues
// notes ahead (latency plus its query window), so the swap has to happen that
// much before the bar; too close to it, it waits for the one after
export function msUntilBar(cycle: number, cps: number, lead = 0.3) {
  const perCycle = 1 / cps;
  let seconds = (Math.ceil(cycle) - cycle) * perCycle - lead;
  if (seconds < 0.05) seconds += perCycle;
  return Math.round(seconds * 1000);
}

// Moves one song up (-1) or down (+1); out of range leaves the list as is
export function moveSong(songs: Song[], index: number, by: number) {
  const target = index + by;
  if (target < 0 || target >= songs.length) return songs;
  const next = [...songs];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

type Options = {
  editor: StrudelMirror;
  presets: () => Preset[];
  visuals: { id: string; name: Localized }[];
  currentVisual: () => string;
  // Loads a song's visual (and redraws it)
  useVisual: (id: string) => void;
  // A song is about to replace the code (the scenes start over, the pattern
  // list shows where it comes from)
  onLoad: (song: Song) => void;
};

// For the stream overlay: the song playing now in a set, if one is on
let songNow: () => string | undefined = () => undefined;
export const liveSetSong = () => songNow();

export function setupLiveSet({ editor, presets, visuals, currentVisual, useVisual, onLoad }: Options) {
  const patternSelect = document.querySelector<HTMLSelectElement>('#set-pattern')!;
  const visualSelect = document.querySelector<HTMLSelectElement>('#set-visual')!;
  const list = document.querySelector<HTMLOListElement>('#set-list')!;
  const hideCode = document.querySelector<HTMLInputElement>('#set-hide-code')!;
  const start = document.querySelector<HTMLButtonElement>('#set-start')!;
  const offline = document.querySelector<HTMLButtonElement>('#set-offline')!;
  const bar = document.querySelector<HTMLElement>('#set-bar')!;
  const now = document.querySelector<HTMLElement>('#set-now')!;
  const upcoming = document.querySelector<HTMLElement>('#set-upcoming')!;

  let songs = readStorage<Song[]>(STORAGE_KEY, []);
  hideCode.checked = readStorage<boolean>(HIDE_KEY, false);
  let active = false;
  let index = 0;
  let pending: number | undefined; // the song waiting for the bar line
  let timer: number | undefined;
  songNow = () => (active ? songs[index]?.name : undefined);

  const save = () => writeStorage(STORAGE_KEY, songs);
  const visualName = (id: string) => pick(visuals.find((v) => v.id === id)?.name ?? { en: id, es: id });
  const scheduler = () => editor.repl?.scheduler;

  const fillSelects = () => {
    const keepPattern = patternSelect.value;
    patternSelect.replaceChildren(new Option(t('setCurrentCode'), ''), ...presets().map((p) => new Option(p.name, p.id)));
    patternSelect.value = keepPattern;
    const keepVisual = visualSelect.value || currentVisual();
    visualSelect.replaceChildren(...visuals.map((v) => new Option(pick(v.name), v.id)));
    visualSelect.value = keepVisual;
  };

  // drawn again, the keyboard focus stays where it was (a11y.ts)
  const renderList = () => keepingFocus(list, renderListNow);
  const renderListNow = () => {
    list.replaceChildren(
      ...songs.map((song, i) => {
        const item = document.createElement('li');
        item.className = 'set-song';
        item.classList.toggle('is-now', active && i === index);
        const text = document.createElement('span');
        text.className = 'set-song-text';
        text.textContent = `${i + 1}. ${song.name}`;
        const visual = document.createElement('span');
        visual.className = 'set-song-visual';
        visual.textContent = visualName(song.visual);
        const actions = document.createElement('div');
        actions.className = 'cheat-actions';
        const button = (label: string, title: string, onClick: () => void) => {
          const element = document.createElement('button');
          element.type = 'button';
          element.className = 'cheat-action';
          element.textContent = label;
          element.title = title;
          element.setAttribute('aria-label', `${title}: ${song.name}`);
          element.addEventListener('click', onClick);
          return element;
        };
        actions.append(
          button('↑', t('setUp'), () => update(moveSong(songs, i, -1))),
          button('↓', t('setDown'), () => update(moveSong(songs, i, 1))),
          button('✕', t('setRemove'), () => update(songs.filter((_, j) => j !== i))),
        );
        item.append(text, visual, actions);
        return item;
      }),
    );
    start.disabled = songs.length === 0;
    offline.disabled = songs.length === 0;
  };

  const renderBar = () => {
    bar.hidden = !active;
    if (!active) return;
    const shown = pending ?? index;
    now.textContent = `${shown + 1}/${songs.length} · ${songs[shown].name}${pending !== undefined ? ` · ${t('setOnTheBar')}` : ''}`;
    const next = songs[shown + 1];
    upcoming.textContent = next ? t('setNextUp', { name: next.name }) : t('setLast');
  };

  function update(next: Song[]) {
    songs = next;
    save();
    renderList();
  }

  document.querySelector('#set-add')!.addEventListener('click', async () => {
    const preset = presets().find((p) => p.id === patternSelect.value);
    const name = preset?.name ?? (await askText(t('setNamePrompt')));
    if (!name) return;
    update([...songs, { name, code: preset?.code ?? editor.code, visual: visualSelect.value, preset: preset?.id }]);
    toast(t('setAdded', { name, n: songs.length }));
  });

  // Loads song i now: code, scenes, visual; plays it if the set is playing
  const load = (i: number) => {
    index = i;
    pending = undefined;
    const song = songs[i];
    onLoad(song);
    editor.setCode(song.code);
    useVisual(song.visual);
    if (scheduler()?.started) void editor.evaluate();
    renderBar();
    renderList();
  };

  // Goes to song i: at once when stopped, on the next bar line when playing
  const go = (i: number) => {
    if (!active || !songs.length) return;
    const target = Math.max(0, Math.min(songs.length - 1, i));
    clearTimeout(timer);
    const clock = scheduler();
    if (!clock?.started || !clock.now || !clock.cps) return load(target);
    pending = target;
    renderBar();
    timer = window.setTimeout(() => load(target), msUntilBar(clock.now(), clock.cps));
  };
  const step = (by: number) => go((pending ?? index) + by);

  start.addEventListener('click', () => {
    if (!songs.length) return;
    active = true;
    writeStorage(HIDE_KEY, hideCode.checked);
    if (hideCode.checked && !document.body.classList.contains('hide-code')) document.querySelector<HTMLButtonElement>('#toggle-code')!.click();
    document.querySelectorAll<HTMLElement>('.panel').forEach((panel) => (panel.hidden = true));
    document.querySelectorAll('[data-panel]').forEach((button) => button.setAttribute('aria-pressed', 'false'));
    load(0);
    toast(t('setStarted'));
  });

  // Before a gig with no wifi: every sound the songs use, downloaded now
  offline.addEventListener('click', async () => {
    if (scheduler()?.started) return toast(t('setOfflineStop'));
    const label = offline.textContent;
    offline.disabled = true;
    try {
      const { sounds, failed } = await prepareSounds(
        editor,
        songs.map((song) => song.code),
        (done, total) => (offline.textContent = t('setOfflineBusy', { n: done + 1, total })),
      );
      toast(t('setOfflineDone', { sounds }) + (failed ? ` ${t('setOfflineFailed', { failed })}` : ''));
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error));
    } finally {
      offline.textContent = label;
      offline.disabled = songs.length === 0;
      // A song's Hydra code may have drawn over the visual
      useVisual(currentVisual());
    }
  });

  const exit = () => {
    active = false;
    pending = undefined;
    clearTimeout(timer);
    renderBar();
    renderList();
  };
  document.querySelector('#set-exit')!.addEventListener('click', exit);
  document.querySelector('#set-prev')!.addEventListener('click', () => step(-1));
  document.querySelector('#set-next')!.addEventListener('click', () => step(1));

  // ← → and a clicker's PageUp / PageDown, unless you are typing
  window.addEventListener('keydown', (event) => {
    if (!active || event.ctrlKey || event.metaKey || event.altKey) return;
    if ((event.target as HTMLElement).closest?.('.cm-editor, input, select, textarea')) return;
    const by = { ArrowRight: 1, PageDown: 1, ArrowLeft: -1, PageUp: -1 }[event.key];
    if (!by) return;
    event.preventDefault();
    step(by);
  });

  fillSelects();
  renderList();
  // Patterns saved since the page loaded show up when the panel opens
  document.querySelector('#toggle-set')!.addEventListener('click', fillSelects);
  onLangChange(() => {
    fillSelects();
    renderList();
    renderBar();
  });

  return {
    // PROG CHANGE with "the set" chosen: pad n plays song n
    playProgram(program: number) {
      if (!songs.length) return;
      if (!active) start.click();
      go(program % songs.length);
    },
  };
}
