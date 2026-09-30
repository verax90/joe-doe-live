import { describe, expect, it } from 'vitest';
import { errorPosition, explainError, likelyLine } from './status';

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

  it('puts the cursor at the column, or at the end of the likely line before', () => {
    const code = 'setcps(0.5)\n$: s("bd")\n$: s("hh*8"';
    expect(code.slice(0, errorPosition(code, 3, 5)!)).toBe('setcps(0.5)\n$: s("bd")\n$: s(');
    // a column past the end: the line's end; a line that is not there: nothing
    expect(errorPosition(code, 2, 99)).toBe(22);
    expect(errorPosition(code, 9)).toBeNull();
    // at the start of line 3: the end of line 2
    expect(code.slice(0, errorPosition(code, 3, 0)!)).toBe('setcps(0.5)\n$: s("bd")');
  });
});

describe('the likely line', () => {
  const code = '// Lofi\nsetcps(78 / 60 / 4\n\nstack(\n  s("bd")\n)';
  it('goes back over blank lines to the last line with code', () => {
    expect(likelyLine(code, 4, 0)).toBe(2);
    // the cursor lands right after "/ 4", where the ) is missing
    expect(code.slice(0, errorPosition(code, 4, 0)!)).toBe('// Lofi\nsetcps(78 / 60 / 4');
  });
  it('stays on the line when the column is inside it', () => {
    expect(likelyLine(code, 4, 3)).toBe(4);
    expect(likelyLine(code, 1, 0)).toBe(1);
  });
});
