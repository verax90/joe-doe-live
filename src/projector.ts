// Projector: a second window with only the picture (visuals, ASCII filter,
// caption), to drag to the projector or the club's screen and put full screen,
// while the code and the panels stay on the laptop. Same origin, so each
// Hydra frame is copied straight into the window's canvas, no stream.
import { onHydraFrame } from './ascii';
import { onLangChange, t } from './i18n';
import { overlayText } from './overlay';
import { drawCaption, themeColours } from './record';
import { shatterCanvas } from './shatter';
import { toast } from './toast';

let popup: Window | null = null;

export function setupProjector() {
  const button = document.querySelector<HTMLButtonElement>('#toggle-projector');
  if (!button) return;
  let stop: (() => void) | undefined;
  let watch = 0;

  const close = () => {
    stop?.();
    stop = undefined;
    window.clearInterval(watch);
    button.setAttribute('aria-pressed', 'false');
    popup = null;
  };

  const open = () => {
    if (popup && !popup.closed) {
      popup.focus();
      return;
    }
    popup = window.open('', 'jdl-projector', 'popup,width=960,height=540');
    if (!popup) {
      toast(t('projectorBlocked'));
      return;
    }
    const doc = popup.document;
    doc.title = t('projectorTitle');
    doc.body.innerHTML = '';
    doc.body.style.cssText = 'margin:0;background:#000;overflow:hidden;cursor:none;height:100vh';
    const canvas = doc.createElement('canvas');
    canvas.style.cssText = 'display:block;width:100vw;height:100vh';
    const hint = doc.createElement('p');
    hint.textContent = t('projectorHint');
    hint.style.cssText =
      'position:fixed;inset:auto 0 2rem;margin:auto;width:fit-content;max-width:90vw;padding:.6rem 1rem;border-radius:.4rem;background:rgba(0,0,0,.75);color:#fff;font:14px/1.4 ui-monospace,monospace;text-align:center;transition:opacity 1s';
    doc.body.append(canvas, hint);
    // the hint fades once read; clicking goes full screen (the click has to
    // happen in that window, browsers ask for a gesture there)
    popup.setTimeout(() => (hint.style.opacity = '0'), 6000);
    doc.addEventListener('click', () => {
      if (doc.fullscreenElement) void doc.exitFullscreen();
      else void doc.documentElement.requestFullscreen?.().catch(() => undefined);
    });
    doc.addEventListener('keydown', (event) => {
      if (event.key === 'f') void doc.documentElement.requestFullscreen?.().catch(() => undefined);
    });

    const g = canvas.getContext('2d')!;
    const colours = themeColours();
    stop = onHydraFrame(() => {
      if (!popup || popup.closed) return;
      const source = document.getElementById('hydra-canvas') as HTMLCanvasElement | null;
      if (!source) return;
      const ascii = document.getElementById('ascii-canvas') as HTMLCanvasElement | null;
      const shown = ascii && !ascii.hidden ? ascii : source;
      // the window's own size, sharp on its screen but no bigger than 1080p
      const scale = Math.min(popup.devicePixelRatio || 1, 1920 / popup.innerWidth);
      const width = Math.round(popup.innerWidth * scale);
      const height = Math.round(popup.innerHeight * scale);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      g.fillStyle = '#000';
      g.fillRect(0, 0, width, height);
      // cover, like the visuals on the main screen
      const fit = Math.max(width / shown.width, height / shown.height);
      const w = shown.width * fit;
      const h = shown.height * fit;
      g.drawImage(shown, (width - w) / 2, (height - h) / 2, w, h);
      const glass = shatterCanvas();
      if (glass) g.drawImage(glass, (width - w) / 2, (height - h) / 2, w, h);
      // no watermark on the club's screen: only your Caption, when there is one
      if (overlayText()) drawCaption(g, width, height, Math.max(14, Math.round(height / 48)), colours);
    });
    button.setAttribute('aria-pressed', 'true');
    // closed from its own window: tidy up here
    watch = window.setInterval(() => {
      if (!popup || popup.closed) close();
    }, 500);
  };

  button.addEventListener('click', () => {
    if (popup && !popup.closed && button.getAttribute('aria-pressed') === 'true') {
      popup.close();
      close();
    } else open();
  });
  // leaving the studio closes the projector too
  window.addEventListener('pagehide', () => popup?.close());
  onLangChange(() => {
    if (popup && !popup.closed) popup.document.title = t('projectorTitle');
  });
}
