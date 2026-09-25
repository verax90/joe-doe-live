// Two languages, English by default like joedoe.dev.
// Order: ?lang= in the URL → the jd-lang cookie shared with joedoe.dev → browser language.

export type Lang = 'en' | 'es';
export type Localized = Record<Lang, string>;

const COOKIE = 'jd-lang';
const isLang = (value: unknown): value is Lang => value === 'en' || value === 'es';

function readCookie(): string | undefined {
  return document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${COOKIE}=`))
    ?.split('=')[1];
}

// On *.joedoe.dev the cookie is shared with the main site, so choosing a
// language in one place carries over to the other
function writeCookie(value: Lang) {
  const shared = location.hostname.endsWith('joedoe.dev') ? '; domain=joedoe.dev' : '';
  const secure = location.protocol === 'https:' ? '; secure' : '';
  document.cookie = `${COOKIE}=${value}; path=/; max-age=31536000; samesite=lax${shared}${secure}`;
}

function detect(): Lang {
  const params = new URLSearchParams(location.search);
  const requested = params.get('lang');
  if (isLang(requested)) {
    writeCookie(requested);
    params.delete('lang');
    const query = params.toString();
    history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`);
    return requested;
  }
  const cookie = readCookie();
  if (isLang(cookie)) return cookie;
  const browser = navigator.languages?.length ? navigator.languages : [navigator.language];
  return browser.some((code) => code?.toLowerCase().startsWith('es')) ? 'es' : 'en';
}

export const lang: Lang = detect();

export function setLang(next: Lang) {
  writeCookie(next);
}

export const pick = (value: Localized) => value[lang] ?? value.en;

