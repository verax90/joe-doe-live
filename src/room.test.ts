import { describe, expect, it } from 'vitest';
import { roomFromUrl, roomId } from './room';

describe('room links', () => {
  it('makes names of two plain words', () => {
    for (let i = 0; i < 50; i++) expect(roomId()).toMatch(/^[a-z]+-[a-z]+$/);
  });
  it('reads a room from the URL and ignores anything odd', () => {
    expect(roomFromUrl('?sala=k3f9x2')).toBe('k3f9x2');
    expect(roomFromUrl('?sala=Luna-Azul')).toBe('luna-azul');
    expect(roomFromUrl('?sala=../../x')).toBeNull();
    expect(roomFromUrl('?lang=es')).toBeNull();
  });
});
