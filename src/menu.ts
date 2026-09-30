import { readStorage, writeStorage } from './storage';

// The "More" menu (everything not needed while playing) and the side panels,
// one open at a time
export function setupMenu() {
  const toggle = document.querySelector<HTMLButtonElement>('#menu-toggle')!;
  const menu = document.querySelector<HTMLElement>('#menu')!;
  const setMenu = (open: boolean) => {
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => setMenu(Boolean(menu.hidden)));
  // Capture phase: the editor and panels cannot swallow the click before we see it
  document.addEventListener(
    'pointerdown',
    (event) => {
      if (!menu.hidden && !(event.target as HTMLElement).closest('.menu')) setMenu(false);
    },
    true,
  );
  // Switching to another window closes it too
  window.addEventListener('blur', () => setMenu(false));
  document.querySelector('#record-mode')!.addEventListener('change', () => setMenu(false));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) {
      setMenu(false);
      toggle.focus();
    }
  });
  // Picking an action closes the menu; the recording select stays open to change it
  menu.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('.menu-item')) setMenu(false);
  });

  // Tabs inside a panel (MIDI): one part at a time, the last one remembered
  document.querySelectorAll<HTMLElement>('.panel-tabs').forEach((list) => {
    const tabs = [...list.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    const key = `jdl:tab:${list.closest('.panel')?.id ?? ''}`;
    const show = (tab: HTMLButtonElement) => {
      for (const other of tabs) {
        const selected = other === tab;
        other.setAttribute('aria-selected', String(selected));
        other.tabIndex = selected ? 0 : -1;
        document.getElementById(other.getAttribute('aria-controls')!)!.hidden = !selected;
      }
      writeStorage(key, tab.getAttribute('aria-controls'));
    };
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => show(tab));
      // arrow keys move between tabs, as in any tab list
      tab.addEventListener('keydown', (event) => {
        const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
        if (!step) return;
        const next = tabs[(index + step + tabs.length) % tabs.length];
        show(next);
        next.focus();
      });
    });
    const saved = readStorage<string | null>(key, null);
    show(tabs.find((tab) => tab.getAttribute('aria-controls') === saved) ?? tabs[0]);
  });

  const panelButtons = document.querySelectorAll<HTMLButtonElement>('[data-panel]');
  panelButtons.forEach((button) => {
    button.addEventListener('click', () => {
      panelButtons.forEach((other) => {
        const panel = document.getElementById(other.dataset.panel!)!;
        const open = other === button ? panel.hidden : false;
        panel.hidden = !open;
        other.setAttribute('aria-pressed', String(open));
      });
    });
  });
}
