// Help: getting started, shortcuts, every control of the MPK Mini Mk II
// in each of its modes, the panels, and what to do when something goes wrong.
import { onLangChange, pick, type Localized } from './i18n';
import { readStorage, writeStorage } from './storage';

type Block =
  | { kind: 'text'; body: Localized }
  | { kind: 'steps'; items: Localized[] }
  | { kind: 'table'; head: [Localized, Localized]; rows: [string | Localized, Localized][] };
// short: its name in the help's index
type Section = { title: Localized; short: Localized; blocks: Block[] };

const L = (en: string, es: string): Localized => ({ en, es });

const sections: Section[] = [
  {
    title: L('Getting started', 'Para empezar'),
    short: L('Getting started', 'Para empezar'),
    blocks: [
      {
        kind: 'steps',
        items: [
          L('Pick a pattern and press Play (Ctrl+Enter).', 'Elige un patrón y pulsa Play (Ctrl+Enter).'),
          L('Change a number or a word in the code and press Ctrl+Enter again: it changes while it plays.', 'Cambia un número o una palabra del código y pulsa otra vez Ctrl+Enter: cambia mientras suena.'),
          L('Pick a visual next to the pattern. "Auto" changes by itself every 4 bars.', 'Elige un visual al lado del patrón. "Automático" cambia solo cada 4 compases.'),
          L('Change the tempo in BPM, or tap Tap four times to the beat (on the MPK, match its Tap Tempo).', 'Cambia el tempo en BPM, o pulsa Tap cuatro veces al ritmo (con el MPK, iguálalo a su Tap Tempo).'),
          L('Ctrl+. stops. Mistakes show up at the bottom in plain words.', 'Ctrl+. para. Los errores salen abajo explicados.'),
          L('New to this? More → Learn goes step by step, More → Compose builds a song layer by layer, More → Cheatsheet has examples.', '¿Empiezas de cero? Más → Aprender va paso a paso, Más → Componer monta una canción capa a capa, Más → Chuleta tiene ejemplos.'),
        ],
      },
    ],
  },
  {
    title: L('Shortcuts', 'Atajos'),
    short: L('Shortcuts', 'Atajos'),
    blocks: [
      {
        kind: 'table',
        head: [L('Keys', 'Teclas'), L('What it does', 'Qué hace')],
        rows: [
          ['Ctrl+Enter', L('Play / apply the changes', 'Play / aplicar los cambios')],
          ['Ctrl+.', L('Stop', 'Stop')],
          ['Ctrl+Z · ↶ / Ctrl+Shift+Z · ↷', L('Undo / redo; with the buttons, while it plays you hear each step', 'Deshacer / rehacer; con los botones, mientras suena oyes cada paso')],
          ['Ctrl+Shift+H', L('Hide the code (performance mode)', 'Ocultar el código (modo concierto)')],
          ['Ctrl+S', L('Save the pattern in this browser', 'Guardar el patrón en este navegador')],
          ['Ctrl+K', L('Search: a panel, a pattern, a visual, by a few letters', 'Buscar: un panel, un patrón, un visual, con unas letras')],
          ['Alt+M', L('While recording the whole session: mark this moment', 'Grabando la sesión entera: marcar este momento')],
          ['?', L('This help', 'Esta ayuda')],
          ['1 – 8', L('Switch parts on and off in a pattern that uses them (Scenes)', 'Encender y apagar partes en un patrón que las use (Escenas)')],
          ['Esc', L('Close the menu or an embedded tool', 'Cerrar el menú o una herramienta incrustada')],
          ['← → · PageUp / PageDown', L('Previous / next song during a live set', 'Tema anterior / siguiente durante el directo')],
        ],
      },
    ],
  },
  {
    title: L('MPK Mini Mk II: keys and pads', 'MPK Mini Mk II: teclas y pads'),
    short: L('MPK: keys and pads', 'MPK: teclas y pads'),
    blocks: [
      {
        kind: 'text',
        body: L(
          'Moving a knob or the joystick shows what it just did at the bottom right, and what it needs if nothing seems to change. Enable MIDI once in More → MIDI. The keys play straight away without pressing Play (pick their sound in the MIDI panel), or through the "MPK Mini" pattern while it plays. Click the page once first so the browser lets it make sound.',
          'Al mover un knob o el joystick, abajo a la derecha sale qué acaba de hacer, y qué hace falta si no parece cambiar nada. Activa el MIDI una vez en Más → MIDI. Las teclas suenan directamente sin pulsar Play (su sonido se elige en el panel MIDI), o a través del patrón "MPK Mini" mientras suena. Haz clic una vez en la página antes para que el navegador deje sonar.',
        ),
      },
      {
        kind: 'table',
        head: [L('Pad mode (MPK buttons)', 'Modo de los pads (botones del MPK)'), L('What the pads do', 'Qué hacen los pads')],
        rows: [
          [L('Normal, bank B', 'Normal, banco B'), L('Drums: kick, snare, hat, open hat, clap, rim, low tom, high tom. Or eight sounds of one of your kits: MIDI panel → Bank B pads play', 'Batería: bombo, caja, charles, charles abierto, palmada, rim, tom grave, tom agudo. O los sonidos de uno de tus kits, de ocho en ocho: panel MIDI → Los pads del banco B tocan')],
          [L('Normal, bank A', 'Normal, banco A'), L('Same notes as the lowest keys: avoid it for drums', 'Las mismas notas que las teclas más graves: mejor no usarlo para batería')],
          ['CC', L('"Scenes" pattern: each pad switches its part on or off. "MPK Mini" pattern: hold pad 1 to cut the beat, pad 2 to crush the piano', 'Patrón "Escenas": cada pad enciende o apaga su parte. Patrón "MPK Mini": mantén el pad 1 para cortar el ritmo y el 2 para ensuciar el piano')],
          ['PROG CHANGE', L('Pick a pattern or a live set song, if chosen in the MIDI panel. Otherwise one of the first 8 visuals: pad 1 From the code, 2 Lime, 3 Pulse, 4 Tunnel, 5 Cells, 6 Echo, 7 Glitch, 8 Plasma (webcam visuals only from the list)', 'Elegir un patrón o un tema del directo, si lo eliges en el panel MIDI. Si no, uno de los 8 primeros visuales: pad 1 Del código, 2 Lima, 3 Pulso, 4 Túnel, 5 Celdas, 6 Eco, 7 Glitch, 8 Plasma (los de webcam, solo desde la lista)')],
        ],
      },
    ],
  },
  {
    title: L('MPK Mini Mk II: knobs and joystick', 'MPK Mini Mk II: knobs y joystick'),
    short: L('MPK: knobs', 'MPK: knobs'),
    blocks: [
      {
        kind: 'table',
        head: [L('Control', 'Control'), L('What it does', 'Qué hace')],
        rows: [
          ['Knob 1', L('Echo, in the "MPK Mini" pattern and when playing without Play (same message as the joystick up)', 'Eco, en el patrón "MPK Mini" y al tocar sin Play (el mismo mensaje que el joystick hacia arriba)')],
          ['Knob 2', L('Filter, dark to bright (pattern and without Play)', 'Filtro, de apagado a brillante (patrón y sin Play)')],
          ['Knob 3', L('Reverb (pattern and without Play)', 'Reverb (patrón y sin Play)')],
          ['Knob 4', L('Volume of the backing beat in the "MPK Mini" pattern (starts at 0)', 'Volumen del ritmo de fondo en el patrón "MPK Mini" (empieza en 0)')],
          ['Knob 5', L('How many mirrors the "MPK Mini" visual has (Visual: From the code)', 'Cuántos espejos tiene el visual del "MPK Mini" (Visual: Del código)')],
          ['Knob 6', L('How fast that visual spins', 'Lo rápido que gira ese visual')],
          ['Knob 7', L('Master volume, always', 'Volumen general, siempre')],
          ['Knob 8', L('Size of the ASCII characters, always (with the ASCII filter on)', 'Tamaño de los caracteres ASCII, siempre (con el filtro ASCII activado)')],
          [L('Joystick sideways', 'Joystick a los lados'), L('Bends up to two semitones, in the "MPK Mini" pattern and when playing without Play, and shifts that pattern\'s visual. It applies to each new note, so it shows most with the arpeggiator or fast playing; a held note does not bend', 'Desafina hasta dos semitonos, en el patrón "MPK Mini" y al tocar sin Play, y desplaza el visual de ese patrón. Se aplica a cada nota nueva, así que se nota más con el arpegiador o tocando rápido; una nota mantenida no se desafina')],
        ],
      },
    ],
  },
  {
    title: L('MPK Mini Mk II: buttons', 'MPK Mini Mk II: botones'),
    short: L('MPK: buttons', 'MPK: botones'),
    blocks: [
      {
        kind: 'table',
        head: [L('MPK button', 'Botón del MPK'), L('What it does', 'Qué hace')],
        rows: [
          ['FULL LEVEL', L('Pads always hit at full strength (keys stay velocity sensitive)', 'Los pads suenan siempre a tope (las teclas siguen respondiendo a la fuerza)')],
          ['NOTE REPEAT', L('Holding a pad repeats it at the MPK tempo', 'Mantener un pad lo repite al tempo del MPK')],
          ['ARP ON/OFF', L('Holding a chord arpeggiates it; with LATCH it keeps going on its own', 'Mantener un acorde lo arpegia; con LATCH sigue solo')],
          ['TAP TEMPO', L('Sets the MPK tempo (120 by default). Match setcps in the pattern', 'Marca el tempo del MPK (120 de fábrica). Pon el mismo en setcps del patrón')],
          ['OCTAVE − / +', L('Moves the keys down or up an octave', 'Baja o sube las teclas una octava')],
          ['BANK A/B', L('Switches pad bank: use B for drums', 'Cambia el banco de pads: usa el B para batería')],
          ['CC / PROG CHANGE', L('Pad modes, see MPK: keys and pads', 'Modos de los pads, mira MPK: teclas y pads')],
        ],
      },
    ],
  },
  {
    title: L('TouchMe (Playtronica)', 'TouchMe (Playtronica)'),
    short: L('TouchMe', 'TouchMe'),
    blocks: [
      {
        kind: 'table',
        head: [L('What', 'Qué'), L('What it does', 'Qué hace')],
        rows: [
          [L('Touch someone', 'Tocar a alguien'), L('Plays notes on its own, like the MPK keys without Play: light contact low, more contact higher, in the scale set on its back (C major by default)', 'Toca notas solo, como las teclas del MPK sin Play: poco contacto grave, más contacto más agudo, en la escala de su parte de atrás (Do mayor de fábrica)')],
          ['touch()', L('How strong the touch is, 0 to 1, easing back to 0 when you let go: from its CC 90, or, if it sends none, from the note (the range it plays is learnt as you go). In patterns: .lpf(ref(() => 300 + touch() * 5000)); in Hydra: () => touch()', 'Cuánto os tocáis, de 0 a 1, volviendo a 0 al soltar: de su CC 90 o, si no lo manda, de la nota (aprende sobre la marcha el rango que toca). En patrones: .lpf(ref(() => 300 + touch() * 5000)); en Hydra: () => touch()')],
          ['touching()', L('true while someone touches', 'true mientras alguien toca')],
          [L('Pattern "TouchMe"', 'Patrón "TouchMe"'), L('A beat where the touch opens the bass and wakes up the hi-hats', 'Un ritmo en el que el contacto abre el bajo y despierta los charles')],
          [L('Visual "Touch"', 'Visual "Tacto"'), L('Grows, spins and brightens with the touch', 'Crece, gira y se ilumina con el contacto')],
        ],
      },
    ],
  },
  {
    title: L('Panels: code', 'Paneles: código'),
    short: L('Code', 'Código'),
    blocks: [
      {
        kind: 'table',
        head: [L('In More', 'En Más'), L('What it is for', 'Para qué sirve')],
        rows: [
          [L('History', 'Historial'), L('Every version that played, the last 50: ↩ loads one (Ctrl+Z undoes), ▶ loads and plays it. For going back to what sounded five minutes ago', 'Cada versión que sonó, las 50 últimas: ↩ carga una (Ctrl+Z la deshace), ▶ la carga y la toca')],
          [L('Save and share', 'Guardar y compartir'), L('Save (Ctrl+S), copy a link, export the code or a session, open a .js', 'Guardar (Ctrl+S), copiar un enlace, exportar el código o una sesión, abrir un .js')],
          [L('Offline', 'Sin internet'), L('Once opened, the studio works with no connection and keeps every sound it played. Before a gig: More → Live set → Get ready to play offline.', 'Una vez abierto, el estudio funciona sin conexión y guarda cada sonido que ha tocado. Antes de un concierto: Más → Directo → Preparar para tocar sin internet.')],
          [L('What to record', 'Qué grabar'), L('WAV audio, a video of the screen, or a vertical 9:16 video for socials (with the code on top if you like); MP4 when the browser can, else WebM. Then ● Record', 'Audio WAV, vídeo de la pantalla, o vídeo vertical 9:16 para redes (con el código encima si quieres); MP4 si el navegador puede, si no WebM. Luego ● Grabar')],
          [L('Whole session', 'Sesión entera'), L('In What to record: a long take of the jam, light enough for hours, with a marker at every change of code and every ★ (Alt+M). A .zip with the audio, the markers for Audacity and the code of every moment', 'En Qué grabar: horas de jam en poco espacio, con marcas en cada cambio de código y cada ★ (Alt+M). Un .zip: audio, marcas para Audacity y el código de cada momento')],
          [L('Separate tracks', 'Pistas por separado'), L('In What to record: a .zip with a WAV per track (named after it), the mix, the mic and the backing track, all aligned, to mix in a DAW. A stack(...) is split into its parts', 'En Qué grabar: un .zip con un WAV por pista (con su nombre), la mezcla, el micro y la pista de fondo, todos alineados, para mezclar en un DAW. Un stack(...) se separa en sus partes')],
        ],
      },
    ],
  },
  {
    title: L('Panels: create', 'Paneles: crear'),
    short: L('Create', 'Crear'),
    blocks: [
      {
        kind: 'table',
        head: [L('In More', 'En Más'), L('What it is for', 'Para qué sirve')],
        rows: [
          [L('Learn', 'Aprender'), L('14 short steps from one sound to a song with visuals; each one plays with a click and ends with a small challenge', '14 pasos cortos de un sonido a una canción con visuales; cada uno suena con un clic y acaba con un pequeño reto')],
          [L('Compose', 'Componer'), L('A song layer by layer without writing code: drums, hi-hats, bass, chords, melody and background, all in one key and tempo. Each layer is a named line (bass:) you can read and change. Arrangement: when each layer plays, in 8 parts of 4 bars', 'Una canción capa a capa sin escribir código: batería, charles, bajo, acordes, melodía y ambiente, todo en el mismo tono y tempo. Cada capa es una línea con nombre (bass:) que puedes leer y cambiar. Arreglo: cuándo suena cada capa, en 8 partes de 4 compases')],
          [L('Cheatsheet', 'Chuleta'), L('Examples to try, insert or copy. Insert adds a pattern as a new $: track, so every track plays together', 'Ejemplos para probar, insertar o copiar. Insertar añade un patrón como pista $: nueva, así suenan todas las pistas juntas')],
          [L('Samples', 'Samples'), L('Your sounds: files, or folders that become kits (s("kicks:3"))', 'Tus sonidos: archivos, o carpetas que se convierten en kits (s("kicks:3"))')],
          [L('Sampler', 'Samplear'), L('Take 1-8 bars of the backing track, the mic or everything, in time with the song, and keep them as s("muestra1") (whole, .loopAt(bars)) and s("muestra1_trozos") (8 chops for the pads)', 'Coge 1-8 compases de la pista de fondo, del micro o de todo, a tempo con la canción, y guárdalos como s("muestra1") (entero, .loopAt(compases)) y s("muestra1_trozos") (8 trozos para los pads)')],
          [L('Tools', 'Herramientas'), L('Other browser live coding tools; some open inside', 'Otras herramientas de live coding; algunas se abren dentro')],
        ],
      },
    ],
  },
  {
    title: L('Panels: controllers', 'Paneles: mandos'),
    short: L('Controllers', 'Mandos'),
    blocks: [
      {
        kind: 'table',
        head: [L('In More', 'En Más'), L('What it is for', 'Para qué sirve')],
        rows: [
          ['MIDI', L('Which number each pad and knob sends, the sound of the keys, what bank B pads play, and Record a riff: play (or hum into the mic) a few bars and get them back as code', 'Qué número manda cada pad y knob, el sonido de las teclas, qué tocan los pads del banco B, y Grabar un riff: tocas (o tarareas al micro) unos compases y te los devuelve como código')],
          [L('Play in a key', 'Tocar en escala'), L('MIDI → Play without Play: pick a key and a scale and every note you play moves to the nearest one of it, so nothing sounds wrong; with chords on, one key plays the scale\'s chord', 'MIDI → Tocar sin Play: elige tono y escala y cada nota que toques pasa a la más cercana de la escala, así nada desafina; con acordes, una tecla toca el acorde de la escala')],
          [L('Computer keyboard', 'Teclado del ordenador'), L('MIDI → Play without Play: tick it and A S D F G H J K L Ñ play white keys, W E T Y U O P black ones, Z/X change octave and 1–8 hit the pads (not in a pattern with parts). Not while typing in the editor', 'MIDI → Tocar sin Play: márcalo y A S D F G H J K L Ñ tocan las teclas blancas, W E T Y U O P las negras, Z/X cambian de octava y 1–8 tocan los pads (salvo en un patrón con partes). No mientras escribes en el editor')],
          [L('SP-404 / MIDI out', 'SP-404 / MIDI'), L('End a pattern in .sp() and it plays the SP-404MKII (or any MIDI device): s("a1 a5").sp() pads, n("1 5").sp("b") one bank, note("c3").sp() chromatic, ccn/ccv for its effects; optional MIDI clock with Play/Stop', 'Acaba un patrón en .sp() y toca la SP-404MKII (o cualquier aparato MIDI): s("a1 a5").sp() pads, n("1 5").sp("b") un banco, note("c3").sp() cromático, ccn/ccv para sus efectos; reloj MIDI con Play/Stop si quieres')],
          [L('Phone as controller', 'Móvil como mando'), L('Scan the QR code with your phone: an XY pad, 8 pads (the MPK bank B pads) and 8 knobs (its knobs; 7 is the volume), over WebRTC. The XY is phoneX() and phoneY() for patterns and visuals.', 'Escanea el QR con el móvil: un XY, 8 pads (los del banco B del MPK) y 8 mandos (sus knobs; el 7 es el volumen), por WebRTC. El XY es phoneX() y phoneY() para patrones y visuales.')],
        ],
      },
    ],
  },
  {
    title: L('Panels: sound', 'Paneles: sonido'),
    short: L('Sound', 'Sonido'),
    blocks: [
      {
        kind: 'table',
        head: [L('In More', 'En Más'), L('What it is for', 'Para qué sirve')],
        rows: [
          [L('Mic', 'Micro'), L('Your voice or any input (the SP-404MKII) with a noise gate, pitch, distortion, lo-fi, filter, muffle, auto-wah, robot, tremolo, vibrato, flanger, chorus, echo and ping-pong (in time while playing) and reverb, 28 presets in four groups; into recordings; Hear me also plays it (headphones only)', 'Tu voz o cualquier entrada (la SP-404MKII) con puerta de ruido, tono, distorsión, lo-fi, filtro, apagado, auto-wah, robot, trémolo, vibrato, flanger, coro, eco y ping-pong (a tempo mientras suena) y reverb, 28 preajustes en cuatro grupos; sale en las grabaciones; Oírme también la reproduce (solo con auriculares)')],
          [L('Tuner', 'Afinador'), L('Mic → Tuner: the note you sing; your voice can play a synth, in tune. voiceNote() and voiceLevel() for patterns', 'Micro → Afinador: la nota que cantas; tu voz puede tocar un sinte afinado. voiceNote() y voiceLevel() para patrones')],
          [L('Looper', 'Looper'), L('Record 1, 2 or 4 bars of your voice (or the backing track, or everything) over the playing pattern and they repeat in time at once; each layer is a line s("capa1").loopAt(2) in the code. Undo the last, remove all, and a Timing nudge', 'Graba 1, 2 o 4 compases de tu voz (o de la pista de fondo, o de todo) encima del patrón y se repiten a tempo al momento; cada capa es una línea s("capa1").loopAt(2) en el código. Deshacer la última, borrar todas y un ajuste de tiempo')],
          [L('Backing track', 'Pista de fondo'), L('A song under your patterns: your own file or another tab\'s sound (YouTube). It can start and stop with Play; into recordings and visuals, not to a live room', 'Una canción debajo de tus patrones: un archivo tuyo o el sonido de otra pestaña (YouTube). Puede empezar y parar con el Play; sale en grabaciones y visuales, no en la sala')],
          [L('Pump', 'Bombeo'), L('Every kick (bd) pushes the rest down and lets it swell back, the breathing of house. Amount and how long it takes to come back; any pattern, the code stays as it is', 'Cada bombo (bd) agacha el resto y lo deja volver, la respiración del house. Cantidad y cuánto tarda en volver; con cualquier patrón, el código no cambia')],
        ],
      },
    ],
  },
  {
    title: L('Panels: live', 'Paneles: directo'),
    short: L('Live', 'Directo'),
    blocks: [
      {
        kind: 'table',
        head: [L('In More', 'En Más'), L('What it is for', 'Para qué sirve')],
        rows: [
          [L('Live set', 'Directo'), L('The running order for a gig: songs with their visual; during the set ◀ ▶, ← → or a clicker move through it, on the next bar while it plays', 'El orden de los temas para un concierto, cada uno con su visual; durante el directo ◀ ▶, ← → o un pasador lo recorren, en el próximo compás si está sonando')],
          [L('Live room', 'Sala en directo'), L('Open a room and send the link: friends hear your code made in their own browser, with your visual and your samples; every play and stop reaches them', 'Abre una sala y pasa el enlace: tus amigos oyen tu código generado en su navegador, con tu visual y tus samples; cada Play y Stop les llega')],
          [L('Caption', 'Rótulo'), L('Your name and the song over the visuals, bottom right, for streams; the title can follow the live set song or the pattern. In the vertical recording too', 'Tu nombre y el tema sobre los visuales, abajo a la derecha, para los directos; el título puede seguir la canción del set o el patrón. También en la grabación vertical')],
          [L('Build-up', 'Subidón'), L('From the next bar, 2, 4 or 8 bars that build up (snare roll, noise riser, bass going away, silence before) and the drop on the one. Stop calls it off', 'Desde el siguiente compás, 2, 4 u 8 compases que suben (redoble, ruido, graves que se van, hueco) y el drop en el uno. Stop lo cancela')],
        ],
      },
    ],
  },
  {
    title: L('Panels: visuals', 'Paneles: visuales'),
    short: L('Visuals', 'Visuales'),
    blocks: [
      {
        kind: 'table',
        head: [L('In More', 'En Más'), L('What it is for', 'Para qué sirve')],
        rows: [
          ['VJ', L('Six effects over any built-in visual (zoom, colour, warp, pixels, trails, spin), with sliders or, if ticked, MPK knobs 1–6', 'Seis efectos sobre cualquier visual incluido (zoom, color, distorsión, píxeles, estela, giro), con deslizadores o, si lo marcas, con los knobs 1–6 del MPK')],
          [L('Video', 'Vídeo'), L('YouTube behind everything, or your video or a tab through the webcam visuals', 'YouTube de fondo, o tu vídeo o una pestaña a través de los visuales de webcam')],
          [L('Audio waves', 'Ondas del audio'), L('An oscilloscope of what is playing along the bottom, over any visual; also in vertical videos', 'Un osciloscopio de lo que suena abajo, encima de cualquier visual; también sale en los vídeos verticales')],
          [L('Vertical framing', 'Encuadre vertical'), L('The visuals and the code in a 9:16 column under the bar, for vertical streams: in OBS, profile "joe doe live vertical" and scene "Vertical" crop exactly that column (Chrome full screen, F11)', 'Los visuales y el código en una columna 9:16 bajo la barra, para directos verticales: en OBS, el perfil "joe doe live vertical" y la escena "Vertical" recortan justo esa columna (Chrome a pantalla completa, F11)')],
          [L('ASCII filter', 'Filtro ASCII'), L('Turns any visual, webcam included, into characters', 'Convierte cualquier visual, webcam incluida, en caracteres')],
        ],
      },
    ],
  },
  {
    title: L('If something goes wrong', 'Si algo falla'),
    short: L('If something goes wrong', 'Si algo falla'),
    blocks: [
      {
        kind: 'table',
        head: [L('What happens', 'Qué pasa'), L('Try', 'Prueba')],
        rows: [
          [L('No sound', 'No suena'), L('Click the page once, check the system volume, press Play', 'Haz clic en la página, revisa el volumen del sistema, pulsa Play')],
          [L('MIDI not found', 'No detecta el MIDI'), L('Use Chrome or Edge, More → MIDI → Enable MIDI, reload', 'Usa Chrome o Edge, Más → MIDI → Activar MIDI, recarga')],
          [L('Clicks or gaps', 'Clics o cortes'), L('Try "No visuals"; open the page with ?debug and copy the report', 'Prueba "Sin visuales"; abre la página con ?debug y copia el informe')],
          [L('Pads change the visual', 'Los pads cambian el visual'), L('PROG CHANGE is on: press it again', 'Está activo PROG CHANGE: vuelve a pulsarlo')],
          [L('Arpeggio will not stop', 'El arpegio no para'), L('ARP ON/OFF (and LATCH) on the MPK', 'ARP ON/OFF (y LATCH) en el MPK')],
        ],
      },
    ],
  },
];

