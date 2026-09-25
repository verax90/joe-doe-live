import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/600.css';
import '@fontsource-variable/syne';
import '@strudel/repl';
import './style.css';
import { lang, onLangChange, pick, setLang, t, translatePage } from './i18n';
import { withTransition } from './transition';
import { builtInPresets, translateIfBuiltIn, type Preset } from './presets';
import { isAsciiOn, readAsciiSetting, setAscii } from './ascii';
import { setupCheatsheet } from './cheatsheet';
import { setupDebug } from './debug';
import { setupFreePlay } from './freeplay';
import { setupHelp } from './help';
import { setupKnobs } from './knobs';
import { setupRecorder } from './record';
import { ensureAudio } from './audio';
import { ensureLimiter } from './limiter';
import { PROGRAM_EVENT, connectMidiIfAllowed, setupMidiPanel } from './midi';
import { setupSamplesPanel } from './samples';
import { buildShareUrl, readSharedPattern } from './share';
import { setupScenes } from './scenes';
import { setupStatus } from './status';
import { setupCompose } from './compose';
import { setupLearn } from './learn';
import { setupExport } from './export';
import { toast } from './toast';
import { setupUndo } from './undo';
import { setupTempo } from './tempo';
import { applyTheme, readTheme, themes } from './themes';
import { setupToolsPanel } from './tools';
import { applyVisual, setVisualClock, useBundledHydra, visuals } from './visuals';
import { setupVideo } from './video';
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
  addGroup(t('groupIncluded'), builtInPresets());
  addGroup(t('groupSaved'), savedPresets);
  presetSelect.value = selectedId ?? '';
  deleteButton.hidden = !savedPresets.some((p) => p.id === presetSelect.value);
}

function findPreset(id: string) {
  return [...builtInPresets(), ...savedPresets].find((p) => p.id === id);
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
const resetParts = setupScenes(() => editor.code);

// Theme before the UI shows, so it does not flash in the default colours
const themeSelect = document.querySelector<HTMLSelectElement>('#theme')!;
const themeEditor = editor as unknown as { setTheme?: (name: string) => void };
for (const theme of themes) themeSelect.append(new Option(pick(theme.name), theme.id));
const startTheme = readTheme();
themeSelect.value = startTheme.id;
applyTheme(startTheme, themeEditor);
// Schedule notes 0.2 s ahead instead of 0.1 s: a frame of visuals that runs
// long no longer makes notes late (clicks, gaps). Keys played on a controller
// are triggered on their own path and stay immediate
const scheduler = (editor as unknown as { repl?: { scheduler?: { latency?: number; started?: boolean; now?: () => number } } }).repl
  ?.scheduler;
if (scheduler) scheduler.latency = 0.2;
// The Auto visual changes on the bar line while it plays
setVisualClock(() => (scheduler?.started && scheduler.now ? scheduler.now() : null));

const shared = readSharedPattern();
// Quita el enlace compartido de la URL: al recargar manda tu borrador, no el patrón original
if (shared.code) history.replaceState(null, '', location.pathname);
const storedDraft = readStorage<string | null>(DRAFT_KEY, null);
const draft = storedDraft === null ? null : translateIfBuiltIn(storedDraft);
editor.setCode(shared.code ?? draft ?? builtInPresets()[0].code);
renderPresetOptions(shared.code || draft ? undefined : builtInPresets()[0].id);
// Translated and holding its code: show it (see the inline script in index.html)
document.documentElement.classList.remove('booting');

// Visuales: se eligen aparte y se vuelven a aplicar tras cada play,
// salvo con "Del código", que deja mandar al patrón
for (const visual of visuals) visualSelect.append(new Option(pick(visual.name), visual.id));
const storedVisual = readStorage<string>(VISUAL_KEY, 'lima');
const initialVisual = shared.visualId ?? storedVisual;
// The camera only switches on when you pick a webcam visual yourself: a saved
// or shared one does not turn it on just by opening the page
const startsCamera = visuals.find((v) => v.id === initialVisual)?.camera;
visualSelect.value = visuals.some((v) => v.id === initialVisual) && !startsCamera ? initialVisual : 'lima';

const runVisual = () => applyVisual(visualSelect.value).catch((error) => console.warn('[visual]', error));

// A theme recolours the UI, the code and the ASCII at once; the visual is
// redrawn so its tint() follows too
themeSelect.addEventListener('change', () => {
  const theme = themes.find((t) => t.id === themeSelect.value) ?? themes[0];
  withTransition(() => applyTheme(theme, themeEditor));
  runVisual();
});

// ASCII filter over whatever visual is showing, remembered between visits
const asciiToggle = document.querySelector<HTMLButtonElement>('#toggle-ascii')!;
asciiToggle.setAttribute('aria-pressed', String(readAsciiSetting()));
asciiToggle.addEventListener('click', async () => {
  const initHydra = (globalThis as { initHydra?: () => Promise<unknown> }).initHydra;
  if (!initHydra) return;
  setAscii(!isAsciiOn(), await initHydra());
  asciiToggle.setAttribute('aria-pressed', String(isAsciiOn()));
});

visualSelect.addEventListener('change', () => {
  writeStorage(VISUAL_KEY, visualSelect.value);
  runVisual();
});

// A video or tab picked in the Video panel shows through the webcam visuals:
// switch to one if the current visual does not use it
setupVideo({
  showSource: () => {
    if (visuals.find((v) => v.id === visualSelect.value)?.camera) return;
    visualSelect.value = 'cam';
    writeStorage(VISUAL_KEY, visualSelect.value);
    runVisual();
  },
});

// A MIDI program change picks a visual or, if chosen in the MIDI panel, a
// pattern: program 0 is the first in its list
const programTarget = document.querySelector<HTMLSelectElement>('#program-target')!;
programTarget.value = readStorage<string>('jdl:program-target', 'visual');
programTarget.addEventListener('change', () => writeStorage('jdl:program-target', programTarget.value));
window.addEventListener(PROGRAM_EVENT, (event) => {
  const program = (event as CustomEvent<number>).detail;
  if (programTarget.value === 'pattern') {
    const all = [...builtInPresets(), ...savedPresets];
    const preset = all[program % all.length];
    presetSelect.value = preset.id;
    resetParts();
    withTransition(() => editor.setCode(preset.code));
    editor.evaluate();
    return;
  }
  const visual = visuals[program % visuals.length];
  visualSelect.value = visual.id;
  writeStorage(VISUAL_KEY, visual.id);
  runVisual();
});

const originalEvaluate = editor.evaluate.bind(editor);
editor.evaluate = async (autostart?: boolean) => {
  await ensureAudio();
  await originalEvaluate(autostart);
  ensureLimiter();
  // Always: with "From the code" it only re-attaches the ASCII filter and the
  // frame cap, which a hush() in the pattern may have reset
  runVisual();
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
  try {
    await navigator.clipboard.writeText(url);
    toast(t('shareCopied'));
  } catch {
    toast(t('shareManual'));
  }
});

