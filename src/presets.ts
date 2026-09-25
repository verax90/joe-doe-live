export type Preset = { id: string; name: string; code: string };

// Los visuales se eligen en el selector "Visual". .analyze(1) deja que los
// visuales que escuchan el audio (graves, volumen) reaccionen a este patrón.
export const builtInPresets: Preset[] = [
  {
    id: 'lofi',
    name: 'Lofi 78',
    code: `// Lofi 78: boom bap con swing, acordes de piano y bajo
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
  {
    id: 'hola',
    name: 'Hola Strudel',
    code: `// Lo mínimo: un ritmo y una melodía
setcps(0.5)

stack(
  s("bd sd [~ bd] sd"),
  s("hh*8").gain(0.3),
  note("c3 eb3 g3 bb3").s("sawtooth").lpf(800).gain(0.5)
).analyze(1)`,
  },
  {
    id: 'samples',
    name: 'Mis samples',
    code: `// Tus propios sonidos
// 1. Abre "Samples" (arriba a la derecha) y arrastra WAVs o MP3
// 2. Haz clic en un sample para copiar su nombre
// 3. Cambia "bd" y "sd" por los tuyos
setcps(85 / 60 / 4)

stack(
  s("bd ~ bd ~, ~ sd ~ sd"),
  s("hh*8").gain(0.3)
).analyze(1)`,
  },
  {
    id: 'mpc',
    name: 'MPC: pads y knobs',
    code: `// La MPC Studio Black como controlador
// 1. Abre el panel MIDI (arriba a la derecha) y pulsa "Activar MIDI"
// 2. Toca pads y gira knobs para ver sus números
// 3. Cambia 'MPC Public' y los números de knob(...) por los tuyos
// 4. Elige "Del código" en Visual para ver el visual de este patrón
await initHydra()

const knob = await midin('MPC Public')
const pads = await midikeys('MPC Public')

// el knob 1 gira los visuales
osc(10, 0.05, 1)
  .color(0.34, 0.4, 0.12)
  .rotate(H(knob(1).mul(3.14)))
  .modulate(noise(3), 0.3)
  .out()

setcps(90 / 60 / 4)

stack(
  s("bd*2, ~ sd, hh*8").gain(0.8),
  // los pads tocan el piano; el knob 2 abre el filtro
  pads().s("piano").lpf(knob(2).range(300, 5000))
).analyze(1)`,
  },
];
