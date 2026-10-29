import { describe, expect, it } from 'vitest';
import { archiveIdFromUrl, archiveQuery, parseArchiveSearch, parseCommonsSearch, pickArchiveFile, pickCommonsFile, pickNasaFile } from './clip-search';
import { examplePattern } from './clips-panel';
import { clipName, GLITCHES, hitFromValue, parseFx, pickFromPool, setGlitchAmount, withGlitch } from './clips';

describe('clip names', () => {
  it('reads well inside s("…")', () => {
    expect(clipName('Duck and Cover (1951)')).toBe('duck');
    expect(clipName('The Atomic Café.mp4')).toBe('atomic');
    expect(clipName('1984 Commercial.webm')).toBe('v1984');
    expect(clipName('???')).toBe('clip');
    expect(clipName('Tele vieja', 4)).toBe('tele_vieja');
  });
});

describe('pools', () => {
  it('deals every clip once before shuffling again', () => {
    const pool = ['a', 'b', 'c'];
    let bag: string[] | undefined;
    let last: string | undefined;
    const round: string[] = [];
    for (let i = 0; i < 3; i++) {
      const next = pickFromPool(pool, bag, last);
      round.push(next.picked);
      bag = next.bag;
      last = next.picked;
    }
    expect([...round].sort()).toEqual(pool);
  });

  it('never repeats across rounds', () => {
    // a random that always keeps the order: the new round would start with the last one
    const next = pickFromPool(['a', 'b'], [], 'a', () => 0.99);
    expect(next.picked).toBe('b');
  });

  it('forgets clips taken out of the pool', () => {
    expect(pickFromPool(['b'], ['a', 'b'], undefined).picked).toBe('b');
  });
});

describe('hits', () => {
  it('turns a Strudel value into a hit', () => {
    const { name, n, hit } = hitFromValue({ s: 'tele', n: 2, begin: 0.5, speed: -1, gain: 0.6, coarse: 8, fx: 'bw_mirror_nope', legato: 0.5 }, 0.25, 1);
    expect(name).toBe('tele');
    expect(n).toBe(2);
    expect(hit).toMatchObject({ layer: 1, begin: 0.5, speed: -1, gain: 0.6, coarse: 8, fx: ['bw', 'mirror'], holdMs: 125 });
  });

  it('holds to the next hit without legato', () => {
    expect(hitFromValue({ s: 'tele' }, 0.25, 0).hit.holdMs).toBeUndefined();
  });

  it('reads effects joined in several ways', () => {
    expect(parseFx('inv+strobe')).toEqual(['inv', 'strobe']);
    expect(parseFx(3)).toEqual([]);
  });
});

describe('Into the code', () => {
  it('writes one track for the pools', () => {
    expect(examplePattern(['tele', 'tele', 'calle'])).toContain('s("<tele calle>*4")');
    expect(examplePattern(['tele'])).toContain('s("tele*4")');
    expect(examplePattern([])).toBe('');
  });
});

describe('Internet Archive', () => {
  it('searches inside a collection, only videos', () => {
    expect(archiveQuery('atomic (bomb)', 'prelinger')).toBe('(atomic  bomb) AND collection:prelinger AND mediatype:movies');
    expect(archiveQuery('', 'archive')).toBe('mediatype:movies');
  });

  it('reads results', () => {
    const [found] = parseArchiveSearch({ response: { docs: [{ identifier: 'DuckandC1951', title: 'Duck and Cover', year: 1951 }] } }, 'prelinger');
    expect(found).toMatchObject({ title: 'Duck and Cover', year: '1951', page: 'https://archive.org/details/DuckandC1951' });
  });

  it('takes the lightest MP4 through the proxy', () => {
    const file = pickArchiveFile({
      server: 'dn1.us.archive.org',
      dir: '/0/items/x',
      files: [
        { name: 'x.mp4', size: '57000000' },
        { name: 'x_512kb.mp4', size: '39000000' },
        { name: 'x.ogv', size: '1000' },
        { name: 'x.avi', size: '10' },
      ],
    });
    expect(file).toEqual({ url: '/ia/dn1.us.archive.org/0/items/x/x_512kb.mp4', size: 39000000, preview: 'https://dn1.us.archive.org/0/items/x/x_512kb.mp4' });
  });

  it('finds the item in a pasted link', () => {
    expect(archiveIdFromUrl('https://archive.org/details/DuckandC1951?q=x')).toBe('DuckandC1951');
    expect(archiveIdFromUrl('https://example.com/a.mp4')).toBeNull();
  });
});

describe('NASA and Commons', () => {
  it('takes NASA’s phone-sized copy over https', () => {
    const file = pickNasaFile(['http://images-assets.nasa.gov/video/A b/A b~orig.mp4', 'http://images-assets.nasa.gov/video/A b/A b~mobile.mp4']);
    expect(file?.url).toBe('https://images-assets.nasa.gov/video/A%20b/A%20b~mobile.mp4');
  });

  it('takes Commons’ smallest playable copy and works out its size', () => {
    const page = {
      title: 'File:Glitch.webm',
      videoinfo: [
        {
          url: 'https://upload.wikimedia.org/o.webm',
          duration: 80,
          descriptionurl: 'https://commons.wikimedia.org/wiki/File:Glitch.webm',
          mediatype: 'VIDEO',
          derivatives: [
            { src: 'big.webm', type: 'video/webm', height: 1080, bandwidth: 4000000 },
            { src: 'mov.mov', type: 'video/quicktime', height: 360 },
            { src: 'small.webm', type: 'video/webm', height: 240, bandwidth: 200000 },
            { src: 'tiny.webm', type: 'video/webm', height: 120 },
          ],
        },
      ],
    };
    expect(pickCommonsFile(page)).toEqual({ url: 'small.webm', size: 2000000, preview: 'small.webm' });
    expect(parseCommonsSearch({ query: { pages: { 1: { ...page, imageinfo: [{ thumburl: 't.jpg' }] } } } })[0]).toMatchObject({ title: 'Glitch', thumb: 't.jpg' });
  });
});

describe('glitch', () => {
  it('turns glitch into one of the glitches', () => {
    setGlitchAmount(0);
    const [picked] = withGlitch(['glitch']);
    expect(GLITCHES).toContain(picked);
  });

  it('adds one at random as often as the slider says', () => {
    setGlitchAmount(0.5);
    expect(withGlitch(['inv'], () => 0.4)).toHaveLength(2);
    expect(withGlitch(['inv'], () => 0.6)).toEqual(['inv']);
    setGlitchAmount(0);
  });
});
