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
    id: 'mpc',
    name: { en: 'MIDI controller', es: 'Controlador MIDI' },
    code: {
      en: `// A MIDI controller (MPK, MPC…) playing the studio
// 1. Open the MIDI panel (top right) and hit "Enable MIDI"
// 2. Play pads and turn knobs to see their numbers
// 3. Swap 'MPK' and the knob(...) numbers for yours
// 4. Pick "From the code" in Visual to see this pattern's visual
await initHydra()

const knob = await midin('MPK')
const pads = await midikeys('MPK')

// knob 1 rotates the visuals
osc(10, 0.05, 1)
  .color(0.34, 0.4, 0.12)
  .rotate(H(knob(1).mul(3.14)))
  .modulate(noise(3), 0.3)
  .out()

setcps(90 / 60 / 4)

stack(
  s("bd*2, ~ sd, hh*8").gain(0.8),
  // keys and pads play the piano; knob 2 opens the filter
  pads().s("piano").lpf(knob(2).range(300, 5000))
).analyze(1)`,
      es: `// Un controlador MIDI (MPK, MPC…) tocando el estudio
// 1. Abre el panel MIDI (arriba a la derecha) y pulsa "Activar MIDI"
// 2. Toca pads y gira knobs para ver sus números
// 3. Cambia 'MPK' y los números de knob(...) por los tuyos
// 4. Elige "Del código" en Visual para ver el visual de este patrón
await initHydra()

const knob = await midin('MPK')
const pads = await midikeys('MPK')

// el knob 1 gira los visuales
osc(10, 0.05, 1)
  .color(0.34, 0.4, 0.12)
  .rotate(H(knob(1).mul(3.14)))
  .modulate(noise(3), 0.3)
  .out()

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
