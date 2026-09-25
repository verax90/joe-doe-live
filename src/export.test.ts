import { describe, expect, it } from 'vitest';
import { exportFileName, isCodeFile, withHeader } from './export';

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
