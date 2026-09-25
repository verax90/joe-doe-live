import { describe, expect, it } from 'vitest';
import { bendLabel, knobLabel } from './knob-hud';

const mpk = "const mpk = 'MPK Mini'\nconst knob = await midin(mpk)\nkeys().speed(ref(() => 2 ** (bend() * 2 / 12)))";
const base = { code: mpk, playing: true, visual: 'lima', ascii: false };

describe('knobLabel', () => {
  it('says what each knob does in the MPK Mini pattern, and what it needs', () => {
    expect(knobLabel(4, base).name.en).toBe('Backing beat volume');
    expect(knobLabel(5, base).hint?.en).toMatch(/From the code/);
    expect(knobLabel(5, { ...base, visual: 'code' }).hint).toBeUndefined();
    expect(knobLabel(8, base).hint?.en).toMatch(/ASCII filter/);
    expect(knobLabel(8, { ...base, ascii: true }).hint).toBeUndefined();
  });

  it('points to free play or your own pattern elsewhere', () => {
    const stopped = { ...base, playing: false };
    expect(knobLabel(2, stopped).hint?.en).toBe('keys without Play');
    expect(knobLabel(5, stopped).name.en).toBe('Not used here');
    expect(knobLabel(3, { ...base, code: "const k = await midin('Launchkey')" }).name.en).toBe('Knob 3 · in your pattern');
    expect(knobLabel(7, stopped).name.en).toBe('Master volume');
  });

  it('tells when the joystick bends', () => {
    expect(bendLabel(base).hint?.en).toBe('each new note');
    expect(bendLabel({ ...base, playing: false }).hint?.en).toBe('each new key without Play');
    expect(bendLabel({ ...base, code: 's("bd")' }).hint?.en).toBe('this pattern does not use it');
  });
});
