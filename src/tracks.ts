// Tracks: Strudel plays only the last bare pattern of the code, unless lines
// start with "$:", and then it plays every "$:" line together (and drops the
// bare one). So a pattern added to your code becomes a "$:" track, and the
// bare patterns already there become tracks too, or they would go quiet.
import type { Node } from 'acorn';

// acorn (the JavaScript parser) is only needed once you insert or compose, so
// it loads in the background after the page instead of with it. Until then
// the code counts as not parseable and nothing is rewritten
let parse: typeof import('acorn').parse | undefined;
export const tracksReady = import('acorn').then((acorn) => {
  parse = acorn.parse;
});

// Calls that set things up rather than make sound
const SETUP = new Set(['setcps', 'setcpm', 'setCps', 'samples', 'initHydra', 'initAudio', 'hush', 'aliasBank', 'soundAlias', 'all', 'each']);

type Expression = Node & { type: string; callee?: Expression; object?: Expression; property?: { name?: string }; name?: string };
type Statement = Node & { type: string; expression?: Expression; label?: { name: string } };

// The name a chain starts from: s in s("bd").gain(0.8)
function root(node: Expression | undefined): string | null {
  while (node) {
    if (node.type === 'Identifier') return node.name ?? null;
    if (node.type === 'CallExpression') node = node.callee;
    else if (node.type === 'MemberExpression') node = node.object;
    else return null;
  }
  return null;
}

function isPattern(statement: Statement) {
  const expression = statement.expression;
  if (statement.type !== 'ExpressionStatement' || expression?.type !== 'CallExpression') return false;
  // Hydra chains end in .out()
  if (expression.callee?.type === 'MemberExpression' && expression.callee.property?.name === 'out') return false;
  const name = root(expression);
  return name !== null && !SETUP.has(name);
}

function statements(code: string): Statement[] | null {
  if (!parse) return null;
  try {
    const program = parse(code, { ecmaVersion: 'latest', sourceType: 'module', allowAwaitOutsideFunction: true });
    return program.body as Statement[];
  } catch {
    return null;
  }
}

// Where "$: " goes so every bare pattern in the code plays; null if the code
// does not parse (mid-edit)
export function bareTracks(code: string) {
  return statements(code)?.filter(isPattern).map((statement) => statement.start) ?? null;
}

// A whole pattern (s("bd*4"), stack(...)), not a method or a setting
export function isPatternSnippet(snippet: string) {
  const body = statements(snippet);
  return body?.length === 1 && isPattern(body[0]);
}

// The edits that make the bare patterns tracks and add the snippet as a new
// one at the end, and where the cursor lands (end of the new track)
export function trackChanges(code: string, snippet: string) {
  const prefixes = (bareTracks(code) ?? []).map((from) => ({ from, insert: '$: ' }));
  const gap = code === '' || code.endsWith('\n') ? '' : '\n';
  const track = `${gap}$: ${snippet}\n`;
  const anchor = code.length + prefixes.length * 3 + track.length - 1;
  return { changes: [...prefixes, { from: code.length, insert: track }], anchor };
}

export type Change = { from: number; to?: number; insert: string };

// Edits (positions in the original code, not overlapping) applied to a string
export function applyChanges(code: string, changes: Change[]) {
  let next = code;
  for (const { from, to = from, insert } of [...changes].sort((a, b) => b.from - a.from)) {
    next = next.slice(0, from) + insert + next.slice(to);
  }
  return next;
}

export const addTrack = (code: string, snippet: string) => applyChanges(code, trackChanges(code, snippet).changes);

// A named track ("bass: note(...)", or "_bass:" while muted): where its whole
// statement is, so it can be swapped for another
export function findLabel(code: string, name: string) {
  const statement = statements(code)?.find((s) => s.type === 'LabeledStatement' && (s.label?.name === name || s.label?.name === `_${name}`));
  return statement ? { from: statement.start, to: statement.end, muted: statement.label!.name.startsWith('_') } : null;
}

// Where new tracks go: before all(...), which has to stay last to reach them
export function trackInsertPoint(code: string) {
  const all = statements(code)?.find((s) => s.type === 'ExpressionStatement' && root(s.expression) === 'all');
  return all?.start ?? code.length;
}

// Stems: every voice of the code on an orbit of its own, so each one comes
// out of its own output. A voice is a playing track ($: or a named one, not
// muted) or, for a stack(...), each thing stacked. Voices that already pick
// their orbit keep it. The first free orbit is 11, away from the usual ones
export const STEM_ORBIT = 11;

type Voice = { at: number; name: string; orbit?: number }; // orbit: one it chose itself

// The stack(...) call a chain grows from, if any: stack(a, b).analyze(1)
function stackCall(node: Expression | undefined): (Expression & { arguments: Expression[] }) | null {
  while (node) {
    if (node.type === 'CallExpression' && node.callee?.type === 'Identifier' && node.callee.name === 'stack') {
      return node as Expression & { arguments: Expression[] };
    }
    if (node.type === 'CallExpression') node = node.callee;
    else if (node.type === 'MemberExpression') node = node.object;
    else return null;
  }
  return null;
}

