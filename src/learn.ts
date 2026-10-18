// Learn panel: a short route from one sound to a whole song with visuals.
// Each step explains one idea, plays an example with one click (your code is
// kept to come back to) and leaves a small challenge to change it yourself.
// Checked against Strudel 1.3.
import { onLangChange, pick, t, type Localized } from './i18n';

type Step = { title: Localized; text: Localized; code: string; challenge: Localized; visual?: boolean };

const L = (en: string, es: string, ca: string): Localized => ({ en, es, ca });

export const steps: Step[] = [
  {
    title: L('One sound', 'Un sonido', 'Un so'),
    text: L(
      's() picks a sound by name. bd is a bass drum (kick). It repeats once per cycle: a cycle is a bar, and every pattern fills it.',
      's() elige un sonido por su nombre. bd es un bombo. Se repite una vez por ciclo: un ciclo es un compás, y cada patrón lo llena.',
      "s() tria un so pel seu nom. bd és un bombo. Es repeteix un cop per cicle: un cicle és un compàs, i cada patró l'omple.",
    ),
    code: 's("bd")',
    challenge: L('Change bd for sd (snare), hh (hi-hat) or cp (clap) and press Ctrl+Enter.', 'Cambia bd por sd (caja), hh (charles) o cp (palmada) y pulsa Ctrl+Enter.', 'Canvia bd per sd (caixa), hh (hi-hat) o cp (picada de mans) i prem Ctrl+Enter.'),
  },
  {
    title: L('A sequence', 'Una secuencia', 'Una seqüència'),
    text: L(
      'Several words play one after another and share the bar equally: four words, four beats. This is mini-notation, the little language inside the quotes.',
      'Varias palabras suenan una detrás de otra y se reparten el compás a partes iguales: cuatro palabras, cuatro tiempos. Esto es la mininotación, el pequeño lenguaje de dentro de las comillas.',
      "Unes quantes paraules sonen una darrere l'altra i es reparteixen el compàs a parts iguals: quatre paraules, quatre temps. Això és la mininotació, el petit llenguatge de dins de les cometes.",
    ),
    code: 's("bd sd bd sd")',
    challenge: L('Add a fifth word: the five squeeze into the same bar.', 'Añade una quinta palabra: las cinco se aprietan en el mismo compás.', "Afegeix una cinquena paraula: les cinc s'estrenyen dins el mateix compàs."),
  },
  {
    title: L('Rests, repeats and layers', 'Silencios, repeticiones y capas', 'Silencis, repeticions i capes'),
    text: L(
      '~ is a rest. *8 plays a sound eight times in its step. A comma plays two sequences at once, each with its own steps.',
      '~ es un silencio. *8 toca un sonido ocho veces en su paso. La coma toca dos secuencias a la vez, cada una con sus pasos.',
      '~ és un silenci. *8 toca un so vuit vegades en el seu pas. La coma toca dues seqüències alhora, cadascuna amb els seus passos.',
    ),
    code: 's("bd ~ sd ~, hh*8")',
    challenge: L('Turn hh*8 into hh*16, or put another ~ where the snare was.', 'Cambia hh*8 por hh*16, o pon otro ~ donde estaba la caja.', 'Canvia hh*8 per hh*16, o posa un altre ~ on hi havia la caixa.'),
  },
  {
    title: L('Splitting a step', 'Dividir un paso', 'Dividir un pas'),
    text: L(
      'Square brackets squeeze several sounds into one step. That is how the off-beat kicks of hip hop are written.',
      'Los corchetes meten varios sonidos en un solo paso. Así se escriben los bombos a contratiempo del hip hop.',
      "Els claudàtors fiquen uns quants sons en un sol pas. Així s'escriuen els bombos a contratemps del hip hop.",
    ),
    code: 's("bd [~ bd] sd [~ bd], hh*8")',
    challenge: L('Try [bd bd] in the first step, or [~ sd] at the end.', 'Prueba [bd bd] en el primer paso, o [~ sd] al final.', 'Prova [bd bd] al primer pas, o [~ sd] al final.'),
  },
  {
    title: L('A drum machine', 'Una caja de ritmos', 'Una caixa de ritmes'),
    text: L(
      '.bank() picks the drum machine the sounds come from. Methods like .bank() and .gain() (volume) chain after the pattern with a dot.',
      '.bank() elige de qué caja de ritmos salen los sonidos. Los métodos como .bank() y .gain() (volumen) se encadenan detrás del patrón con un punto.',
      ".bank() tria de quina caixa de ritmes surten els sons. Els mètodes com .bank() i .gain() (volum) s'encadenen darrere del patró amb un punt.",
    ),
    code: 's("bd [~ bd] sd [~ bd], hh*8").bank("RolandTR808").gain(0.9)',
    challenge: L('Change RolandTR808 for AkaiMPC60, EmuSP12 or RolandTR909.', 'Cambia RolandTR808 por AkaiMPC60, EmuSP12 o RolandTR909.', 'Canvia RolandTR808 per AkaiMPC60, EmuSP12 o RolandTR909.'),
  },
  {
    title: L('One per bar', 'Uno por compás', 'Un per compàs'),
    text: L(
      'Angle brackets play one item per bar, in turn. Great for changes that take their time: a different snare each bar, a chord per bar.',
      'Los ángulos tocan un elemento por compás, por turnos. Sirven para cambios que se toman su tiempo: una caja distinta cada compás, un acorde por compás.',
      'Els angles toquen un element per compàs, per torns. Serveixen per a canvis que es prenen el seu temps: una caixa diferent cada compàs, un acord per compàs.',
    ),
    code: 's("bd*2, ~ <sd cp>, hh*8").bank("RolandTR808")',
    challenge: L('Add a third one: <sd cp rim>.', 'Añade un tercero: <sd cp rim>.', 'Afegeix-ne un tercer: <sd cp rim>.'),
  },
  {
    title: L('Notes', 'Notas', 'Notes'),
    text: L(
      'note() plays notes by name (c d e f g a b, sharps with #, flats with b) and octave; .s() picks the instrument.',
      'note() toca notas por nombre (c d e f g a b, sostenidos con #, bemoles con b) y octava; .s() elige el instrumento.',
      "note() toca notes pel nom (c d e f g a b, sostinguts amb #, bemolls amb b) i l'octava; .s() tria l'instrument.",
    ),
    code: 'note("c3 e3 g3 b3").s("piano")',
    challenge: L('Try other instruments: gm_epiano1, gm_vibraphone, sawtooth.', 'Prueba otros instrumentos: gm_epiano1, gm_vibraphone, sawtooth.', 'Prova altres instruments: gm_epiano1, gm_vibraphone, sawtooth.'),
  },
  {
    title: L('Scales: no wrong notes', 'Escalas: sin notas falsas', 'Escales: sense notes falses'),
    text: L(
      'With n() and .scale(), numbers are steps of a scale: 0 is the first note, 7 the same one an octave up. Any number fits the key.',
      'Con n() y .scale(), los números son pasos de una escala: 0 es la primera nota, 7 la misma una octava más arriba. Cualquier número encaja en el tono.',
      "Amb n() i .scale(), els números són passos d'una escala: 0 és la primera nota, 7 la mateixa una octava més amunt. Qualsevol número encaixa en el to.",
    ),
    code: 'n("0 2 4 <7 6> ~ 4 2 ~").scale("A3:minor").s("gm_vibraphone")',
    challenge: L('Write your own numbers from 0 to 9; or change A3:minor for C3:major.', 'Escribe tus propios números del 0 al 9; o cambia A3:minor por C3:major.', 'Escriu els teus propis números del 0 al 9; o canvia A3:minor per C3:major.'),
  },
  {
    title: L('Chords', 'Acordes', 'Acords'),
    text: L(
      'chord() takes chord names, one per bar here; .voicing() spreads their notes so they sound good together. m7 is minor seventh, ^7 major seventh.',
      'chord() toma nombres de acordes, aquí uno por compás; .voicing() reparte sus notas para que suenen bien juntas. m7 es menor séptima, ^7 mayor séptima.',
      "chord() agafa noms d'acords, aquí un per compàs; .voicing() en reparteix les notes perquè sonin bé juntes. m7 és menor setena, ^7 major setena.",
    ),
    code: 'chord("<Am7 F^7 C^7 G7>").voicing().s("gm_epiano1").gain(0.5)',
    challenge: L('Hear it with .struct("~ x ~ x"): the chords turn into stabs.', 'Escúchalo con .struct("~ x ~ x"): los acordes se vuelven golpes.', 'Escolta\'l amb .struct("~ x ~ x"): els acords es tornen cops.'),
  },
  {
    title: L('Effects', 'Efectos', 'Efectes'),
    text: L(
      '.lpf() cuts the highs (lower numbers, darker), .room() adds reverb and .delay() an echo. They chain like any method.',
      '.lpf() corta los agudos (números más bajos, más oscuro), .room() añade reverb y .delay() un eco. Se encadenan como cualquier método.',
      ".lpf() talla els aguts (números més baixos, més fosc), .room() afegeix reverb i .delay() un eco. S'encadenen com qualsevol mètode.",
    ),
    code: 'n("0 2 4 <7 6> ~ 4 2 ~").scale("A3:minor").s("gm_vibraphone").lpf(1200).room(0.5).delay(0.3)',
    challenge: L('Change lpf(1200) for lpf(400), then for lpf(5000).', 'Cambia lpf(1200) por lpf(400), y luego por lpf(5000).', 'Canvia lpf(1200) per lpf(400), i després per lpf(5000).'),
  },
  {
    title: L('Tracks', 'Pistas', 'Pistes'),
    text: L(
      'Only the last loose pattern plays. Lines starting with $: are tracks and all play together; a name works too (bass:). Put _ in front to mute one.',
      'Solo suena el último patrón suelto. Las líneas que empiezan por $: son pistas y suenan todas juntas; también vale un nombre (bass:). Pon _ delante para silenciar una.',
      "Només sona l'últim patró solt. Les línies que comencen per $: són pistes i sonen totes juntes; també val un nom (bass:). Posa _ al davant per silenciar-ne una.",
    ),
    code: `$: s("bd [~ bd] sd [~ bd], hh*8").bank("RolandTR808")
bass: note("<a1 f1 c2 g1>").s("gm_acoustic_bass")
$: chord("<Am7 F^7 C^7 G7>").voicing().s("gm_epiano1").gain(0.4)`,
    challenge: L('Write _bass: instead of bass: and press Ctrl+Enter. Then take the _ away.', 'Escribe _bass: en vez de bass: y pulsa Ctrl+Enter. Luego quita la _.', 'Escriu _bass: en lloc de bass: i prem Ctrl+Enter. Després treu la _.'),
  },
  {
    title: L('Tempo', 'Tempo', 'Tempo'),
    text: L(
      'setcps() sets the speed in cycles per second. With a bar of four beats, setcps(90 / 60 / 4) is 90 BPM. The BPM field and Tap at the top write it for you.',
      'setcps() marca la velocidad en ciclos por segundo. Con un compás de cuatro tiempos, setcps(90 / 60 / 4) son 90 BPM. El campo BPM y Tap de arriba lo escriben por ti.',
      'setcps() marca la velocitat en cicles per segon. Amb un compàs de quatre temps, setcps(90 / 60 / 4) són 90 BPM. El camp BPM i Tap de dalt ho escriuen per tu.',
    ),
    code: `setcps(90 / 60 / 4)

$: s("bd [~ bd] sd [~ bd], hh*8").bank("AkaiMPC60")
bass: note("<a1 f1 c2 g1>").s("gm_acoustic_bass")
$: chord("<Am7 F^7 C^7 G7>").voicing().s("gm_epiano1").gain(0.4)`,
    challenge: L('Change 90 for 70 (lo-fi) or 140 (trap).', 'Cambia 90 por 70 (lo-fi) o 140 (trap).', 'Canvia 90 per 70 (lo-fi) o 140 (trap).'),
  },
  {
    title: L('Visuals that listen', 'Visuales que escuchan', 'Visuals que escolten'),
    text: L(
      'Hydra draws the visuals: osc() makes stripes, .kaleid() mirrors them, .out() shows them. bass() is how loud the low end is, and .analyze(1) lets it hear the music.',
      'Hydra dibuja los visuales: osc() hace rayas, .kaleid() las refleja, .out() las muestra. bass() es cuánto suenan los graves, y .analyze(1) le deja oír la música.',
      'Hydra dibuixa els visuals: osc() fa ratlles, .kaleid() les reflecteix, .out() les mostra. bass() és quant sonen els greus, i .analyze(1) li deixa sentir la música.',
    ),
    code: `await initHydra()
osc(10, 0.05, 0.8).kaleid(4).scale(() => 1 + bass()).out()

setcps(90 / 60 / 4)
$: s("bd [~ bd] sd [~ bd], hh*8").bank("AkaiMPC60").analyze(1)
bass: note("<a1 f1 c2 g1>").s("gm_acoustic_bass").analyze(1)`,
    challenge: L('Change kaleid(4) for kaleid(8), or add .color(1, 0.3, 0.6) before .out().', 'Cambia kaleid(4) por kaleid(8), o añade .color(1, 0.3, 0.6) antes de .out().', 'Canvia kaleid(4) per kaleid(8), o afegeix .color(1, 0.3, 0.6) abans de .out().'),
    visual: true,
  },
  {
    title: L('Your turn', 'Te toca', 'Et toca'),
    text: L(
      'That is the whole toolkit. More → Compose builds songs layer by layer, More → Cheatsheet has every trick, and the patterns in the list are full songs to pull apart.',
      'Esa es toda la caja de herramientas. Más → Componer monta canciones capa a capa, Más → Chuleta tiene todos los trucos, y los patrones de la lista son canciones enteras para destripar.',
      "Aquesta és tota la caixa d'eines. Més → Compondre munta cançons capa a capa, Més → Xuleta té tots els trucs, i els patrons de la llista són cançons senceres per esbudellar.",
    ),
    code: `setcps(90 / 60 / 4)

$: s("bd [~ bd] sd [~ bd], hh*8").bank("AkaiMPC60")
bass: note("<a1 f1 c2 g1>").s("gm_acoustic_bass")
$: chord("<Am7 F^7 C^7 G7>").voicing().s("gm_epiano1").gain(0.4)
$: n("0 2 4 <7 6> ~ 4 2 ~").scale("A4:minor").s("gm_vibraphone").room(0.4)`,
    challenge: L('Make it yours: change one thing in every line.', 'Hazla tuya: cambia una cosa en cada línea.', 'Fes-la teva: canvia una cosa a cada línia.'),
  },
];

