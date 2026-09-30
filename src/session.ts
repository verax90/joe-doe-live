// Recording the whole session: a jam of an hour or two, as compressed audio
// (Opus or AAC, about 90 MB an hour, where a WAV would be over 600 MB), with a
// marker at every change of code, every Stop, and whenever you press ★ (that
// was good!). Stop gives a .zip: the audio, the markers as an Audacity label
// track (File → Import → Labels, they land on the audio) and sesion.md, the
// timeline with the code of every version, so the best moment can be cut out
// and its code taken back. The chapter list at its top pastes into YouTube.
import { changedLines, summary } from './history';
import { t } from './i18n';
import { zipFiles } from './zip';

export type Marker = { at: number; label: string; code?: string }; // at: seconds from the start

// 75.25 → 1:15, 3725 → 1:02:05
export function clock(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  const [h, m, s] = [Math.floor(whole / 3600), Math.floor((whole % 3600) / 60), whole % 60];
  const two = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`;
}

// What a new version of the code is, in a few words: its first new line (or
// what it plays) and how many lines changed
export function changeLabel(code: string, before: string | undefined) {
  if (before === undefined) return summary(code) || '…';
  const old = new Set(before.split('\n').map((line) => line.trim()));
  const added = code
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith('//') && !old.has(line));
  const text = added ? (added.length > 48 ? `${added.slice(0, 47)}…` : added) : summary(code) || '…';
  return `${text} (±${changedLines(code, before)})`;
}

// Audacity's label track: start, end and text per line, tab separated
export const audacityLabels = (markers: Marker[]) => markers.map((m) => `${m.at.toFixed(3)}\t${m.at.toFixed(3)}\t${m.label.replace(/[\t\n]/g, ' ')}`).join('\n') + '\n';

// The session as a page: chapters (YouTube wants the first at 0:00), then
// every marker with its code
export function sessionPage(markers: Marker[], date: Date, length: number) {
  const chapters = markers.filter((m) => m.code !== undefined);
  const lines = [`# ${t('sessionTitle')} ${date.toLocaleString()}`, '', `${t('sessionLength')}: ${clock(length)}`, '', `## ${t('sessionChapters')}`, ''];
  chapters.forEach((m, i) => lines.push(`${clock(i === 0 ? 0 : m.at)} ${m.label}`));
  lines.push('', `## ${t('sessionTimeline')}`, '');
  for (const m of markers) {
    lines.push(`### ${clock(m.at)} · ${m.label}`, '');
    if (m.code !== undefined) lines.push('```js', m.code.trimEnd(), '```', '');
  }
  return lines.join('\n');
}

type Recording = { markers: Marker[]; startedAt: number; lastCode?: string };
let current: Recording | undefined;
let onMark: ((count: number) => void) | undefined;

const now = () => (current ? (performance.now() - current.startedAt) / 1000 : 0);
const add = (marker: Marker) => {
  if (!current) return;
  current.markers.push(marker);
  onMark?.(current.markers.length);
};

// From main.ts, after every play: a marker when the code changed
export function sessionPlayed(code: string) {
  if (!current || code === current.lastCode) return;
  const again = current.lastCode === undefined && current.markers.length > 0; // Play after a Stop
  add({ at: now(), label: `${again ? '▶ ' : ''}${changeLabel(code, current.lastCode)}`, code });
  current.lastCode = code;
}

// From main.ts, on Stop; the next Play is a new chapter even with the same code
export function sessionStopped() {
  if (!current) return;
  add({ at: now(), label: '■ Stop' });
  current.lastCode = undefined;
}

// The ★ button
export function sessionMark() {
  if (current) add({ at: now(), label: `★ ${t('sessionStar')} ${current.markers.filter((m) => m.label.startsWith('★')).length + 1}` });
}

export const whenMarked = (fn: (count: number) => void) => {
  onMark = fn;
};

// Opus in WebM where the browser has it (Chrome, Firefox), else AAC
export function audioFormat(isSupported: (type: string) => boolean) {
  const candidates: [string, string][] = [
    ['audio/webm;codecs=opus', 'webm'],
    ['audio/mp4;codecs=mp4a.40.2', 'm4a'],
    ['audio/mp4', 'm4a'],
  ];
  const [mimeType, extension] = candidates.find(([type]) => isSupported(type)) ?? ['audio/webm', 'webm'];
  return { mimeType, extension };
}

// Starts recording nodes; the returned function stops and gives the .zip
export function startSession(context: AudioContext, nodes: AudioNode[], code: string, playing: boolean) {
  const destination = context.createMediaStreamDestination();
  for (const node of nodes) node.connect(destination);
  const { mimeType, extension } = audioFormat((type) => MediaRecorder.isTypeSupported(type));
  const recorder = new MediaRecorder(destination.stream, { mimeType, audioBitsPerSecond: 192_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => event.data.size && chunks.push(event.data);
  recorder.start(10_000); // encoded as it goes: Stop does not wait on an hour of audio
  const date = new Date();
  current = { markers: [], startedAt: performance.now() };
  // what is playing already is the first chapter
  if (playing) sessionPlayed(code);
  return () =>
    new Promise<Blob>((resolve) => {
      recorder.onstop = async () => {
        const recording = current!;
        current = undefined;
        for (const node of nodes) node.disconnect(destination);
        destination.stream.getTracks().forEach((track) => track.stop());
        const length = (performance.now() - recording.startedAt) / 1000;
        const audio = new Uint8Array(await new Blob(chunks).arrayBuffer());
        const text = (s: string) => new TextEncoder().encode(s);
        resolve(
          zipFiles([
            { name: `sesion.${extension}`, data: audio },
            { name: 'marcas_audacity.txt', data: text(audacityLabels(recording.markers)) },
            { name: 'sesion.md', data: text(sessionPage(recording.markers, date, length)) },
          ]),
        );
      };
      recorder.stop();
    });
}
