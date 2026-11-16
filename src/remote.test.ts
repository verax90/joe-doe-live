import { describe, expect, it } from 'vitest';
import { CC_EVENT, NOTE_EVENT } from './midi';
import { applyRemote, remoteLink, REMOTE_CLIP_EVENT, REMOTE_FADER_EVENT, REMOTE_GLITCH_EVENT, REMOTE_LAYER_EVENT, REMOTE_HIT_EVENT, REMOTE_LOOK_EVENT, REMOTE_PALETTE_EVENT, REMOTE_POINT_EVENT, REMOTE_TRANSPORT_EVENT, REMOTE_VISUAL_EVENT, REMOTE_VJ_EVENT } from './remote';

describe('phone as controller', () => {
  const heard = () => {
    const target = new EventTarget();
    const events: { type: string; detail: unknown }[] = [];
    for (const type of [NOTE_EVENT, CC_EVENT]) target.addEventListener(type, (e) => events.push({ type, detail: (e as CustomEvent).detail }));
    return { target, events };
  };
  it('turns pads into the MPK bank B pads and knobs into its knobs', () => {
    const { target, events } = heard();
    applyRemote({ t: 'pad', i: 0, v: 1 }, target);
    applyRemote({ t: 'pad', i: 7, v: 0.5 }, target);
    applyRemote({ t: 'cc', cc: 7, v: 0.25 }, target);
    expect(events).toEqual([
      { type: NOTE_EVENT, detail: { note: 32, velocity: 1, device: 'phone' } },
      { type: NOTE_EVENT, detail: { note: 39, velocity: 0.5, device: 'phone' } },
      { type: CC_EVENT, detail: { cc: 7, value: 0.25, channel: 1 } },
    ]);
  });
  it('ignores what the MPK does not have, and keeps values 0 to 1', () => {
    const { target, events } = heard();
    applyRemote({ t: 'pad', i: 8, v: 1 }, target);
    applyRemote({ t: 'cc', cc: 9, v: 1 }, target);
    applyRemote({ t: 'cc', cc: 2, v: 3 }, target);
    expect(events).toEqual([{ type: CC_EVENT, detail: { cc: 2, value: 1, channel: 1 } }]);
  });
  it('exposes the XY as phoneX() and phoneY()', () => {
    applyRemote({ t: 'xy', x: 0.2, y: 1.5 });
    const g = globalThis as { phoneX?: () => number; phoneY?: () => number };
    expect(g.phoneX!()).toBe(0.2);
    expect(g.phoneY!()).toBe(1);
  });
  it('gives the phone a link to the controller page', () => {
    expect(remoteLink('https://live.joedoe.dev', 'abc234')).toBe('https://live.joedoe.dev/mando.html?id=abc234');
  });
  it('passes clip pads and the crossfader on to the Clips panel', () => {
    const target = new EventTarget();
    const got: unknown[] = [];
    for (const type of [REMOTE_CLIP_EVENT, REMOTE_FADER_EVENT]) target.addEventListener(type, (e) => got.push((e as CustomEvent).detail));
    applyRemote({ t: 'clip', i: 2, on: true }, target);
    applyRemote({ t: 'clip', i: -1, on: true }, target);
    applyRemote({ t: 'fader', v: 2 }, target);
    expect(got).toEqual([{ i: 2, on: true }, 1]);
  });
  it('passes the layer and the glitch on, within range', () => {
    const target = new EventTarget();
    const got: unknown[] = [];
    for (const type of [REMOTE_LAYER_EVENT, REMOTE_GLITCH_EVENT]) target.addEventListener(type, (e) => got.push((e as CustomEvent).detail));
    applyRemote({ t: 'layer', i: 3 }, target);
    applyRemote({ t: 'layer', i: 4 }, target);
    applyRemote({ t: 'glitch', v: -1 }, target);
    expect(got).toEqual([3, 0]);
  });
  it('passes Play, Stop and Tap on', () => {
    const target = new EventTarget();
    const got: unknown[] = [];
    target.addEventListener(REMOTE_TRANSPORT_EVENT, (e) => got.push((e as CustomEvent).detail));
    for (const t of ['play', 'stop', 'tap'] as const) applyRemote({ t }, target);
    expect(got).toEqual(['play', 'stop', 'tap']);
  });

  it('passes the Visual tab on: a visual or another one, hits, VJ effects, the point', () => {
    const target = new EventTarget();
    const got: unknown[] = [];
    for (const type of [REMOTE_VISUAL_EVENT, REMOTE_HIT_EVENT, REMOTE_VJ_EVENT, REMOTE_POINT_EVENT]) {
      target.addEventListener(type, (e) => got.push([type, (e as CustomEvent).detail]));
    }
    applyRemote({ t: 'visual', id: 'maq-mosh' }, target);
    applyRemote({ t: 'visual' }, target);
    applyRemote({ t: 'hit', r: 'kick' }, target);
    applyRemote({ t: 'vj', c: 'zoom', v: 3 }, target);
    applyRemote({ t: 'vj' }, target);
    applyRemote({ t: 'point', x: 0.25, y: -1 }, target);
    applyRemote({ t: 'pointup' }, target);
    expect(got).toEqual([
      [REMOTE_VISUAL_EVENT, 'maq-mosh'],
      [REMOTE_VISUAL_EVENT, null],
      [REMOTE_HIT_EVENT, 'kick'],
      [REMOTE_VJ_EVENT, { c: 'zoom', v: 1 }],
      [REMOTE_VJ_EVENT, null],
      [REMOTE_POINT_EVENT, { x: 0.25, y: 0 }],
      [REMOTE_POINT_EVENT, null],
    ]);
  });

  it('ignores a hit or an effect that does not exist', () => {
    const target = new EventTarget();
    let count = 0;
    for (const type of [REMOTE_HIT_EVENT, REMOTE_VJ_EVENT]) target.addEventListener(type, () => count++);
    applyRemote({ t: 'hit', r: 'cowbell' } as never, target);
    applyRemote({ t: 'vj', c: 'explode', v: 1 }, target);
    expect(count).toBe(0);
  });

  it('recalls one of the four VJ looks, and no other', () => {
    const target = new EventTarget();
    const got: number[] = [];
    target.addEventListener(REMOTE_LOOK_EVENT, (e) => got.push((e as CustomEvent<number>).detail));
    applyRemote({ t: 'look', i: 2 }, target);
    applyRemote({ t: 'look', i: 4 }, target);
    applyRemote({ t: 'look', i: -1 }, target);
    expect(got).toEqual([2]);
  });

  it('passes a palette on by its id', () => {
    const target = new EventTarget();
    const got: string[] = [];
    target.addEventListener(REMOTE_PALETTE_EVENT, (e) => got.push((e as CustomEvent<string>).detail));
    applyRemote({ t: 'palette', id: 'neon' }, target);
    applyRemote({ t: 'palette', id: 'x'.repeat(40) }, target);
    expect(got).toEqual(['neon']);
  });
});

describe('two phones at once', () => {
  it('one lifting its finger does not cut off the other', () => {
    const target = new EventTarget();
    const points: unknown[] = [];
    target.addEventListener(REMOTE_POINT_EVENT, (event) => points.push((event as CustomEvent).detail));
    applyRemote({ t: 'point', x: 0.1, y: 0.1 }, target, 'a');
    applyRemote({ t: 'point', x: 0.9, y: 0.9 }, target, 'b');
    applyRemote({ t: 'pointup' }, target, 'a');
    expect(points.at(-1)).toEqual({ x: 0.9, y: 0.9 });
    applyRemote({ t: 'pointup' }, target, 'b');
    expect(points.at(-1)).toBeNull();
  });
});


describe('each phone its own pen', () => {
  it('gives each phone a different colour and draws only while the finger is down', async () => {
    const { penFor, anyPenDown, movePen, forgetPen } = await import('./pens');
    expect(penFor('x').colour).not.toBe(penFor('y').colour);
    movePen('x', { x: 0.2, y: 0.3 });
    expect(anyPenDown()).toBe(true);
    movePen('x', null);
    expect(anyPenDown()).toBe(false);
    forgetPen('x');
    forgetPen('y');
  });
});
