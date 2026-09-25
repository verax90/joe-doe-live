// Samples propios: arrastra archivos de audio a la página y úsalos con s("nombre").
// Se guardan en IndexedDB para que sigan ahí al recargar (solo en este navegador).

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

// "Kick Gordo 01.wav" -> "kick_gordo_01" (válido dentro de s("..."))
export function sampleName(fileName: string) {
  const base = fileName
    .replace(/\.[^.]+$/, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const safe = base || 'sample';
  return /^[0-9]/.test(safe) ? `s_${safe}` : safe;
}

const objectUrls = new Map<string, string>();

async function register(name: string, blob: Blob) {
  const g = globalThis as Global;
  const previous = objectUrls.get(name);
  if (previous) URL.revokeObjectURL(previous);
  const url = URL.createObjectURL(blob);
  objectUrls.set(name, url);
  await g.samples?.({ [name]: [url] });
}

export function setupSamplesPanel() {
  const list = document.querySelector<HTMLUListElement>('#sample-list')!;
  const input = document.querySelector<HTMLInputElement>('#sample-input')!;
  const status = document.querySelector<HTMLElement>('#sample-status')!;

  const names = new Set<string>();

  const render = () => {
    list.replaceChildren();
    if (!names.size) {
      list.innerHTML = '<li class="muted">Todavía no hay samples</li>';
      return;
    }
    for (const name of [...names].sort()) {
      const item = document.createElement('li');
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'sample-name';
      copy.textContent = `s("${name}")`;
      copy.title = 'Copiar';
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(`s("${name}")`);
          status.textContent = `Copiado s("${name}")`;
        } catch {
          status.textContent = 'No se pudo copiar';
        }
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'sample-remove';
      remove.textContent = '×';
      remove.setAttribute('aria-label', `Borrar ${name}`);
      remove.addEventListener('click', async () => {
        names.delete(name);
        render();
        try {
          await withStore('readwrite', (store) => store.delete(name));
        } catch {
          // sin IndexedDB: solo se borra de la lista
        }
      });
      item.append(copy, remove);
      list.append(item);
    }
  };

  const addFiles = async (files: Iterable<File>) => {
    const audio = [...files].filter((file) => file.type.startsWith('audio/') || /\.(wav|mp3|ogg|flac|aif+)$/i.test(file.name));
    if (!audio.length) {
      status.textContent = 'Solo se aceptan archivos de audio (WAV, MP3, OGG, FLAC)';
      return;
    }
    for (const file of audio) {
      const name = sampleName(file.name);
      await register(name, file);
      names.add(name);
      try {
        await withStore('readwrite', (store) => store.put(file, name));
      } catch {
        // sin IndexedDB: el sample funciona hasta recargar
      }
    }
    status.textContent = `${audio.length} sample${audio.length > 1 ? 's' : ''} listo${audio.length > 1 ? 's' : ''}`;
    render();
  };

  input.addEventListener('change', () => {
    if (input.files) addFiles(input.files);
    input.value = '';
  });

  // Soltar archivos en cualquier parte de la página
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
    addFiles(event.dataTransfer.files);
  });

  // Recupera los samples guardados en visitas anteriores
  const restore = async () => {
    try {
      const keys = (await withStore('readonly', (store) => store.getAllKeys())) as string[];
      for (const name of keys) {
        const blob = await withStore<Blob>('readonly', (store) => store.get(name));
        if (blob) {
          await register(name, blob);
          names.add(name);
        }
      }
    } catch {
      status.textContent = 'Este navegador no permite guardar samples: se perderán al recargar';
    }
    render();
  };

  return restore();
}
