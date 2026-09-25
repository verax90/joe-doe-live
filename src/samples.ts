// Your own samples: drop audio files (or folders, which become kits) on the
// page and play them with s("name"). They are kept in IndexedDB so they are
// still there after a reload (in this browser only).

import { isCodeFile } from './export';
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
  objectUrls.get(name)?.forEach((url) => URL.revokeObjectURL(url));
  const urls = blobs.map((blob) => URL.createObjectURL(blob));
  objectUrls.set(name, urls);
  await g.samples?.({ [name]: urls });
}

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

export function setupSamplesPanel() {
  const list = document.querySelector<HTMLUListElement>('#sample-list')!;
  const input = document.querySelector<HTMLInputElement>('#sample-input')!;
  const folderInput = document.querySelector<HTMLInputElement>('#sample-folder')!;
  const status = document.querySelector<HTMLElement>('#sample-status')!;

  // name -> how many sounds (1 for a loose file, more for a kit)
  const names = new Map<string, number>();

  const render = () => {
    list.replaceChildren();
    if (!names.size) {
      list.innerHTML = `<li class="muted">${t('noSamples')}</li>`;
      return;
    }
    for (const [name, count] of [...names].sort(([a], [b]) => a.localeCompare(b))) {
      const item = document.createElement('li');
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'sample-name';
      // A kit copies a line that walks through its first sounds
      const snippet = count > 1 ? `s("${name}").n("${[...Array(Math.min(count, 4)).keys()].join(' ')}")` : `s("${name}")`;
      copy.textContent = `s("${name}")`;
      copy.title = t('copy');
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
        const size = document.createElement('span');
        size.className = 'sample-count';
        size.textContent = t('kitCount', { count });
        item.append(copy, size, remove);
      } else {
        item.append(copy, remove);
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
      names.set(name, files.length);
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

  const fromInput = (files: FileList) =>
    [...files].map((file) => ({ path: file.webkitRelativePath || file.name, file }));

  onLangChange(render);

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
          names.set(name, blobs.length);
        }
      }
    } catch {
      status.textContent = t('noStorage');
    }
    render();
  };

  return restore();
}
