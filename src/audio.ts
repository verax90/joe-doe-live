// Strudel loads its audio worklets (crush, supersaw and other effects) on the
// first click on the page. Sound can start without one: a MIDI key in free
// play, Ctrl+Enter, recording. Every path goes through here first, so those
// effects are there whichever way the sound starts.
type Global = typeof globalThis & {
  getAudioContext?: () => AudioContext;
  initAudio?: () => Promise<void>;
};

let ready: Promise<void> | undefined;

export function ensureAudio(): Promise<void> {
  const g = globalThis as Global;
  const context = g.getAudioContext?.();
  if (context && context.state !== 'running') context.resume().catch(() => {});
  ready ??= (g.initAudio?.() ?? Promise.resolve()).catch(() => {
    ready = undefined; // try again next time
  });
  return ready;
}
