// Cheatsheet panel: the Strudel and Hydra basics, each with a short example
// that copies with one click. Checked against Strudel 1.3 / hydra-synth 1.4.
import { pick, t, type Localized } from './i18n';

type Entry = { code: string; note: Localized };
type Section = { title: Localized; entries: Entry[] };

const sections: Section[] = [
  {
    title: { en: 'Basics', es: 'Lo básico' },
    entries: [
      { code: 's("bd sd hh sd")', note: { en: 'Sounds in sequence, one per step', es: 'Sonidos en secuencia, uno por paso' } },
      { code: 'note("c3 e3 g3").s("piano")', note: { en: 'Notes played by an instrument', es: 'Notas tocadas por un instrumento' } },
      { code: 'stack(s("bd*4"), s("hh*8"))', note: { en: 'Several patterns at once', es: 'Varios patrones a la vez' } },
      { code: 'setcps(90 / 60 / 4)', note: { en: 'Tempo: 90 BPM in 4/4', es: 'Tempo: 90 BPM en 4/4' } },
    ],
  },
  {
    title: { en: 'Mini-notation (inside the quotes)', es: 'Mini-notación (dentro de las comillas)' },
    entries: [
      { code: 's("bd*4")', note: { en: '* repeats within the step', es: '* repite dentro del paso' } },
      { code: 's("bd ~ sd ~")', note: { en: '~ is a rest', es: '~ es un silencio' } },
      { code: 's("[bd bd] sd")', note: { en: '[ ] splits one step in two', es: '[ ] divide un paso en varios' } },
      { code: 'note("<c3 e3 g3>")', note: { en: '< > one per bar', es: '< > uno por compás' } },
      { code: 's("bd*2, hh*8")', note: { en: 'a comma plays both together', es: 'la coma toca los dos a la vez' } },
      { code: 's("hh*8?")', note: { en: '? plays only sometimes', es: '? toca solo a veces' } },
    ],
  },
  {
    title: { en: 'Sound', es: 'Sonido' },
    entries: [
      { code: '.gain(0.8)', note: { en: 'Volume', es: 'Volumen' } },
      { code: '.lpf(800)', note: { en: 'Low-pass filter: darker', es: 'Filtro paso bajo: más apagado' } },
      { code: '.hpf(2000)', note: { en: 'High-pass filter: thinner', es: 'Filtro paso alto: más fino' } },
      { code: '.room(0.5)', note: { en: 'Reverb', es: 'Reverb' } },
      { code: '.delay(0.3)', note: { en: 'Echo', es: 'Eco' } },
      { code: '.crush(8)', note: { en: 'Bitcrusher: lo-fi grit', es: 'Bitcrusher: suciedad lo-fi' } },
      { code: '.speed(2)', note: { en: 'Sample speed (and pitch)', es: 'Velocidad (y tono) del sample' } },
      { code: '.pan("0 1")', note: { en: 'Left to right', es: 'De izquierda a derecha' } },
      { code: '.lpf(sine.range(300, 3000).slow(4))', note: { en: 'Move a value with a slow wave', es: 'Mover un valor con una onda lenta' } },
    ],
  },
  {
    title: { en: 'Harmony', es: 'Armonía' },
    entries: [
      { code: 'chord("<Am7 Dm7 G7 C^7>").voicing()', note: { en: 'Chords, voiced for you', es: 'Acordes ya colocados' } },
      { code: 'n("0 2 4 7").scale("C:minor")', note: { en: 'Scale degrees', es: 'Grados de una escala' } },
    ],
  },
  {
    title: { en: 'Variation', es: 'Variación' },
    entries: [
      { code: '.fast(2)', note: { en: 'Twice as fast (.slow for slower)', es: 'El doble de rápido (.slow para más lento)' } },
      { code: '.rev()', note: { en: 'Backwards', es: 'Al revés' } },
      { code: '.every(4, x => x.fast(2))', note: { en: 'Change every 4 bars', es: 'Cambia cada 4 compases' } },
      { code: '.sometimes(x => x.speed(2))', note: { en: 'Change at random', es: 'Cambia al azar' } },
      { code: '.jux(rev)', note: { en: 'Right channel backwards: instant stereo', es: 'El canal derecho al revés: estéreo al instante' } },
      { code: '.off(1/8, x => x.add(note(12)))', note: { en: 'A delayed copy an octave up', es: 'Una copia retrasada una octava arriba' } },
    ],
  },
  {
    title: { en: 'Hydra (visuals)', es: 'Hydra (visuales)' },
    entries: [
      { code: 'osc(10, 0.1, 1).out()', note: { en: 'Oscillator: stripes', es: 'Oscilador: franjas' } },
      { code: 'noise(3).out()', note: { en: 'Noise', es: 'Ruido' } },
      { code: 'shape(4, 0.3).out()', note: { en: 'Shape (4 = square)', es: 'Forma (4 = cuadrado)' } },
      { code: '.kaleid(4)', note: { en: 'Kaleidoscope', es: 'Caleidoscopio' } },
      { code: '.rotate(0, 0.1)', note: { en: 'Slow rotation', es: 'Rotación lenta' } },
      { code: '.modulate(noise(2), 0.2)', note: { en: 'Warp with noise', es: 'Deformar con ruido' } },
      { code: '.color(0.34, 0.4, 0.12)', note: { en: 'Tint (red, green, blue)', es: 'Tintar (rojo, verde, azul)' } },
      { code: '.scale(() => 1 + bass())', note: { en: 'Grow with the kick (pattern needs .analyze(1))', es: 'Crece con el bombo (el patrón necesita .analyze(1))' } },
      { code: '.kaleid(H("<3 4 6>"))', note: { en: 'Follow the bar with H("...")', es: 'Seguir el compás con H("...")' } },
    ],
  },
  {
    title: { en: 'MIDI', es: 'MIDI' },
    entries: [
      { code: "const knob = await midin('MPK')", note: { en: 'Read knobs; knob(1) goes 0 to 1', es: 'Leer knobs; knob(1) va de 0 a 1' } },
      { code: '.lpf(knob(1).range(300, 5000))', note: { en: 'A knob moves the filter', es: 'Un knob mueve el filtro' } },
      { code: "const pads = await midikeys('MPK')", note: { en: 'Keys and pads as notes', es: 'Teclas y pads como notas' } },
      { code: 'pads().s("piano")', note: { en: 'Play them with an instrument', es: 'Tocarlas con un instrumento' } },
    ],
  },
];