// The help opens in its own window over the studio: the ? button, the ? key
export function openHelp() {
  const dialog = document.querySelector<HTMLDialogElement>('#help')!;
  if (dialog.open) dialog.close();
  else dialog.showModal();
}

export function setupHelp() {
  const container = document.querySelector<HTMLElement>('#help-content')!;
  const dialog = document.querySelector<HTMLDialogElement>('#help')!;
  document.querySelector('#help-button')!.addEventListener('click', openHelp);
  // On phones the ? button leaves the bar (no room) and lives in the menu
  document.querySelector('#help-menu')!.addEventListener('click', openHelp);
  document.querySelector('#help-close')!.addEventListener('click', () => dialog.close());
  // A click on the dimmed backdrop (outside the box) closes it too
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  const text = (value: string | Localized) => (typeof value === 'string' ? value : pick(value));

  // One section at a time: an index on the left, the section on the right
  let current = readStorage<number>('jdl:help-section', 0);
  const block = (item: Block) => {
    if (item.kind === 'text') {
      const p = document.createElement('p');
      p.className = 'panel-help';
      p.textContent = pick(item.body);
      return p;
    }
    if (item.kind === 'steps') {
      const ol = document.createElement('ol');
      ol.className = 'help-steps';
      for (const step of item.items) {
        const li = document.createElement('li');
        li.textContent = pick(step);
        ol.append(li);
      }
      return ol;
    }
    const table = document.createElement('table');
    table.className = 'help-table';
    const head = table.createTHead().insertRow();
    for (const cell of item.head) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = pick(cell);
      head.append(th);
    }
    const body = table.createTBody();
    for (const [key, value] of item.rows) {
      const row = body.insertRow();
      const th = document.createElement('th');
      th.scope = 'row';
      th.textContent = text(key);
      row.append(th);
      row.insertCell().textContent = text(value);
    }
    return table;
  };

  const render = () => {
    if (!sections[current]) current = 0;
    const nav = document.createElement('nav');
    nav.className = 'help-index';
    nav.setAttribute('aria-label', pick(L('Help sections', 'Apartados de la ayuda')));
    sections.forEach((section, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'help-index-item';
      button.textContent = pick(section.short);
      button.setAttribute('aria-current', String(index === current));
      button.addEventListener('click', () => {
        current = index;
        writeStorage('jdl:help-section', current);
        render();
        container.querySelector<HTMLElement>('.help-section')?.scrollTo(0, 0);
      });
      nav.append(button);
    });
    const pane = document.createElement('section');
    pane.className = 'help-section';
    const heading = document.createElement('h3');
    heading.textContent = pick(sections[current].title);
    pane.append(heading, ...sections[current].blocks.map(block));
    container.replaceChildren(nav, pane);
  };

  render();
  onLangChange(render);
}
