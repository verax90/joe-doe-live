import { describe, expect, it } from 'vitest';
import { layerLine, layerName, withoutLine } from './looper';

describe('looper', () => {
  it('names layers capa1, capa2…', () => {
    expect(layerName([])).toBe('capa1');
    expect(layerName(['capa1', 'muestra1'])).toBe('capa2');
  });
  it('writes a line that repeats in time, moved by the take\'s phase', () => {
    expect(layerLine('capa1', 2, 8)).toBe('s("capa1").loopAt(2).gain(1)');
    expect(layerLine('capa1', 2, 9)).toBe('s("capa1").loopAt(2).late(1).gain(1)');
    expect(layerLine('capa2', 4, 7)).toBe('s("capa2").loopAt(4).late(3).gain(1)');
    expect(layerLine('capa3', 1, 5)).toBe('s("capa3").loopAt(1).gain(1)');
  });
  it('finds the whole line to take out', () => {
    const code = 'setcps(0.5)\n$: s("bd*4")\n$: s("capa1").loopAt(2).gain(1)\n$: s("hh*8")\n';
    const range = withoutLine(code, 's("capa1").loopAt(2).gain(1)')!;
    expect(code.slice(0, range.from) + code.slice(range.to)).toBe('setcps(0.5)\n$: s("bd*4")\n$: s("hh*8")\n');
    expect(withoutLine(code, 's("capa9")')).toBeNull();
  });
});
