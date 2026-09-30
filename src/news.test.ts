import { describe, expect, it } from 'vitest';
import { hasUnseen, NEWS } from './news';

describe("what's new", () => {
  it('has unique ids, newest first, in both languages', () => {
    const ids = NEWS.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort().reverse().map((id) => id.slice(0, 10))).toEqual(ids.map((id) => id.slice(0, 10)));
    for (const news of NEWS) {
      expect(news.title.en && news.title.es && news.text.en && news.text.es).toBeTruthy();
    }
  });

  it('is unseen until the newest has been seen', () => {
    expect(hasUnseen(NEWS, '')).toBe(true);
    expect(hasUnseen(NEWS, NEWS[1].id)).toBe(true);
    expect(hasUnseen(NEWS, NEWS[0].id)).toBe(false);
    expect(hasUnseen([], '')).toBe(false);
  });
});
