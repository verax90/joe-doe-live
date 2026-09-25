// Tempo in the bar: a BPM field and a Tap button. A change applies at once and
// is also written into the pattern's setcps(...) line, so the next Ctrl+Enter
// does not undo it. BPM here means 4 beats per cycle: setcps(BPM / 60 / 4).

type Editor = {
  code: string;
  setCode(code: string): void;
  repl?: { scheduler?: { cps?: number; started?: boolean; setCps?: (cps: number) => void } };
};

const MIN = 40;
const MAX = 300;
const SETCPS = /setcps\(\s*[^()]*\)/;

// The pattern's tempo line, rewritten or added at the top
export function withTempo(code: string, bpm: number) {
  const line = `setcps(${bpm} / 60 / 4)`;
  return SETCPS.test(code) ? code.replace(SETCPS, line) : `${line}\n${code}`;
}

// The BPM a pattern asks for: setcps(90 / 60 / 4) or setcps(0.5); null if none
export function tempoInCode(code: string) {
  const match = code.match(/setcps\(\s*([\d.]+)\s*(?:\/\s*60\s*\/\s*4\s*)?\)/);
  if (!match) return null;
  const value = Number(match[1]);
  const bpm = match[0].includes('/') ? value : value * 240;
  return Number.isFinite(bpm) ? Math.round(bpm) : null;
}

// Average of the last few taps; a pause of 2 s starts over
export function tapTempo(taps: number[]) {
  if (taps.length < 2) return null;
  const recent = taps.slice(-5);
  const gaps = recent.slice(1).map((time, i) => time - recent[i]);
  return Math.round(60000 / (gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length));
}

export function setupTempo(editor: Editor) {
  const input = document.querySelector<HTMLInputElement>('#bpm')!;
  const tap = document.querySelector<HTMLButtonElement>('#tap')!;
  const scheduler = () => editor.repl?.scheduler;
  // Playing: the tempo you hear. Stopped: the one the code will set on Play
  const current = () =>
    scheduler()?.started ? Math.round((scheduler()?.cps ?? 0.5) * 240) : (tempoInCode(editor.code) ?? 120);

  const setBpm = (value: number) => {
    const bpm = Math.min(MAX, Math.max(MIN, Math.round(value)));
    scheduler()?.setCps?.(bpm / 240);
    const next = withTempo(editor.code, bpm);
    if (next !== editor.code) editor.setCode(next);
    input.value = String(bpm);
  };

  input.addEventListener('change', () => {
    const value = Number(input.value);
    if (Number.isFinite(value) && value > 0) setBpm(value);
    else input.value = String(current());
  });

  let taps: number[] = [];
  tap.addEventListener('click', () => {
    const now = performance.now();
    if (taps.length && now - taps[taps.length - 1] > 2000) taps = [];
    taps.push(now);
    const bpm = tapTempo(taps);
    if (bpm) setBpm(bpm);
  });

  // Follows the tempo the pattern sets (setcps in the code) unless you are typing
  const show = () => {
    if (document.activeElement !== input) input.value = String(current());
  };
  show();
  setInterval(show, 500);
}
