import { describe, expect, it } from 'vitest';
import { youtubeEmbedUrl, youtubeId, youtubeSource } from './video';

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

describe('youtubeSource', () => {
  it('takes every link, one per line or separated by commas, in order', () => {
    expect(youtubeSource(`https://youtu.be/${ID}\nhttps://www.youtube.com/watch?v=aaaaaaaaaaa, bbbbbbbbbbb\nnot a link`)).toEqual({
      ids: [ID, 'aaaaaaaaaaa', 'bbbbbbbbbbb'],
    });
  });

  it('prefers a playlist when the link has one', () => {
    expect(youtubeSource(`https://www.youtube.com/watch?v=${ID}&list=PL123abc`)).toEqual({ list: 'PL123abc' });
    expect(youtubeSource('nothing here')).toBeNull();
  });

  it('builds a muted, looping embed for both', () => {
    const many = new URL(youtubeEmbedUrl({ ids: [ID, 'aaaaaaaaaaa'] }));
    expect(many.pathname).toBe(`/embed/${ID}`);
    expect(many.searchParams.get('playlist')).toBe(`${ID},aaaaaaaaaaa`);
    expect(many.searchParams.get('loop')).toBe('1');
    expect(many.searchParams.get('mute')).toBe('1');
    const list = new URL(youtubeEmbedUrl({ list: 'PL123abc' }));
    expect(list.pathname).toBe('/embed/videoseries');
    expect(list.searchParams.get('list')).toBe('PL123abc');
  });
});
