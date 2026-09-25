// Undo and redo buttons next to Play: step back through your changes (and the
// ones Insert, Try or the tempo made) and, while it plays, hear each step.
// @strudel/repl ships CodeMirror bundled inside, so its undo history is only
// reachable through the editor's own shortcuts: the buttons press them
type Editor = {
  code: string;
  editor?: { contentDOM: HTMLElement };
  evaluate(): Promise<void>;
  repl?: { scheduler?: { started?: boolean } };
};

const mac = /Mac|iPhone|iPad/.test(navigator.platform);

export function setupUndo(editor: Editor) {
  const press = (shift: boolean) => {
    const target = editor.editor?.contentDOM;
    if (!target) return;
    const before = editor.code;
    target.dispatchEvent(
      new KeyboardEvent('keydown', { key: shift ? 'Z' : 'z', code: 'KeyZ', keyCode: 90, ctrlKey: !mac, metaKey: mac, shiftKey: shift, bubbles: true, cancelable: true }),
    );
    if (editor.code !== before && editor.repl?.scheduler?.started) void editor.evaluate();
  };
  document.querySelector('#undo')!.addEventListener('click', () => press(false));
  document.querySelector('#redo')!.addEventListener('click', () => press(true));
}
