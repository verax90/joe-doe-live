import { describe, expect, it } from 'vitest';
import { worthFolding } from './panel-help';

describe("a panel's explanation folds when it is long", () => {
  it('up to four lines stay as they are: folding would hide too little', () => {
    expect(worthFolding(40, 20)).toBe(false);
    expect(worthFolding(80, 20)).toBe(false);
  });
  it('five or more fold to two', () => {
    expect(worthFolding(100, 20)).toBe(true);
    expect(worthFolding(210, 21)).toBe(true);
  });
});
