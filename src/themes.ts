// Studio themes: an accent colour (buttons, brand, ASCII filter and the
// built-in visuals) paired with one of Strudel's code themes that suits it.
// Only dark code themes whose text reads over the visuals (algoboy and redText
// did not).
import type { Localized } from './i18n';

export type Theme = { id: string; name: Localized; accent: string; code: string };

export const themes: Theme[] = [
  { id: 'lima', name: { en: 'Lime (joedoe.dev)', es: 'Lima (joedoe.dev)' }, accent: '#d6ff4b', code: 'strudelTheme' },
  { id: 'teletext', name: { en: 'Teletext', es: 'Teletexto' }, accent: '#00e5ff', code: 'teletext' },
  { id: 'amber', name: { en: 'Amber monitor', es: 'Monitor ámbar' }, accent: '#ffb000', code: 'gruvboxDark' },
  { id: 'terminal', name: { en: 'Terminal green', es: 'Verde terminal' }, accent: '#33ff66', code: 'greenText' },
  { id: 'pink', name: { en: 'Sonic Pi pink', es: 'Rosa Sonic Pi' }, accent: '#ff4fa8', code: 'sonicPink' },
  { id: 'tokyo', name: { en: 'Tokyo night', es: 'Noche Tokio' }, accent: '#7aa2f7', code: 'tokyoNight' },
  { id: 'dracula', name: { en: 'Dracula', es: 'Drácula' }, accent: '#bd93f9', code: 'dracula' },
  { id: 'red', name: { en: 'Alarm red', es: 'Rojo alarma' }, accent: '#ff5356', code: 'darcula' },
  { id: 'gameboy', name: { en: 'Game Boy', es: 'Game Boy' }, accent: '#9bbc0f', code: 'terminal' },
  { id: 'nord', name: { en: 'Nord', es: 'Nórdico' }, accent: '#88c0d0', code: 'nord' },
  { id: 'solarized', name: { en: 'Solarized', es: 'Solarizado' }, accent: '#2aa198', code: 'solarizedDark' },
  { id: 'aura', name: { en: 'Aura mint', es: 'Aura menta' }, accent: '#61ffca', code: 'aura' },
  { id: 'monokai', name: { en: 'Monokai yellow', es: 'Monokai amarillo' }, accent: '#e6db74', code: 'monokai' },
  { id: 'mono', name: { en: 'Monochrome', es: 'Monocromo' }, accent: '#eceae4', code: 'blackscreen' },
];

const STORAGE_KEY = 'jdl:theme';

export function readTheme(): Theme {
  let id: string | null = null;
  try {
    id = localStorage.getItem(STORAGE_KEY);
  } catch {
    // default theme
  }
  return themes.find((theme) => theme.id === id) ?? themes[0];
}

let accentRgb: [number, number, number] = [0.84, 1, 0.29];

// tint(level) is the accent as Hydra colour values, darkened by level (0-1):
// osc(10).color(...tint(0.4)).out(). The built-in visuals use it
(globalThis as { tint?: (level?: number) => number[] }).tint = (level = 1) => accentRgb.map((c) => c * level);

type Editor = { setTheme?: (name: string) => void };

export function applyTheme(theme: Theme, editor?: Editor) {
  const root = document.documentElement.style;
  root.setProperty('--accent', theme.accent);
  const value = parseInt(theme.accent.slice(1), 16);
  accentRgb = [(value >> 16) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
  editor?.setTheme?.(theme.code);
  try {
    localStorage.setItem(STORAGE_KEY, theme.id);
  } catch {
    // not remembered, still applied
  }
}
