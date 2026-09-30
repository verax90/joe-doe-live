// History of what played: every Play or Ctrl+Enter keeps that version of the
// code (the last 50, not twice in a row the same), so in the middle of a set
// you can go back to what sounded five minutes ago. Undo walks back letter
// by letter; this walks back version by version. Loading one is a single
// edit, so Ctrl+Z brings back what you had.
import { t } from './i18n';
import { readStorage, writeStorage } from './storage';
import type { StrudelMirror } from './strudel';

export type Version = { at: number; code: string };

const KEY = 'jdl:history';
const LIMIT = 50;

// A new version on top, unless it is the same as the last; at most LIMIT
export function remember(list: Version[], code: string, at = Date.now()): Version[] {
  if (!code.trim() || list[0]?.code === code) return list;
  return [{ at, code }, ...list].slice(0, LIMIT);
}

// What a version is about: its first line that plays (not a comment, a tempo
// or a setting), shortened
export function summary(code: string, width = 48) {
  const line =
    code
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l && !l.startsWith('//') && !/^(setcps|setcpm|samples|await|all\()/.test(l)) ?? '';
  return line.length > width ? `${line.slice(0, width - 1)}…` : line;
}

// How many lines differ from the version before (a rough size of the change)
export function changedLines(code: string, before: string | undefined) {
  if (before === undefined) return 0;
  const old = new Set(before.split('\n'));
  const now = new Set(code.split('\n'));
  let changed = 0;
  for (const line of now) if (!old.has(line)) changed++;
  for (const line of old) if (!now.has(line)) changed++;
  return changed;
}

let list = readStorage<Version[]>(KEY, []);
let onChange: (() => void) | undefined;

// From main.ts, on every evaluate
export function recordPlayed(code: string) {
  const next = remember(list, code);
  if (next === list) return;
  list = next;
  writeStorage(KEY, list);
  onChange?.();
}

export function setupHistory(editor: StrudelMirror) {
  const view = document.querySelector<HTMLElement>('#history-list')!;
  const status = document.querySelector<HTMLElement>('#history-status')!;
  const time = (at: number) => new Date(at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const load = (code: string) => {
    // one edit for the whole document: Ctrl+Z undoes it
    editor.editor?.dispatch({ changes: { from: 0, to: editor.code.length, insert: code } });
  };

  const render = () => {
    if (!list.length) {
      view.innerHTML = `<li class="muted">${t('historyEmpty')}</li>`;
      return;
    }
    view.replaceChildren(
      ...list.map((version, i) => {
        const item = document.createElement('li');
        item.className = 'history-item';
        const head = document.createElement('div');
        head.className = 'history-head';
        const when = document.createElement('span');
        when.className = 'history-time';
        when.textContent = time(version.at);
        const size = document.createElement('span');
        size.className = 'history-size';
        const changed = changedLines(version.code, list[i + 1]?.code);
        size.textContent = i === list.length - 1 ? t('historyFirst') : t('historyChanged', { n: changed });
        const actions = document.createElement('span');
        actions.className = 'cheat-icons';
        const button = (glyph: string, label: string, onClick: () => void) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'cheat-icon';
          b.textContent = glyph;
          b.title = label;
          b.setAttribute('aria-label', label);
          b.addEventListener('click', onClick);
          return b;
        };
        actions.append(
          button('↩', t('historyLoad'), () => {
            load(version.code);
            status.textContent = t('historyLoaded', { time: time(version.at) });
          }),
          button('▶', t('historyPlay'), () => {
            load(version.code);
            void editor.evaluate();
            status.textContent = t('historyPlaying', { time: time(version.at) });
          }),
        );
        head.append(when, size, actions);
        const line = document.createElement('code');
        line.className = 'history-line';
        line.textContent = summary(version.code) || '…';
        item.append(head, line);
        return item;
      }),
    );
  };

  document.querySelector('#history-clear')!.addEventListener('click', () => {
    list = [];
    writeStorage(KEY, list);
    render();
  });
  onChange = render;
  render();
  return render;
}
