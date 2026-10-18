// Cheatsheet panel: the Strudel and Hydra basics, each with a short example
// that copies with one click. Checked against Strudel 1.3 / hydra-synth 1.4.
import { onLangChange, pick, t, type Localized } from './i18n';
import { isPatternSnippet, trackChanges } from './tracks';

type Entry = { code: string; note: Localized };
// How "Try" turns an example into a pattern that plays; null: it needs a
// controller, so it can only be inserted
type Demo = (code: string) => string | null;
// tab: which of the panel's three tabs it goes in
type Section = { title: Localized; entries: Entry[]; demo: Demo; tab: 'rhythm' | 'sound' | 'visual' };

const beat = 's("bd*2, ~ sd, hh*4").bank("RolandTR909").gain(0.8)';
const notes = 'note("c3 e3 g3 b3")';
const onNotes: Demo = (code) => (code.startsWith('.') ? `${notes}.s("piano")${code}` : code);
const standalone: Demo = (code) => (code.startsWith('setcps') ? `${code}\ns("bd sd [~ bd] sd")` : code);
const hydra: Demo = (code) =>
  `await initHydra()\n${code.startsWith('.') ? `osc(10, 0.1, 1).color(0.34, 0.4, 0.12)${code}.out()` : code}\n\n${beat}.analyze(1)`;

