import { describe, expect, it } from 'vitest';
import { CC_EVENT, NOTE_EVENT } from './midi';
import { applyRemote, remoteLink } from './remote';

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
      { type: NOTE_EVENT, detail: { note: 32, velocity: 1 } },
      { type: NOTE_EVENT, detail: { note: 39, velocity: 0.5 } },
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
});
