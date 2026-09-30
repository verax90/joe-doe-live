import { beforeAll, describe, expect, it } from 'vitest';
import { hasSequencer, tracksReady, withoutSequencer, withSequencer } from './tracks';

beforeAll(() => tracksReady);

describe('sequencer view', () => {
  it('puts a punchcard under drums and a piano roll under notes, each in its colour', () => {
    const code = 'setcps(0.5)\n$: s("bd ~ sd ~")\nbass: note("c2 eb2").s("sawtooth")\n_$: s("hh*8")\n';
    const on = withSequencer(code)!;
    expect(on).toBe(
      'setcps(0.5)\n$: s("bd ~ sd ~").color("#d6ff4b")._punchcard()\nbass: note("c2 eb2").s("sawtooth").color("#4bd6ff")._pianoroll()\n_$: s("hh*8")\n',
    );
    expect(hasSequencer(on)).toBe(true);
    // off: back to the code as it was
    expect(withoutSequencer(on)).toBe(code);
    expect(hasSequencer(code)).toBe(false);
  });

  it('goes part by part in a stack, keeps your colours and does not add twice', () => {
    const code = 'stack(\n  s("bd*4"),\n  note("c3").color("cyan")\n).analyze(1)';
    const on = withSequencer(code)!;
    expect(on).toBe('stack(\n  s("bd*4").color("#d6ff4b")._punchcard(),\n  note("c3").color("cyan")._pianoroll()\n).analyze(1)');
    expect(withSequencer(on)).toBe(on);
    // your own colour stays when it goes
    expect(withoutSequencer(on)).toBe('stack(\n  s("bd*4"),\n  note("c3").color("cyan")\n).analyze(1)');
  });

  it('leaves code with a mistake alone', () => {
    expect(withSequencer('$: s("bd"')).toBeNull();
  });
});
