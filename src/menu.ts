import { onLangChange, t } from './i18n';
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

  // ↑ ↓ move through the menu, as in any menu
  menu.addEventListener('keydown', (event) => {
    const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    if (!step || (event.target as HTMLElement).closest('select')) return;
    const items = [...menu.querySelectorAll<HTMLElement>('.menu-item, .menu-summary')].filter((item) => item.offsetParent !== null);
    const at = items.indexOf(event.target as HTMLElement);
    if (at < 0) return;
    event.preventDefault();
    items[(at + step + items.length) % items.length].focus();
  });

  const editorFocus = () => document.querySelector<HTMLElement>('.cm-content')?.focus();
  const panelButtons = document.querySelectorAll<HTMLButtonElement>('[data-panel]');
  panelButtons.forEach((button) => {
    button.addEventListener('click', () => {
      let opened: HTMLElement | undefined;
      panelButtons.forEach((other) => {
        const panel = document.getElementById(other.dataset.panel!)!;
        const open = other === button ? panel.hidden : false;
        panel.hidden = !open;
        other.setAttribute('aria-pressed', String(open));
        if (open) opened = panel;
      });
      // the focus goes into the panel just opened (its first control after
      // the ✕), so the keyboard can use it at once; closed, back to the code
      if (opened) {
        const controls = [...opened.querySelectorAll<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(
          (element) => !element.closest('[hidden]') && !(element as HTMLButtonElement).disabled,
        );
        (controls.find((element) => !element.classList.contains('panel-close')) ?? controls[0])?.focus({ preventScroll: true });
      } else if (!document.activeElement || document.activeElement === document.body) editorFocus();
    });
  });

  // Every panel closes from its own ✕ (top right), or with Escape
  const openButton = () => [...panelButtons].find((button) => !document.getElementById(button.dataset.panel!)!.hidden);
  const closeButtons: HTMLButtonElement[] = [];
  panelButtons.forEach((button) => {
    const panel = document.getElementById(button.dataset.panel!)!;
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'control control-icon panel-close';
    close.textContent = '✕';
    close.addEventListener('click', () => {
      button.click();
      editorFocus();
    });
    panel.prepend(close);
    closeButtons.push(close);
  });
  const label = () => closeButtons.forEach((close) => close.setAttribute('aria-label', t('close')));
  label();
  onLangChange(label);
  // Escape closes the open panel, unless it already closed something else
  // (a dialog, the menu, the editor's suggestions) or text is being typed
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || event.defaultPrevented || !menu.hidden || document.querySelector('dialog[open]')) return;
    const target = event.target as HTMLElement;
    // not while typing (text fields keep their own Escape); a checkbox or a
    // slider does not type, so Escape still closes from there
    const typing = target.closest('textarea, select, input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="button"]):not([type="file"])');
    if (typing) return;
    if (document.querySelector('.cm-tooltip-autocomplete')) return;
    const button = openButton();
    if (!button) return;
    const panel = document.getElementById(button.dataset.panel!)!;
    const inside = panel.contains(target);
    button.click();
    // focus was in the panel: give it back to the editor
    if (inside) document.querySelector<HTMLElement>('.cm-content')?.focus();
  });
}
