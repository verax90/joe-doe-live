import { describe, expect, it } from 'vitest';
import { buildShareUrl, readSharedPattern } from './share';

const open = (url: string) => history.replaceState(null, '', new URL(url).pathname + new URL(url).hash);

describe('share links', () => {
  it('round-trips code and visual, accents and emoji included', () => {
    const code = '// ñandú, café ☕\ns("bd*4").lpf(800)';
    open(buildShareUrl(code, 'graves'));
    expect(readSharedPattern()).toEqual({ code, visualId: 'graves' });
  });

  it('keeps the link URL-safe', () => {
    const url = buildShareUrl('s("bd?") // +/=', 'lima');
    const encoded = new URLSearchParams(new URL(url).hash.slice(1)).get('c');
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('ignores a broken link instead of throwing', () => {
    history.replaceState(null, '', '/#v=lima&c=%%%');
    expect(readSharedPattern()).toEqual({ code: undefined, visualId: 'lima' });
  });
});
