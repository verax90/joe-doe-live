import { describe, expect, it } from 'vitest';
import { worthFolding } from './panel-help';

describe("a panel's explanation folds when it is long", () => {
  it('two or three lines stay as they are', () => {
    expect(worthFolding(40, 20)).toBe(false);
    expect(worthFolding(60, 20)).toBe(false);
  });
  it('four or more fold to two', () => {
    expect(worthFolding(80, 20)).toBe(true);
    expect(worthFolding(210, 21)).toBe(true);
  });
});
