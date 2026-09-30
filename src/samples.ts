// Your own samples: drop audio files (or folders, which become kits) on the
// page and play them with s("name"). They are kept in IndexedDB so they are
// still there after a reload (in this browser only).

import { isCodeFile } from './export';
import { ensureAudio } from './audio';
import { onLangChange, t } from './i18n';

type Global = typeof globalThis & {
  samples?: (map: Record<string, string[]>, baseUrl?: string) => Promise<unknown>;
};

const DB_NAME = 'jdl-samples';
const STORE = 'files';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const request = run(db.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// "Kick Gordo 01.wav" -> "kick_gordo_01" (valid inside s("..."))
export function sampleName(fileName: string, { isFolder = false } = {}) {
  const base = (isFolder ? fileName : fileName.replace(/\.[^.]+$/, ''))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const safe = base || 'sample';
  return /^[0-9]/.test(safe) ? `s_${safe}` : safe;
}

export type Picked = { path: string; file: File };

// For the sampler: add files as if they had been dropped (a path with a
// folder makes a kit), saved and listed like any other
let addPickedHere: ((picked: Picked[]) => Promise<void>) | undefined;
export const addSamples = (picked: Picked[]) => addPickedHere?.(picked) ?? Promise.resolve();

const isAudio = (file: File) => file.type.startsWith('audio/') || /\.(wav|mp3|ogg|flac|aif+)$/i.test(file.name);

// Loose files keep their own name; files inside a folder become a kit named
// after that folder, in name order, so s("kicks:3") is the fourth file. Two
// folders with the same name in different places get their parent in front.
export function groupIntoKits(picked: Picked[]) {
  const byFolder = new Map<string, Picked[]>();
  const kits = new Map<string, File[]>();
  for (const entry of picked.filter((p) => isAudio(p.file))) {
    const parts = entry.path.split('/').filter(Boolean);
    if (parts.length < 2) {
      kits.set(sampleName(entry.file.name), [entry.file]);
      continue;
    }
    const folder = parts.slice(0, -1).join('/');
    byFolder.set(folder, [...(byFolder.get(folder) ?? []), entry]);
  }
  const lastNames = [...byFolder.keys()].map((folder) => folder.split('/').at(-1)!);
  for (const [folder, entries] of byFolder) {
    const parts = folder.split('/');
    const last = parts.at(-1)!;
    const clash = lastNames.filter((name) => name === last).length > 1 && parts.length > 1;
    const name = sampleName(clash ? `${parts.at(-2)}_${last}` : last, { isFolder: true });
    const files = entries
      .map((entry) => entry.file)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    kits.set(name, files);
  }
  return kits;
}

const objectUrls = new Map<string, string[]>();

async function register(name: string, blobs: Blob[]) {
  const g = globalThis as Global;
  kitNames.add(name);
  objectUrls.get(name)?.forEach((url) => URL.revokeObjectURL(url));
  const urls = blobs.map((blob) => URL.createObjectURL(blob));
  objectUrls.set(name, urls);
  await g.samples?.({ [name]: urls });
}

// Preview: the file itself through Web Audio, not through Strudel, so it can
// be stopped (chops run up to 30 s) and a new one cuts the last. Decoded
// sounds are kept for the last few, as a kit is usually browsed back and forth
const decoded = new Map<string, AudioBuffer>();
let previewing: { source: AudioBufferSourceNode; key: string; onEnd: () => void } | undefined;

function stopPreview() {
  if (!previewing) return;
  const { source, onEnd } = previewing;
  previewing = undefined;
  source.onended = null;
  try {
    source.stop();
  } catch {
    // already over
  }
  onEnd();
}

async function preview(name: string, index: number, onEnd: () => void) {
  const key = `${name}:${index}`;
  const again = previewing?.key === key;
  stopPreview();
  if (again) return; // the same ▶ twice stops it
  const url = objectUrls.get(name)?.[index];
  const context = (globalThis as { getAudioContext?: () => AudioContext }).getAudioContext?.();
  if (!url || !context) return;
  await ensureAudio();
  let buffer = decoded.get(url);
  if (!buffer) {
    buffer = await context.decodeAudioData(await (await fetch(url)).arrayBuffer());
    decoded.set(url, buffer);
    if (decoded.size > 24) decoded.delete(decoded.keys().next().value!);
  }
  const source = context.createBufferSource();
  source.buffer = buffer;
  const gain = context.createGain();
  gain.gain.value = 0.8;
  source.connect(gain).connect(context.destination);
  source.onended = () => {
    if (previewing?.source === source) {
      previewing = undefined;
      onEnd();
    }
  };
  previewing = { source, key, onEnd };
  source.start();
}

// For the live room: the kits a piece of code uses, as files to send, and the
// kits that arrive, registered for this visit only (not saved here)
const kitNames = new Set<string>();

export async function kitsUsedBy(code: string) {
  const used = [...kitNames].filter((name) => new RegExp(`(^|[^\\w])${name}([^\\w]|$)`).test(code));
  return Promise.all(
    used.map(async (name) => ({
      name,
      files: await Promise.all((objectUrls.get(name) ?? []).map(async (url) => (await fetch(url)).arrayBuffer())),
    })),
  );
}

// Every kit loaded now and how many sounds it has (free play's pads use them)
export const loadedKits = () => [...objectUrls].map(([name, urls]) => ({ name, count: urls.length }));

export async function useSentKit(name: string, files: ArrayBuffer[]) {
  await register(name, files.map((data) => new Blob([data])));
}

// A sound's name in the list: its file name, or its number for old saves
const label = (blob: Blob, index: number) => ((blob as File).name ? (blob as File).name.replace(/\.[^.]+$/, '') : String(index));

// A dropped folder only exposes its contents through the entries API
async function readDropped(items: DataTransferItemList): Promise<Picked[]> {
  const roots = [...items]
    .map((item) => item.webkitGetAsEntry?.())
    .filter((entry): entry is FileSystemEntry => Boolean(entry));
  const picked: Picked[] = [];
  const visit = async (entry: FileSystemEntry): Promise<void> => {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject));
      picked.push({ path: entry.fullPath, file });
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      // readEntries hands them over in batches until an empty one
      for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
        if (!batch.length) break;
        for (const child of batch) await visit(child);
      }
    }
  };
  for (const root of roots) await visit(root);
  return picked;
}

