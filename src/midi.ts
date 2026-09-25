// Panel MIDI: lista dispositivos y muestra los últimos mensajes para saber
// qué número manda cada pad o knob. Strudel abre sus propias conexiones con
// midin()/midikeys(); esto es solo un monitor.

import { t } from './i18n';

const MAX_LOG = 12;

export function setupMidiPanel() {
  const enable = document.querySelector<HTMLButtonElement>('#midi-enable')!;
  const deviceList = document.querySelector<HTMLUListElement>('#midi-devices')!;
  const log = document.querySelector<HTMLOListElement>('#midi-log')!;
  const dot = document.querySelector<HTMLElement>('#midi-dot')!;

  if (!('requestMIDIAccess' in navigator)) {
    deviceList.innerHTML = `<li class="muted">${t('noWebMidi')}</li>`;
    enable.hidden = true;
    return;
  }

  let flashTimer: number | undefined;
  const flash = () => {
    dot.classList.add('is-active');
    clearTimeout(flashTimer);
    flashTimer = window.setTimeout(() => dot.classList.remove('is-active'), 120);
  };

  const describe = ([status, a, b]: Uint8Array) => {
    const type = status & 0xf0;
    const channel = (status & 0x0f) + 1;
    if (type === 0x90 && b > 0) return t('midiNote', { note: a, velocity: b, channel });
    if (type === 0x80 || type === 0x90) return null; // note off: ruido para el monitor
    if (type === 0xb0) return t('midiCc', { cc: a, value: b, channel });
    if (type === 0xe0) return t('midiBend', { value: (b << 7) | a, channel });
    if (type === 0xd0 || type === 0xa0) return t('midiTouch', { value: a, channel });
    return null;
  };

  const addLog = (device: string, text: string) => {
    const item = document.createElement('li');
    item.innerHTML = `<span class="midi-device"></span> <span class="midi-text"></span>`;
    item.querySelector('.midi-device')!.textContent = device;
    item.querySelector('.midi-text')!.textContent = text;
    log.prepend(item);
    while (log.children.length > MAX_LOG) log.lastElementChild!.remove();
  };

  const connect = async () => {
    try {
      const access = await navigator.requestMIDIAccess();
      const render = () => {
        deviceList.replaceChildren();
        if (!access.inputs.size) {
          deviceList.innerHTML = `<li class="muted">${t('noDevices')}</li>`;
        }
        access.inputs.forEach((input) => {
          const item = document.createElement('li');
          item.textContent = input.name ?? input.id;
          deviceList.append(item);
          input.onmidimessage = (event) => {
            if (!event.data) return;
            const text = describe(event.data);
            if (!text) return;
            flash();
            addLog(input.name ?? '', text);
          };
        });
      };
      render();
      access.onstatechange = render;
      enable.hidden = true;
      dot.classList.add('is-on');
    } catch {
      deviceList.innerHTML = `<li class="muted">${t('midiDenied')}</li>`;
    }
  };

  enable.addEventListener('click', connect);
}
