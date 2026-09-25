// Tracks: Strudel plays only the last bare pattern of the code, unless lines
// start with "$:", and then it plays every "$:" line together (and drops the
// bare one). So a pattern added to your code becomes a "$:" track, and the
// bare patterns already there become tracks too, or they would go quiet.
import { parse, type Node } from 'acorn';

// Calls that set things up rather than make sound
const SETUP = new Set(['setcps', 'setcpm', 'setCps', 'samples', 'initHydra', 'initAudio', 'hush', 'aliasBank', 'soundAlias']);

type Expression = Node & { type: string; callee?: Expression; object?: Expression; property?: { name?: string }; name?: string };
type Statement = Node & { type: string; expression?: Expression };

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

// The same edits applied to a string
export function addTrack(code: string, snippet: string) {
  let next = code;
  for (const { from, insert } of [...trackChanges(code, snippet).changes].reverse()) {
    next = next.slice(0, from) + insert + next.slice(from);
  }
  return next;
}
