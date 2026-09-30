// More → View → Sequencer: every voice drawn under its line as it plays (a
// punchcard for drums, a piano roll for notes, each in its colour), the way
// Strudel's own ._punchcard() and ._pianoroll() do, without typing them. On
// and off are one edit each, so Ctrl+Z undoes them; while it plays it is
// heard (seen) at once.
import { t } from './i18n';
import type { StrudelMirror } from './strudel';
import { toast } from './toast';
import { hasSequencer, withoutSequencer, withSequencer } from './tracks';

export function setupSequencer(editor: StrudelMirror, isPlaying: () => boolean) {
  const button = document.querySelector<HTMLButtonElement>('#toggle-sequencer')!;
  const show = () => button.setAttribute('aria-pressed', String(hasSequencer(editor.code)));
  button.addEventListener('click', () => {
    const code = editor.code;
    const next = hasSequencer(code) ? withoutSequencer(code) : withSequencer(code);
    if (next === null) {
      toast(t('sequencerCantParse'));
      return;
    }
    if (next !== code) editor.editor?.dispatch({ changes: { from: 0, to: code.length, insert: next } });
    if (isPlaying()) void editor.evaluate();
    show();
  });
  // the code changes in many ways (typing, patterns, undo): the button follows
  window.setInterval(show, 500);
  show();
}
