import { describe, expect, it } from 'vitest';
import { exportFileName } from './export';

describe('exportFileName', () => {
  it('stamps the date and time so downloads do not overwrite each other', () => {
    expect(exportFileName(new Date(2026, 8, 5, 7, 3))).toBe('joe-doe-live-2026-09-05-0703.js');
  });
});
