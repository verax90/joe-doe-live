// Keyboard focus that survives a redraw. Many lists here are drawn again
// from scratch when one of their own buttons is pressed (a help section, a
// kit opening, a song moving up the set…); the pressed button is replaced, the
// focus falls back to the page and the next Tab starts from the top. Drawing
// through keepingFocus puts the focus back on the same control: the one with
// the same name (data-focus-key, aria-label or text) nearest to where it was,
// or else the one now in its place.

const FOCUSABLE = 'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])';

const keyOf = (element: HTMLElement) => element.dataset.focusKey ?? element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '';

// Which control, among the ones drawn now, stands for the one focused before
export function refocusIndex(beforeKeys: string[], index: number, afterKeys: string[]) {
  if (!afterKeys.length) return -1;
  const key = beforeKeys[index];
  let best = -1;
  afterKeys.forEach((candidate, i) => {
    if (candidate === key && (best < 0 || Math.abs(i - index) < Math.abs(best - index))) best = i;
  });
  return best >= 0 ? best : Math.min(index, afterKeys.length - 1);
}

export function keepingFocus(container: HTMLElement, draw: () => void) {
  const active = document.activeElement as HTMLElement | null;
  if (!active || !container.contains(active)) {
    draw();
    return;
  }
  const controls = () => [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) => !element.hidden && !element.closest('[hidden]'));
  const before = controls();
  const index = before.indexOf(active);
  const beforeKeys = before.map(keyOf);
  draw();
  const after = controls();
  const target = after[refocusIndex(beforeKeys, index, after.map(keyOf))];
  // the same element may still be there (nothing was replaced): leave it
  if (target && document.activeElement !== target) target.focus({ preventScroll: true });
}
