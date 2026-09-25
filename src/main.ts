import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/600.css';
import '@fontsource-variable/syne';
import '@strudel/repl';
import './style.css';
import { lang, pick, setLang, t, translatePage } from './i18n';
import { builtInPresets, translateIfBuiltIn, type Preset } from './presets';
import { setupCheatsheet } from './cheatsheet';
import { PROGRAM_EVENT, connectMidiIfAllowed, setupMidiPanel } from './midi';
import { setupSamplesPanel } from './samples';
import { buildShareUrl, readSharedPattern } from './share';
import { setupStatus } from './status';
import { setupToolsPanel } from './tools';
import { CODE_VISUAL, applyVisual, useBundledHydra, visuals } from './visuals';
// Ruta directa: el paquete no exporta dist/ por su nombre
import hydraUrl from '../node_modules/hydra-synth/dist/hydra-synth.js?url';

type StrudelMirror = {
  code: string;
  setCode(code: string): void;
  evaluate(autostart?: boolean): Promise<void>;
  stop(): Promise<void>;
};

const DRAFT_KEY = 'jdl:draft';
const SAVED_KEY = 'jdl:saved';
const VISUAL_KEY = 'jdl:visual';

const repl = document.querySelector('strudel-editor') as HTMLElement & { editor: StrudelMirror | null };
const presetSelect = document.querySelector<HTMLSelectElement>('#preset')!;
const saveButton = document.querySelector<HTMLButtonElement>('#save')!;
const deleteButton = document.querySelector<HTMLButtonElement>('#delete')!;
const playButton = document.querySelector<HTMLButtonElement>('#play')!;
const stopButton = document.querySelector<HTMLButtonElement>('#stop')!;
const codeToggle = document.querySelector<HTMLButtonElement>('#toggle-code')!;
const visualSelect = document.querySelector<HTMLSelectElement>('#visual')!;
const shareButton = document.querySelector<HTMLButtonElement>('#share')!;
const langButton = document.querySelector<HTMLButtonElement>('#lang')!;

translatePage();
langButton.dataset.current = lang;

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
  presetSelect.append(new Option(t('patternsPlaceholder'), ''));
  addGroup(t('groupIncluded'), builtInPresets);
  addGroup(t('groupSaved'), savedPresets);
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

// Las funciones de Strudel (samples, initHydra…) se registran como globales al terminar
// de cargar; hasta entonces no se pueden usar
function whenStrudelReady(): Promise<void> {
  return new Promise((resolve) => {
    const g = globalThis as { samples?: unknown; initHydra?: unknown };
    const check = () => (g.samples && g.initHydra ? resolve() : setTimeout(check, 100));
    check();
  });
}

const editor = await whenEditorReady();
setupStatus(repl);

const shared = readSharedPattern();
// Quita el enlace compartido de la URL: al recargar manda tu borrador, no el patrón original
if (shared.code) history.replaceState(null, '', location.pathname);
const storedDraft = readStorage<string | null>(DRAFT_KEY, null);
const draft = storedDraft === null ? null : translateIfBuiltIn(storedDraft);
editor.setCode(shared.code ?? draft ?? builtInPresets[0].code);
renderPresetOptions(shared.code || draft ? undefined : builtInPresets[0].id);

// Visuales: se eligen aparte y se vuelven a aplicar tras cada play,
// salvo con "Del código", que deja mandar al patrón
for (const visual of visuals) visualSelect.append(new Option(pick(visual.name), visual.id));
const storedVisual = readStorage<string>(VISUAL_KEY, 'lima');
const initialVisual = shared.visualId ?? storedVisual;
visualSelect.value = visuals.some((v) => v.id === initialVisual) ? initialVisual : 'lima';

const runVisual = () => applyVisual(visualSelect.value).catch((error) => console.warn('[visual]', error));

visualSelect.addEventListener('change', () => {
  writeStorage(VISUAL_KEY, visualSelect.value);
  runVisual();
});

// A MIDI program change picks a visual: program 0 is the first in the list
window.addEventListener(PROGRAM_EVENT, (event) => {
  const visual = visuals[(event as CustomEvent<number>).detail % visuals.length];
  visualSelect.value = visual.id;
  writeStorage(VISUAL_KEY, visual.id);
  runVisual();
});

const originalEvaluate = editor.evaluate.bind(editor);
editor.evaluate = async (autostart?: boolean) => {
  await originalEvaluate(autostart);
  if (visualSelect.value !== CODE_VISUAL) runVisual();
  // A pattern using midin() may have just granted MIDI: start reading the pitch bend
  connectMidiIfAllowed();
};

whenStrudelReady().then(() => {
  useBundledHydra(hydraUrl);
  runVisual();
  setupSamplesPanel();
});

shareButton.addEventListener('click', async () => {
  const url = buildShareUrl(editor.code, visualSelect.value);
  history.replaceState(null, '', url);
  const label = shareButton.textContent;
  try {
    await navigator.clipboard.writeText(url);
    shareButton.textContent = t('shareCopied');
  } catch {
    shareButton.textContent = t('shareManual');
  }
  setTimeout(() => (shareButton.textContent = label), 2000);
});

// Paneles laterales: solo uno abierto a la vez
const panelButtons = document.querySelectorAll<HTMLButtonElement>('[data-panel]');
panelButtons.forEach((button) => {
  button.addEventListener('click', () => {
    panelButtons.forEach((other) => {
      const panel = document.getElementById(other.dataset.panel!)!;
      const open = other === button ? panel.hidden : false;
      panel.hidden = !open;
      other.setAttribute('aria-pressed', String(open));
    });
  });
});

// Guarda el borrador cada pocos segundos para no perder nada al recargar
setInterval(() => writeStorage(DRAFT_KEY, editor.code), 3000);

// Cambiar de idioma recarga la página; antes se guarda el borrador
langButton.addEventListener('click', () => {
  writeStorage(DRAFT_KEY, editor.code);
  setLang(lang === 'es' ? 'en' : 'es');
  location.reload();
});

presetSelect.addEventListener('change', () => {
  const preset = findPreset(presetSelect.value);
  deleteButton.hidden = !savedPresets.some((p) => p.id === presetSelect.value);
  if (preset) editor.setCode(preset.code);
});

saveButton.addEventListener('click', () => {
  const current = savedPresets.find((p) => p.id === presetSelect.value);
  const name = prompt(t('savePrompt'), current?.name ?? '');
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
  if (!preset || !confirm(t('deleteConfirm', { name: preset.name }))) return;
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
setupCheatsheet();
setupToolsPanel(() => editor.stop());
