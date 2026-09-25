import { pick, type Localized } from './i18n';

export type Preset = { id: string; name: string; code: string };

// Visuals are picked in the "Visual" selector. .analyze(1) lets the visuals
// that listen to the audio (bass, volume) react to the pattern.
const presets: { id: string; name: Localized; code: Localized }[] = [
  {
    id: 'lofi',
    name: { en: 'Lofi 78', es: 'Lofi 78' },
    code: {
      en: `// Lofi 78: swung boom bap, piano chords and bass
setcps(78 / 60 / 4)

stack(
  // kick and snare
  s("bd ~ ~ ~ sd ~ ~ bd ~ ~ bd ~ sd ~ ~ ~")
    .gain(1.1).lpf(3500).crush(10),
  // swung hi-hats
  s("hh*8").gain("0.35 0.2").swing(4).lpf(6000),
  // chords
  chord("<F^7 Em7 Dm7 C^7>").voicing()
    .s("piano").gain(0.55).room(0.5).lpf(1800),
  // bass
  note("<f2 e2 d2 c2>").s("triangle").gain(0.7).lpf(500),
  // vinyl noise
  s("pink").gain(0.02).hpf(4000)
).analyze(1)`,
      es: `// Lofi 78: boom bap con swing, acordes de piano y bajo
setcps(78 / 60 / 4)

stack(
  // bombo y caja
  s("bd ~ ~ ~ sd ~ ~ bd ~ ~ bd ~ sd ~ ~ ~")
    .gain(1.1).lpf(3500).crush(10),
  // charles con swing
  s("hh*8").gain("0.35 0.2").swing(4).lpf(6000),
  // acordes
  chord("<F^7 Em7 Dm7 C^7>").voicing()
    .s("piano").gain(0.55).room(0.5).lpf(1800),
  // bajo
  note("<f2 e2 d2 c2>").s("triangle").gain(0.7).lpf(500),
  // ruido de vinilo
  s("pink").gain(0.02).hpf(4000)
).analyze(1)`,
    },
  },
  {
    id: 'scenes',
    name: { en: 'Scenes (parts)', es: 'Escenas (partes)' },
    code: {
      en: `// Scenes: switch parts on and off while it plays
// 1 kick · 2 snare · 3 hats · 4 chords · 5 bass · 6 pad
// Number keys 1-6, a click on the numbers at the bottom, or MPK pads in CC mode
// Any pattern can do it: add .mask(part(n)) to a layer
setcps(90 / 60 / 4)

stack(
  s("bd ~ ~ ~ ~ ~ ~ bd ~ ~ bd ~ ~ ~ ~ ~").bank("EmuSP12").mask(part(1)),
  s("~ ~ ~ ~ sd ~ ~ ~ ~ ~ ~ ~ sd ~ ~ ~").bank("EmuSP12").mask(part(2)),
  s("hh*8").bank("EmuSP12").gain("0.5 0.3").swing(4).mask(part(3)),
  chord("<Dm9 G13 C^9 A7b9>").voicing().s("gm_epiano1").gain(0.5).lpf(2200).room(0.3).mask(part(4)),
  note("<d2 g1 c2 a1>").s("gm_acoustic_bass").gain(0.8).mask(part(5)),
  chord("<Dm9 G13 C^9 A7b9>").voicing().s("gm_pad_warm").gain(0.25).room(0.6).mask(part(6))
).analyze(1)`,
      es: `// Escenas: enciende y apaga partes mientras suena
// 1 bombo · 2 caja · 3 charles · 4 acordes · 5 bajo · 6 pad
// Teclas 1-6, clic en los números de abajo, o pads del MPK en modo CC
// Vale para cualquier patrón: añade .mask(part(n)) a una capa
setcps(90 / 60 / 4)

stack(
  s("bd ~ ~ ~ ~ ~ ~ bd ~ ~ bd ~ ~ ~ ~ ~").bank("EmuSP12").mask(part(1)),
  s("~ ~ ~ ~ sd ~ ~ ~ ~ ~ ~ ~ sd ~ ~ ~").bank("EmuSP12").mask(part(2)),
  s("hh*8").bank("EmuSP12").gain("0.5 0.3").swing(4).mask(part(3)),
  chord("<Dm9 G13 C^9 A7b9>").voicing().s("gm_epiano1").gain(0.5).lpf(2200).room(0.3).mask(part(4)),
  note("<d2 g1 c2 a1>").s("gm_acoustic_bass").gain(0.8).mask(part(5)),
  chord("<Dm9 G13 C^9 A7b9>").voicing().s("gm_pad_warm").gain(0.25).room(0.6).mask(part(6))
).analyze(1)`,
    },
  },
  {
    id: 'boombap-sp1200',
    name: { en: 'Boom bap SP-1200', es: 'Boom bap SP-1200' },
    code: {
      en: `// Boom bap 90: SP-1200 drums, jazz chords and upright bass
setcps(90 / 60 / 4)

stack(
  // kick and snare from the E-mu SP-1200, the sampler that shaped boom bap
  s("bd ~ ~ ~ ~ ~ ~ bd ~ ~ bd ~ ~ ~ ~ ~").bank("EmuSP12").gain(1),
  s("~ ~ ~ ~ sd ~ ~ ~ ~ ~ ~ ~ sd ~ ~ ~").bank("EmuSP12"),
  // swung hi-hats
  s("hh*8").bank("EmuSP12").gain("0.5 0.3").swing(4),
  // jazz chords on electric piano
  chord("<Dm9 G13 C^9 A7b9>").voicing().s("gm_epiano1").gain(0.5).lpf(2200).room(0.3),
  // upright bass
  note("<d2 g1 c2 a1>").s("gm_acoustic_bass").gain(0.8)
).analyze(1)`,
      es: `// Boom bap 90: batería SP-1200, acordes de jazz y contrabajo
setcps(90 / 60 / 4)

stack(
  // bombo y caja de la E-mu SP-1200, el sampler que definió el boom bap
  s("bd ~ ~ ~ ~ ~ ~ bd ~ ~ bd ~ ~ ~ ~ ~").bank("EmuSP12").gain(1),
  s("~ ~ ~ ~ sd ~ ~ ~ ~ ~ ~ ~ sd ~ ~ ~").bank("EmuSP12"),
  // charles con swing
  s("hh*8").bank("EmuSP12").gain("0.5 0.3").swing(4),
  // acordes de jazz en piano eléctrico
  chord("<Dm9 G13 C^9 A7b9>").voicing().s("gm_epiano1").gain(0.5).lpf(2200).room(0.3),
  // contrabajo
  note("<d2 g1 c2 a1>").s("gm_acoustic_bass").gain(0.8)
).analyze(1)`,
    },
  },
  {
    id: 'boombap-mpc60',
    name: { en: 'Boom bap MPC60', es: 'Boom bap MPC60' },
    code: {
      en: `// Boom bap 94: MPC60 drums and vibraphone
setcps(94 / 60 / 4)

stack(
  // drums from the Akai MPC60
  s("bd ~ ~ bd ~ ~ ~ ~, ~ ~ sd ~ ~ ~ sd ~").bank("AkaiMPC60").gain(0.9),
  s("hh*8").bank("AkaiMPC60").gain("0.45 0.25").swing(4),
  // vibraphone phrases in A minor
  n("<[0 2 4] [2 4 7] [4 6 9] [3 5 8]>").scale("A:minor").s("gm_vibraphone").gain(0.45).room(0.4),
  note("<a1 c2 e2 d2>").s("gm_acoustic_bass").gain(0.8)
).analyze(1)`,
      es: `// Boom bap 94: batería MPC60 y vibráfono
setcps(94 / 60 / 4)

stack(
  // batería de la Akai MPC60
  s("bd ~ ~ bd ~ ~ ~ ~, ~ ~ sd ~ ~ ~ sd ~").bank("AkaiMPC60").gain(0.9),
  s("hh*8").bank("AkaiMPC60").gain("0.45 0.25").swing(4),
  // frases de vibráfono en La menor
  n("<[0 2 4] [2 4 7] [4 6 9] [3 5 8]>").scale("A:minor").s("gm_vibraphone").gain(0.45).room(0.4),
  note("<a1 c2 e2 d2>").s("gm_acoustic_bass").gain(0.8)
).analyze(1)`,
    },
  },
  {
    id: 'trap-808',
    name: { en: 'Trap 808', es: 'Trap 808' },
    code: {
      en: `// Trap 140: 808, hi-hat rolls and a choir pad
setcps(140 / 60 / 4)

stack(
  // Roland TR-808
  s("bd ~ ~ ~ ~ ~ ~ ~ ~ ~ bd ~ ~ ~ ~ ~").bank("RolandTR808").gain(1.3),
  s("~ ~ ~ ~ ~ ~ ~ ~ sd ~ ~ ~ ~ ~ ~ ~").bank("RolandTR808").gain(1.1),
  // hi-hat rolls: ply repeats each hit
  s("hh*8").bank("RolandTR808").gain(0.45).ply("<1 1 2 [1 3]>"),
  // sub bass
  note("<c2 c2 eb2 g1>").s("sawtooth").lpf(300).gain(0.9).decay(0.6),
  n("0 ~ 3 ~ 5 ~ 3 ~").scale("C:minor").s("gm_pad_choir").gain(0.35).slow(2)
).analyze(1)`,
      es: `// Trap 140: 808, redobles de charles y pad de coro
setcps(140 / 60 / 4)

stack(
  // Roland TR-808
  s("bd ~ ~ ~ ~ ~ ~ ~ ~ ~ bd ~ ~ ~ ~ ~").bank("RolandTR808").gain(1.3),
  s("~ ~ ~ ~ ~ ~ ~ ~ sd ~ ~ ~ ~ ~ ~ ~").bank("RolandTR808").gain(1.1),
  // redobles de charles: ply repite cada golpe
  s("hh*8").bank("RolandTR808").gain(0.45).ply("<1 1 2 [1 3]>"),
  // subgrave
  note("<c2 c2 eb2 g1>").s("sawtooth").lpf(300).gain(0.9).decay(0.6),
  n("0 ~ 3 ~ 5 ~ 3 ~").scale("C:minor").s("gm_pad_choir").gain(0.35).slow(2)
).analyze(1)`,
    },
  },
  {
    id: 'dnb',
    name: { en: 'Drum and bass 174', es: 'Drum and bass 174' },
    code: {
      en: `// Drum and bass 174: two-step, ghost snares, reese bass and a pad
setcps(174 / 60 / 4)

stack(
  // two-step: kick on 1 and the \"and\" of 3, snare on 2 and 4
  s("bd ~ ~ ~ ~ ~ ~ ~ ~ ~ bd ~ ~ ~ ~ ~").bank("EmuSP12").gain(1.1),
  s("~ ~ ~ ~ sd ~ ~ ~ ~ ~ ~ ~ sd ~ ~ ~").bank("EmuSP12").room(0.2),
  // ghost snares, the soft hits in between
  s("~ ~ ~ ~ ~ ~ ~ sd ~ sd ~ ~ ~ ~ ~ sd").bank("EmuSP12").gain(0.3),
  // hats crushed so the kit sounds like a sampled break
  s("hh*8, ~ oh").bank("EmuSP12").gain("0.35 0.2").crush(9),
  // reese bass: two saws slightly out of tune, a slow filter sweep
  note("<e1 e1 g1 [d1 c1]>").s("sawtooth").lpf(sine.range(200, 900).slow(8)).gain(0.45),
  note("<e1 e1 g1 [d1 c1]>").add(note(0.12)).s("sawtooth").lpf(sine.range(200, 900).slow(8)).gain(0.45),
  chord("<Em9 Em9 G^7 D>").voicing().s("gm_pad_warm").gain(0.3).room(0.6)
).analyze(1)`,
      es: `// Drum and bass 174: two-step, cajas fantasma, bajo reese y un pad
setcps(174 / 60 / 4)

stack(
  // two-step: bombo en la 1 y a la mitad de la 3, caja en la 2 y la 4
  s("bd ~ ~ ~ ~ ~ ~ ~ ~ ~ bd ~ ~ ~ ~ ~").bank("EmuSP12").gain(1.1),
  s("~ ~ ~ ~ sd ~ ~ ~ ~ ~ ~ ~ sd ~ ~ ~").bank("EmuSP12").room(0.2),
  // cajas fantasma, los golpes flojos de en medio
  s("~ ~ ~ ~ ~ ~ ~ sd ~ sd ~ ~ ~ ~ ~ sd").bank("EmuSP12").gain(0.3),
  // charles ensuciados para que suene a break sampleado
  s("hh*8, ~ oh").bank("EmuSP12").gain("0.35 0.2").crush(9),
  // bajo reese: dos sierras un poco desafinadas y un filtro que se abre despacio
  note("<e1 e1 g1 [d1 c1]>").s("sawtooth").lpf(sine.range(200, 900).slow(8)).gain(0.45),
  note("<e1 e1 g1 [d1 c1]>").add(note(0.12)).s("sawtooth").lpf(sine.range(200, 900).slow(8)).gain(0.45),
  chord("<Em9 Em9 G^7 D>").voicing().s("gm_pad_warm").gain(0.3).room(0.6)
).analyze(1)`,
    },
  },
  {
    id: 'house-909',
    name: { en: 'House 909', es: 'House 909' },
    code: {
      en: `// House 124: 909 and organ
setcps(124 / 60 / 4)

stack(
  // Roland TR-909, four on the floor
  s("bd*4").bank("RolandTR909").gain(0.85),
  s("~ cp ~ cp").bank("RolandTR909").gain(0.7),
  s("~ oh ~ oh ~ oh ~ oh").bank("RolandTR909").gain(0.35),
  s("hh*16").bank("RolandTR909").gain(0.2),
  // organ stabs
  chord("<Am7 Dm7 G7 C^7>").voicing().s("gm_drawbar_organ").struct("~ x ~ ~ ~ x ~ ~").gain(0.4),
  note("<a1 d2 g1 c2>*4").s("triangle").lpf(400).gain(0.6)
).analyze(1)`,
      es: `// House 124: 909 y órgano
setcps(124 / 60 / 4)

stack(
  // Roland TR-909, bombo a negras
  s("bd*4").bank("RolandTR909").gain(0.85),
  s("~ cp ~ cp").bank("RolandTR909").gain(0.7),
  s("~ oh ~ oh ~ oh ~ oh").bank("RolandTR909").gain(0.35),
  s("hh*16").bank("RolandTR909").gain(0.2),
  // golpes de órgano
  chord("<Am7 Dm7 G7 C^7>").voicing().s("gm_drawbar_organ").struct("~ x ~ ~ ~ x ~ ~").gain(0.4),
  note("<a1 d2 g1 c2>*4").s("triangle").lpf(400).gain(0.6)
).analyze(1)`,
    },
  },
  {
    id: 'hola',
    name: { en: 'Hello Strudel', es: 'Hola Strudel' },
    code: {
      en: `// The bare minimum: a beat and a melody
setcps(0.5)

stack(
  s("bd sd [~ bd] sd"),
  s("hh*8").gain(0.3),
  note("c3 eb3 g3 bb3").s("sawtooth").lpf(800).gain(0.5)
).analyze(1)`,
      es: `// Lo mínimo: un ritmo y una melodía
setcps(0.5)

stack(
  s("bd sd [~ bd] sd"),
  s("hh*8").gain(0.3),
  note("c3 eb3 g3 bb3").s("sawtooth").lpf(800).gain(0.5)
).analyze(1)`,
    },
  },
  {
    id: 'samples',
    name: { en: 'My samples', es: 'Mis samples' },
    code: {
      en: `// Your own sounds
// 1. Open "Samples" (top right) and drop WAVs or MP3s
// 2. Click a sample to copy its name
// 3. Swap "bd" and "sd" for yours
setcps(85 / 60 / 4)

stack(
  s("bd ~ bd ~, ~ sd ~ sd"),
  s("hh*8").gain(0.3)
).analyze(1)`,
      es: `// Tus propios sonidos
// 1. Abre "Samples" (arriba a la derecha) y arrastra WAVs o MP3
// 2. Haz clic en un sample para copiar su nombre
// 3. Cambia "bd" y "sd" por los tuyos
setcps(85 / 60 / 4)

stack(
  s("bd ~ bd ~, ~ sd ~ sd"),
  s("hh*8").gain(0.3)
).analyze(1)`,
    },
  },
  {
    id: 'mpk',
    name: { en: 'MPK Mini', es: 'MPK Mini' },
    code: {
      en: `// Akai MPK Mini Mk II
// Keys → piano · bank B pads → drums (bank A shares notes with the keys)
// Joystick: up (same as knob 1) adds echo, sideways bends the piano and the visual
// Knobs start at 0: turn 4 to bring the beat in and 2 to open the filter
// Knob 7 is the master volume and 8 the ASCII size, in any pattern
// Full Level, Note Repeat and the arpeggiator work on the MPK itself.
// They run at the MPK's tempo (120 unless you tap another): keep setcps in step
// CC mode: hold pad 1 to cut the beat, pad 2 to crush the piano
// PROG CHANGE mode: each pad picks a visual
// Knobs are channel 1 and CC-mode pads channel 10, hence knob(n, 1) and pad(n)
// 1. Open the MIDI panel and hit "Enable MIDI"
// 2. Pick "From the code" in Visual to see this pattern's visual
await initHydra()

// the keys' instrument: 'piano', 'gm_epiano1', 'gm_drawbar_organ',
// 'gm_church_organ', 'gm_string_ensemble_1', 'gm_pad_warm', 'gm_vibraphone',
// 'gm_marimba', 'gm_acoustic_bass', 'sawtooth'… (more in the Cheatsheet)
const sound = 'piano'

const mpk = 'MPK Mini'
const knob = await midin(mpk)
const keys = await midikeys(mpk)
const pad = (n) => knob(n - 1, 10)

// knob 5: how many mirrors · knob 6: how fast it spins
osc(10, 0.05, 1)
  .color(0.34, 0.4, 0.12)
  .kaleid(H(knob(5, 1).range(2, 8)))
  .rotate(0, H(knob(6, 1).range(0, 0.3)))
  .scale(() => 1 + bass())
  .scrollX(() => bend() * 0.2)
  .out()

setcps(120 / 60 / 4)

// bank B pads send notes 32 to 39
const kit = ['bd', 'sd', 'hh', 'oh', 'cp', 'rim', 'lt', 'ht']

stack(
  // a beat to play over · knob 4: its volume
  s("bd ~ ~ bd, ~ sd, hh*8").gain(knob(4, 1).range(0, 0.9).mul(pad(1).mul(-1).add(1))),
  // knob 2: filter · knob 3: reverb
  // joystick up: echo · sideways: bends up to two semitones (each new note)
  keys().s(sound).gain(0.7)
    .lpf(knob(2, 1).range(300, 8000)).room(knob(3, 1).range(0, 0.8))
    .delay(knob(1, 1).range(0, 0.6)).speed(ref(() => 2 ** (bend() * 2 / 12)))
    .crush(pad(2).range(16, 3))
    // pads become drums, hit harder = louder; keys stay piano.
    // The bitcrusher only switches on while pad 2 is held: each crushed note
    // costs its own audio processor, and chords pile them up fast.
    // Keys never go below 35% volume: the arpeggiator repeats the velocity of
    // the chord, and a soft chord made it nearly silent
    .withValue(({ crush, ...v }) => v.note < 40
      ? { s: kit[v.note - 32] ?? 'bd', gain: v.velocity * 0.8 }
      : { ...v, velocity: 0.35 + v.velocity * 0.65, ...(crush < 15 ? { crush } : {}) })
).analyze(1)`,
      es: `// Akai MPK Mini Mk II
// Teclas → piano · pads del banco B → batería (el banco A comparte notas con las teclas)
// Joystick: arriba (igual que el knob 1) añade eco, a los lados desafina el piano y el visual
// Los knobs empiezan en 0: sube el 4 para que entre el ritmo y el 2 para abrir el filtro
// El knob 7 es el volumen general y el 8 el tamaño del ASCII, en cualquier patrón
// Full Level, Note Repeat y el arpegiador funcionan en el propio MPK.
// Van al tempo del MPK (120 si no marcas otro): mantén setcps igual
// Modo CC: mantén el pad 1 para cortar el ritmo y el pad 2 para ensuciar el piano
// Modo PROG CHANGE: cada pad elige un visual
// Los knobs van por el canal 1 y los pads en modo CC por el 10: de ahí knob(n, 1) y pad(n)
// 1. Abre el panel MIDI y pulsa "Activar MIDI"
// 2. Elige "Del código" en Visual para ver el visual de este patrón
await initHydra()

// el instrumento de las teclas: 'piano', 'gm_epiano1', 'gm_drawbar_organ',
// 'gm_church_organ', 'gm_string_ensemble_1', 'gm_pad_warm', 'gm_vibraphone',
// 'gm_marimba', 'gm_acoustic_bass', 'sawtooth'… (más en la Chuleta)
const sound = 'piano'

const mpk = 'MPK Mini'
const knob = await midin(mpk)
const keys = await midikeys(mpk)
const pad = (n) => knob(n - 1, 10)

// knob 5: cuántos espejos · knob 6: lo rápido que gira
osc(10, 0.05, 1)
  .color(0.34, 0.4, 0.12)
  .kaleid(H(knob(5, 1).range(2, 8)))
  .rotate(0, H(knob(6, 1).range(0, 0.3)))
  .scale(() => 1 + bass())
  .scrollX(() => bend() * 0.2)
  .out()

setcps(120 / 60 / 4)

// los pads del banco B mandan las notas 32 a 39
const kit = ['bd', 'sd', 'hh', 'oh', 'cp', 'rim', 'lt', 'ht']

stack(
  // un ritmo sobre el que tocar · knob 4: su volumen
  s("bd ~ ~ bd, ~ sd, hh*8").gain(knob(4, 1).range(0, 0.9).mul(pad(1).mul(-1).add(1))),
  // knob 2: filtro · knob 3: reverb
  // joystick arriba: eco · a los lados: desafina hasta dos semitonos (cada nota nueva)
  keys().s(sound).gain(0.7)
    .lpf(knob(2, 1).range(300, 8000)).room(knob(3, 1).range(0, 0.8))
    .delay(knob(1, 1).range(0, 0.6)).speed(ref(() => 2 ** (bend() * 2 / 12)))
    .crush(pad(2).range(16, 3))
    // los pads pasan a batería, más fuerte = más volumen; las teclas siguen siendo piano.
    // El bitcrush solo se activa mientras mantienes el pad 2: cada nota con bitcrush
    // necesita su propio procesador de audio, y con acordes se acumulan enseguida.
    // Las teclas nunca bajan del 35 % de volumen: el arpegiador repite la fuerza
    // del acorde, y un acorde suave lo dejaba casi en silencio
    .withValue(({ crush, ...v }) => v.note < 40
      ? { s: kit[v.note - 32] ?? 'bd', gain: v.velocity * 0.8 }
      : { ...v, velocity: 0.35 + v.velocity * 0.65, ...(crush < 15 ? { crush } : {}) })
).analyze(1)`,
    },
  },
  {
    id: 'mpc',
    name: { en: 'Any MIDI controller', es: 'Cualquier controlador MIDI' },
    code: {
      en: `// Any MIDI controller: a starting point
// 1. Open the MIDI panel and hit "Enable MIDI"
// 2. Play pads and turn knobs to see their numbers
// 3. Swap 'MIDI' for part of your device's name and the knob(...) numbers for yours
const knob = await midin('MIDI')
const pads = await midikeys('MIDI')

setcps(90 / 60 / 4)

stack(
  s("bd*2, ~ sd, hh*8").gain(0.8),
  // keys and pads play the piano; knob 2 opens the filter
  pads().s("piano").lpf(knob(2).range(300, 5000))
).analyze(1)`,
      es: `// Cualquier controlador MIDI: un punto de partida
// 1. Abre el panel MIDI y pulsa "Activar MIDI"
// 2. Toca pads y gira knobs para ver sus números
// 3. Cambia 'MIDI' por parte del nombre de tu aparato y los números de knob(...) por los tuyos
const knob = await midin('MIDI')
const pads = await midikeys('MIDI')

setcps(90 / 60 / 4)

stack(
  s("bd*2, ~ sd, hh*8").gain(0.8),
  // las teclas y los pads tocan el piano; el knob 2 abre el filtro
  pads().s("piano").lpf(knob(2).range(300, 5000))
).analyze(1)`,
    },
  },
];

// A function, not a constant: names and comments follow the current language
export const builtInPresets = (): Preset[] =>
  presets.map((preset) => ({
    id: preset.id,
    name: pick(preset.name),
    code: pick(preset.code),
  }));

// An untouched built-in pattern in the other language comes back translated;
// anything you edited stays exactly as it is
export function translateIfBuiltIn(code: string) {
  const match = presets.find((preset) => preset.code.en === code || preset.code.es === code);
  return match ? pick(match.code) : code;
}
