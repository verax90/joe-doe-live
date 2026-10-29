// The Clips and Find tabs of the Video panel: the pool as pads (click one to
// fire it, rename it to make pools, take it out), and the search of free
// archives that downloads footage into the pool.
import { keepingFocus } from './a11y';
import { download, resolve, resolveLink, search, MAX_BYTES, SUGGESTIONS, type Found, type SourceId } from './clip-search';
import { openViewer, type ViewerItem } from './clip-viewer';
import type { Hit } from './clips';
import { addClip, addPiece, allClips, clearLayer, clipAddress, clipName, fireIndex, liveClips, releaseClip, MIX_MODES, mixer, setClipRange, setGlitchAmount, type MixMode, loadClips, missingNames, onClipsChange, removeClip, renameClip, warmUp, type Clip } from './clips';
import { onLangChange, pick, t, type Localized } from './i18n';
import { NOTE_EVENT, NOTE_OFF_EVENT, type NoteDetail } from './midi';
import { readStorage, writeStorage } from './storage';

type Options = {
  showClips: () => void; // picks a Clips visual
  addTrack: (pattern: string) => void;
};

const SOURCE_NAMES: Record<SourceId, string> = {
  prelinger: 'Prelinger',
  vhs: 'VHS Vault',
  archive: 'Internet Archive',
  nasa: 'NASA',
  commons: 'Wikimedia Commons',
};

const MODE_NAMES: Record<MixMode, Localized> = {
  auto: { en: 'per the code', es: 'según el código', ca: 'segons el codi' },
  normal: { en: 'on top', es: 'encima, tapando', ca: 'a sobre, tapant' },
  screen: { en: 'screen (lighter)', es: 'pantalla (aclara)', ca: 'pantalla (aclareix)' },
  add: { en: 'add (light)', es: 'suma (luz)', ca: 'suma (llum)' },
  diff: { en: 'difference', es: 'diferencia', ca: 'diferència' },
  mult: { en: 'multiply (darker)', es: 'multiplicar (oscurece)', ca: 'multiplicar (enfosqueix)' },
  overlay: { en: 'overlay', es: 'superponer', ca: 'superposar' },
  lighten: { en: 'lighten', es: 'aclarar', ca: 'aclarir' },
  key: { en: 'key: no darks', es: 'key: sin oscuros', ca: 'key: sense foscos' },
  dark: { en: 'key: no lights', es: 'key: sin claros', ca: 'key: sense clars' },
  tiles: { en: 'tiles', es: 'mosaico', ca: 'mosaic' },
  bands: { en: 'bands', es: 'franjas', ca: 'franges' },
  cols: { en: 'columns', es: 'columnas', ca: 'columnes' },
  half: { en: 'half and half', es: 'mitad y mitad', ca: 'meitat i meitat' },
};
const modeName = (mode: MixMode) => pick(MODE_NAMES[mode]);

const megabytes = (bytes: number) => `${Math.max(0.1, bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
const seconds = (value?: number) => {
  if (!value || !Number.isFinite(value)) return '';
  const whole = Math.round(value);
  return whole >= 60 ? `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}` : `${whole} s`;
};

// The pattern "Into the code" writes: three layers at once, after the
// stacked, broken look of Abjext's videos. Layer 0 cuts on the beat, layer 1
// weaves pieces of another clip into it (tiles, bands, columns, halves),
// layer 2 throws short bursts of light and pixels on top
export function examplePattern(names: string[]) {
  const pools = [...new Set(names)].slice(0, 4);
  if (!pools.length) return '';
  const turn = (shift: number) => {
    const order = [...pools.slice(shift % pools.length), ...pools.slice(0, shift % pools.length)];
    return order.length === 1 ? order[0] : `<${order.join(' ')}>`;
  };
  return `s("${turn(0)}*4")
  .sometimesBy(0.25, x => x.speed(-1))
  .sometimesBy(0.3, x => x.fx("<mosh vhs rgb blocks>"))
  .video()
