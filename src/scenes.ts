// Parts you switch on and off while it plays, the classic way to build a live
// set: start with the kick and bring layers in. A pattern opts in with
// .mask(part(n)); part n toggles with the MPK pad n in CC mode, the number key
// n, or a click on its box at the bottom of the screen.
import { CC_EVENT, type CcDetail } from './midi';
import { t } from './i18n';

const PARTS = 8;
const on = Array<boolean>(PARTS).fill(true);

type Global = typeof globalThis & {
  ref?: (read: () => number) => unknown;
  part?: (n: number) => unknown;
};

export function setupScenes(getCode: () => string) {
  const strip = document.querySelector<HTMLElement>('#parts')!;
  const buttons: HTMLButtonElement[] = [];

  const render = () =>
    buttons.forEach((button, i) => {
      button.setAttribute('aria-pressed', String(on[i]));
      button.title = t(on[i] ? 'partOn' : 'partOff', { n: i + 1 });
    });

  const toggle = (index: number) => {
    if (index < 0 || index >= PARTS) return;
    on[index] = !on[index];
    render();
  };

  for (let i = 0; i < PARTS; i++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'part';
    button.textContent = String(i + 1);
    button.addEventListener('click', () => toggle(i));
    buttons.push(button);
  }
  strip.append(...buttons);
  render();

  // part(n): 1 while part n is on, 0 while off; read live on every cycle
  (globalThis as Global).part = (n: number) => (globalThis as Global).ref?.(() => (on[n - 1] ? 1 : 0));

  // MPK pads in CC mode send CC 0-7 on channel 10: a press toggles
  window.addEventListener(CC_EVENT, (event) => {
    const { cc, value, channel } = (event as CustomEvent<CcDetail>).detail;
    if (channel === 10 && value > 0 && getCode().includes('part(')) toggle(cc);
  });

  // Number keys 1-8, unless you are typing
  window.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement;
    if (event.ctrlKey || event.metaKey || event.altKey || target.closest('.cm-editor, input, select, textarea')) return;
    const n = Number(event.key);
    if (n >= 1 && n <= PARTS && getCode().includes('part(')) toggle(n - 1);
  });

  // The strip only shows for a pattern that uses parts
  const update = () => {
    strip.hidden = !getCode().includes('part(');
  };
  update();
  setInterval(update, 500);

  // Every part back on, e.g. when another pattern is loaded
  return () => {
    on.fill(true);
    render();
  };
}
