// Full screen from the bar (and More → View, where phones find it): the
// whole studio without the browser around it. Ctrl+Shift+F too; the
// browser's own F11 and Esc still work and the button follows them.
import { toast } from './toast';
import { t } from './i18n';

export function setupFullscreen() {
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('#fullscreen, #fullscreen-menu')];
  const root = document.documentElement;
  // iPhones have no full screen for pages: nothing to offer there
  if (!root.requestFullscreen) return buttons.forEach((button) => (button.hidden = true));

  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else root.requestFullscreen({ navigationUI: 'hide' }).catch(() => toast(t('fullscreenBlocked')));
  };
  const show = () => {
    const on = Boolean(document.fullscreenElement);
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(on));
      button.dataset.icon = on ? 'fullscreen-exit' : 'fullscreen';
    }
  };
  for (const button of buttons) button.addEventListener('click', toggle);
  document.addEventListener('fullscreenchange', show);
  window.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      toggle();
    }
  });
  show();
}
