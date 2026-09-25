// Keyboard shortcuts that work anywhere on the page (inside the editor,
// Strudel's own Ctrl+Enter and Ctrl+. apply) and the code on/off toggle
import type { StrudelMirror } from './strudel';

export function setupShortcuts(editor: StrudelMirror) {
  const codeToggle = document.querySelector<HTMLButtonElement>('#toggle-code')!;
  // Performance mode: the code hides, the visuals fill the screen
  const toggleCode = () => {
    const hidden = document.body.classList.toggle('hide-code');
    codeToggle.setAttribute('aria-pressed', String(!hidden));
  };
  codeToggle.addEventListener('click', toggleCode);

  window.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement;
    // "?" opens the help, unless you are typing in the editor or a field
    if (event.key === '?' && !target.closest('.cm-editor, input, select, textarea')) {
      event.preventDefault();
      document.querySelector<HTMLButtonElement>('#toggle-help')!.click();
      return;
    }
    if (!(event.ctrlKey || event.metaKey)) return;
    if (event.shiftKey && event.key.toLowerCase() === 'h') {
      event.preventDefault();
      toggleCode();
    } else if (!target.closest('.cm-editor')) {
      if (event.key === 'Enter') {
        event.preventDefault();
        void editor.evaluate();
      } else if (event.key === '.') {
        event.preventDefault();
        void editor.stop();
      }
    }
  });
}
