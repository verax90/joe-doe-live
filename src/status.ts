// Status bar: code errors in plain words and a notice while sounds load.
// Strudel reports two ways: the editor's "update" event (errors when evaluating
// or playing) and the document's "strudel.log" event (samples loading).

import { t } from './i18n';

type ReplState = { error?: unknown; pending?: boolean };
type LogDetail = { message: string; type?: string };

// Turns the usual errors into something you can follow mid-performance;
// where the message says where (line:column), that comes along too
export function explainError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  const at = raw.match(/\((\d+):(\d+)\)/);
  const where = at ? { line: Number(at[1]), column: Number(at[2]) } : undefined;
  const line = at ? t('line', { line: at[1] }) : '';
  const rules: [RegExp, (m: RegExpMatchArray) => string][] = [
    [/Unterminated string/i, () => t('errString')],
    [/Unexpected token/i, () => t('errToken')],
    [/sound (\S+?) not found/i, (m) => t('errSound', { name: m[1] })],
    [/(\w+) is not defined/i, (m) => t('errUndefined', { name: m[1] })],
    [/([\w.]+) is not a function/i, (m) => t('errFunction', { name: m[1] })],
    [/midi device .* not found|No MIDI devices found/i, () => t('errMidi')],
  ];
  const sentence = (text: string) => (line ? line + text : text.charAt(0).toUpperCase() + text.slice(1));
  for (const [pattern, explain] of rules) {
    const match = raw.match(pattern);
    if (match) return { text: sentence(explain(match)), raw, where };
  }
  return { text: sentence(raw), raw, where };
}

// Where in the code a line:column is, as a range from that column to the
// line's end (the whole line when the column is past it); null if the line
// does not exist. At the very start of a line the fault is usually at the
// end of the one before (a bracket never closed): both are taken
export function lineRange(code: string, line: number, column = 0) {
  const lines = code.split('\n');
  if (line < 1 || line > lines.length) return null;
  const startOf = (n: number) => lines.slice(0, n - 1).reduce((sum, l) => sum + l.length + 1, 0);
  const from = startOf(line);
  const length = lines[line - 1].length;
  if (column === 0 && line > 1) return { from: startOf(line - 1), to: from + length };
  const start = column < length ? from + column : from;
  return { from: start, to: from + length };
}

type Where = { line: number; column: number };
type View = { dispatch(spec: unknown): void; focus(): void; state: { doc: { toString(): string } } };

export function setupStatus(repl: HTMLElement & { editor?: { editor?: View } | null }) {
  const bar = document.querySelector<HTMLElement>('#status')!;
  const text = bar.querySelector<HTMLElement>('.status-text')!;
  const detail = bar.querySelector<HTMLElement>('.status-detail')!;
  // "Go to line 3": the cursor there, the line selected, the editor focused
  const goButton = bar.querySelector<HTMLButtonElement>('.status-go')!;
  let where: Where | undefined;
  goButton.addEventListener('click', () => {
    const view = repl.editor?.editor;
    if (!view || !where) return;
    const range = lineRange(view.state.doc.toString(), where.line, where.column);
    if (!range) return;
    view.dispatch({ selection: { anchor: range.from, head: range.to }, scrollIntoView: true });
    view.focus();
  });

  type Shown = { text: string; raw: string; where?: Where };
  // Errors when evaluating (they come with the editor state) and while playing
  // (only as log messages); these last until the next play
  let evalError: Shown | null = null;
  let runtimeError: Shown | null = null;
  let loading = false;
  let loadingTimer: number | undefined;

  const render = () => {
    const error = evalError ?? runtimeError;
    if (error) {
      bar.dataset.kind = 'error';
      text.textContent = error.text;
      detail.textContent = error.raw === error.text ? '' : error.raw;
      where = error.where;
      goButton.hidden = !where;
      if (where) goButton.textContent = t('goToLine', { line: where.line });
      bar.hidden = false;
    } else if (loading) {
      goButton.hidden = true;
      bar.dataset.kind = 'loading';
      text.textContent = t('loadingSounds');
      detail.textContent = '';
      bar.hidden = false;
    } else {
      bar.hidden = true;
    }
  };

  repl.addEventListener('update', (event) => {
    const state = (event as CustomEvent<ReplState>).detail;
    if (state.pending) runtimeError = null;
    evalError = state.error ? explainError(state.error) : null;
    render();
  });

  document.addEventListener('strudel.log', (event) => {
    const { message, type } = (event as CustomEvent<LogDetail>).detail;
    if (type === 'load-sample' || type === 'loaded-sample') {
      // Loading notices repeat and sometimes come grouped: instead of counting
      // them, "loading" shows until a while passes without one
      loading = true;
      clearTimeout(loadingTimer);
      loadingTimer = window.setTimeout(() => {
        loading = false;
        render();
      }, 800);
      render();
    } else if (type === 'error' && /could not load/.test(message)) {
      const name = message.match(/"([^"]+)"/)?.[1] ?? '';
      runtimeError = { text: t('errDownload', { name }), raw: message };
      render();
    } else {
      // Errores mientras suena, p. ej. "[getTrigger] error: sound x not found!"
      const runtime = message.match(/^\[[\w-]+\] error: (.+)$/);
      if (runtime && runtime[1] !== runtimeError?.raw) {
        runtimeError = explainError(runtime[1]);
        render();
      }
    }
  });
}
