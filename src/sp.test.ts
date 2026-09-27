import { describe, expect, it } from 'vitest';
import { padMessage, parsePad, spMessages } from './sp';

const noteToMidi = (note: string) => ({ c3: 48, e3: 52 })[note] ?? NaN;

describe('SP-404MKII pads', () => {
  it('maps pads as in the MIDI note map, mode A: a channel per bank', () => {
    // bottom row (13-16) is 36-39, top row (1-4) is 48-51
    expect(padMessage('a', 13, 'A')).toEqual({ channel: 1, note: 36 });
    expect(padMessage('a', 1, 'A')).toEqual({ channel: 1, note: 48 });
    expect(padMessage('a', 4, 'A')).toEqual({ channel: 1, note: 51 });
    expect(padMessage('a', 8, 'A')).toEqual({ channel: 1, note: 47 });
    expect(padMessage('j', 16, 'A')).toEqual({ channel: 10, note: 39 });
  });
  it('maps mode B: A-E on channel 1, F-J on 2, 16 notes a bank from 12', () => {
    expect(padMessage('a', 13, 'B')).toEqual({ channel: 1, note: 12 });
    expect(padMessage('a', 1, 'B')).toEqual({ channel: 1, note: 24 });
    expect(padMessage('b', 1, 'B')).toEqual({ channel: 1, note: 40 });
    expect(padMessage('e', 4, 'B')).toEqual({ channel: 1, note: 91 });
    expect(padMessage('f', 1, 'B')).toEqual({ channel: 2, note: 24 });
    expect(padMessage('g', 12, 'B')).toEqual({ channel: 2, note: 35 });
  });
  it('refuses pads that do not exist', () => {
    expect(padMessage('k', 1, 'A')).toBeNull();
    expect(padMessage('a', 0, 'A')).toBeNull();
    expect(padMessage('a', 17, 'A')).toBeNull();
  });
  it('reads pad names', () => {
    expect(parsePad('a1')).toEqual({ bank: 'a', pad: 1 });
    expect(parsePad('J16')).toEqual({ bank: 'j', pad: 16 });
    expect(parsePad('bd')).toBeNull();
  });
});

describe('events to MIDI', () => {
  const options = { bank: 'b', mode: 'A' as const, noteToMidi };
  it('plays a named pad, a numbered pad of the given bank, or a chromatic note', () => {
    expect(spMessages({ s: 'c5' }, options).note).toEqual({ channel: 3, note: 44, velocity: 114 });
    expect(spMessages({ n: 1 }, options).note).toMatchObject({ channel: 2, note: 48 });
    expect(spMessages(1, options).note).toMatchObject({ channel: 2, note: 48 });
    expect(spMessages({ note: 'e3' }, options).note).toMatchObject({ channel: 16, note: 52 });
    expect(spMessages({ note: 60 }, options).note).toMatchObject({ channel: 16, note: 60 });
  });
  it('scales velocity by gain', () => {
    expect(spMessages({ s: 'a1', velocity: 1, gain: 0.5 }, options).note?.velocity).toBe(64);
  });
  it('sends control changes on midichan', () => {
    expect(spMessages({ ccn: 16, ccv: 1, midichan: 2 }, options)).toEqual({ cc: [0xb1, 16, 127] });
    expect(spMessages({ ccn: 83, ccv: 0 }, options).cc).toEqual([0xb0, 83, 0]);
  });
  it('ignores what it cannot play', () => {
    expect(spMessages({ s: 'bd' }, options)).toEqual({});
    expect(spMessages({ n: 20 }, options)).toEqual({});
  });
});
