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
// Full Level, Note Repeat and the arpeggiator work on the MPK itself.
// They run at the MPK's tempo (120 unless you tap another): keep setcps in step
// 1. Open the MIDI panel and hit "Enable MIDI"
// 2. Pick "From the code" in Visual to see this pattern's visual
await initHydra()

const mpk = 'MPK Mini'
const knob = await midin(mpk)
const keys = await midikeys(mpk)

// knob 5: how many mirrors · knob 6: how fast it spins
osc(10, 0.05, 1)
  .color(0.34, 0.4, 0.12)
  .kaleid(H(knob(5).range(2, 8)))
  .rotate(0, H(knob(6).range(0, 0.3)))
  .scale(() => 1 + bass())
  .scrollX(() => bend() * 0.2)
  .out()

setcps(120 / 60 / 4)

// bank B pads send notes 32 to 39
const kit = ['bd', 'sd', 'hh', 'oh', 'cp', 'rim', 'lt', 'ht']

stack(
  // a beat to play over · knob 4: its volume
  s("bd ~ ~ bd, ~ sd, hh*8").gain(knob(4).range(0, 0.9)),
  // knob 2: filter · knob 3: reverb
  // joystick up: echo · sideways: up to a semitone of bend
  keys().s("piano")
    .lpf(knob(2).range(300, 8000)).room(knob(3).range(0, 0.8))
    .delay(knob(1).range(0, 0.6)).speed(ref(() => 1 + bend() * 0.06))
    // pads become drums, hit harder = louder; keys stay piano
    .withValue(v => v.note < 40
      ? { s: kit[v.note - 32] ?? 'bd', gain: v.velocity }
      : v)
).analyze(1)`,
      es: `// Akai MPK Mini Mk II
// Teclas → piano · pads del banco B → batería (el banco A comparte notas con las teclas)
// Joystick: arriba (igual que el knob 1) añade eco, a los lados desafina el piano y el visual
// Los knobs empiezan en 0: sube el 4 para que entre el ritmo y el 2 para abrir el filtro
// Full Level, Note Repeat y el arpegiador funcionan en el propio MPK.
// Van al tempo del MPK (120 si no marcas otro): mantén setcps igual
// 1. Abre el panel MIDI y pulsa "Activar MIDI"
// 2. Elige "Del código" en Visual para ver el visual de este patrón
await initHydra()

const mpk = 'MPK Mini'
const knob = await midin(mpk)
const keys = await midikeys(mpk)

// knob 5: cuántos espejos · knob 6: lo rápido que gira
osc(10, 0.05, 1)
  .color(0.34, 0.4, 0.12)
  .kaleid(H(knob(5).range(2, 8)))
  .rotate(0, H(knob(6).range(0, 0.3)))
  .scale(() => 1 + bass())
  .scrollX(() => bend() * 0.2)
  .out()

setcps(120 / 60 / 4)

// los pads del banco B mandan las notas 32 a 39
const kit = ['bd', 'sd', 'hh', 'oh', 'cp', 'rim', 'lt', 'ht']

stack(
  // un ritmo sobre el que tocar · knob 4: su volumen
  s("bd ~ ~ bd, ~ sd, hh*8").gain(knob(4).range(0, 0.9)),
  // knob 2: filtro · knob 3: reverb
  // joystick arriba: eco · a los lados: hasta un semitono de bend
  keys().s("piano")
    .lpf(knob(2).range(300, 8000)).room(knob(3).range(0, 0.8))
    .delay(knob(1).range(0, 0.6)).speed(ref(() => 1 + bend() * 0.06))
    // los pads pasan a batería, más fuerte = más volumen; las teclas siguen siendo piano
    .withValue(v => v.note < 40
      ? { s: kit[v.note - 32] ?? 'bd', gain: v.velocity }
      : v)
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

export const builtInPresets: Preset[] = presets.map((preset) => ({
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