setupExport(editor);
setupCompose(editor as unknown as Parameters<typeof setupCompose>[0]);
setupUndo(editor as unknown as Parameters<typeof setupUndo>[0]);

// "More" menu: everything that is not needed while playing
const menuToggle = document.querySelector<HTMLButtonElement>('#menu-toggle')!;
const menu = document.querySelector<HTMLElement>('#menu')!;
const setMenu = (open: boolean) => {
  menu.hidden = !open;
  menuToggle.setAttribute('aria-expanded', String(open));
};
menuToggle.addEventListener('click', () => setMenu(Boolean(menu.hidden)));
// Capture phase: the editor and panels cannot swallow the click before we see it
document.addEventListener(
  'pointerdown',
  (event) => {
    if (!menu.hidden && !(event.target as HTMLElement).closest('.menu')) setMenu(false);
  },
  true,
);
// Switching to another window closes it too
window.addEventListener('blur', () => setMenu(false));
document.querySelector('#record-mode')!.addEventListener('change', () => setMenu(false));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !menu.hidden) {
    setMenu(false);
    menuToggle.focus();
  }
});
// Picking an action closes the menu; the recording select stays open to change it
menu.addEventListener('click', (event) => {
  if ((event.target as HTMLElement).closest('.menu-item')) setMenu(false);
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

// Language switch in place, cross-faded: nothing stops playing
langButton.addEventListener('click', () => {
  withTransition(() => setLang(lang === 'es' ? 'en' : 'es'));
});
onLangChange(() => {
  langButton.dataset.current = lang;
  renderPresetOptions(presetSelect.value || undefined);
  [...visualSelect.options].forEach((option, index) => (option.text = pick(visuals[index].name)));
  [...themeSelect.options].forEach((option, index) => (option.text = pick(themes[index].name)));
  // An untouched built-in pattern follows the language; edited code stays as is
  const translated = translateIfBuiltIn(editor.code);
  if (translated !== editor.code) editor.setCode(translated);
});

presetSelect.addEventListener('change', () => {
  const preset = findPreset(presetSelect.value);
  deleteButton.hidden = !savedPresets.some((p) => p.id === presetSelect.value);
  if (preset) {
    resetParts();
    withTransition(() => editor.setCode(preset.code));
  }
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

// "?" opens the help, unless you are typing in the editor or a field
window.addEventListener('keydown', (event) => {
  const target = event.target as HTMLElement;
  if (event.key !== '?' || target.closest('.cm-editor, input, select, textarea')) return;
  event.preventDefault();
  document.querySelector<HTMLButtonElement>('#toggle-help')!.click();
});

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
// Hydra examples need their own visual to show
const useCodeVisual = () => {
  visualSelect.value = 'code';
  writeStorage(VISUAL_KEY, 'code');
};
setupCheatsheet({ editor, useCodeVisual });
setupLearn({ editor, useCodeVisual });
setupHelp();
setupTempo(editor as unknown as Parameters<typeof setupTempo>[0]);
setupKnobs();
setupRecorder();
// Free play stays out of the way when the playing pattern reads the keys itself
setupFreePlay(
  () =>
    Boolean((editor as unknown as { repl?: { scheduler?: { started?: boolean } } }).repl?.scheduler?.started) &&
    editor.code.includes('midikeys'),
);
setupDebug(() => (editor as unknown as { repl?: { scheduler?: { started?: boolean } } }).repl?.scheduler);
setupToolsPanel(() => editor.stop());
