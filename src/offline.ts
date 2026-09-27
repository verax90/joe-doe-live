// Offline: the service worker (see service-worker.js) keeps the app and every
// sound once used. This module registers it, says when the connection comes
// and goes, and gets a live set ready before a gig: each song's code is run
// silently, the sounds it uses over 16 bars are listed, and each one is played
// once at volume 0 so its file is downloaded (and saved by the worker).
import { ensureAudio } from './audio';
import { t } from './i18n';
import type { StrudelMirror } from './strudel';
import { toast } from './toast';

type Hap = { value: Record<string, unknown> };
type Repl = {
  evaluate?: (code: string, autostart?: boolean) => Promise<unknown>;
  state?: { pattern?: { queryArc(begin: number, end: number): Hap[] } };
};
type Globals = {
  superdough?: (value: Record<string, unknown>, time: number, duration: number) => Promise<unknown>;
  getAudioContext?: () => AudioContext;
};

export function setupOffline() {
  // Only the built site: in development the files change on every save
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch((error) => console.warn('[offline]', error));
  }
  window.addEventListener('offline', () => toast(t('offlineNow')));
  window.addEventListener('online', () => toast(t('onlineAgain')));
}

// One entry per file to download: soundfonts are one file per instrument,
// samples one per sound, index and (for pitched sample sets) note
export function soundsToLoad(values: Record<string, unknown>[]) {
  const sounds = new Map<string, Record<string, unknown>>();
  for (const value of values) {
    if (typeof value.s !== 'string') continue;
    const { s, bank, n, note } = value;
    const key = s.startsWith('gm_') ? JSON.stringify({ s }) : JSON.stringify({ s, bank, n, note });
    if (!sounds.has(key)) sounds.set(key, { s, bank, n, note });
  }
  return [...sounds.values()];
}

// Runs each piece of code without playing it and loads its sounds. Only while
// stopped: evaluating swaps the pattern that is playing
export async function prepareSounds(editor: StrudelMirror, codes: string[], onProgress: (done: number, total: number) => void) {
  const repl = editor.repl as Repl | undefined;
  const g = globalThis as Globals;
  if (!repl?.evaluate || !g.superdough || !g.getAudioContext) throw new Error('Strudel is not ready');
  await ensureAudio();
  let failed = 0;
  const values: Record<string, unknown>[] = [];
  for (const [i, code] of codes.entries()) {
    onProgress(i, codes.length);
    try {
      await repl.evaluate(code, false);
      values.push(...(repl.state?.pattern?.queryArc(0, 16) ?? []).map((hap) => hap.value));
    } catch {
      failed++; // a MIDI template with no controller plugged in, say
    }
  }
  const sounds = soundsToLoad(values);
  const context = g.getAudioContext();
  for (const sound of sounds) {
    await g.superdough({ ...sound, gain: 0 }, context.currentTime + 0.05, 0.05).catch(() => undefined);
  }
  // Back to the code in the editor, still stopped
  await repl.evaluate(editor.code, false).catch(() => undefined);
  return { sounds: sounds.length, failed };
}
