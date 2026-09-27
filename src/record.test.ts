import { describe, expect, it } from 'vitest';
import { codeLines, encodeWav, videoFormat } from './record';

describe('WAV encoding', () => {
  it('writes a 16-bit stereo PCM file with every sample', async () => {
    const block = [new Float32Array([0, 0.5, -1]), new Float32Array([1, -0.5, 0])];
    const blob = encodeWav([block, block], 48000);
    const view = new DataView(await blob.arrayBuffer());
    const text = (offset: number) => String.fromCharCode(...new Uint8Array(view.buffer, offset, 4));
    expect(text(0)).toBe('RIFF');
    expect(text(8)).toBe('WAVE');
    expect(view.getUint16(22, true)).toBe(2);
    expect(view.getUint32(24, true)).toBe(48000);
    expect(view.getUint32(40, true)).toBe(6 * 2 * 2); // 6 frames, 2 channels, 2 bytes
    expect(view.getInt16(44 + 2 * 2, true)).toBe(Math.round(0.5 * 0x7fff)); // left, frame 1
    expect(view.getInt16(44 + 4 * 2, true)).toBe(-0x8000); // left, frame 2: -1
  });

  it('clips values beyond ±1 instead of wrapping around', async () => {
    const blob = encodeWav([[new Float32Array([2]), new Float32Array([-3])]], 44100);
    const view = new DataView(await blob.arrayBuffer());
    expect(view.getInt16(44, true)).toBe(0x7fff);
    expect(view.getInt16(46, true)).toBe(-0x8000);
  });
});

describe('videoFormat', () => {
  it('prefers MP4 and falls back to WebM', () => {
    expect(videoFormat((type) => type.startsWith('video/mp4'))).toEqual({ mimeType: 'video/mp4;codecs=avc1.640028,mp4a.40.2', extension: 'mp4' });
    expect(videoFormat((type) => type === 'video/webm;codecs=vp8,opus')).toEqual({ mimeType: 'video/webm;codecs=vp8,opus', extension: 'webm' });
    expect(videoFormat(() => false).extension).toBe('webm');
  });
});

describe('codeLines', () => {
  it('cuts long lines and too many lines with …', () => {
    expect(codeLines('s("bd sd")\nnote("c e g b d f a")\n\n', 12, 5)).toEqual(['s("bd sd")', 'note("c e g…']);
    expect(codeLines('1\n2\n3\n4', 10, 3)).toEqual(['1', '2', '…']);
  });
});
