import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/600.css';
import '@fontsource-variable/syne';
import '@strudel/repl';
import './style.css';
import { builtInPresets, type Preset } from './presets';
import { setupMidiPanel } from './midi';

type StrudelMirror = {
  code: string;
  setCode(code: string): void;
  evaluate(autostart?: boolean): Promise<void>;
  stop(): Promise<void>;
};

const DRAFT_KEY = 'jdl:draft';
const SAVED_KEY = 'jdl:saved';

const repl = document.querySelector('strudel-editor') as HTMLElement & { editor: StrudelMirror | null };
const presetSelect = document.querySelector<HTMLSelectElement>('#preset')!;
const saveButton = document.querySelector<HTMLButtonElement>('#save')!;
const deleteButton = document.querySelector<HTMLButtonElement>('#delete')!;
const playButton = document.querySelector<HTMLButtonElement>('#play')!;
const stopButton = document.querySelector<HTMLButtonElement>('#stop')!;
const codeToggle = document.querySelector<HTMLButtonElement>('#toggle-code')!;

// localStorage puede fallar (modo privado, datos bloqueados): la página debe funcionar igual
function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // sin almacenamiento: seguimos sin guardar
  }
}

let savedPresets = readStorage<Preset[]>(SAVED_KEY, []);

function renderPresetOptions(selectedId?: string) {
  presetSelect.replaceChildren();
  const addGroup = (label: string, presets: Preset[]) => {
    if (!presets.length) return;
    const group = document.createElement('optgroup');
    group.label = label;
    for (const preset of presets) {
      group.append(new Option(preset.name, preset.id));
    }
    presetSelect.append(group);
  };
  presetSelect.append(new Option('— Patrones —', ''));
  addGroup('Incluidos', builtInPresets);
  addGroup('Guardados', savedPresets);
  presetSelect.value = selectedId ?? '';
  deleteButton.hidden = !savedPresets.some((p) => p.id === presetSelect.value);
}

function findPreset(id: string) {
  return [...builtInPresets, ...savedPresets].find((p) => p.id === id);
}

// El editor se crea dentro de un setTimeout del componente: esperamos a que exista
function whenEditorReady(): Promise<StrudelMirror> {
  return new Promise((resolve) => {
    const check = () => (repl.editor ? resolve(repl.editor) : requestAnimationFrame(check));
    check();
  });
}

const editor = await whenEditorReady();

const draft = readStorage<string | null>(DRAFT_KEY, null);
editor.setCode(draft ?? builtInPresets[0].code);
renderPresetOptions(draft ? undefined : builtInPresets[0].id);

// Guarda el borrador cada pocos segundos para no perder nada al recargar
setInterval(() => writeStorage(DRAFT_KEY, editor.code), 3000);

presetSelect.addEventListener('change', () => {
  const preset = findPreset(presetSelect.value);
  deleteButton.hidden = !savedPresets.some((p) => p.id === presetSelect.value);
  if (preset) editor.setCode(preset.code);
});

saveButton.addEventListener('click', () => {
  const current = savedPresets.find((p) => p.id === presetSelect.value);
  const name = prompt('Nombre del patrón', current?.name ?? '');
  if (!name) return;
  const existing = savedPresets.find((p) => p.name === name);
  if (existing) {
    existing.code = editor.code;
  } else {
    savedPresets.push({ id: `saved-${Date.now()}`, name, code: editor.code });
  }
  writeStorage(SAVED_KEY, savedPresets);
  renderPresetOptions((existing ?? savedPresets.at(-1))!.id);
});

deleteButton.addEventListener('click', () => {
  const preset = savedPresets.find((p) => p.id === presetSelect.value);
  if (!preset || !confirm(`¿Borrar "${preset.name}"?`)) return;
  savedPresets = savedPresets.filter((p) => p !== preset);
  writeStorage(SAVED_KEY, savedPresets);
  renderPresetOptions();
});

playButton.addEventListener('click', () => editor.evaluate());
stopButton.addEventListener('click', () => editor.stop());

function toggleCode() {
  const hidden = document.body.classList.toggle('hide-code');
  codeToggle.setAttribute('aria-pressed', String(!hidden));
}
codeToggle.addEventListener('click', () => toggleCode());

// Atajos globales para cuando el foco no está en el editor
window.addEventListener('keydown', (event) => {
  const mod = event.ctrlKey || event.metaKey;
  if (!mod) return;
  if (event.shiftKey && event.key.toLowerCase() === 'h') {
    event.preventDefault();
    toggleCode();
  } else if (!(event.target as HTMLElement).closest('.cm-editor')) {
    if (event.key === 'Enter') {
      event.preventDefault();
      editor.evaluate();
    } else if (event.key === '.') {
      event.preventDefault();
      editor.stop();
    }
  }
});

setupMidiPanel();
