import { describe, expect, it } from 'vitest';
import { roomFromUrl, roomId } from './room';

describe('room links', () => {
  it('makes short ids without look-alike characters', () => {
    const id = roomId();
    expect(id).toMatch(/^[a-km-np-z2-9]{6}$/);
  });
  it('reads a room from the URL and ignores anything odd', () => {
    expect(roomFromUrl('?sala=k3f9x2')).toBe('k3f9x2');
    expect(roomFromUrl('?sala=../../x')).toBeNull();
    expect(roomFromUrl('?lang=es')).toBeNull();
  });
});
