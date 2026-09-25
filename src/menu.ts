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
