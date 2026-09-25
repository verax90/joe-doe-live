// The parts of Strudel's editor (StrudelMirror from @strudel/codemirror, inside
// the <strudel-editor> element of @strudel/repl) that the studio uses.
// @strudel/repl ships no types, so they are described here once.

export type Scheduler = {
  started?: boolean;
  cps?: number;
  latency?: number;
  now?: () => number;
  setCps?: (cps: number) => void;
};

// CodeMirror's EditorView, as far as the studio touches it
export type EditorView = {
  state: {
    doc: { length: number; lines: number; lineAt(pos: number): { number: number } };
    selection: { main: { head: number } };
    replaceSelection(text: string): unknown;
  };
  dispatch(spec: unknown): void;
  focus(): void;
  contentDOM: HTMLElement;
};

export type StrudelMirror = {
  code: string;
  setCode(code: string): void;
  evaluate(autostart?: boolean): Promise<void>;
  stop(): Promise<void>;
  setTheme?: (name: string) => void;
  repl?: { scheduler?: Scheduler };
  editor?: EditorView;
};

// The component creates its editor inside a setTimeout: wait until it exists
export function whenEditorReady(repl: HTMLElement & { editor?: StrudelMirror | null }): Promise<StrudelMirror> {
  return new Promise((resolve) => {
    const check = () => (repl.editor ? resolve(repl.editor) : requestAnimationFrame(check));
    check();
  });
}

// Strudel's functions (samples, initHydra…) become globals once it has loaded;
// until then they cannot be used
export function whenStrudelReady(): Promise<void> {
  return new Promise((resolve) => {
    const g = globalThis as { samples?: unknown; initHydra?: unknown };
    const check = () => (g.samples && g.initHydra ? resolve() : setTimeout(check, 100));
    check();
  });
}
