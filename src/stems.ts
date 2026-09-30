// Recording stems: a WAV per voice of the code, plus the mix, the mic and the
// backing track, all the same length from the same instant, in one .zip for
// a DAW. While it records, the code plays with each voice on an orbit of its
// own (tracks.ts stemCode, without touching the editor), and every orbit's
// output is tapped as it appears. Voices are taken before the limiter; the
// mix after it, as you hear it.
import { backingOutput } from './backing';
import { micOutput } from './mic';
import { download, encodeWav, startTap, type TapBlock } from './record';
import { takeWindow } from './sampler';
import { stemCode } from './tracks';
import { zipFiles } from './zip';

type Player = (code: string) => Promise<unknown>;
type Controller = { nodes?: Record<string, { output?: AudioNode }> };

let names = new Map<number, string>();
let recording = false;

// While recording, anything that plays the code plays it with the orbits
export const stemsActive = () => recording;
export function stemsVersion(code: string) {
  const next = stemCode(code);
  for (const [orbit, name] of next.names) names.set(orbit, name);
  return next.code;
}

export async function startStems(context: AudioContext, mix: AudioNode, code: string, play: Player) {
  names = new Map();
  const taps = new Map<string, () => TapBlock[]>();
  const from = context.currentTime;
  taps.set('0_mezcla', await startTap(context, [mix]));
  const mic = micOutput();
  if (mic) taps.set('voz_micro', await startTap(context, [mic]));
  const backing = backingOutput();
  if (backing) taps.set('pista_de_fondo', await startTap(context, [backing]));
  recording = true;
  await play(stemsVersion(code));

  // Orbits appear as their first sound plays: tap each new one
  const tapped = new Set<string>();
  const watch = window.setInterval(async () => {
    const nodes = (globalThis as { getSuperdoughAudioController?: () => Controller }).getSuperdoughAudioController?.()?.nodes ?? {};
    for (const [orbit, node] of Object.entries(nodes)) {
      if (tapped.has(orbit) || !node.output) continue;
      tapped.add(orbit);
      taps.set(`orbit:${orbit}`, await startTap(context, [node.output]));
    }
  }, 50);

  return async () => {
    window.clearInterval(watch);
    recording = false;
    const to = context.currentTime;
    const files: { name: string; data: Uint8Array }[] = [];
    for (const [key, stop] of taps) {
      const audio = takeWindow(stop(), from, to, context.sampleRate);
      const silent = audio[0].every((v) => v === 0) && audio[1].every((v) => v === 0);
      if (silent && key !== '0_mezcla') continue;
      const orbit = key.startsWith('orbit:') ? Number(key.slice(6)) : undefined;
      const name = orbit === undefined ? key : (names.get(orbit) ?? `orbit_${orbit}`);
      files.push({ name: `${name}.wav`, data: new Uint8Array(await encodeWav([audio], context.sampleRate).arrayBuffer()) });
    }
    download(zipFiles(files), 'zip');
  };
}
