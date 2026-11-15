// A panel's explanation is there for the first time you open it; the tenth
// time it is a wall between you and the button. So what runs to five lines
// or more folds to two, with a "more" after it. Every panel gets this at once: the
// texts stay whole (and in the Help), the panels open on their controls.
import { onLangChange, t } from './i18n';
import { readStorage, writeStorage } from './storage';

const LINES = 2;
const KEY = 'jdl:help-open';

// Whether a text of this height, at this line height, is worth folding: only
// when it would hide three lines or more. Hiding one or two saves less room
// than the "more" and the click cost
export const worthFolding = (height: number, lineHeight: number, lines = LINES) => height > lineHeight * (lines + 2.5);

export function setupPanelHelp() {
  // remembered open, by the text's own key: someone who wants a panel's
  // explanation in view keeps it
  const open = new Set(readStorage<string[]>(KEY, []));
  const texts = [...document.querySelectorAll<HTMLElement>('.panel .panel-help')].filter(
    (text) => !text.closest('details') && !text.id && (text.dataset.i18n || text.dataset.i18nHtml),
  );
  const toggles = new Map<HTMLElement, HTMLButtonElement>();
  const keyOf = (text: HTMLElement) => text.dataset.i18n ?? text.dataset.i18nHtml ?? '';

  const show = (text: HTMLElement) => {
    const toggle = toggles.get(text)!;
    const folded = text.classList.contains('is-folded');
    toggle.textContent = t(folded ? 'helpMore' : 'helpLess');
    toggle.setAttribute('aria-expanded', String(!folded));
  };

  for (const text of texts) {
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'panel-help-toggle';
    toggle.hidden = true;
    toggle.addEventListener('click', () => {
      const folded = text.classList.toggle('is-folded');
      if (folded) open.delete(keyOf(text));
      else open.add(keyOf(text));
      writeStorage(KEY, [...open]);
      show(text);
    });
    text.after(toggle);
    toggles.set(text, toggle);
  }

  // Measured unfolded, and only what is on screen (a hidden one has no height)
  const fit = () => {
    for (const text of texts) {
      if (text.offsetParent === null) continue;
      const toggle = toggles.get(text)!;
      text.classList.remove('is-folded');
      const long = worthFolding(text.scrollHeight, parseFloat(getComputedStyle(text).lineHeight) || 20);
      toggle.hidden = !long;
      text.classList.toggle('has-toggle', long);
      if (long && !open.has(keyOf(text))) text.classList.add('is-folded');
      show(text);
    }
  };

  // a panel or one of its tabs coming into view, another language, another width
  const watcher = new MutationObserver(() => requestAnimationFrame(fit));
  for (const box of document.querySelectorAll('.panel, .panel-tabpanel')) watcher.observe(box, { attributes: true, attributeFilter: ['hidden'] });
  onLangChange(() => requestAnimationFrame(fit));
  let timer: number | undefined;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = window.setTimeout(fit, 250);
  });
  fit();
}
