// What's new: the latest things in the studio, newest first, each with a
// button that takes you there (opens its panel, its tab, picks its visual).
// The help shows them as its first section, and the ? button carries a dot
// while there is something you have not seen yet.
import type { Localized } from './i18n';
import { readStorage, writeStorage } from './storage';

const L = (en: string, es: string): Localized => ({ en, es });

type Step = { click?: string; value?: [string, string] }; // a selector to click, or [select, value] to pick
export type News = { id: string; title: Localized; text: Localized; go?: Step[] };

export const NEWS: News[] = [
  {
    id: '2026-09-30-youtube',
    title: L('YouTube queue', 'Cola de YouTube'),
    text: L('Paste and Add: it waits its turn, the video on is never cut', 'Pega y Añadir: espera su turno, sin cortar el que suena'),
    go: [{ click: '#toggle-video' }, { click: '[aria-controls="video-tab-youtube"]' }],
  },
  {
    id: '2026-09-30-sequencer',
    title: L('Sequencer view', 'Vista de secuenciador'),
    text: L('Each track drawn under its line as it plays, in its colour', 'Cada pista dibujada bajo su línea mientras suena, con su color'),
    go: [{ click: '#toggle-sequencer' }],
  },
  {
    id: '2026-09-30-keyboard',
    title: L('Better with the keyboard', 'Mejor con teclado'),
    text: L('Tab and Enter keep their place, arrows in the help, and a ring shows where you are', 'Tab e Intro no pierden el sitio, flechas en la ayuda y un anillo marca dónde estás'),
  },
  {
    id: '2026-09-30-goline',
    title: L('Go to the error', 'Ir al error'),
    text: L('When the code has an error, a button takes the cursor to its line', 'Si el código tiene un error, un botón lleva el cursor a su línea'),
  },
  {
    id: '2026-09-30-play',
    title: L('Play says where you are', 'Play dice dónde estás'),
    text: L('Playing, or Apply when your changes are not sounding yet. Every panel closes with its ✕ or Escape', 'Sonando, o Aplicar si tus cambios aún no suenan. Cada panel se cierra con su ✕ o con Escape'),
  },
  {
    id: '2026-09-30-project',
    title: L('Save and share', 'Guardar y compartir'),
    text: L('Save, link, export and open, in one place; Ctrl+S saves', 'Guardar, enlace, exportar y abrir, en un sitio; Ctrl+S guarda'),
    go: [{ click: '#project-open' }],
  },
  {
    id: '2026-09-30-finder',
    title: L('Search (Ctrl+K)', 'Buscar (Ctrl+K)'),
    text: L('A few letters open any panel, pattern or visual', 'Unas letras abren cualquier panel, patrón o visual'),
    go: [{ click: '#finder-open' }],
  },
  {
    id: '2026-09-30-drop',
    title: L('Build-up and drop', 'Subidón y drop'),
    text: L('A few bars that build up, and the drop on the one', 'Unos compases que suben y el drop en el uno'),
    go: [{ click: '#toggle-drop' }],
  },
  {
    id: '2026-09-30-voice',
    title: L('Tuner and voice synth', 'Afinador y sinte con tu voz'),
    text: L('The note you sing; a synth that follows it; two visuals that follow you', 'La nota que cantas; un sinte que la sigue; dos visuales que te siguen'),
    go: [{ click: '#toggle-mic' }, { click: '[aria-controls="mic-tab-tuner"]' }],
  },
  {
    id: '2026-09-30-hum',
    title: L('Hum a riff', 'Tararea un riff'),
    text: L('Sing a few bars and get them back as notes', 'Canta unos compases y salen como notas'),
    go: [{ click: '#toggle-midi' }, { click: '[aria-controls="midi-tab-riff"]' }, { value: ['#riff-source', 'voice'] }],
  },
  {
    id: '2026-09-30-session',
    title: L('Record the whole session', 'Grabar la sesión entera'),
    text: L('Hours of jam, a marker at every change and every ★ (Alt+M)', 'Horas de jam, una marca en cada cambio y en cada ★ (Alt+M)'),
    go: [{ value: ['#record-mode', 'session'] }, { click: '#menu-toggle' }],
  },
  {
    id: '2026-09-30-pump',
    title: L('Pump', 'Bombeo'),
    text: L('Every kick pushes the rest down, the breathing of house', 'Cada bombo agacha el resto, la respiración del house'),
    go: [{ click: '#toggle-pump' }],
  },
];

// Takes you to it: the steps run in order, a moment apart
export function goTo(news: News) {
  (news.go ?? []).forEach((step, index) => {
    window.setTimeout(() => {
      if (step.click) document.querySelector<HTMLElement>(step.click)?.click();
      if (step.value) {
        const field = document.querySelector<HTMLSelectElement>(step.value[0]);
        if (field) {
          field.value = step.value[1];
          field.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }, index * 60);
  });
}

// Something new since you last looked
const SEEN = 'jdl:news-seen';
export const hasUnseen = (list = NEWS, seen = readStorage<string>(SEEN, '')) => Boolean(list[0]) && list[0].id !== seen;
export const markSeen = () => writeStorage(SEEN, NEWS[0]?.id ?? '');