const sections: Section[] = [
  {
    title: { en: 'Basics', es: 'Lo básico', ca: 'El bàsic' }, tab: 'rhythm',
    demo: standalone,
    entries: [
      { code: 's("bd sd hh sd")', note: { en: 'Sounds in sequence, one per step', es: 'Sonidos en secuencia, uno por paso', ca: 'Sons en seqüència, un per pas' } },
      { code: 'note("c3 e3 g3").s("piano")', note: { en: 'Notes played by an instrument', es: 'Notas tocadas por un instrumento', ca: 'Notes tocades per un instrument' } },
      { code: 'stack(s("bd*4"), s("hh*8"))', note: { en: 'Several patterns at once', es: 'Varios patrones a la vez', ca: 'Diversos patrons alhora' } },
      { code: 'setcps(90 / 60 / 4)', note: { en: 'Tempo: 90 BPM in 4/4', es: 'Tempo: 90 BPM en 4/4', ca: 'Tempo: 90 BPM en 4/4' } },
    ],
  },
  {
    title: { en: 'Mini-notation (inside the quotes)', es: 'Mini-notación (dentro de las comillas)', ca: 'Mininotació (dins de les cometes)' }, tab: 'rhythm',
    demo: standalone,
    entries: [
      { code: 's("bd*4")', note: { en: '* repeats within the step', es: '* repite dentro del paso', ca: '* repeteix dins del pas' } },
      { code: 's("bd ~ sd ~")', note: { en: '~ is a rest', es: '~ es un silencio', ca: '~ és un silenci' } },
      { code: 's("[bd bd] sd")', note: { en: '[ ] splits one step in two', es: '[ ] divide un paso en varios', ca: '[ ] divideix un pas en uns quants' } },
      { code: 'note("<c3 e3 g3>")', note: { en: '< > one per bar', es: '< > uno por compás', ca: '< > un per compàs' } },
      { code: 's("bd*2, hh*8")', note: { en: 'a comma plays both together', es: 'la coma toca los dos a la vez', ca: 'la coma toca els dos alhora' } },
      { code: 's("hh*8?")', note: { en: '? plays only sometimes', es: '? toca solo a veces', ca: '? només toca de tant en tant' } },
    ],
  },
  {
    title: { en: 'Sound', es: 'Sonido', ca: 'So' }, tab: 'sound',
    demo: onNotes,
    entries: [
      { code: '.gain(0.8)', note: { en: 'Volume', es: 'Volumen', ca: 'Volum' } },
      { code: '.lpf(800)', note: { en: 'Low-pass filter: darker', es: 'Filtro paso bajo: más apagado', ca: 'Filtre passabaix: més apagat' } },
      { code: '.hpf(2000)', note: { en: 'High-pass filter: thinner', es: 'Filtro paso alto: más fino', ca: 'Filtre passaalt: més fi' } },
      { code: '.room(0.5)', note: { en: 'Reverb', es: 'Reverb', ca: 'Reverb' } },
      { code: '.delay(0.3)', note: { en: 'Echo', es: 'Eco', ca: 'Eco' } },
      { code: '.crush(8)', note: { en: 'Bitcrusher: lo-fi grit', es: 'Bitcrusher: suciedad lo-fi', ca: 'Bitcrusher: brutícia lo-fi' } },
      { code: '.speed(2)', note: { en: 'Sample speed (and pitch)', es: 'Velocidad (y tono) del sample', ca: 'Velocitat (i to) del sample' } },
      { code: '.pan("0 1")', note: { en: 'Left to right', es: 'De izquierda a derecha', ca: "D'esquerra a dreta" } },
      { code: '.lpf(sine.range(300, 3000).slow(4))', note: { en: 'Move a value with a slow wave', es: 'Mover un valor con una onda lenta', ca: 'Moure un valor amb una ona lenta' } },
    ],
  },
  {
    title: { en: 'Instruments', es: 'Instrumentos', ca: 'Instruments' }, tab: 'sound',
    demo: (code) => `${notes}${code}`,
    entries: [
      { code: '.s("gm_epiano1")', note: { en: 'Electric piano', es: 'Piano eléctrico', ca: 'Piano elèctric' } },
      { code: '.s("gm_drawbar_organ")', note: { en: 'Drawbar (Hammond) organ; also gm_rock_organ, gm_church_organ', es: 'Órgano Hammond; también gm_rock_organ, gm_church_organ', ca: 'Orgue Hammond; també gm_rock_organ, gm_church_organ' } },
      { code: '.s("gm_string_ensemble_1")', note: { en: 'Strings; also gm_violin, gm_cello', es: 'Cuerdas; también gm_violin, gm_cello', ca: 'Cordes; també gm_violin, gm_cello' } },
      { code: '.s("gm_pad_warm")', note: { en: 'Warm pad; also gm_pad_choir, gm_pad_halo', es: 'Pad cálido; también gm_pad_choir, gm_pad_halo', ca: 'Pad càlid; també gm_pad_choir, gm_pad_halo' } },
      { code: '.s("gm_vibraphone")', note: { en: 'Vibraphone; also gm_marimba, gm_kalimba', es: 'Vibráfono; también gm_marimba, gm_kalimba', ca: 'Vibràfon; també gm_marimba, gm_kalimba' } },
      { code: '.s("gm_acoustic_bass")', note: { en: 'Double bass; also gm_synth_bass_1', es: 'Contrabajo; también gm_synth_bass_1', ca: 'Contrabaix; també gm_synth_bass_1' } },
      { code: '.s("sawtooth")', note: { en: 'Synth: also square, triangle, sine', es: 'Sinte: también square, triangle, sine', ca: 'Sinte: també square, triangle, sine' } },
      { code: '.s("supersaw")', note: { en: 'Several detuned saws at once: big and wide', es: 'Varias sierras desafinadas a la vez: gordo y ancho', ca: 'Unes quantes serres desafinades alhora: gros i ample' } },
    ],
  },
  {
    title: { en: 'Harmony', es: 'Armonía', ca: 'Harmonia' }, tab: 'rhythm',
    demo: standalone,
    entries: [
      { code: 'chord("<Am7 Dm7 G7 C^7>").voicing()', note: { en: 'Chords, voiced for you', es: 'Acordes ya colocados', ca: 'Acords ja col·locats' } },
      { code: 'n("0 2 4 7").scale("C:minor")', note: { en: 'Scale degrees', es: 'Grados de una escala', ca: "Graus d'una escala" } },
    ],
  },
  {
    title: { en: 'Variation', es: 'Variación', ca: 'Variació' }, tab: 'rhythm',
    demo: onNotes,
    entries: [
      { code: '.fast(2)', note: { en: 'Twice as fast (.slow for slower)', es: 'El doble de rápido (.slow para más lento)', ca: 'El doble de ràpid (.slow per anar més lent)' } },
      { code: '.rev()', note: { en: 'Backwards', es: 'Al revés', ca: 'Al revés' } },
      { code: '.every(4, x => x.fast(2))', note: { en: 'Change every 4 bars', es: 'Cambia cada 4 compases', ca: 'Canvia cada 4 compassos' } },
      { code: '.sometimes(x => x.speed(2))', note: { en: 'Change at random', es: 'Cambia al azar', ca: "Canvia a l'atzar" } },
      { code: '.jux(rev)', note: { en: 'Right channel backwards: instant stereo', es: 'El canal derecho al revés: estéreo al instante', ca: "El canal dret al revés: estèreo a l'instant" } },
      { code: '.off(1/8, x => x.add(note(12)))', note: { en: 'A delayed copy an octave up', es: 'Una copia retrasada una octava arriba', ca: 'Una còpia endarrerida una octava amunt' } },
    ],
  },
  {
    title: { en: 'Hydra (visuals)', es: 'Hydra (visuales)', ca: 'Hydra (visuals)' }, tab: 'visual',
    demo: hydra,
    entries: [
      { code: 'osc(10, 0.1, 1).out()', note: { en: 'Oscillator: stripes', es: 'Oscilador: franjas', ca: 'Oscil·lador: franges' } },
      { code: 'noise(3).out()', note: { en: 'Noise', es: 'Ruido', ca: 'Soroll' } },
      { code: 'shape(4, 0.3).out()', note: { en: 'Shape (4 = square)', es: 'Forma (4 = cuadrado)', ca: 'Forma (4 = quadrat)' } },
      { code: '.kaleid(4)', note: { en: 'Kaleidoscope', es: 'Caleidoscopio', ca: 'Calidoscopi' } },
      { code: '.rotate(0, 0.1)', note: { en: 'Slow rotation', es: 'Rotación lenta', ca: 'Rotació lenta' } },
      { code: '.modulate(noise(2), 0.2)', note: { en: 'Warp with noise', es: 'Deformar con ruido', ca: 'Deformar amb soroll' } },
      { code: '.color(0.34, 0.4, 0.12)', note: { en: 'Tint (red, green, blue)', es: 'Tintar (rojo, verde, azul)', ca: 'Tenyir (vermell, verd, blau)' } },
      { code: '.color(...tint(0.4))', note: { en: 'Tint with the theme colour (0 dark to 1 full)', es: 'Tintar con el color del tema (de 0 oscuro a 1 pleno)', ca: 'Tenyir amb el color del tema (de 0 fosc a 1 ple)' } },
      { code: '.scale(() => 1 + bass())', note: { en: 'Grow with the kick (pattern needs .analyze(1))', es: 'Crece con el bombo (el patrón necesita .analyze(1))', ca: 'Creix amb el bombo (el patró necessita .analyze(1))' } },
      { code: '.kaleid(H("<3 4 6>"))', note: { en: 'Follow the bar with H("...")', es: 'Seguir el compás con H("...")', ca: 'Seguir el compàs amb H("...")' } },
    ],
  },
  {
    title: { en: 'MIDI', es: 'MIDI', ca: 'MIDI' }, tab: 'visual',
    demo: () => null,
    entries: [
      { code: "const knob = await midin('MPK')", note: { en: 'Read knobs; knob(1) goes 0 to 1', es: 'Leer knobs; knob(1) va de 0 a 1', ca: 'Llegir knobs; knob(1) va de 0 a 1' } },
      { code: '.lpf(knob(1).range(300, 5000))', note: { en: 'A knob moves the filter', es: 'Un knob mueve el filtro', ca: 'Un knob mou el filtre' } },
      { code: 'knob(1, 10)', note: { en: 'Only CC 1 on channel 10 (MPK pads in CC mode)', es: 'Solo el CC 1 del canal 10 (pads del MPK en modo CC)', ca: 'Només el CC 1 del canal 10 (pads del MPK en mode CC)' } },
      { code: "const pads = await midikeys('MPK')", note: { en: 'Keys and pads as notes', es: 'Teclas y pads como notas', ca: 'Tecles i pads com a notes' } },
      { code: 'pads().s("piano")', note: { en: 'Play them with an instrument', es: 'Tocarlas con un instrumento', ca: 'Tocar-les amb un instrument' } },
      { code: '.speed(ref(() => 2 ** (bend() * 2 / 12)))', note: { en: 'Pitch bend (joystick sideways), -1 to 1', es: 'Pitch bend (joystick a los lados), de -1 a 1', ca: 'Pitch bend (joystick cap als costats), de -1 a 1' } },
      { code: '.lpf(ref(() => 300 + touch() * 5000))', note: { en: 'TouchMe: the touch opens the filter (touch() 0 to 1)', es: 'TouchMe: el contacto abre el filtro (touch() de 0 a 1)', ca: 'TouchMe: el contacte obre el filtre (touch() de 0 a 1)' } },
      { code: '.gain(ref(() => (touching() ? 0.8 : 0)))', note: { en: 'TouchMe: sounds only while someone touches', es: 'TouchMe: suena solo mientras alguien toca', ca: 'TouchMe: només sona mentre algú toca' } },
    ],
  },
];

