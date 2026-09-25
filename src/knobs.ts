// MPK Mini knobs (CC 1-8 on channel 1) outside any pattern:
// 1-3 shape the sound of free play, 7 is the studio's master volume and 8 the
// size of the ASCII characters. Inside the "MPK Mini" pattern, 1-6 are read by
// the pattern itself (midin), and 7-8 keep working because they live here.
import { setAsciiScale } from './ascii';
import { setMasterVolume } from './limiter';
import { CC_EVENT, type CcDetail } from './midi';

// Free play starts with an open filter and no effects, as if the knobs were down
export const freePlayKnobs = { echo: 0, filter: 1, reverb: 0 };

export function setupKnobs() {
  window.addEventListener(CC_EVENT, (event) => {
    const { cc, value, channel } = (event as CustomEvent<CcDetail>).detail;
    if (channel !== 1) return;
    if (cc === 1) freePlayKnobs.echo = value; // also the joystick up
    else if (cc === 2) freePlayKnobs.filter = value;
    else if (cc === 3) freePlayKnobs.reverb = value;
    else if (cc === 7) setMasterVolume(value);
    else if (cc === 8) setAsciiScale(value);
  });
}
