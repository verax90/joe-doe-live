import { describe, expect, it } from 'vitest';
import { addTrack, isPatternSnippet } from './tracks';

describe('addTrack', () => {
  it('turns the bare patterns into tracks so all of them sound', () => {
    const code = 's("bd sd hh sd")\nnote("c3 e3 g3").s("piano")\nsetcps(90 / 60 / 4)\ns("bd*4")';
    expect(addTrack(code, 's("hh*8")')).toBe(
      '$: s("bd sd hh sd")\n$: note("c3 e3 g3").s("piano")\nsetcps(90 / 60 / 4)\n$: s("bd*4")\n$: s("hh*8")\n',
    );
  });

  it('leaves setup, Hydra, variables and existing tracks alone', () => {
    const code = 'await initHydra()\nosc(10).color(...tint(0.4)).out()\nconst k = await midin("MPK")\n$: s("bd*4")\n_$: s("sd*2")\nsamples("github:x/y")\n';
    expect(addTrack(code, 'note("c2")')).toBe(`${code}$: note("c2")\n`);
  });

  it('works on multi-line patterns and empty code', () => {
    expect(addTrack('stack(\n  s("bd"),\n  s("hh*8")\n).analyze(1)', 's("cp")')).toBe('$: stack(\n  s("bd"),\n  s("hh*8")\n).analyze(1)\n$: s("cp")\n');
    expect(addTrack('', 's("cp")')).toBe('$: s("cp")\n');
  });

  it('still adds the track when the code does not parse', () => {
    expect(addTrack('s("bd"', 's("cp")')).toBe('s("bd"\n$: s("cp")\n');
  });
});

describe('isPatternSnippet', () => {
  it('tells whole patterns from methods and settings', () => {
    expect(isPatternSnippet('s("bd sd")')).toBe(true);
    expect(isPatternSnippet('stack(s("bd*4"), s("hh*8"))')).toBe(true);
    expect(isPatternSnippet('.lpf(800)')).toBe(false);
    expect(isPatternSnippet('setcps(90 / 60 / 4)')).toBe(false);
    expect(isPatternSnippet('osc(10).out()')).toBe(false);
  });
});
