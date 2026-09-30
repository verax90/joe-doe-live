import { describe, expect, it } from 'vitest';
import { explainError, lineRange } from './status';

describe('errors in plain words', () => {
  it('points at the line of a syntax slip', () => {
    expect(explainError(new SyntaxError('Unexpected token (3:12)')).text).toMatch(/^Line 3: /);
  });

  it('names the sound that does not exist', () => {
    expect(explainError('sound tambor not found! Is it loaded?').text).toContain('tambor');
  });

  it('names a misspelled function', () => {
    expect(explainError(new TypeError('s(...).gian is not a function')).text).toContain('.gian');
  });

  it('keeps the original message', () => {
    expect(explainError('something new').raw).toBe('something new');
  });
});

describe('where an error is', () => {
  it('comes with the line and column when the message says', () => {
    expect(explainError(new SyntaxError('Unexpected token (3:12)')).where).toEqual({ line: 3, column: 12 });
    expect(explainError('sound tambor not found!').where).toBeUndefined();
  });

  it('turns into a range from the column to the end of the line', () => {
    const code = 'setcps(0.5)\n$: s("bd")\n$: s("hh*8"';
    const range = lineRange(code, 3, 5)!;
    expect(code.slice(range.from, range.to)).toBe('"hh*8"');
    // a column past the end selects the whole line; a line that is not there, nothing
    expect(lineRange(code, 2, 99)).toEqual({ from: 12, to: 22 });
    expect(lineRange(code, 9)).toBeNull();
    // at the start of a line: the one before comes too
    const both = lineRange(code, 3, 0)!;
    expect(code.slice(both.from, both.to)).toBe('$: s("bd")\n$: s("hh*8"');
    expect(lineRange(code, 1, 0)).toEqual({ from: 0, to: 11 });
  });
});