const strings = {
  en: {
    metaDescription: 'Live coding studio in the browser: Strudel, Hydra and MIDI.',
    backHome: 'Back to joedoe.dev',
    pattern: 'Pattern',
    patternsPlaceholder: '— Patterns —',
    groupIncluded: 'Included',
    groupSaved: 'Saved',
    save: 'Save',
    saveTitle: 'Save in this browser',
    delete: 'Delete',
    deleteTitle: 'Delete the saved pattern',
    savePrompt: 'Pattern name',
    deleteConfirm: 'Delete "{name}"?',
    visual: 'Visual',
    visuals: 'Visuals',
    share: 'Share',
    shareCopied: 'Link copied!',
    shareManual: 'Copy the URL above',
    code: 'Code',
    tools: 'Tools',
    cheatsheet: 'Cheatsheet',
    cheatHelp: 'Click an example to copy it, then paste it into your pattern.',
    cheatFilter: 'Search: filter, reverb, kick…',
    samples: 'Samples',
    langSwitch: 'Español',
    shortcuts: 'Ctrl+Enter play · Ctrl+. stop · Ctrl+Shift+H hides the code',
    source: 'Source code (AGPL-3.0)',
    openInTab: 'Open in tab ↗',
    close: 'Close',
    embeddedTool: 'Embedded tool',
    toolsHelp:
      'Other tools that run in the browser, from the <a href="https://joedoe.dev/art?cat=livecoding" target="_blank" rel="noopener">joedoe.dev/art</a> shelf. The ones with "Try it here" open inside the studio (your pattern stops so they do not clash).',
    loading: 'Loading…',
    groupLivecoding: 'Live coding',
    groupSound: 'Sound in the browser',
    tryHere: 'Try it here',
    samplesHelp:
      'Drop audio files anywhere on the page (or pick them below) and use them with <code>s("name")</code>. They stay in this browser.',
    chooseFiles: 'Choose files',
    yourSamples: 'Your samples',
    noSamples: 'No samples yet',
    copy: 'Copy',
    copied: 'Copied {code}',
    copyFailed: 'Could not copy',
    deleteSample: 'Delete {name}',
    onlyAudio: 'Only audio files are accepted (WAV, MP3, OGG, FLAC)',
    samplesReady: '{count} sample(s) ready',
    noStorage: 'This browser cannot store samples: they will be gone on reload',
    dropHere: 'Drop your samples here',
    midiHelp:
      'Hit a pad or turn a knob to see which number it sends. Use it in code with <code>midin(\'name\')</code> (knobs) or <code>midikeys(\'name\')</code> (pads).',
    devices: 'Devices',
    noPermission: 'No permission yet',
    enableMidi: 'Enable MIDI',
    lastMessages: 'Last messages',
    noWebMidi: 'This browser has no Web MIDI (try Chrome or Edge)',
    noDevices: 'No devices connected',
    midiDenied: 'MIDI permission denied',
    midiNote: 'pad/note {note} · velocity {velocity} · channel {channel}',
    midiCc: 'knob cc({cc}) = {value} · channel {channel}',
    midiBend: 'pitch bend {value} · channel {channel}',
    midiTouch: 'aftertouch {value} · channel {channel}',
    midiProgram: 'program {program} · channel {channel} → visual',
    freePlayTitle: 'Play without Play',
    freePlayHelp: 'Keys and bank B pads sound straight away while the studio is stopped, or over a pattern that does not use midikeys. Click the page once first so the browser lets it make sound.',
    freePlaySound: 'Sound for the keys',
    loadingSounds: 'Loading sounds…',
    line: 'Line {line}: ',
    errString: 'a closing quote is missing',
    errToken: 'something is extra or missing: a parenthesis, a comma or a quote?',
    errSound: 'there is no sound called {name}. Check the name or your list in Samples',
    errUndefined: '"{name}" does not exist: is it spelled right?',
    errFunction: '{name} is not a function: check the name',
    errMidi: 'that MIDI device is not there. See the exact name in the MIDI panel',
    errDownload: 'Could not download the sound {name}. Are you online?',
  },
  es: {
    metaDescription: 'Estudio de live coding en el navegador: Strudel, Hydra y MIDI.',
    backHome: 'Volver a joedoe.dev',
    pattern: 'Patrón',
    patternsPlaceholder: '— Patrones —',
    groupIncluded: 'Incluidos',
    groupSaved: 'Guardados',
    save: 'Guardar',
    saveTitle: 'Guardar en este navegador',
    delete: 'Borrar',
    deleteTitle: 'Borrar el patrón guardado',
    savePrompt: 'Nombre del patrón',
    deleteConfirm: '¿Borrar "{name}"?',
    visual: 'Visual',
    visuals: 'Visuales',
    share: 'Compartir',
    shareCopied: '¡Enlace copiado!',
    shareManual: 'Copia la URL de arriba',
    code: 'Código',
    tools: 'Herramientas',
    cheatsheet: 'Chuleta',
    cheatHelp: 'Haz clic en un ejemplo para copiarlo y pégalo en tu patrón.',
    cheatFilter: 'Buscar: filtro, reverb, bombo…',
    samples: 'Samples',
    langSwitch: 'English',
    shortcuts: 'Ctrl+Enter play · Ctrl+. stop · Ctrl+Shift+H oculta el código',
    source: 'Código fuente (AGPL-3.0)',
    openInTab: 'Abrir en pestaña ↗',
    close: 'Cerrar',
    embeddedTool: 'Herramienta incrustada',
    toolsHelp:
      'Otras herramientas que funcionan en el navegador, de la estantería de <a href="https://joedoe.dev/art?cat=livecoding" target="_blank" rel="noopener">joedoe.dev/art</a>. Las que dicen "Probar aquí" se abren dentro del estudio (tu patrón se para para que no choquen).',
    loading: 'Cargando…',
    groupLivecoding: 'Live coding',
    groupSound: 'Sonido en el navegador',
    tryHere: 'Probar aquí',
    samplesHelp:
      'Arrastra archivos de audio a cualquier parte de la página (o elígelos abajo) y úsalos con <code>s("nombre")</code>. Se guardan en este navegador.',
    chooseFiles: 'Elegir archivos',
    yourSamples: 'Tus samples',
    noSamples: 'Todavía no hay samples',
    copy: 'Copiar',
    copied: 'Copiado {code}',
    copyFailed: 'No se pudo copiar',
    deleteSample: 'Borrar {name}',
    onlyAudio: 'Solo se aceptan archivos de audio (WAV, MP3, OGG, FLAC)',
    samplesReady: '{count} sample(s) listo(s)',
    noStorage: 'Este navegador no permite guardar samples: se perderán al recargar',
    dropHere: 'Suelta aquí tus samples',
    midiHelp:
      'Toca un pad o gira un knob para ver qué número manda. Úsalo en el código con <code>midin(\'nombre\')</code> (knobs) o <code>midikeys(\'nombre\')</code> (pads).',
    devices: 'Dispositivos',
    noPermission: 'Sin permiso todavía',
    enableMidi: 'Activar MIDI',
    lastMessages: 'Últimos mensajes',
    noWebMidi: 'Este navegador no soporta Web MIDI (prueba Chrome o Edge)',
    noDevices: 'No hay dispositivos conectados',
    midiDenied: 'Permiso de MIDI denegado',
    midiNote: 'pad/nota {note} · fuerza {velocity} · canal {channel}',
    midiCc: 'knob cc({cc}) = {value} · canal {channel}',
    midiBend: 'pitch bend {value} · canal {channel}',
    midiTouch: 'aftertouch {value} · canal {channel}',
    midiProgram: 'programa {program} · canal {channel} → visual',
    freePlayTitle: 'Tocar sin Play',
    freePlayHelp: 'Las teclas y los pads del banco B suenan directamente con el estudio parado, o encima de un patrón que no use midikeys. Haz clic una vez en la página antes, para que el navegador deje sonar.',
    freePlaySound: 'Sonido de las teclas',
    loadingSounds: 'Cargando sonidos…',
    line: 'Línea {line}: ',
    errString: 'faltan unas comillas por cerrar',
    errToken: 'algo sobra o falta: ¿un paréntesis, una coma o unas comillas?',
    errSound: 'no existe el sonido {name}. Revisa el nombre o mira tu lista en Samples',
    errUndefined: '"{name}" no existe: ¿está bien escrito?',
    errFunction: '{name} no es una función: revisa el nombre',
    errMidi: 'no encuentro ese dispositivo MIDI. Mira el nombre exacto en el panel MIDI',
    errDownload: 'No se pudo descargar el sonido {name}. ¿Hay conexión?',
  },
} satisfies Record<Lang, Record<string, string>>;

export type StringKey = keyof typeof strings.en;

export function t(key: StringKey, vars: Record<string, string | number> = {}) {
  const template: string = strings[lang][key] ?? strings.en[key];
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}

// Static texts in index.html:
// data-i18n → text, data-i18n-html → markup (our own strings only),
// data-i18n-title / data-i18n-label → title and aria-label attributes
export function translatePage() {
  document.documentElement.lang = lang;
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('metaDescription'));
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n as StringKey);
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-html]').forEach((el) => {
    el.innerHTML = t(el.dataset.i18nHtml as StringKey);
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset.i18nTitle as StringKey);
  });
  document.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder as StringKey);
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-label]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nLabel as StringKey));
  });
}
