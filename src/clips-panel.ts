// The Clips and Find tabs of the Video panel: the pool as pads (click one to
// fire it, rename it to make pools, take it out), and the search of free
// archives that downloads footage into the pool.
import { keepingFocus } from './a11y';
import { download, resolve, resolveLink, search, MAX_BYTES, SUGGESTIONS, type Found, type SourceId } from './clip-search';
import { addClip, allClips, clipName, fireIndex, loadClips, missingNames, onClipsChange, removeClip, renameClip, warmUp, type Clip } from './clips';
import { onLangChange, t } from './i18n';
import { NOTE_EVENT, type NoteDetail } from './midi';
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

const megabytes = (bytes: number) => `${Math.max(0.1, bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
const seconds = (value?: number) => {
  if (!value || !Number.isFinite(value)) return '';
  const whole = Math.round(value);
  return whole >= 60 ? `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}` : `${whole} s`;
};

// The pattern "Into the code" writes: each pool once, a cut every beat in
// turn, sometimes backwards or flashing
export function examplePattern(names: string[]) {
  const pools = [...new Set(names)].slice(0, 4);
  if (!pools.length) return '';
  const steps = pools.length === 1 ? `${pools[0]}*4` : `<${pools.join(' ')}>*4`;
  return `s("${steps}")\n  .sometimesBy(0.25, x => x.speed(-1))\n  .rarely(x => x.fx("<inv bw_mirror strobe>"))\n  .video()`;
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
  const renderPool = () => keepingFocus(list, renderPoolNow);
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
    length.textContent = seconds(clip.duration);
    pad.append(number, length);
    pad.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      fireIndex(index, { holdMs: undefined });
      showClipsIfNeeded();
    });
    pad.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      fireIndex(index);
      showClipsIfNeeded();
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

    const row = document.createElement('div');
    row.className = 'clip-row';
    row.append(name, tag, remove);
    item.append(pad, row);
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

  // Firing a pad while another visual shows: switch to the clips, once
  let switched = false;
  const showClipsIfNeeded = () => {
    if (switched) return;
    switched = true;
    showClips();
  };

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

  // ── MIDI: note 36 (C1, the MPK's first pad) is the first clip ──────────
  midiBox.checked = readStorage<boolean>('jdl:clips-midi', false);
  midiBox.addEventListener('change', () => writeStorage('jdl:clips-midi', midiBox.checked));
  window.addEventListener(NOTE_EVENT, (event) => {
    if (!midiBox.checked || !allClips().length) return;
    const { note, velocity } = (event as CustomEvent<NoteDetail>).detail;
    fireIndex(note - 36, { gain: Math.min(1, 0.35 + velocity / 127) });
    showClipsIfNeeded();
  });

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
    // A look before downloading: the video plays in place, straight from its
    // site (showing it needs no permission, only reading its pixels does)
    look.addEventListener('click', async () => {
      look.disabled = true;
      try {
        const file = await fileFor(found);
        if (!file) throw new Error('no video');
        const preview = document.createElement('video');
        preview.className = 'clip-preview';
        preview.src = file.preview;
        preview.muted = true;
        preview.autoplay = true;
        preview.loop = true;
        preview.playsInline = true;
        preview.addEventListener('loadedmetadata', () => {
          if (preview.duration > 20) preview.currentTime = preview.duration * 0.2;
        });
        look.replaceWith(preview);
      } catch {
        look.disabled = false;
        say(t('clipsNoVideo'));
      }
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