// "bass" for a named track, else the voice's number and its main sound:
// 2_bd for s("bd ~ sd"), 3_piano for chord(...).s("piano"), 4_notes
export function voiceName(label: string | undefined, text: string, index: number) {
  if (label && label !== '$') return label.replace(/^_/, '');
  const sound = /(?:^|[.\s(,])s\(\s*["'`]([^"'`]+)/.exec(text)?.[1];
  const first = sound?.split(/[\s<>[\]{}*!?,:~@/()]+/).find(Boolean);
  const hint = first ?? (/\b(note|n|chord)\(/.test(text) ? 'notes' : 'voice');
  return `${index}_${hint.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
}

export function stemVoices(code: string): Voice[] | null {
  const body = statements(code);
  if (!body) return null;
  const voices: Voice[] = [];
  let index = 0;
  for (const statement of body) {
    let label: string | undefined;
    let expression: Expression | undefined;
    if (statement.type === 'LabeledStatement') {
      label = statement.label!.name;
      const inner = (statement as Statement & { body?: Statement }).body;
      if (label.startsWith('_') || !inner || !isPattern(inner)) continue;
      expression = inner.expression;
    } else if (isPattern(statement)) {
      expression = statement.expression;
    } else continue;
    const stack = stackCall(expression);
    for (const part of stack ? stack.arguments : [expression!]) {
      index++;
      const text = code.slice(part.start, part.end);
      // it chose its own orbit: kept, and named if it is a plain number
      const own = /\borbit\s*\(\s*["'`]?(\d+)["'`]?\s*\)/.exec(text);
      if (own) voices.push({ at: part.end, name: voiceName(label, text, index), orbit: Number(own[1]) });
      else if (!/\borbit\s*\(/.test(text)) voices.push({ at: part.end, name: voiceName(label, text, index) });
    }
  }
  return voices;
}

// Every voice that plays (not muted with _): where it ends and its text, a
// stack(...) counted part by part
export function playingParts(code: string): { end: number; text: string }[] | null {
  const body = statements(code);
  if (!body) return null;
  const parts: { end: number; text: string }[] = [];
  for (const statement of body) {
    let expression: Expression | undefined;
    if (statement.type === 'LabeledStatement') {
      const inner = (statement as Statement & { body?: Statement }).body;
      if (statement.label!.name.startsWith('_') || !inner || !isPattern(inner)) continue;
      expression = inner.expression;
    } else if (isPattern(statement)) expression = statement.expression;
    else continue;
    const stack = stackCall(expression);
    for (const part of stack ? stack.arguments : [expression!]) parts.push({ end: part.end, text: code.slice(part.start, part.end) });
  }
  return parts;
}

// Sequencer view: each voice drawn under its line as it plays, in its own
// colour: a piano roll for notes, a punchcard (one row per sound) for the
// rest. The colours are these, so turning it off takes out only what it put
export const SEQUENCER_COLOURS = ['#d6ff4b', '#4bd6ff', '#ff5fd2', '#ffb84b', '#9d8cff', '#4bffa5'];
const WIDGET = /\._(?:punchcard|pianoroll)\(\)/;
const ADDED = new RegExp(`(?:\\.color\\("(?:${SEQUENCER_COLOURS.join('|')})"\\))?\\._(?:punchcard|pianoroll)\\(\\)`, 'g');

export const hasSequencer = (code: string) => WIDGET.test(code);

export function withSequencer(code: string) {
  const parts = playingParts(code);
  if (!parts) return null;
  let colour = 0;
  const changes = parts
    .filter((part) => !WIDGET.test(part.text))
    .map((part) => {
      const melodic = /\b(note|n|chord|freq)\(/.test(part.text) && !/\bs\(\s*["'`](bd|sd|hh|oh|cp|rim|lt|ht|mt|perc)/.test(part.text);
      const tint = /\.color\(/.test(part.text) ? '' : `.color("${SEQUENCER_COLOURS[colour++ % SEQUENCER_COLOURS.length]}")`;
      return { from: part.end, insert: `${tint}._${melodic ? 'pianoroll' : 'punchcard'}()` };
    });
  return applyChanges(code, changes);
}

export const withoutSequencer = (code: string) => code.replace(ADDED, '');

// The code with .orbit(n) after each voice, and which name each orbit has
export function stemCode(code: string) {
  const voices = stemVoices(code) ?? [];
  const names = new Map<number, string>();
  const changes = voices
    .filter((voice) => {
      if (voice.orbit !== undefined) names.set(voice.orbit, voice.name);
      return voice.orbit === undefined;
    })
    .map((voice, i) => {
      names.set(STEM_ORBIT + i, voice.name);
      return { from: voice.at, insert: `.orbit(${STEM_ORBIT + i})` };
    });
  return { code: applyChanges(code, changes), names };
}
