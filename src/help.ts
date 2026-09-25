// Help panel: getting started, shortcuts, every control of the MPK Mini Mk II
// in each of its modes, the panels, and what to do when something goes wrong.
import { onLangChange, pick, type Localized } from './i18n';

type Block =
  | { kind: 'text'; body: Localized }
  | { kind: 'steps'; items: Localized[] }
  | { kind: 'table'; head: [Localized, Localized]; rows: [string | Localized, Localized][] };
type Section = { title: Localized; blocks: Block[] };

const L = (en: string, es: string): Localized => ({ en, es });

const sections: Section[] = [
  {
    title: L('Getting started', 'Para empezar'),
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
    blocks: [
      {
        kind: 'table',
        head: [L('Keys', 'Teclas'), L('What it does', 'Qué hace')],
        rows: [
          ['Ctrl+Enter', L('Play / apply the changes', 'Play / aplicar los cambios')],
          ['Ctrl+.', L('Stop', 'Stop')],
          ['Ctrl+Z · ↶ / Ctrl+Shift+Z · ↷', L('Undo / redo; with the buttons, while it plays you hear each step', 'Deshacer / rehacer; con los botones, mientras suena oyes cada paso')],
          ['Ctrl+Shift+H', L('Hide the code (performance mode)', 'Ocultar el código (modo concierto)')],
          ['?', L('This help', 'Esta ayuda')],
          ['1 – 8', L('Switch parts on and off in a pattern that uses them (Scenes)', 'Encender y apagar partes en un patrón que las use (Escenas)')],
          ['Esc', L('Close the menu or an embedded tool', 'Cerrar el menú o una herramienta incrustada')],
        ],
      },
    ],
  },
  {
    title: L('MPK Mini Mk II: keys and pads', 'MPK Mini Mk II: teclas y pads'),
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
          [L('Normal, bank B', 'Normal, banco B'), L('Drums: kick, snare, hat, open hat, clap, rim, low tom, high tom', 'Batería: bombo, caja, charles, charles abierto, palmada, rim, tom grave, tom agudo')],
          [L('Normal, bank A', 'Normal, banco A'), L('Same notes as the lowest keys: avoid it for drums', 'Las mismas notas que las teclas más graves: mejor no usarlo para batería')],
          ['CC', L('"Scenes" pattern: each pad switches its part on or off. "MPK Mini" pattern: hold pad 1 to cut the beat, pad 2 to crush the piano', 'Patrón "Escenas": cada pad enciende o apaga su parte. Patrón "MPK Mini": mantén el pad 1 para cortar el ritmo y el 2 para ensuciar el piano')],
          ['PROG CHANGE', L('Pick a pattern, if chosen in the MIDI panel. Otherwise one of the first 8 visuals: pad 1 From the code, 2 Lime, 3 Pulse, 4 Tunnel, 5 Cells, 6 Echo, 7 Glitch, 8 Plasma (webcam visuals only from the list)', 'Elegir un patrón, si lo eliges en el panel MIDI. Si no, uno de los 8 primeros visuales: pad 1 Del código, 2 Lima, 3 Pulso, 4 Túnel, 5 Celdas, 6 Eco, 7 Glitch, 8 Plasma (los de webcam, solo desde la lista)')],
        ],
      },
    ],
  },
  {
    title: L('MPK Mini Mk II: knobs, joystick and buttons', 'MPK Mini Mk II: knobs, joystick y botones'),
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
          ['CC / PROG CHANGE', L('Pad modes, see the table above', 'Modos de los pads, mira la tabla de arriba')],
        ],
      },
    ],
  },
  {
    title: L('Panels', 'Paneles'),
    blocks: [
      {
        kind: 'table',
        head: [L('In More', 'En Más'), L('What it is for', 'Para qué sirve')],
        rows: [
          [L('Learn', 'Aprender'), L('14 short steps from one sound to a song with visuals; each one plays with a click and ends with a small challenge', '14 pasos cortos de un sonido a una canción con visuales; cada uno suena con un clic y acaba con un pequeño reto')],
          [L('Compose', 'Componer'), L('A song layer by layer without writing code: drums, hi-hats, bass, chords, melody and background, all in one key and tempo. Each layer is a named line (bass:) you can read and change', 'Una canción capa a capa sin escribir código: batería, charles, bajo, acordes, melodía y ambiente, todo en el mismo tono y tempo. Cada capa es una línea con nombre (bass:) que puedes leer y cambiar')],
          [L('Cheatsheet', 'Chuleta'), L('Examples to try, insert or copy. Insert adds a pattern as a new $: track, so every track plays together', 'Ejemplos para probar, insertar o copiar. Insertar añade un patrón como pista $: nueva, así suenan todas las pistas juntas')],
          [L('Copy / Download the code', 'Copiar / Descargar el código'), L('Your code to the clipboard, or as a .js file that opens in any Strudel', 'Tu código al portapapeles, o como archivo .js que se abre en cualquier Strudel')],
          [L('Video', 'Vídeo'), L('YouTube behind everything, or your video or a tab through the webcam visuals', 'YouTube de fondo, o tu vídeo o una pestaña a través de los visuales de webcam')],
          [L('Tools', 'Herramientas'), L('Other browser live coding tools; some open inside', 'Otras herramientas de live coding; algunas se abren dentro')],
          [L('Samples', 'Samples'), L('Your sounds: files, or folders that become kits (s("kicks:3"))', 'Tus sonidos: archivos, o carpetas que se convierten en kits (s("kicks:3"))')],
          ['MIDI', L('Which number each pad and knob sends, and the sound of the keys', 'Qué número manda cada pad y knob, y el sonido de las teclas')],
          [L('ASCII filter', 'Filtro ASCII'), L('Turns any visual, webcam included, into characters', 'Convierte cualquier visual, webcam incluida, en caracteres')],
          [L('What to record', 'Qué grabar'), L('WAV audio or video with visuals; then ● Record', 'Audio WAV o vídeo con visuales; luego ● Grabar')],
        ],
      },
    ],
  },
  {
    title: L('If something goes wrong', 'Si algo falla'),
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

export function setupHelp() {
  const container = document.querySelector<HTMLElement>('#help-content')!;
  const text = (value: string | Localized) => (typeof value === 'string' ? value : pick(value));

  const render = () => {
    container.replaceChildren();
    for (const section of sections) {
      const heading = document.createElement('h3');
      heading.textContent = pick(section.title);
      container.append(heading);
      for (const block of section.blocks) {
        if (block.kind === 'text') {
          const p = document.createElement('p');
          p.className = 'panel-help';
          p.textContent = pick(block.body);
          container.append(p);
        } else if (block.kind === 'steps') {
          const ol = document.createElement('ol');
          ol.className = 'help-steps';
          for (const item of block.items) {
            const li = document.createElement('li');
            li.textContent = pick(item);
            ol.append(li);
          }
          container.append(ol);
        } else {
          const table = document.createElement('table');
          table.className = 'help-table';
          const head = table.createTHead().insertRow();
          for (const cell of block.head) {
            const th = document.createElement('th');
            th.scope = 'col';
            th.textContent = pick(cell);
            head.append(th);
          }
          const body = table.createTBody();
          for (const [key, value] of block.rows) {
            const row = body.insertRow();
            const th = document.createElement('th');
            th.scope = 'row';
            th.textContent = text(key);
            row.append(th);
            row.insertCell().textContent = text(value);
          }
          container.append(table);
        }
      }
    }
  };

  render();
  onLangChange(render);
}
