export type Preset = { id: string; name: string; code: string };

export const builtInPresets: Preset[] = [
  {
    id: 'lofi',
    name: 'Lofi 78',
    code: `// Lofi 78: boom bap con swing, acordes de piano y visuales
await initHydra()

// lima de joedoe.dev, oscurecida para que se lea el código
osc(6, 0.03, 0.8)
  .color(0.34, 0.4, 0.12)
  .modulate(noise(1.5), 0.25)
  .kaleid(H("<3 3 4 6>"))
  .out()

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
)`,
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
)`,
  },
  {
    id: 'mpc',
    name: 'MPC: pads y knobs',
    code: `// La MPC Studio Black como controlador
// 1. Abre el panel MIDI (arriba a la derecha) y pulsa "Activar MIDI"
// 2. Toca pads y gira knobs para ver sus números
// 3. Cambia 'MPC Public' y los números de cc(...) por los tuyos
await initHydra()

const knob = await midin('MPC Public')
const pads = await midikeys('MPC Public')

// el knob 1 mueve los visuales
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
)`,
  },
  {
    id: 'visuales',
    name: 'Solo visuales',
    code: `// Solo Hydra: pulsa play y cambia los números
await initHydra()

shape(4, 0.4, 0.01)
  .repeat(3, 3)
  .scrollX(0.1, 0.05)
  .color(0.34, 0.4, 0.12)
  .modulateRotate(osc(2, 0.1), 0.5)
  .diff(src(o0).scale(1.01))
  .out()

silence`,
  },
];