// addTrack: puts a pattern into the code as a new track (see tracks.ts)
// A long name cut in the middle, so its start and its end (often the number
// that tells a series apart: …quA1, …quA12) both stay in sight
export function shortName(name: string, max = 30) {
  if (name.length <= max) return name;
  const tail = Math.floor((max - 1) / 2);
  return `${name.slice(0, max - 1 - tail)}…${name.slice(-tail)}`;
}

export function setupSamplesPanel({ addTrack }: { addTrack: (pattern: string) => void }) {
  const list = document.querySelector<HTMLUListElement>('#sample-list')!;
  const input = document.querySelector<HTMLInputElement>('#sample-input')!;
  const folderInput = document.querySelector<HTMLInputElement>('#sample-folder')!;
  const status = document.querySelector<HTMLElement>('#sample-status')!;
  const tray = document.querySelector<HTMLElement>('#sample-picked')!;
  const trayList = document.querySelector<HTMLElement>('#sample-picked-list')!;

  // name -> the names of its sounds (one for a loose file, more for a kit)
  const names = new Map<string, string[]>();
  // Kits shown open, and the sounds picked for a new track ("kit:3")
  const open = new Set<string>();
  let picked: string[] = [];

  const renderTray = () => {
    tray.hidden = !picked.length;
    trayList.replaceChildren(
      ...picked.map((token, i) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'cheat-action';
        chip.textContent = `${token} ✕`;
        chip.title = t('pickedRemove');
        chip.addEventListener('click', () => {
          picked = picked.filter((_, j) => j !== i);
          renderTray();
        });
        return chip;
      }),
    );
  };

  document.querySelector('#sample-add-track')!.addEventListener('click', () => {
    if (!picked.length) return;
    const pattern = `s("${picked.join(' ')}")`;
    addTrack(pattern);
    status.textContent = t('pickedAdded', { code: pattern });
    picked = [];
    renderTray();
  });
  document.querySelector('#sample-clear')!.addEventListener('click', () => {
    picked = [];
    renderTray();
  });

  const smallButton = (text: string, title: string, onClick: (button: HTMLButtonElement) => void) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cheat-action';
    button.textContent = text;
    button.title = title;
    button.setAttribute('aria-label', title);
    button.addEventListener('click', () => onClick(button));
    return button;
  };

  // ▶ to hear it (again to stop), + to pick it
  const soundActions = (name: string, index: number, token: string) => [
    smallButton('▶', t('samplePreview', { token }), (button) => {
      button.textContent = '■';
      void preview(name, index, () => (button.textContent = '▶')).catch(() => (button.textContent = '▶'));
    }),
    smallButton('+', t('samplePick', { token }), () => {
      picked.push(token);
      renderTray();
    }),
  ];

  const render = () => {
    list.replaceChildren();
    if (!names.size) {
      list.innerHTML = `<li class="muted">${t('noSamples')}</li>`;
      return;
    }
    // numbers in order: …A2 before …A10
    for (const [name, sounds] of [...names].sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))) {
      const count = sounds.length;
      const item = document.createElement('li');
      item.className = 'sample-kit';
      const row = document.createElement('div');
      row.className = 'sample-row';
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'sample-name';
      // A kit copies a line that walks through its first sounds
      const snippet = count > 1 ? `s("${name}").n("${[...Array(Math.min(count, 4)).keys()].join(' ')}")` : `s("${name}")`;
      // just the name, cut in the middle to fit: the button copies s("…")
      copy.textContent = shortName(name, 24);
      copy.title = `${t('copy')}: s("${name}")`;
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(snippet);
          status.textContent = t('copied', { code: snippet });
        } catch {
          status.textContent = t('copyFailed');
        }
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'sample-remove';
      remove.textContent = '×';
      remove.setAttribute('aria-label', t('deleteSample', { name }));
      remove.addEventListener('click', async () => {
        names.delete(name);
        render();
        try {
          await withStore('readwrite', (store) => store.delete(name));
        } catch {
          // no IndexedDB: it only leaves the list
        }
      });
      if (count > 1) {
        // A kit opens (▸) into its numbered sounds
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'sample-toggle';
        toggle.textContent = open.has(name) ? '▾' : '▸';
        toggle.setAttribute('aria-expanded', String(open.has(name)));
        toggle.setAttribute('aria-label', t('kitOpen', { name }));
        toggle.addEventListener('click', () => {
          if (open.has(name)) open.delete(name);
          else open.add(name);
          render();
        });
        const size = document.createElement('span');
        size.className = 'sample-count';
        size.textContent = t('kitCount', { count });
        row.append(toggle, copy, size, remove);
        item.append(row);
        if (open.has(name)) {
          const soundList = document.createElement('ol');
          soundList.className = 'sample-sounds';
          soundList.start = 0;
          sounds.forEach((sound, index) => {
            const li = document.createElement('li');
            const text = document.createElement('span');
            text.className = 'sample-sound-name';
            text.textContent = `${index} · ${shortName(sound, 24)}`;
            text.title = sound;
            li.append(text, ...soundActions(name, index, `${name}:${index}`));
            soundList.append(li);
          });
          item.append(soundList);
        }
      } else {
        row.append(copy, ...soundActions(name, 0, name), remove);
        item.append(row);
      }
      list.append(item);
    }
  };

  const addPicked = async (picked: Picked[]) => {
    const kits = groupIntoKits(picked);
    const total = [...kits.values()].reduce((sum, files) => sum + files.length, 0);
    if (!total) {
      status.textContent = t('onlyAudio');
      return;
    }
    let done = 0;
    for (const [name, files] of kits) {
      await register(name, files);
      names.set(name, files.map(label));
      done += files.length;
      status.textContent = t('samplesLoading', { done, total });
      try {
        await withStore('readwrite', (store) => store.put(files, name));
      } catch {
        // no IndexedDB: the sample works until a reload
      }
    }
    status.textContent = t('samplesReady', { count: total });
    render();
  };

  addPickedHere = addPicked;

  const fromInput = (files: FileList) =>
    [...files].map((file) => ({ path: file.webkitRelativePath || file.name, file }));

  onLangChange(() => {
    render();
    renderTray();
  });

  input.addEventListener('change', () => {
    if (input.files) addPicked(fromInput(input.files));
    input.value = '';
  });
  folderInput.addEventListener('change', () => {
    if (folderInput.files) addPicked(fromInput(folderInput.files));
    folderInput.value = '';
  });

  // Drop files anywhere on the page
  let dragDepth = 0;
  window.addEventListener('dragenter', (event) => {
    if (!event.dataTransfer?.types.includes('Files')) return;
    dragDepth++;
    document.body.classList.add('is-dropping');
  });
  window.addEventListener('dragleave', () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) document.body.classList.remove('is-dropping');
  });
  window.addEventListener('dragover', (event) => {
    if (event.dataTransfer?.types.includes('Files')) event.preventDefault();
  });
  window.addEventListener('drop', (event) => {
    if (!event.dataTransfer?.files.length) return;
    event.preventDefault();
    dragDepth = 0;
    document.body.classList.remove('is-dropping');
    // A code file (.js) is opened by the export module, not added as a sample
    if ([...event.dataTransfer.files].every(isCodeFile)) return;
    // Items are only readable during the event: take the entries now
    readDropped(event.dataTransfer.items).then(addPicked);
  });

  // Bring back the samples saved on earlier visits
  const restore = async () => {
    try {
      const keys = (await withStore('readonly', (store) => store.getAllKeys())) as string[];
      for (const name of keys) {
        // Saved as one Blob by earlier versions, as a list since kits exist
        const saved = await withStore<Blob | Blob[]>('readonly', (store) => store.get(name));
        const blobs = Array.isArray(saved) ? saved : saved ? [saved] : [];
        if (blobs.length) {
          await register(name, blobs);
          names.set(name, blobs.map(label));
        }
      }
    } catch {
      status.textContent = t('noStorage');
    }
    render();
  };

  return restore();
}