export function setupCheatsheet() {
  const list = document.querySelector<HTMLElement>('#cheat-list')!;
  const filter = document.querySelector<HTMLInputElement>('#cheat-filter')!;
  const status = document.querySelector<HTMLElement>('#cheat-status')!;

  for (const section of sections) {
    const group = document.createElement('section');
    group.className = 'cheat-group';
    const heading = document.createElement('h3');
    heading.textContent = pick(section.title);
    const ul = document.createElement('ul');
    ul.className = 'panel-list cheat-entries';
    for (const entry of section.entries) {
      const li = document.createElement('li');
      li.dataset.search = `${entry.code} ${entry.note.en} ${entry.note.es}`.toLowerCase();
      const code = document.createElement('button');
      code.type = 'button';
      code.className = 'cheat-code';
      code.textContent = entry.code;
      code.title = t('copy');
      code.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(entry.code);
          status.textContent = t('copied', { code: entry.code });
        } catch {
          status.textContent = t('copyFailed');
        }
      });
      const note = document.createElement('p');
      note.className = 'cheat-note';
      note.textContent = pick(entry.note);
      li.append(code, note);
      ul.append(li);
    }
    group.append(heading, ul);
    list.append(group);
  }

  // Searches the code and both languages, so "filtro" and "filter" both find .lpf
  filter.addEventListener('input', () => {
    const query = filter.value.trim().toLowerCase();
    list.querySelectorAll<HTMLElement>('.cheat-group').forEach((group) => {
      let visible = 0;
      group.querySelectorAll<HTMLElement>('li').forEach((item) => {
        const match = !query || item.dataset.search!.includes(query);
        item.hidden = !match;
        if (match) visible++;
      });
      group.hidden = visible === 0;
    });
  });
}
