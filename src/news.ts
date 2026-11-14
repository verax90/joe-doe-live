// What's new: the latest things in the studio, newest first, each with a
// button that takes you there (opens its panel, its tab, picks its visual).
// The help shows them as its first section, and More (and Help in it) carries a dot
// while there is something you have not seen yet.
import type { Localized } from './i18n';
import { readStorage, writeStorage } from './storage';

const L = (en: string, es: string, ca: string): Localized => ({ en, es, ca });

type Step = { click?: string; value?: [string, string] }; // a selector to click, or [select, value] to pick
export type News = { id: string; title: Localized; text: Localized; go?: Step[] };

export const NEWS: News[] = [
  {
    id: '2026-11-15-finish',
    title: L('Sharper visuals, with a finish', 'Visuales más nítidos y con acabado', 'Visuals més nítids i amb acabat'),
    text: L(
      'VJ → Finish: a glow around what is bright, grain and darker corners over any visual, and a High quality that draws every pixel sixty times a second (Go live takes it by itself). The webcam and clips datamosh now follows how the picture really moves',
      'VJ → Acabado: resplandor alrededor de lo claro, grano y esquinas oscuras sobre cualquier visual, y una calidad Alta que dibuja todos los píxeles sesenta veces por segundo (Empezar el directo la pone solo). El datamosh de webcam y clips sigue ahora el movimiento real de la imagen',
      "VJ → Acabat: resplendor al voltant del que és clar, gra i cantonades fosques sobre qualsevol visual, i una qualitat Alta que dibuixa tots els píxels seixanta cops per segon (Començar el directe la posa sol). El datamosh de webcam i clips segueix ara el moviment real de la imatge",
    ),
    go: [{ click: '#toggle-vj' }, { click: '[aria-controls="vj-tab-finish"]' }],
  },
  {
    id: '2026-11-15-vj-moves',
    title: L('The VJ effects move by themselves', 'Los efectos del VJ se mueven solos', 'Els efectes del VJ es mouen sols'),
    text: L(
      'The sign after each effect: a slow or a fast swing, a jump on every beat, or following the lows, the kick, the highs or the webcam. Three new effects (tunnel, fluid, dots), looks that fade into each other and can take turns every few kicks',
      'El signo de cada efecto: un vaivén lento o rápido, un salto en cada pulso, o siguiendo los graves, el bombo, los agudos o la webcam. Tres efectos nuevos (túnel, fluido, puntos), aspectos que se funden uno en otro y pueden turnarse cada tantos bombos',
      'El signe de cada efecte: un vaivé lent o ràpid, un salt a cada pols, o seguint els greus, el bombo, els aguts o la webcam. Tres efectes nous (túnel, fluid, punts), aspectes que es fonen l\'un en l\'altre i es poden tornar cada tants bombos',
    ),
    go: [{ click: '#toggle-vj' }, { click: '[aria-controls="vj-tab-effects"]' }],
  },
  {
    id: '2026-11-15-patterns',
    title: L('Ten new patterns', 'Diez patrones nuevos', 'Deu patrons nous'),
    text: L(
      'Techno, Acid, UK garage, Dub techno, Electro, Synthwave, Jungle, Jersey club, Afrobeats and Ambient, each with its comments on what makes the genre',
      'Techno, Acid, UK garage, Dub techno, Electro, Synthwave, Jungle, Jersey club, Afrobeats y Ambient, cada uno con sus comentarios sobre qué hace al género',
      'Techno, Acid, UK garage, Dub techno, Electro, Synthwave, Jungle, Jersey club, Afrobeats i Ambient, cadascun amb els seus comentaris sobre què fa el gènere',
    ),
    go: [{ value: ['#preset', 'acid-303'] }],
  },
  {
    id: '2026-11-15-vj-effects',
    title: L('Six more VJ effects', 'Seis efectos más en el VJ', 'Sis efectes més al VJ'),
    text: L(
      'Punch (the kick bumps the picture), kaleidoscope, glitch, RGB split, negative and blocks; Surprise me for a look you did not choose, and four memories to save a look and come back to it, from the phone too',
      'Golpe (el bombo empuja la imagen), caleidoscopio, glitch, RGB partido, negativo y bloques; Sorpréndeme para un aspecto que no has elegido, y cuatro memorias para guardar un aspecto y volver a él, también desde el móvil',
      "Cop (el bombo empeny la imatge), calidoscopi, glitch, RGB partit, negatiu i blocs; Sorprèn-me per a un aspecte que no has triat, i quatre memòries per desar un aspecte i tornar-hi, també des del mòbil",
    ),
    go: [{ click: '#toggle-vj' }, { click: '[aria-controls="vj-tab-effects"]' }],
  },
  {
    id: '2026-11-14-more-shaders',
    title: L('A spectrum, a tunnel and a broken signal', 'Un espectro, un túnel y una señal rota', 'Un espectre, un túnel i un senyal trencat'),
    text: L(
      'Three more visuals under Machines: the sound as eight bars of lamps, a tunnel each kick pushes you down, and a picture the snare tears like a bad aerial',
      'Tres visuales más en Máquinas: el sonido en ocho barras de luces, un túnel por el que te empuja cada bombo, y una imagen que la caja rasga como una antena mal puesta',
      'Tres visuals més a Màquines: el so en vuit barres de llums, un túnel pel qual t\'empeny cada bombo, i una imatge que la caixa esquinça com una antena mal posada',
    ),
    go: [{ value: ['#visual', 'maq-espectro'] }],
  },
  {
    id: '2026-11-14-phone-visual',
    title: L('A friend plays the visuals from their phone', 'Un colega toca los visuales desde su móvil', 'Un col·lega toca els visuals des del mòbil'),
    text: L(
      'The phone as controller has a Visual tab: pads for a kick, a snare and the hats, a square that moves the point of the Motion visuals, the list of visuals and the VJ effects',
      'El móvil como mando tiene una pestaña Visual: pads de bombo, caja y platos, un cuadro que mueve el punto de los visuales de Movimiento, la lista de visuales y los efectos del VJ',
      'El mòbil com a comandament té una pestanya Visual: pads de bombo, caixa i plats, un quadre que mou el punt dels visuals de Moviment, la llista de visuals i els efectes del VJ',
    ),
    go: [{ click: '#toggle-remote' }],
  },
  {
    id: '2026-11-14-motion',
    title: L('Move, and the visual follows', 'Muévete y el visual te sigue', 'Mou-te i el visual et segueix'),
    text: L(
      'VJ → Motion: the webcam finds where you move and the visuals under Motion follow it; it can also play the VJ effects. No recognition, nothing sent',
      'VJ → Movimiento: la webcam encuentra dónde te mueves y los visuales de Movimiento lo siguen; también puede tocar los efectos del VJ. Sin reconocimiento, sin enviar nada',
      'VJ → Moviment: la webcam troba on et mous i els visuals de Moviment ho segueixen; també pot tocar els efectes del VJ. Sense reconeixement, sense enviar res',
    ),
    go: [{ click: '#toggle-vj' }, { click: '[aria-controls="vj-tab-motion"]' }],
  },
  {
    id: '2026-11-14-machines',
    title: L('The visuals listen to your machines', 'Los visuales escuchan tus máquinas', 'Els visuals escolten les teves màquines'),
    text: L(
      'VJ → Machines: pick an audio input and the visuals move with your MPC or your Roland, with no sound from the studio. Kick, snare and hats can change the clips, and the tempo can follow the MIDI clock',
      'VJ → Máquinas: elige una entrada de audio y los visuales se mueven con tu MPC o tu Roland, sin que el estudio suene. Bombo, caja y platos pueden cambiar los clips, y el tempo puede seguir el reloj MIDI',
      "VJ → Màquines: tria una entrada d'àudio i els visuals es mouen amb la teva MPC o la teva Roland, sense que l'estudi soni. Bombo, caixa i plats poden canviar els clips, i el tempo pot seguir el rellotge MIDI",
    ),
    go: [{ click: '#toggle-vj' }, { click: '[aria-controls="vj-tab-machines"]' }],
  },
  {
    id: '2026-11-14-shaders',
    title: L('Shaders of its own and a live datamosh', 'Shaders propios y datamosh en vivo', 'Shaders propis i datamosh en viu'),
    text: L(
      'New visuals under Machines: rings on the kick, a grid floor and Melt, which smears the picture in blocks until a kick redraws it. The datamosh also comes for the webcam and for Clips',
      'Visuales nuevos en Máquinas: anillos con el bombo, una rejilla y Derretido, que arrastra la imagen a bloques hasta que un bombo la redibuja. El datamosh llega también a la webcam y a Clips',
      'Visuals nous a Màquines: anells amb el bombo, una reixa i Fos, que arrossega la imatge a blocs fins que un bombo la redibuixa. El datamosh arriba també a la webcam i a Clips',
    ),
    go: [{ value: ['#visual', 'maq-mosh'] }],
  },
  {
    id: '2026-11-14-fullscreen',
    title: L('Full screen, in the bar', 'Pantalla completa, en la barra', 'Pantalla completa, a la barra'),
    text: L(
      'An icon in the bar (and Ctrl+Shift+F) fills the screen with the studio. The help moved into More',
      'Un icono en la barra (y Ctrl+Mayús+F) llena la pantalla con el estudio. La ayuda pasa a estar dentro de Más',
      "Una icona a la barra (i Ctrl+Maj+F) omple la pantalla amb l'estudi. L'ajuda passa a ser dins de Més",
    ),
    go: [{ click: '#fullscreen' }],
  },
  {
    id: '2026-11-01-flip',
    title: L('The Miyoo Flip as a controller, anywhere', 'La Miyoo Flip como mando, desde donde sea', 'La Miyoo Flip com a comandament, des d\'on sigui'),
    text: L(
      'More → Miyoo Flip: type the code Studio Remote shows and the console plays the studio over the internet, with no bridge on the PC. Once is enough: next time they find each other',
      'Más → Miyoo Flip: escribe el código que sale en Studio Remote y la consola toca el estudio por internet, sin puente en el PC. Basta una vez: la próxima se encuentran solos',
      "Més → Miyoo Flip: escriu el codi que surt a Studio Remote i la consola toca l'estudi per internet, sense pont al PC. N'hi ha prou amb un cop: la propera es troben sols",
    ),
    go: [{ click: '#toggle-flip' }],
  },
  {
    id: '2026-11-01-video-only',
    title: L('Change clips without a sound', 'Cambiar de clip sin que suene', 'Canviar de clip sense que soni'),
    text: L(
      'In Clips, Video only: a MIDI controller (the Miyoo Flip too) changes the clip without playing the studio sounds',
      'En Clips, Solo vídeo: un controlador MIDI (también la Miyoo Flip) cambia de clip sin tocar los sonidos del estudio',
      "A Clips, Només vídeo: un controlador MIDI (també la Miyoo Flip) canvia de clip sense tocar els sons de l'estudi",
    ),
    go: [{ click: '#toggle-video' }, { click: '[aria-controls="video-tab-clips"]' }],
  },
  {
    id: '2026-10-30-glass',
    title: L('The screen breaks on the drop', 'La pantalla se rompe en el drop', 'La pantalla es trenca al drop'),
    text: L(
      'With Build-up, the picture cracks over the last bar, bursts into shards on the drop and puts itself back together a bar later; on the projector and in recordings too',
      'Con Subidón, la imagen se agrieta en el último compás, estalla en trozos en el drop y se recompone un compás después; también en el proyector y en las grabaciones',
      "Amb Pujada, la imatge s'esquerda a l'últim compàs, esclata en trossos al drop i es recompon un compàs després; també al projector i a les gravacions",
    ),
  },
  {
    id: '2026-10-30-follow',
    title: L('Clips that follow the music', 'Clips que siguen la música', 'Clips que segueixen la música'),
    text: L(
      'In Clips, Follow the music: the kick cuts to another clip, the snare jumps back and the hi-hats flash, with any pattern and no code',
      'En Clips, Seguir la música: el bombo cambia de clip, la caja vuelve atrás y los platos destellan, con cualquier patrón y sin código',
      'A Clips, Seguir la música: el bombo canvia de clip, la caixa torna enrere i els plats espurnegen, amb qualsevol patró i sense codi',
    ),
    go: [{ click: '#toggle-video' }, { click: '[aria-controls="video-tab-clips"]' }, { value: ['#clips-react', 'drums'] }],
  },
  {
    id: '2026-10-29-projector',
    title: L('Projector and record what you play', 'Proyector y grabar lo que tocas', 'Projector i gravar el que toques'),
    text: L(
      'More → Projector opens a window with only the picture for the big screen; in Clips, Record what you play turns your pad hits into a looping track',
      'Más → Proyector abre una ventana solo con la imagen para la pantalla grande; en Clips, Grabar lo que tocas convierte tus golpes en los pads en una pista que se repite',
      'Més → Projector obre una finestra només amb la imatge per a la pantalla gran; a Clips, Gravar el que toques converteix els teus cops als pads en una pista que es repeteix',
    ),
    go: [{ click: '#toggle-video' }, { click: '[aria-controls="video-tab-clips"]' }],
  },
  {
    id: '2026-10-29-at-hand',
    title: L('Tools at hand and the beat in the bar', 'Herramientas a mano y el pulso en la barra', 'Eines a mà i el pols a la barra'),
    text: L(
      'The panels you open stay in the foot, one click away; the BPM field lights up each beat; the visuals menu comes in groups',
      'Los paneles que abres se quedan abajo, a un clic; el campo de BPM se ilumina en cada pulso; el menú de visuales va por grupos',
      "Els panells que obres es queden a baix, a un clic; el camp de BPM s'il·lumina a cada pols; el menú de visuals va per grups",
    ),
  },
  {
    id: '2026-10-29-pieces',
    title: L('Clips: pieces, held pads and Fill', 'Clips: trozos, pads mantenidos y Llenar', 'Clips: trossos, pads mantinguts i Omplir'),
    text: L(
      'Several pieces of one long video without downloading it again; a layer mixer; pads that last only while held; 🎲 Fill for three odd clips at once',
      'Varios trozos de un vídeo largo sin bajarlo otra vez; una mesa de capas; pads que duran solo mientras pulsas; 🎲 Llenar para tener tres clips raros de golpe',
      "Diversos trossos d'un vídeo llarg sense baixar-lo de nou; una taula de capes; pads que duren només mentre prems; 🎲 Omplir per tenir tres clips rars de cop",
    ),
    go: [{ click: '#toggle-video' }, { click: '[aria-controls="video-tab-clips"]' }],
  },
  {
    id: '2026-10-29-glitch',
    title: L('Clips: layers, weaving and glitches', 'Clips: capas, entrelazado y glitches', 'Clips: capes, entrellaçat i glitches'),
    text: L(
      'Three layers at once, pieces of one clip woven into another, datamosh, VHS, pixel-sort drips, a Glitch slider and nine new Clips visuals',
      'Tres capas a la vez, trozos de un clip metidos en otro, datamosh, VHS, chorreones tipo pixel sort, un deslizador Glitch y nueve visuales Clips nuevos',
      'Tres capes alhora, trossos d\'un clip ficats dins d\'un altre, datamosh, VHS, regalims tipus pixel sort, un control Glitch i nou visuals Clips nous',
    ),
    go: [{ click: '#toggle-video' }, { click: '[aria-controls="video-tab-clips"]' }, { click: '#clips-code' }],
  },
  {
    id: '2026-10-29-clips',
    title: L('Clips: footage played like samples', 'Clips: vídeo tocado como samples', 'Clips: vídeo tocat com a samples'),
    text: L(
      'Video → Clips: s("tele*4").video() cuts on each hit, with chance and effects per hit; Find brings odd old films, VHS tapes and NASA footage',
      'Vídeo → Clips: s("tele*4").video() corta en cada golpe, con azar y efectos por golpe; Buscar trae películas antiguas raras, cintas VHS y la NASA',
      'Vídeo → Clips: s("tele*4").video() talla a cada cop, amb atzar i efectes per cop; Cercar porta pel·lícules antigues rares, cintes VHS i la NASA',
    ),
    go: [{ click: '#toggle-video' }, { click: '[aria-controls="video-tab-clips"]' }],
  },
  {
    id: '2026-10-10-transport',
    title: L('Play and Stop from a controller', 'Play y Stop desde un mando', "Play i Stop des d'un comandament"),
    text: L('MIDI Start and Stop press Play and Stop: the Miyoo console, a drum machine…', 'Start y Stop por MIDI pulsan Play y Stop: la consola Miyoo, una caja de ritmos…', 'Start i Stop per MIDI premen Play i Stop: la consola Miyoo, una caixa de ritmes…'),
    go: [{ click: '#toggle-midi' }],
  },
  {
    id: '2026-10-02-touch',
    title: L('Three TouchMe visuals', 'Tres visuales para el TouchMe', 'Tres visuals per al TouchMe'),
    text: L('Ripples, sparks and a heartbeat that follow your touch; touchPulse() for each new one', 'Ondas, chispas y un latido que siguen el contacto; touchPulse() en cada toque', 'Ones, espurnes i un batec que segueixen el contacte; touchPulse() a cada toc'),
    go: [{ value: ['#visual', 'tacto-ondas'] }],
  },
  {
    id: '2026-09-30-blank',
    title: L('Start from blank', 'Empezar en blanco', 'Començar en blanc'),
    text: L('More → Code: a tempo and a kick to start; Ctrl+Z brings back what you had', 'Más → Código: tempo y un bombo para empezar; Ctrl+Z recupera lo que tenías', 'Més → Codi: tempo i un bombo per començar; Ctrl+Z recupera el que tenies'),
    go: [{ click: '#menu-toggle' }],
  },
  {
    id: '2026-09-30-youtube',
    title: L('YouTube queue', 'Cola de YouTube', 'Cua de YouTube'),
    text: L('Paste and Add: it waits its turn, the video on is never cut', 'Pega y Añadir: espera su turno, sin cortar el que suena', 'Enganxa i Afegir: espera el seu torn, sense tallar el que sona'),
    go: [{ click: '#toggle-video' }, { click: '[aria-controls="video-tab-youtube"]' }],
  },
  {
    id: '2026-09-30-sequencer',
    title: L('Sequencer view', 'Vista de secuenciador', 'Vista de seqüenciador'),
    text: L('Each track drawn under its line as it plays, in its colour', 'Cada pista dibujada bajo su línea mientras suena, con su color', 'Cada pista dibuixada sota la seva línia mentre sona, amb el seu color'),
    go: [{ click: '#toggle-sequencer' }],
  },
  {
    id: '2026-09-30-keyboard',
    title: L('Better with the keyboard', 'Mejor con teclado', 'Millor amb teclat'),
    text: L('Tab and Enter keep their place, arrows in the help, and a ring shows where you are', 'Tab e Intro no pierden el sitio, flechas en la ayuda y un anillo marca dónde estás', "Tab i Intro no perden el lloc, fletxes a l'ajuda i un anell marca on ets"),
  },
  {
    id: '2026-09-30-goline',
    title: L('Go to the error', 'Ir al error', "Anar a l'error"),
    text: L('When the code has an error, a button takes the cursor to its line', 'Si el código tiene un error, un botón lleva el cursor a su línea', 'Si el codi té un error, un botó porta el cursor a la seva línia'),
  },
  {
    id: '2026-09-30-play',
    title: L('Play says where you are', 'Play dice dónde estás', 'Play diu on ets'),
    text: L('Playing, or Apply when your changes are not sounding yet. Every panel closes with its ✕ or Escape', 'Sonando, o Aplicar si tus cambios aún no suenan. Cada panel se cierra con su ✕ o con Escape', 'Sonant, o Aplicar si els teus canvis encara no sonen. Cada panell es tanca amb la seva ✕ o amb Escape'),
  },
  {
    id: '2026-09-30-project',
    title: L('Save and share', 'Guardar y compartir', 'Desar i compartir'),
    text: L('Save, link, export and open, in one place; Ctrl+S saves', 'Guardar, enlace, exportar y abrir, en un sitio; Ctrl+S guarda', 'Desar, enllaç, exportar i obrir, en un sol lloc; Ctrl+S desa'),
    go: [{ click: '#project-open' }],
  },
  {
    id: '2026-09-30-finder',
    title: L('Search (Ctrl+K)', 'Buscar (Ctrl+K)', 'Cercar (Ctrl+K)'),
    text: L('A few letters open any panel, pattern or visual', 'Unas letras abren cualquier panel, patrón o visual', 'Unes quantes lletres obren qualsevol panell, patró o visual'),
    go: [{ click: '#finder-open' }],
  },
  {
    id: '2026-09-30-drop',
    title: L('Build-up and drop', 'Subidón y drop', 'Pujada i drop'),
    text: L('A few bars that build up, and the drop on the one', 'Unos compases que suben y el drop en el uno', "Uns quants compassos que pugen i el drop a l'u"),
    go: [{ click: '#toggle-drop' }],
  },
  {
    id: '2026-09-30-voice',
    title: L('Tuner and voice synth', 'Afinador y sinte con tu voz', 'Afinador i sinte amb la teva veu'),
    text: L('The note you sing; a synth that follows it; two visuals that follow you', 'La nota que cantas; un sinte que la sigue; dos visuales que te siguen', 'La nota que cantes; un sinte que la segueix; dos visuals que et segueixen'),
    go: [{ click: '#toggle-mic' }, { click: '[aria-controls="mic-tab-tuner"]' }],
  },
  {
    id: '2026-09-30-hum',
    title: L('Hum a riff', 'Tararea un riff', 'Taral·leja un riff'),
    text: L('Sing a few bars and get them back as notes', 'Canta unos compases y salen como notas', 'Canta uns quants compassos i surten com a notes'),
    go: [{ click: '#toggle-midi' }, { click: '[aria-controls="midi-tab-riff"]' }, { value: ['#riff-source', 'voice'] }],
  },
  {
    id: '2026-09-30-session',
    title: L('Record the whole session', 'Grabar la sesión entera', 'Gravar la sessió sencera'),
    text: L('Hours of jam, a marker at every change and every ★ (Alt+M)', 'Horas de jam, una marca en cada cambio y en cada ★ (Alt+M)', 'Hores de jam, una marca a cada canvi i a cada ★ (Alt+M)'),
    go: [{ value: ['#record-mode', 'session'] }, { click: '#menu-toggle' }],
  },
  {
    id: '2026-09-30-pump',
    title: L('Pump', 'Bombeo', 'Bombeig'),
    text: L('Every kick pushes the rest down, the breathing of house', 'Cada bombo agacha el resto, la respiración del house', 'Cada bombo ajup la resta, la respiració del house'),
    go: [{ click: '#toggle-pump' }],
  },
];

// Takes you to it: the steps run in order, a moment apart
export function goTo(news: News) {
  (news.go ?? []).forEach((step, index) => {
    window.setTimeout(() => {
      if (step.click) document.querySelector<HTMLElement>(step.click)?.click();
      if (step.value) {
        const field = document.querySelector<HTMLSelectElement>(step.value[0]);
        if (field) {
          field.value = step.value[1];
          field.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }, index * 60);
  });
}

// Something new since you last looked
const SEEN = 'jdl:news-seen';
export const hasUnseen = (list = NEWS, seen = readStorage<string>(SEEN, '')) => Boolean(list[0]) && list[0].id !== seen;
export const markSeen = () => writeStorage(SEEN, NEWS[0]?.id ?? '');
