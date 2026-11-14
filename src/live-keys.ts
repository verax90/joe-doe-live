// The VJ from the keyboard, for playing it without the mouse: the looks on
// 1 to 4, all neutral on 0, the dice on D, another visual on V, the next
// palette on P and a kick by hand on the space bar. Only when a key cannot
// be meant as text: with the code hidden (performance mode, where typing
// blind into it would be worse) or with the focus outside the editor and
// any field.
import { hearRole } from './clips-react';
import { applyColour, colourNow, PALETTES } from './finish';
import { GLIDE_MS, recallLook, resetVj } from './vj';

export type LiveKey = { look: number } | 'neutral' | 'dice' | 'visual' | 'palette' | 'kick';

// What a key does, if anything
export function liveKey(key: string): LiveKey | undefined {
  if (/^[1-4]$/.test(key)) return { look: Number(key) - 1 };
  if (key === '0') return 'neutral';
  const lower = key.toLowerCase();
  if (lower === 'd') return 'dice';
  if (lower === 'v') return 'visual';
  if (lower === 'p') return 'palette';
  if (key === ' ') return 'kick';
  return undefined;
}

// The palette after this one, round and round (the theme's own colour is one of them)
export function nextPalette(current: string) {
  const at = PALETTES.findIndex((palette) => palette.id === current);
  return PALETTES[(at + 1) % PALETTES.length].id;
}

type Options = { anotherVisual: () => void };

export function setupLiveKeys({ anotherVisual }: Options) {
  window.addEventListener(
    'keydown',
    (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      if (document.querySelector('dialog[open]')) return;
      const target = event.target as HTMLElement;
      const hidden = document.body.classList.contains('hide-code');
      // a field is always for typing; the editor too, unless it is out of sight
      if (target.closest('input, select, textarea, [contenteditable="true"]:not(.cm-content)')) return;
      if (target.closest('.cm-editor') && !hidden) return;
      const action = liveKey(event.key);
      if (!action) return;
      event.preventDefault();
      event.stopPropagation();
      if (typeof action === 'object') recallLook(action.look, GLIDE_MS);
      else if (action === 'neutral') resetVj();
      else if (action === 'dice') document.querySelector<HTMLButtonElement>('#vj-random')?.click();
      else if (action === 'visual') anotherVisual();
      else if (action === 'palette') applyColour({ palette: nextPalette(colourNow().palette) });
      else hearRole('kick');
    },
    true,
  );
}
