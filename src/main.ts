// The studio: waits for Strudel's editor, then wires every part of the page
// to it. Each part lives in its own module; this file only connects them.
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/600.css';
import '@fontsource-variable/syne';
import '@strudel/repl';
import './style.css';
import { isAsciiOn, readAsciiSetting, setAscii } from './ascii';
import { ensureAudio } from './audio';
import { setupCheatsheet } from './cheatsheet';
import { setupCompose } from './compose';
import { setupDebug } from './debug';
import { setupExport } from './export';
import { setupFreePlay } from './freeplay';
import { setupHelp } from './help';
import { lang, onLangChange, pick, setLang, t, translatePage } from './i18n';
import { setupKnobHud } from './knob-hud';
import { setupKnobs } from './knobs';
import { setupLearn } from './learn';
import { setupLibrary } from './library';
import { ensureLimiter } from './limiter';
import { setupMenu } from './menu';
import { PROGRAM_EVENT, connectMidiIfAllowed, setupMidiPanel } from './midi';
import { builtInPresets, translateIfBuiltIn } from './presets';
import { setupRecorder } from './record';
import { setupSamplesPanel } from './samples';
import { setupScenes } from './scenes';
import { buildShareUrl, readSharedPattern } from './share';
import { setupShortcuts } from './shortcuts';
import { setupStatus } from './status';
import { readStorage, writeStorage } from './storage';
import { whenEditorReady, whenStrudelReady, type StrudelMirror } from './strudel';
import { setupTempo } from './tempo';
import { applyTheme, readTheme, themes } from './themes';
import { toast } from './toast';
import { setupToolsPanel } from './tools';
import { withTransition } from './transition';
import { setupUndo } from './undo';
import { setupVideo } from './video';
import { applyVisual, setVisualClock, useBundledHydra, visuals } from './visuals';
// A direct path: the package does not export dist/ by name
import hydraUrl from '../node_modules/hydra-synth/dist/hydra-synth.js?url';

const DRAFT_KEY = 'jdl:draft';
const VISUAL_KEY = 'jdl:visual';

const repl = document.querySelector('strudel-editor') as HTMLElement & { editor: StrudelMirror | null };
const visualSelect = document.querySelector<HTMLSelectElement>('#visual')!;
const themeSelect = document.querySelector<HTMLSelectElement>('#theme')!;
const langButton = document.querySelector<HTMLButtonElement>('#lang')!;

translatePage();
langButton.dataset.current = lang;

const editor = await whenEditorReady(repl);
const scheduler = editor.repl?.scheduler;
setupStatus(repl);
const resetParts = setupScenes(() => editor.code);
const library = setupLibrary(editor, resetParts);

// Theme before the UI shows, so it does not flash in the default colours
for (const theme of themes) themeSelect.append(new Option(pick(theme.name), theme.id));
const startTheme = readTheme();
themeSelect.value = startTheme.id;
applyTheme(startTheme, editor);
// Schedule notes 0.2 s ahead instead of 0.1 s: a frame of visuals that runs
// long no longer makes notes late (clicks, gaps). Keys played on a controller
// are triggered on their own path and stay immediate
if (scheduler) scheduler.latency = 0.2;
// The Auto visual changes on the bar line while it plays
setVisualClock(() => (scheduler?.started && scheduler.now ? scheduler.now() : null));

// Start with a shared link, else your draft, else the first pattern
const shared = readSharedPattern();
// The shared link leaves the URL: a reload brings your draft, not the original
if (shared.code) history.replaceState(null, '', location.pathname);
const storedDraft = readStorage<string | null>(DRAFT_KEY, null);
const draft = storedDraft === null ? null : translateIfBuiltIn(storedDraft);
editor.setCode(shared.code ?? draft ?? builtInPresets()[0].code);
library.render(shared.code || draft ? undefined : builtInPresets()[0].id);
// Translated and holding its code: show it (see the inline script in index.html)
document.documentElement.classList.remove('booting');
// A draft every few seconds, so a reload loses nothing
setInterval(() => writeStorage(DRAFT_KEY, editor.code), 3000);

// Visuals are picked apart from the pattern and applied again after every
// play, except "From the code", which leaves them to the pattern
for (const visual of visuals) visualSelect.append(new Option(pick(visual.name), visual.id));
const initialVisual = shared.visualId ?? readStorage<string>(VISUAL_KEY, 'lima');
// The camera only switches on when you pick a webcam visual yourself: a saved
// or shared one does not turn it on just by opening the page
const startsCamera = visuals.find((v) => v.id === initialVisual)?.camera;
visualSelect.value = visuals.some((v) => v.id === initialVisual) && !startsCamera ? initialVisual : 'lima';

const runVisual = () => applyVisual(visualSelect.value).catch((error) => console.warn('[visual]', error));
const pickVisual = (id: string) => {
  visualSelect.value = id;
  writeStorage(VISUAL_KEY, id);
};
visualSelect.addEventListener('change', () => {
  pickVisual(visualSelect.value);
  runVisual();
});

// A theme recolours the UI, the code and the ASCII at once; the visual is
// redrawn so its tint() follows too
themeSelect.addEventListener('change', () => {
  const theme = themes.find((t) => t.id === themeSelect.value) ?? themes[0];
  withTransition(() => applyTheme(theme, editor));
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

// A video or tab picked in the Video panel shows through the webcam visuals:
// switch to one if the current visual does not use it
setupVideo({
  showSource: () => {
    if (visuals.find((v) => v.id === visualSelect.value)?.camera) return;
    pickVisual('cam');
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
  if (programTarget.value === 'pattern') return library.playProgram(program);
  pickVisual(visuals[program % visuals.length].id);
  runVisual();
});

// Every play, from any button, key or panel, goes through here
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

document.querySelector('#play')!.addEventListener('click', () => editor.evaluate());
document.querySelector('#stop')!.addEventListener('click', () => editor.stop());

document.querySelector('#share')!.addEventListener('click', async () => {
  const url = buildShareUrl(editor.code, visualSelect.value);
  history.replaceState(null, '', url);
  try {
    await navigator.clipboard.writeText(url);
    toast(t('shareCopied'));
  } catch {
    toast(t('shareManual'));
  }
});

// Language switch in place, cross-faded: nothing stops playing
langButton.addEventListener('click', () => {
  withTransition(() => setLang(lang === 'es' ? 'en' : 'es'));
});
onLangChange(() => {
  langButton.dataset.current = lang;
  [...visualSelect.options].forEach((option, index) => (option.text = pick(visuals[index].name)));
  [...themeSelect.options].forEach((option, index) => (option.text = pick(themes[index].name)));
  // An untouched built-in pattern follows the language; edited code stays as is
  const translated = translateIfBuiltIn(editor.code);
  if (translated !== editor.code) editor.setCode(translated);
});

// Hydra examples need their own visual to show
const useCodeVisual = () => pickVisual('code');

setupMenu();
setupShortcuts(editor);
setupUndo(editor);
setupExport(editor);
setupCompose(editor);
setupLearn({ editor, useCodeVisual });
setupCheatsheet({ editor, useCodeVisual });
setupHelp();
setupTempo(editor);
setupMidiPanel();
setupKnobs();
setupKnobHud(() => ({ code: editor.code, playing: Boolean(scheduler?.started), visual: visualSelect.value, ascii: isAsciiOn() }));
setupRecorder();
// Free play stays out of the way when the playing pattern reads the keys itself
setupFreePlay(() => Boolean(scheduler?.started) && editor.code.includes('midikeys'));
setupDebug(() => scheduler);
setupToolsPanel(() => editor.stop());
