import { describe, expect, it } from 'vitest';
import { explainError } from './status';

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
