// Steps by hand: with the sequencer on, a click on a drum line's grid opens
// a row of boxes under it, one per step of its s("…"); a box on is a hit,
// off a rest (~), and the code changes as you click (heard at once while it
// plays, one Ctrl+Z each). Only for plain sequences ("bd ~ sd ~", "hh*8"):
// brackets, angles and the like are left to the code.
import { t } from './i18n';
import type { StrudelMirror } from './strudel';
import { toast } from './toast';
import { playingParts } from './tracks';

const WORD = /^[A-Za-z][\w:.-]*$/;
const MAX_STEPS = 32;

// "bd ~ sd*2" → ['bd', '~', 'sd', 'sd']; null when it is more than a plain row
export function parseSteps(mini: string): string[] | null {
  const words = mini.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const steps: string[] = [];
  for (const word of words) {
    if (word === '~' || word === '-') {
      steps.push('~');
      continue;
    }
    const [name, times, ...rest] = word.split('*');
    if (rest.length || !WORD.test(name)) return null;
    const count = times === undefined ? 1 : Number(times);
    if (!Number.isInteger(count) || count < 1) return null;
    for (let i = 0; i < count; i++) steps.push(name);
  }
  return steps.length <= MAX_STEPS ? steps : null;
}

// Back to mini-notation: the same sound on every step stays short ("hh*8")
export function stepsToMini(steps: string[]) {
  if (steps.length > 1 && steps.every((step) => step === steps[0] && step !== '~')) return `${steps[0]}*${steps.length}`;
  return steps.join(' ');
}

// The sound a box puts in: the one most used in the row
export function mainSound(steps: string[]) {
  const counts = new Map<string, number>();
  for (const step of steps) if (step !== '~') counts.set(step, (counts.get(step) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'bd';
}

export function toggleStep(steps: string[], i: number, sound = mainSound(steps)) {
  return steps.map((step, k) => (k !== i ? step : step === '~' ? sound : '~'));
}

// Where in the code the row of a voice is: its s("…") or sound("…")
export function findRow(code: string, partEnd: number) {
  const part = playingParts(code)?.find((p) => p.end === partEnd);
  if (!part) return null;
  const start = part.end - part.text.length;
  const match = /\b(?:s|sound)\(\s*(["'`])([^"'`]*)\1/.exec(part.text);
  if (!match || /\b(?:note|n|chord|freq)\(/.test(part.text)) return null;
  const from = start + match.index + match[0].indexOf(match[1]) + 1;
  return { from, to: from + match[2].length, mini: match[2] };
}

export function setupSteps(editor: StrudelMirror, isPlaying: () => boolean) {
  const host = document.querySelector<HTMLElement>('.editor');
  if (!host) return;
  let box: HTMLElement | undefined;
  let partEnd = -1;

  const close = () => {
    box?.remove();
    box = undefined;
  };

  const write = (from: number, to: number, mini: string) => {
    editor.editor?.dispatch({ changes: { from, to, insert: mini } });
    if (isPlaying()) void editor.evaluate();
  };

  const open = (canvas: HTMLCanvasElement) => {
    const view = editor.editor;
    if (!view) return;
    // the widget sits at the end of its voice: that voice is the row
    let at: number;
    try {
      at = (view as unknown as { posAtDOM(node: Node): number }).posAtDOM(canvas);
    } catch {
      return;
    }
    const parts = playingParts(editor.code) ?? [];
    const part = parts.find((p) => Math.abs(p.end - at) <= 1) ?? parts.filter((p) => p.end <= at).at(-1);
    const row = part && findRow(editor.code, part.end);
    const steps = row && parseSteps(row.mini);
    if (!part || !row || !steps) {
      close();
      toast(t('stepsCant'));
      return;
    }
    partEnd = part.end;
    close();
    box = document.createElement('div');
    box.className = 'steps-box';
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', t('stepsTitle'));
    const render = () => {
      const current = findRow(editor.code, partEnd);
      const now = current && parseSteps(current.mini);
      if (!current || !now) {
        close();
        return;
      }
      const sound = mainSound(now);
      const title = document.createElement('div');
      title.className = 'steps-title';
      title.textContent = `${t('stepsTitle')} · ${sound}`;
      const done = document.createElement('button');
      done.type = 'button';
      done.className = 'control control-icon steps-close';
      done.dataset.icon = 'close';
      done.setAttribute('aria-label', t('close'));
      done.addEventListener('click', close);
      title.append(done);
      const row = document.createElement('div');
      row.className = 'steps-row';
      row.style.setProperty('--steps', String(now.length));
      now.forEach((step, i) => {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'steps-cell';
        cell.setAttribute('aria-pressed', String(step !== '~'));
        cell.setAttribute('aria-label', `${i + 1}: ${step === '~' ? t('stepsRest') : step}`);
        cell.title = step === '~' ? '' : step;
        // a beat starts every quarter of the row: marked, to count by
        if (now.length % 4 === 0 && i % (now.length / 4) === 0) cell.classList.add('is-beat');
        cell.addEventListener('click', () => {
          const fresh = findRow(editor.code, partEnd);
          const steps = fresh && parseSteps(fresh.mini);
          if (!fresh || !steps) return close();
          const next = stepsToMini(toggleStep(steps, i, sound));
          write(fresh.from, fresh.to, next);
          // the voice got longer or shorter: it ends somewhere else now
          partEnd += next.length - (fresh.to - fresh.from);
          box!.replaceChildren();
          render();
          box!.querySelectorAll<HTMLButtonElement>('.steps-cell')[i]?.focus();
        });
        row.append(cell);
      });
      box!.append(title, row);
    };
    render();
    const place = canvas.getBoundingClientRect();
    const frame = host.getBoundingClientRect();
    box.style.left = `${Math.max(8, place.left - frame.left)}px`;
    box.style.top = `${place.bottom - frame.top + host.scrollTop + 4}px`;
    host.append(box);
    box.querySelector<HTMLButtonElement>('.steps-cell')?.focus();
  };

  host.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target instanceof HTMLCanvasElement && target.closest('.cm-content')) {
      open(target);
      return;
    }
    // a box clicked was drawn again meanwhile: no longer in the page, but inside
    if (box && target.isConnected && !box.contains(target)) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && box) close();
  });
}
