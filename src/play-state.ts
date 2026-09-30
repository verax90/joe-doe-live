// The Play button tells where you are: stopped (▶ Play), playing what you
// see (▶ Playing, outlined), or playing while the code has changes not yet
// applied (↻ Apply, lit and breathing), so in the middle of a set you know
// whether the last edit is already sounding or still needs Ctrl+Enter. Code
// with an error is not applied: Strudel keeps playing the version before.
import { onLangChange, t } from './i18n';

export type PlayState = 'stopped' | 'playing' | 'changed';

// What the button should say, from whether it plays and what was applied.
// Whitespace alone (a blank line, an indent) is not a change
export function playState(playing: boolean, code: string, applied: string | undefined): PlayState {
  if (!playing) return 'stopped';
  const same = applied !== undefined && code.replace(/\s+/g, ' ').trim() === applied.replace(/\s+/g, ' ').trim();
  return same ? 'playing' : 'changed';
}

let applied: string | undefined;
let failed = false;
// From main.ts, after every evaluate: this code is what sounds now, unless
// it did not evaluate
export const markApplied = (code: string) => {
  if (!failed) applied = code;
};

export function setupPlayState(getCode: () => string, isPlaying: () => boolean, repl: EventTarget) {
  // the editor reports each evaluation, with its error if any
  repl.addEventListener('update', (event) => {
    failed = Boolean((event as CustomEvent<{ error?: unknown }>).detail?.error);
  });
  const button = document.querySelector<HTMLButtonElement>('#play')!;
  const text = button.querySelector<HTMLElement>('.btn-text');
  let shown: PlayState | undefined;
  const render = (force = false) => {
    const state = playState(isPlaying(), getCode(), applied);
    if (state === shown && !force) return;
    shown = state;
    button.dataset.state = state;
    const [icon, label, title] =
      state === 'changed'
        ? ['↻', t('playApply'), t('playApplyTitle')]
        : state === 'playing'
          ? ['▶', t('playPlaying'), t('playPlayingTitle')]
          : ['▶', 'Play', 'Play (Ctrl+Enter)'];
    button.firstChild!.textContent = icon;
    if (text) text.textContent = ` ${label}`;
    button.setAttribute('aria-label', label);
    button.title = title;
  };
  // cheap enough to check a few times a second, and it needs no hook into
  // every way the code or the transport can change
  window.setInterval(render, 250);
  onLangChange(() => render(true));
  render(true);
}
