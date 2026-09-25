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
          L('Pick a visual next to the pattern.', 'Elige un visual al lado del patrón.'),
          L('Ctrl+. stops. Mistakes show up at the bottom in plain words.', 'Ctrl+. para. Los errores salen abajo explicados.'),
          L('More → Cheatsheet has examples to copy.', 'Más → Chuleta tiene ejemplos para copiar.'),
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
          ['Ctrl+Shift+H', L('Hide the code (performance mode)', 'Ocultar el código (modo concierto)')],
          ['?', L('This help', 'Esta ayuda')],
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
          'Enable MIDI once in More → MIDI. The keys play straight away without pressing Play (pick their sound in the MIDI panel), or through the "MPK Mini" pattern while it plays. Click the page once first so the browser lets it make sound.',
          'Activa el MIDI una vez en Más → MIDI. Las teclas suenan directamente sin pulsar Play (su sonido se elige en el panel MIDI), o a través del patrón "MPK Mini" mientras suena. Haz clic una vez en la página antes para que el navegador deje sonar.',
        ),
      },
      {
        kind: 'table',
        head: [L('Pad mode (MPK buttons)', 'Modo de los pads (botones del MPK)'), L('What the pads do', 'Qué hacen los pads')],
        rows: [
          [L('Normal, bank B', 'Normal, banco B'), L('Drums: kick, snare, hat, open hat, clap, rim, low tom, high tom', 'Batería: bombo, caja, charles, charles abierto, palmada, rim, tom grave, tom agudo')],
          [L('Normal, bank A', 'Normal, banco A'), L('Same notes as the lowest keys: avoid it for drums', 'Las mismas notas que las teclas más graves: mejor no usarlo para batería')],
          ['CC', L('Hold to apply ("MPK Mini" pattern): pad 1 cuts the beat, pad 2 crushes the piano', 'Mantener para aplicar (patrón "MPK Mini"): pad 1 corta el ritmo, pad 2 ensucia el piano')],
          ['PROG CHANGE', L('Pick one of the first 8 visuals: pad 1 From the code, 2 Lime, 3 Pulse, 4 Tunnel, 5 Cells, 6 Echo, 7 Glitch, 8 Plasma (webcam visuals only from the list)', 'Elegir uno de los 8 primeros visuales: pad 1 Del código, 2 Lima, 3 Pulso, 4 Túnel, 5 Celdas, 6 Eco, 7 Glitch, 8 Plasma (los de webcam, solo desde la lista)')],
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
          ['Knob 8', L('Size of the ASCII characters, always', 'Tamaño de los caracteres ASCII, siempre')],
          [L('Joystick sideways', 'Joystick a los lados'), L('Bends the piano up to a semitone and shifts the visual', 'Desafina el piano hasta un semitono y desplaza el visual')],
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
          [L('Cheatsheet', 'Chuleta'), L('Strudel, Hydra, instruments and MIDI examples, one click to copy', 'Ejemplos de Strudel, Hydra, instrumentos y MIDI, se copian con un clic')],
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
