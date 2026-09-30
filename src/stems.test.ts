import { beforeAll, describe, expect, it } from 'vitest';
import { stemCode, tracksReady, voiceName } from './tracks';
import { crc32, zipFiles } from './zip';

beforeAll(() => tracksReady);

describe('stems: one orbit per voice', () => {
  it('puts each $: track on its own orbit, named after its sound', () => {
    const { code, names } = stemCode('setcps(0.5)\n$: s("bd ~ sd").gain(1)\n$: note("c3 e3").s("piano")\n_$: s("hh*8")\n');
    expect(code).toBe('setcps(0.5)\n$: s("bd ~ sd").gain(1).orbit(11)\n$: note("c3 e3").s("piano").orbit(12)\n_$: s("hh*8")\n');
    expect([...names]).toEqual([
      [11, '1_bd'],
      [12, '2_piano'],
    ]);
  });
  it('splits a stack(...) into its voices and keeps named tracks\' names', () => {
    const { code, names } = stemCode('stack(\n  s("bd*4"),\n  chord("<Am C>").voicing().s("gm_epiano1")\n).analyze(1)\nbass: note("a1").s("sawtooth")\n');
    expect(code).toContain('s("bd*4").orbit(11),');
    expect(code).toContain('.s("gm_epiano1").orbit(12)\n).analyze(1)');
    expect(code).toContain('bass: note("a1").s("sawtooth").orbit(13)');
    expect([...names.values()]).toEqual(['1_bd', '2_gm_epiano1', 'bass']);
  });
  it('leaves a voice that picks its own orbit alone', () => {
    const { code } = stemCode('$: s("bd*4").orbit(2)\n$: s("hh*8")\n');
    expect(code).toBe('$: s("bd*4").orbit(2)\n$: s("hh*8").orbit(11)\n');
  });
  it('names voices without a sound by what they play', () => {
    expect(voiceName(undefined, 'note("c3 e3")', 4)).toBe('4_notes');
    expect(voiceName('_drums', 's("bd")', 1)).toBe('drums');
    expect(voiceName('$', 's("<bd:3 sd>")', 2)).toBe('2_bd');
  });
});

describe('zip', () => {
  it('uses the standard CRC-32', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });
  it('writes a zip whose sizes add up', async () => {
    const zip = zipFiles([
      { name: 'a.wav', data: new Uint8Array([1, 2, 3]) },
      { name: 'bajo.wav', data: new Uint8Array(10) },
    ]);
    const bytes = new Uint8Array(await zip.arrayBuffer());
    const view = new DataView(bytes.buffer);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    // end record: 2 entries, central directory right after the files
    const end = bytes.length - 22;
    expect(view.getUint32(end, true)).toBe(0x06054b50);
    expect(view.getUint16(end + 10, true)).toBe(2);
    expect(view.getUint32(end + 16, true)).toBe(30 + 5 + 3 + 30 + 8 + 10);
  });
});
