// Small buttons drawn from code: the glyph they used to show becomes a Lucide
// icon (icons.css), the label stays in title and aria-label
const GLYPHS: Record<string, string> = {
  '▶': 'play',
  '■': 'stop',
  '✕': 'close',
  '×': 'close',
  '+': 'plus',
  '⧉': 'copy',
  '↩': 'undo',
  '↻': 'apply',
  '↑': 'up',
  '↓': 'down',
  '🔈': 'volume',
  '🔇': 'mute',
  '⤢': 'look',
};

export function setIcon(element: HTMLElement, glyph: string) {
  const name = GLYPHS[glyph];
  if (!name) {
    element.textContent = glyph;
    delete element.dataset.icon;
    return;
  }
  element.textContent = '';
  element.dataset.icon = name;
}