$: s("${turn(1)}*2").fx("<tiles bands_echo cols half_rgb>")
  .speed("<0.5 1>")
  .video(1)
$: s("[~ ${turn(2)}]*2?").fx("<add_glow dodge_flash diff_melt screen_stutter>")
  .coarse("<1 6 1 12>").legato(0.4).gain(0.8)
  .video(2)`;
}

export function setupClipsPanel({ showClips, addTrack }: Options) {
  const fileInput = document.querySelector<HTMLInputElement>('#clips-file')!;
  const list = document.querySelector<HTMLUListElement>('#clips-list')!;
  const empty = document.querySelector<HTMLElement>('#clips-empty')!;
  const status = document.querySelector<HTMLElement>('#clips-status')!;
  const midiBox = document.querySelector<HTMLInputElement>('#clips-midi')!;
  const panel = document.querySelector<HTMLElement>('#video')!;
  const say = (text: string) => (status.textContent = text);

  // ── Adding your own videos ─────────────────────────────────────────────
  const addFiles = async (files: File[]) => {
    const videos = files.filter((file) => file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogv|mkv)$/i.test(file.name));
    if (!videos.length) return;
    let added = 0;
    for (const [index, file] of videos.entries()) {
      say(t('clipsAdding', { done: index + 1, total: videos.length }));
      try {
        await addClip(file, { title: file.name });
        added++;
      } catch {
        say(t('clipsBadFile', { name: file.name }));
      }
    }
    if (added) say(t('clipsAdded', { count: added }));
  };
  fileInput.addEventListener('change', () => {
    const files = [...(fileInput.files ?? [])];
    fileInput.value = '';
    void addFiles(files);
  });
  // Videos dropped on the panel go in too
  panel.addEventListener('dragover', (event) => {
    if ([...(event.dataTransfer?.items ?? [])].some((item) => item.type.startsWith('video/'))) {
      event.preventDefault();
      panel.classList.add('is-dropping');
    }
  });
  panel.addEventListener('dragleave', () => panel.classList.remove('is-dropping'));
  panel.addEventListener('drop', (event) => {
    panel.classList.remove('is-dropping');
    const files = [...(event.dataTransfer?.files ?? [])];
    if (!files.some((file) => file.type.startsWith('video/'))) return;
    event.preventDefault();
    event.stopPropagation();
    void addFiles(files);
  });

  // ── The pool as pads ───────────────────────────────────────────────────
  const counts = () => {
    const byName = new Map<string, number>();
    for (const clip of allClips()) byName.set(clip.name, (byName.get(clip.name) ?? 0) + 1);
    return byName;
  };
  const renderPool = () => {
    keepingFocus(list, renderPoolNow);
    lastLive = ''; // light the new pads up again
  };
  const renderPoolNow = () => {
    const clips = allClips();
    const pools = counts();
    const seen = new Map<string, number>();
    empty.hidden = clips.length > 0;
    list.replaceChildren(
      ...clips.map((clip, index) => {
        const nth = seen.get(clip.name) ?? 0;
        seen.set(clip.name, nth + 1);
        return clipItem(clip, index, (pools.get(clip.name) ?? 1) > 1 ? nth : undefined);
      }),
    );
  };

  const clipItem = (clip: Clip, index: number, nth: number | undefined) => {
    const item = document.createElement('li');
    item.className = 'clip';
    item.dataset.clip = clip.id;
    const pad = document.createElement('button');
    pad.type = 'button';
    pad.className = 'clip-pad';
    pad.title = t('clipsFire', { name: clip.title });
    pad.setAttribute('aria-label', t('clipsFire', { name: clip.title }));
    if (clip.thumb) pad.style.backgroundImage = `url("${clip.thumb}")`;
    const number = document.createElement('span');
    number.className = 'clip-number';
    number.textContent = String(index + 1);
    const length = document.createElement('span');
    length.className = 'clip-length';
    length.textContent = clip.range ? `✂ ${seconds(clip.range[1] - clip.range[0])}` : seconds(clip.duration);
    pad.append(number, length);
    pad.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      press(`pointer`, index, { layer: targetLayer });
      // the release counts even if the finger slides off the pad
      pad.setPointerCapture?.(event.pointerId);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) pad.addEventListener(type, () => letGo('pointer'));
    pad.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      if (!event.repeat) press('pad-key', index, { layer: targetLayer });
    });
    pad.addEventListener('keyup', (event) => {
      if (event.key === 'Enter' || event.key === ' ') letGo('pad-key');
    });

    const name = document.createElement('input');
    name.className = 'clip-name';
    name.value = clip.name;
    name.spellcheck = false;
    name.autocomplete = 'off';
    name.setAttribute('aria-label', t('clipsRename', { name: clip.title }));
    name.title = t('clipsRenameHint');
    const commit = () => void renameClip(clip.id, name.value).then(() => (name.value = allClips().find((c) => c.id === clip.id)?.name ?? name.value));
    name.addEventListener('change', commit);
    name.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') name.blur();
    });
    const tag = document.createElement('span');
    tag.className = 'clip-tag';
    tag.textContent = nth === undefined ? '' : `:${nth}`;

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'clip-remove';
    remove.textContent = '×';
    remove.setAttribute('aria-label', t('clipsRemove', { name: clip.title }));
    remove.title = t('clipsRemove', { name: clip.title });
    remove.addEventListener('click', () => void removeClip(clip.id).then(() => say(t('clipsRemoved', { name: clip.title }))));

    const look = document.createElement('button');
    look.type = 'button';
    look.className = 'clip-remove clip-look';
    look.textContent = '⤢';
    look.setAttribute('aria-label', t('clipsLookBig', { name: clip.title }));
    look.title = t('clipsLookBig', { name: clip.title });
    look.addEventListener('click', () => openPool(clip.id));

    // ⤢ and × sit on the picture's corner, so the name gets the whole row
    const tools = document.createElement('div');
    tools.className = 'clip-tools';
    tools.append(look, remove);
    const row = document.createElement('div');
    row.className = 'clip-row';
    row.append(name, tag);
    item.append(pad, tools, row);
    if (clip.credit) {
      const credit = document.createElement('a');
      credit.className = 'clip-credit';
      credit.href = clip.credit.page;
      credit.target = '_blank';
      credit.rel = 'noopener';
      credit.textContent = clip.credit.source;
      credit.title = clip.title;
      item.append(credit);
    }
    return item;
  };

  // Your clips big, from one of them; startAt opens it at that time (a new
  // piece, where the last one was being looked at)
  const openPool = (id: string, startAt?: number) => {
    const clips = allClips();
    openViewer(
      clips.map((each) => {
        let address: string | null = null;
        return {
          title: each.title,
          meta: [each.name, seconds(each.duration), each.credit?.source].filter(Boolean).join(' · '),
          page: each.credit?.page,
          load: async () => (address = await clipAddress(each)),
          done: () => address && URL.revokeObjectURL(address),
          startAt: each.id === id ? startAt : undefined,
          range: {
            get: () => allClips().find((c) => c.id === each.id)?.range,
            set: (range, thumb) => void setClipRange(each.id, range, thumb),
            piece: (at) =>
              void addPiece(each.id).then((piece) => {
                if (!piece) return;
                openPool(piece.id, at);
                say(t('clipsPieceAdded', { name: piece.name }));
              }),
          },
        };
      }),
      clips.findIndex((each) => each.id === id),
    );
  };

  // The layer pads, keys and MIDI fire on (0 is the bottom one)
  let targetLayer = 0;

  // Held: with "Only while held", letting go of a pad, key or note takes its
  // clip off again; each press is remembered by what pressed it
  const holdBox = document.querySelector<HTMLInputElement>('#clips-hold')!;
  holdBox.checked = readStorage<boolean>('jdl:clips-hold', false);
  holdBox.addEventListener('change', () => writeStorage('jdl:clips-hold', holdBox.checked));
  const pressed = new Map<string, { id: string; layer: number; shown: Promise<void> }>();
  const press = (by: string, index: number, hit: Hit) => {
    const fired = fireIndex(index, hit);
    showClipsIfNeeded();
    if (fired) pressed.set(by, { id: fired.clip.id, layer: hit.layer ?? 0, shown: fired.shown });
  };
  const letGo = (by: string) => {
    const held = pressed.get(by);
    pressed.delete(by);
    if (!held || !holdBox.checked) return;
    void held.shown.then(() => releaseClip(held.id, held.layer));
  };

  // Firing a pad while another visual shows: switch to the clips, once
  let switched = false;
  const showClipsIfNeeded = () => {
    if (switched) return;
    switched = true;
    showClips();
  };

  // Fill: three odd videos at random from different archives, light ones,
  // all called raro, so s("raro") plays at once
  const fillButton = document.querySelector<HTMLButtonElement>('#clips-fill')!;
  fillButton.addEventListener('click', async () => {
    fillButton.disabled = true;
    const sources: SourceId[] = ['nasa', 'commons', 'prelinger', 'vhs'];
    const ideas = sources.flatMap((source) => SUGGESTIONS[source].map((word) => [source, word] as const));
    for (let i = ideas.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ideas[i], ideas[j]] = [ideas[j], ideas[i]];
    }
    const WANTED = 3;
    const LIGHT = 60 * 1024 * 1024;
    let taken = 0;
    for (const [source, word] of ideas.slice(0, 12)) {
      if (taken >= WANTED) break;
      say(t('clipsFilling', { done: taken, total: WANTED, word }));
      try {
        const found = await search(source, word);
        const pick = found[Math.floor(Math.random() * Math.min(found.length, 12))];
        if (!pick) continue;
        const file = await resolve(pick);
        if (!file || (file.size && file.size > LIGHT)) continue;
        const blob = await download(
          file.url,
          (done) => done >= 0 && say(t('clipsFillingFile', { done: taken + 1, total: WANTED, title: pick.title, percent: Math.round(done * 100) })),
          undefined,
          LIGHT,
        );
        await addClip(blob, { title: pick.title, name: 'raro', credit: { source: SOURCE_NAMES[pick.source], page: pick.page } });
        taken++;
      } catch {
        // that one would not come: the next idea
      }
    }
    fillButton.disabled = false;
    say(taken ? t('clipsFilled', { count: taken }) : t('clipsFillFailed'));
  });

  document.querySelector('#clips-show')!.addEventListener('click', () => {
    switched = true;
    showClips();
  });
  document.querySelector('#clips-code')!.addEventListener('click', () => {
    const pattern = examplePattern(allClips().map((clip) => clip.name));
    if (!pattern) return say(t('clipsNoneYet'));
    addTrack(pattern);
    showClips();
    say(t('clipsInCode'));
  });

  onClipsChange(renderPool);
  onClipsChange(() => warmUp([...new Set(allClips().map((clip) => clip.name))]));
  onLangChange(renderPool);
  void loadClips();

  // A pattern asked for a name that is not in the pool: say so, once a second
  setInterval(() => {
    if (!missingNames.size) return;
    say(t('clipsMissing', { names: [...missingNames].join(', ') }));
    missingNames.clear();
  }, 1000);

  // ── Layers: where pads, keys and MIDI fire, and how each layer mixes ──
  const rows = document.querySelector<HTMLElement>('#clips-mixer-rows')!;
  const savedMix = readStorage<{ target?: number; layers?: { opacity: number; mode: MixMode }[] }>('jdl:clips-mixer', {});
  targetLayer = Math.min(3, Math.max(0, savedMix.target ?? 0));
  savedMix.layers?.forEach((saved, i) => {
    if (!mixer[i]) return;
    mixer[i].opacity = Math.min(1, Math.max(0, Number(saved.opacity) || 0));
    if (MIX_MODES.includes(saved.mode)) mixer[i].mode = saved.mode;
  });
  const saveMix = () => writeStorage('jdl:clips-mixer', { target: targetLayer, layers: mixer });
  const renderMixer = () => keepingFocus(rows, renderMixerNow);
  const renderMixerNow = () => {
    rows.replaceChildren(
      ...mixer.map((mix, i) => {
        const row = document.createElement('div');
        row.className = 'clips-mixer-row';
        const pick = document.createElement('button');
        pick.type = 'button';
        pick.className = 'control clips-layer-pick';
        pick.textContent = String(i + 1);
        pick.setAttribute('aria-pressed', String(i === targetLayer));
        pick.setAttribute('aria-label', t('clipsLayerPick', { n: i + 1 }));
        pick.title = t('clipsLayerPick', { n: i + 1 });
        pick.addEventListener('click', () => {
          targetLayer = i;
          saveMix();
          renderMixer();
        });
        const mode = document.createElement('select');
        mode.className = 'control clips-layer-mode';
        mode.setAttribute('aria-label', t('clipsLayerMode', { n: i + 1 }));
        if (i === 0) {
          mode.append(new Option(t('clipsLayerBottom'), 'auto'));
          mode.disabled = true;
        } else {
          for (const each of MIX_MODES) mode.append(new Option(modeName(each), each));
          mode.value = mix.mode;
        }
        mode.addEventListener('change', () => {
          mix.mode = mode.value as MixMode;
          saveMix();
        });
        const opacity = document.createElement('input');
        opacity.type = 'range';
        opacity.min = '0';
        opacity.max = '1';
        opacity.step = '0.01';
        opacity.value = String(mix.opacity);
        opacity.className = 'clips-layer-opacity';
        opacity.setAttribute('aria-label', t('clipsLayerOpacity', { n: i + 1 }));
        opacity.addEventListener('input', () => {
          mix.opacity = Number(opacity.value);
          saveMix();
        });
        const clear = document.createElement('button');
        clear.type = 'button';
        clear.className = 'clip-remove';
        clear.textContent = '×';
        clear.setAttribute('aria-label', t('clipsLayerClear', { n: i + 1 }));
        clear.title = t('clipsLayerClear', { n: i + 1 });
        clear.addEventListener('click', () => clearLayer(i));
        row.append(pick, mode, opacity, clear);
        return row;
      }),
    );
  };
  renderMixer();
  onLangChange(renderMixer);

  // Glitch: how often any hit gets a glitch at random, remembered
  const glitch = document.querySelector<HTMLInputElement>('#clips-glitch')!;
  glitch.value = String(readStorage<number>('jdl:clips-glitch', 0));
  setGlitchAmount(Number(glitch.value));
  glitch.addEventListener('input', () => {
    setGlitchAmount(Number(glitch.value));
    writeStorage('jdl:clips-glitch', Number(glitch.value));
  });

  // The pads of the clips on screen light up, with their layer
  let lastLive = '';
  setInterval(() => {
    const live = liveClips();
    const key = [...live].join();
    if (key === lastLive) return;
    lastLive = key;
    for (const item of list.querySelectorAll<HTMLElement>('.clip')) {
      const layer = live.get(item.dataset.clip ?? '');
      item.classList.toggle('is-live', layer !== undefined);
      const pad = item.querySelector<HTMLElement>('.clip-pad');
      if (!pad) continue;
      if (layer === undefined) delete pad.dataset.layer;
      else pad.dataset.layer = String(layer);
    }
  }, 100);

  // Keys 1-9 fire the first nine clips (with Shift, on layer 1, over the
  // others), whenever you are not typing
  document.addEventListener('keydown', (event) => {
    const digit = event.code.match(/^(?:Digit|Numpad)([1-9])$/)?.[1];
    if (!digit || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    if (event.target instanceof Element && event.target.closest('.cm-editor, input, select, textarea, [contenteditable], dialog')) return;
    if (!allClips().length) return;
    event.preventDefault();
    press(`key-${digit}`, Number(digit) - 1, { layer: event.shiftKey ? Math.min(3, targetLayer + 1) : targetLayer });
  });
  document.addEventListener('keyup', (event) => {
    const digit = event.code.match(/^(?:Digit|Numpad)([1-9])$/)?.[1];
    if (digit) letGo(`key-${digit}`);
  });

  // ── MIDI: note 36 (C1, the MPK's first pad) is the first clip ──────────
  midiBox.checked = readStorage<boolean>('jdl:clips-midi', false);
  midiBox.addEventListener('change', () => writeStorage('jdl:clips-midi', midiBox.checked));
  window.addEventListener(NOTE_EVENT, (event) => {
    if (!midiBox.checked || !allClips().length) return;
    const { note, velocity } = (event as CustomEvent<NoteDetail>).detail;
    // velocity comes from 0 to 1: soft hits are see-through
    press(`note-${note}`, note - 36, { layer: targetLayer, gain: Math.min(1, 0.35 + velocity * 0.65) });
  });
  window.addEventListener(NOTE_OFF_EVENT, (event) => letGo(`note-${(event as CustomEvent<number>).detail}`));

  setupFinder(say);
}

// ── Find: searching free archives ────────────────────────────────────────

function setupFinder(sayInPool: (text: string) => void) {
  const form = document.querySelector<HTMLFormElement>('#clips-search')!;
  const sourceSelect = document.querySelector<HTMLSelectElement>('#clips-source')!;
  const query = document.querySelector<HTMLInputElement>('#clips-query')!;
  const ideas = document.querySelector<HTMLElement>('#clips-ideas')!;
  const results = document.querySelector<HTMLUListElement>('#clips-results')!;
  const more = document.querySelector<HTMLButtonElement>('#clips-more')!;
  const status = document.querySelector<HTMLElement>('#clips-find-status')!;
  const linkForm = document.querySelector<HTMLFormElement>('#clips-link')!;
  const linkInput = document.querySelector<HTMLInputElement>('#clips-link-url')!;
  const say = (text: string) => (status.textContent = text);

  let source = readStorage<SourceId>('jdl:clips-source', 'prelinger');
  if (!(source in SUGGESTIONS)) source = 'prelinger';
  sourceSelect.value = source;
  let page = 1;
  let lastQuery = '';
  let searching = 0;
  // Files already worked out (a pasted link), so they are not looked up again
  const known = new Map<string, Awaited<ReturnType<typeof resolve>>>();
  const fileFor = async (found: Found) => known.get(found.id) ?? resolve(found);
  const viewerItems = new WeakMap<Element, ViewerItem>();

  const renderIdeas = () => {
    const surprise = document.createElement('button');
    surprise.type = 'button';
    surprise.className = 'clips-idea clips-surprise';
    surprise.textContent = t('clipsSurprise');
    surprise.addEventListener('click', () => {
      const all = SUGGESTIONS[source];
      run(all[Math.floor(Math.random() * all.length)]);
    });
    ideas.replaceChildren(
      surprise,
      ...SUGGESTIONS[source].map((word) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'clips-idea';
        chip.textContent = word;
        chip.addEventListener('click', () => run(word));
        return chip;
      }),
    );
  };

  const run = (text: string, append = false) => {
    query.value = text;
    lastQuery = text;
    page = append ? page + 1 : 1;
    const ticket = ++searching;
    say(t('clipsSearching', { source: SOURCE_NAMES[source] }));
    if (!append) results.replaceChildren();
    more.hidden = true;
    search(source, text, page)
      .then((found) => {
        if (ticket !== searching) return;
        results.append(...found.map((item) => resultItem(item)));
        more.hidden = found.length < 12;
        say(results.children.length ? t('clipsFound', { count: results.children.length }) : t('clipsNothing'));
      })
      .catch(() => ticket === searching && say(t('clipsSearchFailed', { source: SOURCE_NAMES[source] })));
  };

  const resultItem = (found: Found) => {
    const item = document.createElement('li');
    item.className = 'clip clip-result';
    const look = document.createElement('button');
    look.type = 'button';
    look.className = 'clip-pad';
    if (found.thumb) look.style.backgroundImage = `url("${found.thumb}")`;
    look.title = t('clipsPreview');
    look.setAttribute('aria-label', `${t('clipsPreview')}: ${found.title}`);
    const year = document.createElement('span');
    year.className = 'clip-length';
    year.textContent = found.year ?? '';
    look.append(year);
    // A big look before downloading, straight from its site (showing it needs
    // no permission, only reading its pixels does); ← → go through the results
    look.addEventListener('click', () => {
      const shown = [...results.children].map((li) => viewerItems.get(li)).filter((entry): entry is ViewerItem => Boolean(entry));
      openViewer(shown, Math.max(0, shown.indexOf(viewerItems.get(item)!)));
    });

    const title = document.createElement('a');
    title.className = 'clip-title';
    title.href = found.page;
    title.target = '_blank';
    title.rel = 'noopener';
    title.textContent = found.title;

    const take = document.createElement('button');
    take.type = 'button';
    take.className = 'control clip-take';
    take.textContent = t('clipsTake');
    take.addEventListener('click', () => void takeIt(found, take));
    item.append(look, title, take);
    viewerItems.set(item, {
      title: found.title,
      meta: [found.year, SOURCE_NAMES[found.source]].filter(Boolean).join(' · '),
      page: found.page,
      take,
      load: async () => (await fileFor(found))?.preview ?? null,
    });
    return item;
  };

  // Downloads a result into the pool, named after the search words (so a
  // search makes a pool) or, without words, after its title
  const takeIt = async (found: Found, button: HTMLButtonElement) => {
    button.disabled = true;
    const name = clipName(lastQuery || found.title);
    try {
      const file = await fileFor(found);
      if (!file) throw new Error('no video');
      if (file.size && file.size > MAX_BYTES) {
        button.textContent = t('clipsTooBig', { size: megabytes(file.size) });
        return;
      }
      button.textContent = file.size ? `0 % · ${megabytes(file.size)}` : '…';
      const blob = await download(file.url, (done) => {
        button.textContent = done < 0 ? '…' : `${Math.round(done * 100)} %${file.size ? ` · ${megabytes(file.size)}` : ''}`;
      });
      await addClip(blob, { title: found.title, name, credit: { source: SOURCE_NAMES[found.source], page: found.page } });
      button.textContent = t('clipsTaken', { name });
      button.classList.add('is-done');
      sayInPool(t('clipsAddedAs', { title: found.title, name }));
    } catch (error) {
      button.disabled = false;
      button.textContent = t('clipsTake');
      say((error as Error).message === 'too big' ? t('clipsTooBig', { size: `> ${megabytes(MAX_BYTES)}` }) : t('clipsDownloadFailed'));
    }
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    run(query.value.trim());
  });
  more.addEventListener('click', () => run(lastQuery, true));
  sourceSelect.addEventListener('change', () => {
    source = sourceSelect.value as SourceId;
    writeStorage('jdl:clips-source', source);
    renderIdeas();
    run(query.value.trim());
  });

  linkForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = linkInput.value.trim();
    if (!text) return;
    say(t('clipsLinkLooking'));
    try {
      const resolved = await resolveLink(text);
      if (!resolved) return say(t('clipsLinkBad'));
      known.set(resolved.found.id, resolved.file);
      results.prepend(resultItem(resolved.found));
      linkInput.value = '';
      say(t('clipsLinkReady'));
    } catch {
      say(t('clipsLinkBad'));
    }
  });

  renderIdeas();
  onLangChange(renderIdeas);
}