const STORAGE_KEY = 'jdl:learn-step';

type Editor = { code: string; setCode(code: string): void; evaluate(): Promise<void> };

export function setupLearn({ editor, useCodeVisual }: { editor: Editor; useCodeVisual: () => void }) {
  const progress = document.querySelector<HTMLElement>('#learn-progress')!;
  const title = document.querySelector<HTMLElement>('#learn-title')!;
  const text = document.querySelector<HTMLElement>('#learn-text')!;
  const code = document.querySelector<HTMLElement>('#learn-code')!;
  const challenge = document.querySelector<HTMLElement>('#learn-challenge')!;
  const previous = document.querySelector<HTMLButtonElement>('#learn-previous')!;
  const next = document.querySelector<HTMLButtonElement>('#learn-next')!;
  const back = document.querySelector<HTMLButtonElement>('#learn-back')!;

  let index = 0;
  try {
    index = Math.min(steps.length - 1, Math.max(0, Number(localStorage.getItem(STORAGE_KEY)) || 0));
  } catch {
    // first step
  }
  let yourCode: string | null = null;

  const render = () => {
    const step = steps[index];
    progress.textContent = t('learnProgress', { n: index + 1, total: steps.length });
    title.textContent = pick(step.title);
    text.textContent = pick(step.text);
    code.textContent = step.code;
    challenge.textContent = pick(step.challenge);
    previous.disabled = index === 0;
    next.disabled = index === steps.length - 1;
    try {
      localStorage.setItem(STORAGE_KEY, String(index));
    } catch {
      // starts from the first step next time
    }
  };

  const go = (delta: number) => {
    index = Math.min(steps.length - 1, Math.max(0, index + delta));
    render();
  };
  previous.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));

  // Your code is kept the first time, to come back to after the lesson
  document.querySelector('#learn-try')!.addEventListener('click', async () => {
    yourCode ??= editor.code;
    const step = steps[index];
    editor.setCode(step.code);
    if (step.visual) useCodeVisual();
    await editor.evaluate();
    back.hidden = false;
  });
  back.addEventListener('click', () => {
    if (yourCode !== null) editor.setCode(yourCode);
    yourCode = null;
    back.hidden = true;
  });

  render();
  onLangChange(render);
}