type Editor = {
  code: string;
  setCode(code: string): void;
  evaluate(): Promise<void>;
  repl?: { scheduler?: { started?: boolean } };
  editor?: {
    state: {
      replaceSelection(text: string): unknown;
      doc: { length: number; lines: number; lineAt(pos: number): { number: number } };
      selection: { main: { head: number } };
    };
    dispatch(transaction: unknown): void;
    focus(): void;
  };
};

// "Try" puts a complete example in the editor and plays it, keeping your code
// to go back to; "Insert" drops the snippet into your code where the cursor is
export function setupCheatsheet({ editor, useCodeVisual }: { editor: Editor; useCodeVisual: () => void }) {
  const list = document.querySelector<HTMLElement>('#cheat-list')!;
  const filter = document.querySelector<HTMLInputElement>('#cheat-filter')!;
  const status = document.querySelector<HTMLElement>('#cheat-status')!;
  const back = document.querySelector<HTMLButtonElement>('#cheat-back')!;

  let yourCode: string | null = null;

  const tryIt = async (demo: string, isVisual: boolean) => {
    yourCode ??= editor.code; // only the first try: the rest are examples too
    editor.setCode(demo);
    if (isVisual) useCodeVisual();
    await editor.evaluate();
    status.textContent = t('tryingExample');
    back.hidden = false;
  };

  back.addEventListener('click', () => {
    if (yourCode !== null) editor.setCode(yourCode);
    yourCode = null;
    back.hidden = true;
    status.textContent = t('backToCodeDone');
  });

  const insert = (code: string) => {
    const view = editor.editor;
    if (!view) return;
    // A whole pattern becomes a new "$:" track at the end, and the bare
    // patterns already there become tracks too: otherwise only the last one
    // would sound. While it plays, it joins in straight away
    if (isPatternSnippet(code)) {
      const { changes, anchor } = trackChanges(editor.code, code);
      // One transaction, so a single undo takes it all back
      view.dispatch({ changes, selection: { anchor }, scrollIntoView: true });
      view.focus();
      if (editor.repl?.scheduler?.started) {
        void editor.evaluate();
        status.textContent = t('trackAddedPlaying');
      } else status.textContent = t('trackAdded');
      return;
    }
    // A method (.lpf(800)) chains onto what is before the cursor; anything
    // else (setcps, Hydra) goes on a line of its own
    const head = view.state.selection.main.head;
    const atLineStart = head === 0 || editor.code[head - 1] === '\n';
    const text = code.startsWith('.') || atLineStart ? code : `\n${code}`;
    view.dispatch(view.state.replaceSelection(text));
    view.focus();
    const line = view.state.doc.lineAt(view.state.selection.main.head).number;
    status.textContent = t('inserted', { line });
  };

  // Small icon buttons next to the example; their name on hover and for
  // screen readers
  const button = (icon: string, label: string, className: string, onClick: () => void) => {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = `cheat-icon ${className}`;
    element.textContent = icon;
    element.title = label;
    element.setAttribute('aria-label', label);
    element.addEventListener('click', onClick);
    return element;
  };

  const render = () => {
    const panes = { rhythm: '#cheat-tab-rhythm', sound: '#cheat-tab-sound', visual: '#cheat-tab-visual' } as const;
    for (const pane of Object.values(panes)) list.querySelector(pane)!.replaceChildren();
    for (const section of sections) {
      const group = document.createElement('section');
      group.className = 'cheat-group';
      const heading = document.createElement('h3');
      heading.textContent = pick(section.title);
      const ul = document.createElement('ul');
      ul.className = 'panel-list cheat-entries';
      for (const entry of section.entries) {
        const li = document.createElement('li');
        li.dataset.search = `${entry.code} ${entry.note.en} ${entry.note.es} ${entry.note.ca}`.toLowerCase();
        const code = document.createElement('code');
        code.className = 'cheat-code';
        code.textContent = entry.code;
        const note = document.createElement('p');
        note.className = 'cheat-note';
        note.textContent = pick(entry.note);
        const actions = document.createElement('div');
        actions.className = 'cheat-icons';
        const demo = section.demo(entry.code);
        if (demo) actions.append(button('▶', t('tryIt'), 'cheat-try', () => tryIt(demo, section.demo === hydra)));
        actions.append(button('+', t('insert'), '', () => insert(entry.code)));
        actions.append(
          button('⧉', t('copy'), '', async () => {
            try {
              await navigator.clipboard.writeText(entry.code);
              status.textContent = t('copied', { code: entry.code });
            } catch {
              status.textContent = t('copyFailed');
            }
          }),
        );
        const row = document.createElement('div');
        row.className = 'cheat-row';
        row.append(code, actions);
        li.append(row, note);
        ul.append(li);
      }
      group.append(heading, ul);
      list.querySelector(panes[section.tab])!.append(group);
    }
  };
  render();

  // Searches the code and both languages, so "filtro" and "filter" both find .lpf
  const applyFilter = () => {
    const query = filter.value.trim().toLowerCase();
    // while searching, every tab shows its matches
    list.closest('.panel')!.classList.toggle('is-searching', Boolean(query));
    list.querySelectorAll<HTMLElement>('.cheat-group').forEach((group) => {
      let visible = 0;
      group.querySelectorAll<HTMLElement>('li').forEach((item) => {
        const match = !query || item.dataset.search!.includes(query);
        item.hidden = !match;
        if (match) visible++;
      });
      group.hidden = visible === 0;
    });
  };
  filter.addEventListener('input', applyFilter);

  onLangChange(() => {
    render();
    applyFilter();
  });
}
