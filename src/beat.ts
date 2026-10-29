// The beat you hear, in the bar: four marks under the BPM field light up one
// per beat (the first of the bar brighter), and the «live» of the brand
// blinks with each bar while it plays. Read from the audio clock, so it lands
// with the sound, not with Strudel's look-ahead.
import { heardCycle } from './cycle-clock';
import { sendToPhones } from './remote';

type Globals = { getAudioContext?: () => AudioContext };

export function setupBeat() {
  const play = document.querySelector<HTMLButtonElement>('#play');
  const tempo = document.querySelector<HTMLElement>('.tempo-field');
  const brand = document.querySelector<HTMLElement>('.brand');
  if (!play || !tempo) return;
  const lights = document.createElement('span');
  lights.className = 'beat';
  lights.setAttribute('aria-hidden', 'true');
  const marks = Array.from({ length: 4 }, () => document.createElement('i'));
  lights.append(...marks);
  tempo.append(lights);

  let frame = 0;
  let lit = -1;
  let bar = -1;
  const light = (beat: number) => {
    if (beat === lit) return;
    lit = beat;
    // the phone blinks along
    if (beat >= 0) sendToPhones({ t: 'beat', b: beat });
    marks.forEach((mark, index) => mark.classList.toggle('is-on', index === beat));
  };
  const tick = () => {
    frame = requestAnimationFrame(tick);
    const context = (globalThis as Globals).getAudioContext?.();
    const cycle = context ? heardCycle(context.currentTime) : undefined;
    if (cycle === undefined || cycle < 0) return light(-1);
    light(Math.floor((cycle % 1) * 4));
    const now = Math.floor(cycle);
    if (now !== bar && brand) {
      bar = now;
      // restart the blink: drop the class, let the browser see it, add it again
      brand.classList.remove('is-bar');
      void brand.offsetWidth;
      brand.classList.add('is-bar');
    }
  };
  const follow = () => {
    const playing = play.dataset.state === 'playing' || play.dataset.state === 'changed';
    document.body.classList.toggle('is-playing', playing);
    if (playing && !frame) frame = requestAnimationFrame(tick);
    if (!playing && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
      bar = -1;
      light(-1);
    }
  };
  new MutationObserver(follow).observe(play, { attributes: true, attributeFilter: ['data-state'] });
  follow();
}
