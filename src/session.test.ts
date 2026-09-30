import { describe, expect, it } from 'vitest';
import { audacityLabels, audioFormat, changeLabel, clock, sessionPage } from './session';

describe('session', () => {
  it('writes times as a clock', () => {
    expect(clock(0)).toBe('0:00');
    expect(clock(75.25)).toBe('1:15');
    expect(clock(3725)).toBe('1:02:05');
  });

  it('names a change by its first new line and its size', () => {
    const before = 'setcps(0.5)\n$: s("bd*4")';
    expect(changeLabel(before, undefined)).toBe('$: s("bd*4")');
    expect(changeLabel(`${before}\n$: s("hh*8")`, before)).toBe('$: s("hh*8") (±1)');
    // only a line gone: what plays, and the size
    expect(changeLabel('setcps(0.5)', `${before}`)).toBe('… (±1)');
  });

  it('gives Audacity point labels, one per line', () => {
    expect(audacityLabels([{ at: 1.5, label: 'a\tb' }, { at: 62, label: '★ Marca 1' }])).toBe('1.500\t1.500\ta b\n62.000\t62.000\t★ Marca 1\n');
  });

  it('lists chapters from 0:00 and the code of each version', () => {
    const page = sessionPage(
      [
        { at: 3, label: '$: s("bd*4")', code: '$: s("bd*4")' },
        { at: 95, label: '★ Marca 1' },
        { at: 130, label: '$: s("hh*8") (±1)', code: '$: s("bd*4")\n$: s("hh*8")' },
      ],
      new Date(2026, 8, 30, 17, 0),
      200,
    );
    expect(page).toContain('0:00 $: s("bd*4")\n2:10 $: s("hh*8") (±1)');
    expect(page).toContain('### 1:35 · ★ Marca 1');
    expect(page).toContain('```js\n$: s("bd*4")\n$: s("hh*8")\n```');
    expect(page).toContain('3:20');
  });

  it('prefers Opus, then AAC', () => {
    expect(audioFormat(() => true).extension).toBe('webm');
    expect(audioFormat((type) => type.startsWith('audio/mp4')).extension).toBe('m4a');
  });
});
