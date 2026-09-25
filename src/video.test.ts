import { describe, expect, it } from 'vitest';
import { youtubeId } from './video';

const ID = 'dQw4w9WgXcQ';

describe('youtubeId', () => {
  it('reads every usual kind of link', () => {
    for (const link of [
      `https://www.youtube.com/watch?v=${ID}`,
      `https://youtube.com/watch?v=${ID}&t=42s&list=PL123`,
      `https://m.youtube.com/watch?v=${ID}`,
      `https://music.youtube.com/watch?v=${ID}`,
      `https://youtu.be/${ID}?si=abc`,
      `youtu.be/${ID}`,
      `https://www.youtube.com/shorts/${ID}`,
      `https://www.youtube.com/live/${ID}`,
      `https://www.youtube.com/embed/${ID}`,
      `https://www.youtube-nocookie.com/embed/${ID}`,
      `  ${ID}  `,
    ]) {
      expect(youtubeId(link), link).toBe(ID);
    }
  });

  it('rejects anything else', () => {
    for (const link of ['', 'hola', 'https://vimeo.com/123456', `https://evil.com/watch?v=${ID}`, 'https://youtube.com/watch?v=short', 'https://www.youtube.com/@channel']) {
      expect(youtubeId(link), link).toBeNull();
    }
  });
});
