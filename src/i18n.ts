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

export let lang: Lang = detect();

// Switching language re-renders in place instead of reloading: static texts
// here, and every module that builds text listens for LANG_EVENT
export const LANG_EVENT = 'jdl:lang';

export function setLang(next: Lang) {
  writeCookie(next);
  lang = next;
  translatePage();
  window.dispatchEvent(new Event(LANG_EVENT));
}

export function onLangChange(listener: () => void) {
  window.addEventListener(LANG_EVENT, listener);
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
    more: 'More',
    partsLabel: 'Parts: click, press 1-8 or a pad in CC mode',
    partOn: 'Part {n} on: click or press {n} to mute',
    partOff: 'Part {n} muted: click or press {n} to bring it in',
    programTarget: 'PROG CHANGE pads change',
    programVisual: 'the visual',
    programPattern: 'the pattern',
    theme: 'Theme',
    tempoTitle: 'Tempo in beats per minute',
    tapTitle: 'Tap four times to the beat',
    help: 'Help',
    asciiFilter: 'ASCII filter',
    language: 'Language',
    cheatHelp: 'Try plays a complete example (your code is kept to go back to). Insert puts it into your code where the cursor is.',
    tryIt: '▶ Try',
    insert: 'Insert',
    tryingExample: 'Playing the example.',
    backToCode: '← Back to my code',
    backToCodeDone: 'Your code is back.',
    inserted: 'Inserted at line {line}. Press Ctrl+Enter to hear it.',
    undo: 'Undo',
    redo: 'Redo',
    undoTitle: 'Undo (Ctrl+Z). While it plays, you hear each step',
    redoTitle: 'Redo (Ctrl+Shift+Z)',
    copyCode: 'Copy the code',
    downloadCode: 'Download the code (.js)',
    codeCopied: 'Code copied.',
    codeDownloaded: 'Downloaded {name}.',
    trackAdded: 'Added as a new track ($:) at the end. Press Play: every track sounds together.',
    trackAddedPlaying: 'Added as a new track ($:) and already playing with the rest.',
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
      'Drop audio files or whole folders anywhere on the page (or pick them below). A file plays with <code>s("name")</code>; a folder becomes a kit: <code>s("kicks:3")</code> or <code>s("kicks").n("0 3 5")</code>. They stay in this browser.',
    chooseFiles: 'Choose files',
    chooseFolder: 'Choose folder',
    video: 'Video',
    youtubeTitle: 'YouTube behind',
    youtubeHelp:
      'Paste a YouTube link: it plays muted and looped behind the code and the visuals. Effects and the ASCII filter do not touch it and recordings leave it out (YouTube does not let pages read its picture); for that, capture its tab below. If it says the video is unavailable, its owner does not allow embedding: try another one.',
    youtubeLink: 'YouTube link',
    youtubePut: 'Put',
    youtubeOff: 'Remove the video',
    youtubeBad: 'That does not look like a YouTube link.',
    youtubeOn: 'Playing behind. Ctrl+Shift+H hides the code to see it whole.',
    videoSourceTitle: 'With effects',
    videoSourceHelp:
      'The webcam visuals can take a video of yours or a browser tab instead of the camera, with every effect, the ASCII filter and recording. For YouTube with effects, open it in another tab and capture that tab.',
    videoFile: 'Your video',
    videoTab: 'Capture a tab',
    videoWebcam: 'Back to the webcam',
    videoUsingFile: 'Webcam visuals now show {name}.',
    videoBadFile: 'This browser cannot play {name}. Try an MP4 or WebM.',
    videoUsingTab: 'Webcam visuals now show the captured tab. Stop sharing from the browser bar.',
    videoTabEnded: 'The tab is no longer shared. Webcam visuals will use the camera again.',
    videoTabCancelled: 'No tab captured.',
    videoUsingWebcam: 'Webcam visuals use the camera.',
    samplesLoading: 'Loading {done}/{total}…',
    kitCount: '{count} sounds',
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
    recordMode: 'What to record',
    recordAudio: 'Audio (WAV)',
    recordVideo: 'Video (WebM)',
    record: 'Record',
    stopRecording: 'Stop',
    recordSaving: 'Saving…',
    recordSaved: 'Saved to Downloads',
    recordNoVisual: 'Pick a visual first: the video records the visuals',
    recordNoAudio: 'Audio is not ready yet: press Play or play a key first',
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
    more: 'Más',
    partsLabel: 'Partes: clic, teclas 1-8 o un pad en modo CC',
    partOn: 'Parte {n} sonando: clic o tecla {n} para silenciarla',
    partOff: 'Parte {n} silenciada: clic o tecla {n} para que entre',
    programTarget: 'Los pads en PROG CHANGE cambian',
    programVisual: 'el visual',
    programPattern: 'el patrón',
    theme: 'Tema',
    tempoTitle: 'Tempo en pulsos por minuto',
    tapTitle: 'Pulsa cuatro veces al ritmo',
    help: 'Ayuda',
    asciiFilter: 'Filtro ASCII',
    language: 'Idioma',
    cheatHelp: 'Probar hace sonar un ejemplo completo (tu código se guarda para volver). Insertar lo mete en tu código donde tengas el cursor.',
    tryIt: '▶ Probar',
    insert: 'Insertar',
    tryingExample: 'Sonando el ejemplo.',
    backToCode: '← Volver a mi código',
    backToCodeDone: 'Tu código ha vuelto.',
    inserted: 'Insertado en la línea {line}. Pulsa Ctrl+Enter para oírlo.',
    undo: 'Deshacer',
    redo: 'Rehacer',
    undoTitle: 'Deshacer (Ctrl+Z). Mientras suena, oyes cada paso',
    redoTitle: 'Rehacer (Ctrl+Shift+Z)',
    copyCode: 'Copiar el código',
    downloadCode: 'Descargar el código (.js)',
    codeCopied: 'Código copiado.',
    codeDownloaded: 'Descargado {name}.',
    trackAdded: 'Añadido como pista nueva ($:) al final. Pulsa Play: todas las pistas suenan juntas.',
    trackAddedPlaying: 'Añadido como pista nueva ($:) y ya suena con el resto.',
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
      'Arrastra archivos de audio o carpetas enteras a cualquier parte de la página (o elígelos abajo). Un archivo suena con <code>s("nombre")</code>; una carpeta se convierte en un kit: <code>s("kicks:3")</code> o <code>s("kicks").n("0 3 5")</code>. Se guardan en este navegador.',
    chooseFiles: 'Elegir archivos',
    chooseFolder: 'Elegir carpeta',
    video: 'Vídeo',
    youtubeTitle: 'YouTube de fondo',
    youtubeHelp:
      'Pega un enlace de YouTube: suena en silencio y en bucle detrás del código y de los visuales. Los efectos y el filtro ASCII no le afectan y no sale en las grabaciones (YouTube no deja leer su imagen); para eso, captura su pestaña aquí abajo. Si dice que el vídeo no está disponible, su autor no deja incrustarlo: prueba con otro.',
    youtubeLink: 'Enlace de YouTube',
    youtubePut: 'Poner',
    youtubeOff: 'Quitar el vídeo',
    youtubeBad: 'Eso no parece un enlace de YouTube.',
    youtubeOn: 'Sonando de fondo. Ctrl+Shift+H oculta el código para verlo entero.',
    videoSourceTitle: 'Con efectos',
    videoSourceHelp:
      'Los visuales de webcam pueden usar un vídeo tuyo o una pestaña del navegador en vez de la cámara, con todos los efectos, el filtro ASCII y la grabación. Para YouTube con efectos, ábrelo en otra pestaña y captura esa pestaña.',
    videoFile: 'Tu vídeo',
    videoTab: 'Capturar una pestaña',
    videoWebcam: 'Volver a la webcam',
    videoUsingFile: 'Los visuales de webcam muestran ahora {name}.',
    videoBadFile: 'Este navegador no puede reproducir {name}. Prueba con un MP4 o WebM.',
    videoUsingTab: 'Los visuales de webcam muestran ahora la pestaña capturada. Deja de compartir desde la barra del navegador.',
    videoTabEnded: 'La pestaña ya no se comparte. Los visuales de webcam volverán a usar la cámara.',
    videoTabCancelled: 'No se ha capturado ninguna pestaña.',
    videoUsingWebcam: 'Los visuales de webcam usan la cámara.',
    samplesLoading: 'Cargando {done}/{total}…',
    kitCount: '{count} sonidos',
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
    recordMode: 'Qué grabar',
    recordAudio: 'Audio (WAV)',
    recordVideo: 'Vídeo (WebM)',
    record: 'Grabar',
    stopRecording: 'Parar',
    recordSaving: 'Guardando…',
    recordSaved: 'Guardado en Descargas',
    recordNoVisual: 'Elige antes un visual: el vídeo graba los visuales',
    recordNoAudio: 'El audio aún no está listo: pulsa Play o toca una tecla antes',
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
