import { describe, expect, it } from 'vitest';
import { exportFileName, isCodeFile, sessionMarkdown, slugify, withHeader } from './export';

describe('exportFileName', () => {
  it('stamps the date and time so downloads do not overwrite each other', () => {
    expect(exportFileName(new Date(2026, 8, 5, 7, 3))).toBe('joe-doe-live-2026-09-05-0703.js');
  });
});

describe('withHeader', () => {
  it('adds one header line, replacing an earlier one', () => {
    const once = withHeader('s("bd")', 'a');
    expect(once).toBe('// live.joedoe.dev · a\ns("bd")');
    expect(withHeader(once, 'b')).toBe('// live.joedoe.dev · b\ns("bd")');
  });
});

describe('isCodeFile', () => {
  it('opens code, leaves audio to the samples', () => {
    expect(isCodeFile(new File([''], 'beat.js'))).toBe(true);
    expect(isCodeFile(new File([''], 'kick.wav'))).toBe(false);
  });
});

describe('sessionMarkdown', () => {
  it('writes the joedoe.dev session format', () => {
    const md = sessionMarkdown('$: s("bd*4")\n\n', { title: 'Dembow "live"', visual: 'vortice', date: new Date(2026, 8, 27, 0, 30) });
    expect(md).toBe(
      '---\ntitle: "Dembow \\"live\\""\ndate: 2026-09-27\nvisual: "vortice"\n# video: "https://youtu.be/…"   (optional: the recording or the stream)\n# note: "…"                     (optional)\n---\n\n```js\n$: s("bd*4")\n```\n',
    );
  });
  it('uses a longer fence when the code holds one', () => {
    expect(sessionMarkdown('// ```', { title: 'x', visual: 'lima', date: new Date() })).toContain('````js\n// ```\n````');
  });
});

describe('slugify', () => {
  it('makes a file-name-safe slug', () => {
    expect(slugify('¡Dembow en La menor, ñandú!')).toBe('dembow-en-la-menor-nandu');
    expect(slugify('???')).toBe('session');
  });
});
