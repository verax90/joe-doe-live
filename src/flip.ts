// More → Miyoo Flip: the console as a controller over the internet. Studio
// Remote on the Flip shows a short code; typed here, both meet at the relay
// (github.com/verax90/miyoo-remote, relay/main.ts on Deno Deploy) and the
// console's MIDI arrives as if it were plugged in, called "Miyoo Flip". The
// code is remembered, so the next time they find each other alone. Every few
// seconds each side says "hi": that is how both know the other is there.
import { t } from './i18n';
import { receiveMidi } from './midi';
import { readStorage, writeStorage } from './storage';
import { toast } from './toast';

const RELAY = 'wss://studio-relay.verax90.deno.net/ws';
const CODE_KEY = 'jdl:flip-code';
const HI_EVERY = 3000;
const GONE_AFTER = 10000;

export function setupFlip() {
  const input = document.querySelector<HTMLInputElement>('#flip-code')!;
  const button = document.querySelector<HTMLButtonElement>('#flip-connect')!;
  const status = document.querySelector<HTMLElement>('#flip-status')!;
  const dot = document.querySelector<HTMLElement>('#flip-dot')!;
  // another relay, for trying one on the home network: localStorage jdl:flip-relay
  const relay = readStorage<string>('jdl:flip-relay', RELAY);

  let code = readStorage<string>(CODE_KEY, '');
  let socket: WebSocket | undefined;
  let seen = 0; // when the console last said hi
  let here = false;
  let retry: number | undefined;
  let wait = 2000;
  let hi: number | undefined;

  const show = () => {
    const wanted = Boolean(code);
    button.textContent = t(wanted ? 'flipDisconnect' : 'flipConnect');
    button.classList.toggle('control-accent', !wanted);
    input.disabled = wanted;
    dot.classList.toggle('is-on', here);
    if (!wanted) status.textContent = '';
    else if (here) status.textContent = t('flipConnected', { code });
    else if (socket?.readyState === WebSocket.OPEN) status.textContent = t('flipWaiting', { code });
    else status.textContent = t('flipOffline');
  };

  const setHere = (now: boolean) => {
    if (now === here) return;
    here = now;
    if (here) toast(t('flipConnected', { code }));
    show();
  };

  const close = () => {
    clearTimeout(retry);
    clearInterval(hi);
    const old = socket;
    socket = undefined;
    old?.close();
    setHere(false);
  };

  const open = () => {
    close();
    if (!code) return show();
    const ws = new WebSocket(`${relay}?code=${encodeURIComponent(code)}&role=studio`);
    ws.binaryType = 'arraybuffer';
    socket = ws;
    ws.onopen = () => {
      wait = 2000;
      ws.send('hi');
      hi = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('hi');
        setHere(performance.now() - seen < GONE_AFTER);
      }, HI_EVERY);
      show();
    };
    ws.onmessage = (event) => {
      if (event.data === 'hi') {
        seen = performance.now();
        setHere(true);
      } else if (event.data instanceof ArrayBuffer) {
        seen = performance.now();
        setHere(true);
        receiveMidi(new Uint8Array(event.data), 'Miyoo Flip');
      }
    };
    ws.onclose = () => {
      if (socket !== ws) return; // closed on purpose
      clearInterval(hi);
      socket = undefined;
      setHere(false);
      show();
      // try again, a bit later each time
      retry = window.setTimeout(open, wait);
      wait = Math.min(wait * 2, 15000);
    };
  };

  button.addEventListener('click', () => {
    if (code) {
      code = '';
      writeStorage(CODE_KEY, '');
      close();
      show();
      return;
    }
    const typed = input.value.trim().toUpperCase();
    if (!/^[A-Z2-9]{4,8}$/.test(typed)) {
      status.textContent = t('flipBadCode');
      return;
    }
    code = typed;
    writeStorage(CODE_KEY, code);
    open();
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') button.click();
  });

  input.value = code;
  show();
  if (code) open();
}
