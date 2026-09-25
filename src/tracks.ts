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
