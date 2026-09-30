import { describe, expect, it } from 'vitest';
import { addToQueue, EMPTY, nextIndex, removeFromQueue } from './youtube';

const A = 'jNQXAC9IVRw';
const B = 'dQw4w9WgXcQ';
const C = 'aqz-KE-bpKQ';

describe('YouTube queue', () => {
  it('adds at the end, keeping the one playing', () => {
    let queue = addToQueue(EMPTY, `https://youtu.be/${A}`);
    expect(queue).toEqual({ ids: [A], index: 0 });
    queue = { ...queue, index: 0 };
    queue = addToQueue(queue, `https://www.youtube.com/watch?v=${B}`);
    expect(queue).toEqual({ ids: [A, B], index: 0 });
    // several at once, any separator
    expect(addToQueue(EMPTY, `${A}\n${B}, ${C}`).ids).toEqual([A, B, C]);
  });

  it('leaves the queue as it was when nothing in the text is a video', () => {
    const queue = { ids: [A], index: 0 };
    expect(addToQueue(queue, 'hola')).toBe(queue);
  });

  it('turns a playlist link into a list, and videos after a list into a new queue', () => {
    const list = addToQueue(EMPTY, 'https://www.youtube.com/playlist?list=PL123abc');
    expect(list).toEqual({ ids: [], index: 0, list: 'PL123abc' });
    expect(addToQueue(list, A)).toEqual({ ids: [A], index: 0 });
  });

  it('removes a video and keeps the one on', () => {
    const queue = { ids: [A, B, C], index: 2 };
    expect(removeFromQueue(queue, 0)).toEqual({ ids: [B, C], index: 1 });
    // the last one, playing, goes: back to the first
    expect(removeFromQueue(queue, 2)).toEqual({ ids: [A, B], index: 0 });
  });

  it('goes round to the first after the last', () => {
    expect(nextIndex({ ids: [A, B], index: 1 })).toBe(0);
    expect(nextIndex({ ids: [A], index: 0 })).toBe(0);
  });
});
