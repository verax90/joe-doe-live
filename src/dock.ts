// The tools at hand: the panels you opened last stay in the foot as one-click
// buttons, so Video or Samples are not three clicks deep in More every time.
// A first visit shows a few to discover.
import { onLangChange, t } from './i18n';
import { readStorage, writeStorage } from './storage';

const KEY = 'jdl:dock';
const MAX = 5;
const FIRST = ['learn', 'samples', 'video', 'vj'];

// The newest first, without repeats, no more than fit
export function remember(list: string[], panel: string, max = MAX) {
  return [panel, ...list.filter((other) => other !== panel)].slice(0, max);
}

export function setupDock() {
  const foot = document.querySelector<HTMLElement>('.foot');
  if (!foot) return;
  const buttons = new Map(
    [...document.querySelectorAll<HTMLButtonElement>('.menu [data-panel]')].map((button) => [button.dataset.panel!, button] as const),
  );
  let panels = readStorage<string[]>(KEY, FIRST).filter((panel) => buttons.has(panel));

  const dock = document.createElement('nav');
  dock.className = 'dock';
  const title = document.createElement('span');
  title.className = 'dock-title';
  const list = document.createElement('div');
  list.className = 'dock-list';
  dock.append(title, list);
  foot.prepend(dock);

  // the menu button's own words (MIDI keeps its dot out)
  const label = (button: HTMLButtonElement) => (button.firstChild?.textContent ?? button.textContent ?? '').trim();
  const render = () => {
    title.textContent = t('dockTitle');
    dock.setAttribute('aria-label', t('dockTitle'));
    list.replaceChildren(
      ...panels.map((panel) => {
        const source = buttons.get(panel)!;
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'dock-item';
        chip.dataset.dock = panel;
        chip.textContent = label(source);
        chip.setAttribute('aria-pressed', source.getAttribute('aria-pressed') ?? 'false');
        // the same as picking it in More, so the panel logic stays in one place
        chip.addEventListener('click', () => source.click());
        return chip;
      }),
    );
  };
  // pressed state follows the panel, whoever opened it
  const sync = () => {
    for (const chip of list.querySelectorAll<HTMLButtonElement>('.dock-item')) {
      chip.setAttribute('aria-pressed', buttons.get(chip.dataset.dock!)?.getAttribute('aria-pressed') ?? 'false');
    }
  };
  for (const [panel, button] of buttons) {
    new MutationObserver(sync).observe(button, { attributes: true, attributeFilter: ['aria-pressed'] });
    button.addEventListener('click', () => {
      if (button.getAttribute('aria-pressed') !== 'true') return;
      // reorder only when it was not already at hand, so chips do not jump
      // under the pointer while you use them
      if (panels.includes(panel)) return;
      panels = remember(panels, panel);
      writeStorage(KEY, panels);
      render();
    });
  }
  render();
  onLangChange(render);
}
