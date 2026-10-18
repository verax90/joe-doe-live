import { LANGS, pick, type Localized } from './i18n';

export type Preset = { id: string; name: string; code: string };

// Visuals are picked in the "Visual" selector. .analyze(1) lets the visuals
// that listen to the audio (bass, volume) react to the pattern.
const presets: { id: string; name: Localized; code: Localized }[] = [
  {
    id: 'lofi',
    name: { en: 'Lofi 78', es: 'Lofi 78', ca: 'Lofi 78' },
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
      ca: `// Lofi 78: boom bap amb swing, acords de piano i baix
setcps(78 / 60 / 4)

stack(
  // bombo i caixa
  s("bd ~ ~ ~ sd ~ ~ bd ~ ~ bd ~ sd ~ ~ ~")
    .gain(1.1).lpf(3500).crush(10),
  // hi-hat amb swing
  s("hh*8").gain("0.35 0.2").swing(4).lpf(6000),
  // acords
  chord("<F^7 Em7 Dm7 C^7>").voicing()
    .s("piano").gain(0.55).room(0.5).lpf(1800),
  // baix
  note("<f2 e2 d2 c2>").s("triangle").gain(0.7).lpf(500),
  // soroll de vinil
  s("pink").gain(0.02).hpf(4000)
).analyze(1)`,
    },
  },
  {
    id: 'scenes',
    name: { en: 'Scenes (parts)', es: 'Escenas (partes)', ca: 'Escenes (parts)' },
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
      ca: `// Escenes: engega i apaga parts mentre sona
// 1 bombo · 2 caixa · 3 hi-hat · 4 acords · 5 baix · 6 pad
// Tecles 1-6, clic als números de baix, o pads del MPK en mode CC
// Val per a qualsevol patró: afegeix .mask(part(n)) a una capa
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
    name: { en: 'Boom bap SP-1200', es: 'Boom bap SP-1200', ca: 'Boom bap SP-1200' },
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
      ca: `// Boom bap 90: bateria SP-1200, acords de jazz i contrabaix
setcps(90 / 60 / 4)

stack(
  // bombo i caixa de l'E-mu SP-1200, el sampler que va definir el boom bap
  s("bd ~ ~ ~ ~ ~ ~ bd ~ ~ bd ~ ~ ~ ~ ~").bank("EmuSP12").gain(1),
  s("~ ~ ~ ~ sd ~ ~ ~ ~ ~ ~ ~ sd ~ ~ ~").bank("EmuSP12"),
  // hi-hat amb swing
  s("hh*8").bank("EmuSP12").gain("0.5 0.3").swing(4),
  // acords de jazz amb piano elèctric
  chord("<Dm9 G13 C^9 A7b9>").voicing().s("gm_epiano1").gain(0.5).lpf(2200).room(0.3),
  // contrabaix
  note("<d2 g1 c2 a1>").s("gm_acoustic_bass").gain(0.8)
).analyze(1)`,
    },
  },
  {
    id: 'boombap-mpc60',
    name: { en: 'Boom bap MPC60', es: 'Boom bap MPC60', ca: 'Boom bap MPC60' },
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
      ca: `// Boom bap 94: bateria MPC60 i vibràfon
setcps(94 / 60 / 4)

stack(
  // bateria de l'Akai MPC60
  s("bd ~ ~ bd ~ ~ ~ ~, ~ ~ sd ~ ~ ~ sd ~").bank("AkaiMPC60").gain(0.9),
  s("hh*8").bank("AkaiMPC60").gain("0.45 0.25").swing(4),
  // frases de vibràfon en La menor
  n("<[0 2 4] [2 4 7] [4 6 9] [3 5 8]>").scale("A:minor").s("gm_vibraphone").gain(0.45).room(0.4),
  note("<a1 c2 e2 d2>").s("gm_acoustic_bass").gain(0.8)
).analyze(1)`,
    },
  },
  {
    id: 'shaolin',
    name: { en: 'Boom bap Shaolin', es: 'Boom bap Shaolin', ca: 'Boom bap Shaolin' },
    code: {
      en: `// Shaolin 92: hard 90s New York boom bap, the Wu-Tang way. Dusty SP-1200,
// a piano a hair flat, a kung-fu film flute, tremolo strings, vinyl
// Every $: line is a track that plays with the rest: write _$: to mute one
setcps(92 / 60 / 4)

// the kick pushes before the snare; the snare cracks on 2 and 4
$: s("bd ~ ~ bd ~ ~ ~ ~ ~ ~ bd ~ ~ bd ~ ~").bank("EmuSP12").gain(1.2).shape(0.2)
$: s("~ sd").bank("EmuSP12").gain(1.1).room(0.15)
$: s("hh*8").bank("EmuSP12").gain("0.4 0.25").swing(4).lpf(6000)
// the out-of-tune piano: speed below 1 plays the sample flat
$: note("<[c4,eb4,g4]!2 [bb3,d4,f4] [ab3,c4,eb4]>").struct("x ~ ~ x ~ ~ x ~")
  .s("piano").speed(0.97).lpf(2500).room(0.3).gain(0.5)
$: note("<c2 c2 ab1 g1>").struct("x ~ ~ x ~ ~ ~ ~ ~ ~ x ~ ~ ~ ~ ~")
  .s("gm_acoustic_bass").lpf(800).gain(0.9)
// the kung-fu flute, every other bar
$: note("<[g5 ~ f5 eb5] ~ [~ ~ c5 ~] ~>").s("gm_shakuhachi").gain(0.35).room(0.5)
$: note("<c3 ~ ab2 g2>").s("gm_tremolo_strings").gain(0.2).room(0.4)
$: s("crackle*4").gain(0.15)

// .analyze(1) on every track so the visuals hear it
all(x => x.analyze(1))`,
      es: `// Shaolin 92: boom bap duro de Nueva York de los 90, a lo Wu-Tang. SP-1200
// polvorienta, un piano un pelín desafinado, flauta de peli de kung-fu,
// cuerdas en trémolo y vinilo
// Cada línea $: es una pista que suena con el resto: escribe _$: para silenciar una
setcps(92 / 60 / 4)

// el bombo empuja antes de la caja; la caja restalla en el 2 y el 4
$: s("bd ~ ~ bd ~ ~ ~ ~ ~ ~ bd ~ ~ bd ~ ~").bank("EmuSP12").gain(1.2).shape(0.2)
$: s("~ sd").bank("EmuSP12").gain(1.1).room(0.15)
$: s("hh*8").bank("EmuSP12").gain("0.4 0.25").swing(4).lpf(6000)
// el piano desafinado: una velocidad por debajo de 1 baja un poco el sample
$: note("<[c4,eb4,g4]!2 [bb3,d4,f4] [ab3,c4,eb4]>").struct("x ~ ~ x ~ ~ x ~")
  .s("piano").speed(0.97).lpf(2500).room(0.3).gain(0.5)
$: note("<c2 c2 ab1 g1>").struct("x ~ ~ x ~ ~ ~ ~ ~ ~ x ~ ~ ~ ~ ~")
  .s("gm_acoustic_bass").lpf(800).gain(0.9)
// la flauta de kung-fu, un compás sí y otro no
$: note("<[g5 ~ f5 eb5] ~ [~ ~ c5 ~] ~>").s("gm_shakuhachi").gain(0.35).room(0.5)
$: note("<c3 ~ ab2 g2>").s("gm_tremolo_strings").gain(0.2).room(0.4)
$: s("crackle*4").gain(0.15)

// .analyze(1) en todas las pistas para que los visuales lo oigan
all(x => x.analyze(1))`,
      ca: `// Shaolin 92: boom bap dur de Nova York dels 90, a l'estil Wu-Tang. SP-1200
// polsosa, un piano una mica desafinat, flauta de peli de kung-fu,
// cordes en trèmolo i vinil
// Cada línia $: és una pista que sona amb la resta: escriu _$: per silenciar-ne una
setcps(92 / 60 / 4)

// el bombo empeny abans de la caixa; la caixa esclata al 2 i al 4
$: s("bd ~ ~ bd ~ ~ ~ ~ ~ ~ bd ~ ~ bd ~ ~").bank("EmuSP12").gain(1.2).shape(0.2)
$: s("~ sd").bank("EmuSP12").gain(1.1).room(0.15)
$: s("hh*8").bank("EmuSP12").gain("0.4 0.25").swing(4).lpf(6000)
// el piano desafinat: una velocitat per sota d'1 abaixa una mica el sample
$: note("<[c4,eb4,g4]!2 [bb3,d4,f4] [ab3,c4,eb4]>").struct("x ~ ~ x ~ ~ x ~")
  .s("piano").speed(0.97).lpf(2500).room(0.3).gain(0.5)
$: note("<c2 c2 ab1 g1>").struct("x ~ ~ x ~ ~ ~ ~ ~ ~ x ~ ~ ~ ~ ~")
  .s("gm_acoustic_bass").lpf(800).gain(0.9)
// la flauta de kung-fu, un compàs sí i un altre no
$: note("<[g5 ~ f5 eb5] ~ [~ ~ c5 ~] ~>").s("gm_shakuhachi").gain(0.35).room(0.5)
$: note("<c3 ~ ab2 g2>").s("gm_tremolo_strings").gain(0.2).room(0.4)
$: s("crackle*4").gain(0.15)

// .analyze(1) a totes les pistes perquè els visuals ho sentin
all(x => x.analyze(1))`,
    },
  },
  {
    id: 'queensbridge',
    name: { en: 'Boom bap Queensbridge', es: 'Boom bap Queensbridge', ca: 'Boom bap Queensbridge' },
    code: {
      en: `// Queensbridge 88: dark 90s boom bap. Heavy MPC60 drums, an eerie high piano
// rubbing two notes a semitone apart, and a deep 808 under it
// Every $: line is a track that plays with the rest: write _$: to mute one
setcps(88 / 60 / 4)

$: s("bd ~ ~ ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~ ~ ~").bank("AkaiMPC60").gain(1.3).shape(0.25)
$: s("~ ~ ~ ~ sd ~ ~ ~ ~ ~ ~ ~ sd ~ ~ <~ sd>").bank("AkaiMPC60").gain(1.1)
$: s("[~ hh]*4").bank("AkaiMPC60").gain(0.35)
// the eerie piano: a minor second, high up, with a long reverb
$: note("<[bb5 a5]*2 [bb5 a5 ~ e5]>").s("piano").gain(0.35).room(0.6).lpf(4000)
$: note("<d2 d2 bb1 a1>").s("sine").decay(0.7).sustain(0).shape(0.3).lpf(300).gain(0.9)

// .analyze(1) on every track so the visuals hear it
all(x => x.analyze(1))`,
      es: `// Queensbridge 88: boom bap oscuro de los 90. Batería MPC60 pesada, un piano
// agudo e inquietante que roza dos notas a un semitono, y un 808 grave debajo
// Cada línea $: es una pista que suena con el resto: escribe _$: para silenciar una
setcps(88 / 60 / 4)

$: s("bd ~ ~ ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~ ~ ~").bank("AkaiMPC60").gain(1.3).shape(0.25)
$: s("~ ~ ~ ~ sd ~ ~ ~ ~ ~ ~ ~ sd ~ ~ <~ sd>").bank("AkaiMPC60").gain(1.1)
$: s("[~ hh]*4").bank("AkaiMPC60").gain(0.35)
// el piano inquietante: una segunda menor, agudo, con reverb larga
$: note("<[bb5 a5]*2 [bb5 a5 ~ e5]>").s("piano").gain(0.35).room(0.6).lpf(4000)
$: note("<d2 d2 bb1 a1>").s("sine").decay(0.7).sustain(0).shape(0.3).lpf(300).gain(0.9)

// .analyze(1) en todas las pistas para que los visuales lo oigan
all(x => x.analyze(1))`,
      ca: `// Queensbridge 88: boom bap fosc dels 90. Bateria MPC60 pesada, un piano
// agut i inquietant que frega dues notes a un semitò, i un 808 greu a sota
// Cada línia $: és una pista que sona amb la resta: escriu _$: per silenciar-ne una
setcps(88 / 60 / 4)

$: s("bd ~ ~ ~ ~ ~ bd ~ ~ ~ bd ~ ~ ~ ~ ~").bank("AkaiMPC60").gain(1.3).shape(0.25)
$: s("~ ~ ~ ~ sd ~ ~ ~ ~ ~ ~ ~ sd ~ ~ <~ sd>").bank("AkaiMPC60").gain(1.1)
$: s("[~ hh]*4").bank("AkaiMPC60").gain(0.35)
// el piano inquietant: una segona menor, aguda, amb reverb llarga
$: note("<[bb5 a5]*2 [bb5 a5 ~ e5]>").s("piano").gain(0.35).room(0.6).lpf(4000)
$: note("<d2 d2 bb1 a1>").s("sine").decay(0.7).sustain(0).shape(0.3).lpf(300).gain(0.9)

// .analyze(1) a totes les pistes perquè els visuals ho sentin
all(x => x.analyze(1))`,
    },
  },
  {
    id: 'mugre',
    name: { en: 'Boom bap raw', es: 'Boom bap mugre', ca: 'Boom bap brut' },
    code: {
      en: `// Raw 94: saturated Akai XR10 drums, orchestra hits, a shamisen riff and a
// finger bass. Grimy on purpose
// Every $: line is a track that plays with the rest: write _$: to mute one
setcps(94 / 60 / 4)

$: s("bd ~ ~ bd ~ ~ bd ~ ~ ~ bd ~ ~ ~ ~ ~").bank("AkaiXR10").gain(1.3).shape(0.3).lpf(4000)
$: s("~ sd ~ sd").bank("AkaiXR10").gain(1.1).room(0.2)
$: s("hh*8?").bank("AkaiXR10").gain(0.35).swing(4)
$: note("<[a2 ~ ~ ~] [c3 ~ ~ b2]>").s("gm_orchestra_hit").gain(0.3).lpf(3000)
$: n("<[0 ~ 3 ~ 2 ~ ~ ~] [0 ~ ~ 5 3 ~ 2 ~]>").scale("A3:minor").s("gm_shamisen").gain(0.4).room(0.3)
$: note("<a1 a1 f1 e1>").struct("x ~ ~ x ~ ~ x ~").s("gm_electric_bass_finger").lpf(700).gain(0.85)

// .analyze(1) on every track so the visuals hear it
all(x => x.analyze(1))`,
      es: `// Mugre 94: batería Akai XR10 saturada, golpes de orquesta, un riff de shamisen
// y bajo de dedo. Sucio a propósito
// Cada línea $: es una pista que suena con el resto: escribe _$: para silenciar una
setcps(94 / 60 / 4)

$: s("bd ~ ~ bd ~ ~ bd ~ ~ ~ bd ~ ~ ~ ~ ~").bank("AkaiXR10").gain(1.3).shape(0.3).lpf(4000)
$: s("~ sd ~ sd").bank("AkaiXR10").gain(1.1).room(0.2)
$: s("hh*8?").bank("AkaiXR10").gain(0.35).swing(4)
$: note("<[a2 ~ ~ ~] [c3 ~ ~ b2]>").s("gm_orchestra_hit").gain(0.3).lpf(3000)
$: n("<[0 ~ 3 ~ 2 ~ ~ ~] [0 ~ ~ 5 3 ~ 2 ~]>").scale("A3:minor").s("gm_shamisen").gain(0.4).room(0.3)
$: note("<a1 a1 f1 e1>").struct("x ~ ~ x ~ ~ x ~").s("gm_electric_bass_finger").lpf(700).gain(0.85)

// .analyze(1) en todas las pistas para que los visuales lo oigan
all(x => x.analyze(1))`,
      ca: `// Brut 94: bateria Akai XR10 saturada, cops d'orquestra, un riff de shamisen
// i baix de dit. Brut expressament
// Cada línia $: és una pista que sona amb la resta: escriu _$: per silenciar-ne una
setcps(94 / 60 / 4)

$: s("bd ~ ~ bd ~ ~ bd ~ ~ ~ bd ~ ~ ~ ~ ~").bank("AkaiXR10").gain(1.3).shape(0.3).lpf(4000)
$: s("~ sd ~ sd").bank("AkaiXR10").gain(1.1).room(0.2)
$: s("hh*8?").bank("AkaiXR10").gain(0.35).swing(4)
$: note("<[a2 ~ ~ ~] [c3 ~ ~ b2]>").s("gm_orchestra_hit").gain(0.3).lpf(3000)
$: n("<[0 ~ 3 ~ 2 ~ ~ ~] [0 ~ ~ 5 3 ~ 2 ~]>").scale("A3:minor").s("gm_shamisen").gain(0.4).room(0.3)
$: note("<a1 a1 f1 e1>").struct("x ~ ~ x ~ ~ x ~").s("gm_electric_bass_finger").lpf(700).gain(0.85)

// .analyze(1) a totes les pistes perquè els visuals ho sentin
all(x => x.analyze(1))`,
    },
  },
  {
    id: 'trap-808',
    name: { en: 'Trap 808', es: 'Trap 808', ca: 'Trap 808' },
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
      ca: `// Trap 140: 808, redobles de hi-hat i pad de cor
setcps(140 / 60 / 4)

stack(
  // Roland TR-808
  s("bd ~ ~ ~ ~ ~ ~ ~ ~ ~ bd ~ ~ ~ ~ ~").bank("RolandTR808").gain(1.3),
  s("~ ~ ~ ~ ~ ~ ~ ~ sd ~ ~ ~ ~ ~ ~ ~").bank("RolandTR808").gain(1.1),
  // redobles de hi-hat: ply repeteix cada cop
  s("hh*8").bank("RolandTR808").gain(0.45).ply("<1 1 2 [1 3]>"),
  // subgreu
  note("<c2 c2 eb2 g1>").s("sawtooth").lpf(300).gain(0.9).decay(0.6),
  n("0 ~ 3 ~ 5 ~ 3 ~").scale("C:minor").s("gm_pad_choir").gain(0.35).slow(2)
).analyze(1)`,
    },
  },
  {
    id: 'drill',
    name: { en: 'UK drill', es: 'Drill UK', ca: 'Drill UK' },
    code: {
      en: `// UK drill 142: sliding 808, triplet hats, the snare on beat three
// Every $: line is a track that plays with the rest: write _$: to mute one
setcps(142 / 60 / 4)

// kick, off the grid
$: s("bd ~ ~ ~ ~ ~ ~ bd ~ ~ bd ~ ~ ~ ~ ~").bank("RolandTR808").gain(1.1)
// the snare on beat three gives drill its half-time feel
$: s("~ ~ ~ ~ ~ ~ ~ ~ sd ~ ~ ~ ~ ~ ~ <~ sd>").bank("RolandTR808")
// triplet hats with a roll every other bar
$: s("hh*12").bank("RolandTR808").gain("0.5 0.3 0.35").ply("<1 [1 1 2 1] 1 [1 3 1 1]>")
// 808: a sine with a bit of drive, following the kick
$: note("<[c#2 ~ ~ ~ ~ ~ ~ c#2 ~ ~ e2 ~ ~ ~ ~ ~] [c#2 ~ ~ ~ ~ ~ ~ c#2 ~ ~ f#2 ~ ~ ~ g#1 ~]>")
  .s("sine").decay(0.8).sustain(0).shape(0.35).lpf(500).gain(0.9)
// dark strings in C# minor
$: n("<[0 ~ ~ 3 ~ ~ 2 ~] [0 ~ ~ 3 ~ 5 4 ~]>").scale("C#4:minor")
  .s("gm_string_ensemble_1").gain(0.3).room(0.4)

// .analyze(1) on every track so the visuals hear it
all(x => x.analyze(1))`,
      es: `// Drill UK 142: 808 que desliza, charles en tresillos, caja en el tercer tiempo
// Cada línea $: es una pista que suena con el resto: escribe _$: para silenciar una
setcps(142 / 60 / 4)

// bombo, fuera de la rejilla
$: s("bd ~ ~ ~ ~ ~ ~ bd ~ ~ bd ~ ~ ~ ~ ~").bank("RolandTR808").gain(1.1)
// la caja en el tercer tiempo da al drill su sensación de medio tiempo
$: s("~ ~ ~ ~ ~ ~ ~ ~ sd ~ ~ ~ ~ ~ ~ <~ sd>").bank("RolandTR808")
// charles en tresillos con un redoble cada dos compases
$: s("hh*12").bank("RolandTR808").gain("0.5 0.3 0.35").ply("<1 [1 1 2 1] 1 [1 3 1 1]>")
// 808: una senoidal algo saturada, siguiendo al bombo
$: note("<[c#2 ~ ~ ~ ~ ~ ~ c#2 ~ ~ e2 ~ ~ ~ ~ ~] [c#2 ~ ~ ~ ~ ~ ~ c#2 ~ ~ f#2 ~ ~ ~ g#1 ~]>")
  .s("sine").decay(0.8).sustain(0).shape(0.35).lpf(500).gain(0.9)
// cuerdas oscuras en do# menor
$: n("<[0 ~ ~ 3 ~ ~ 2 ~] [0 ~ ~ 3 ~ 5 4 ~]>").scale("C#4:minor")
  .s("gm_string_ensemble_1").gain(0.3).room(0.4)

// .analyze(1) en todas las pistas para que los visuales lo oigan
all(x => x.analyze(1))`,
      ca: `// Drill UK 142: 808 que llisca, hi-hat en tresets, caixa al tercer temps
// Cada línia $: és una pista que sona amb la resta: escriu _$: per silenciar-ne una
setcps(142 / 60 / 4)

// bombo, fora de la graella
$: s("bd ~ ~ ~ ~ ~ ~ bd ~ ~ bd ~ ~ ~ ~ ~").bank("RolandTR808").gain(1.1)
// la caixa al tercer temps dona al drill la seva sensació de mig temps
$: s("~ ~ ~ ~ ~ ~ ~ ~ sd ~ ~ ~ ~ ~ ~ <~ sd>").bank("RolandTR808")
// hi-hat en tresets amb un redoble cada dos compassos
$: s("hh*12").bank("RolandTR808").gain("0.5 0.3 0.35").ply("<1 [1 1 2 1] 1 [1 3 1 1]>")
// 808: una sinusoide una mica saturada, seguint el bombo
$: note("<[c#2 ~ ~ ~ ~ ~ ~ c#2 ~ ~ e2 ~ ~ ~ ~ ~] [c#2 ~ ~ ~ ~ ~ ~ c#2 ~ ~ f#2 ~ ~ ~ g#1 ~]>")
  .s("sine").decay(0.8).sustain(0).shape(0.35).lpf(500).gain(0.9)
// cordes fosques en do# menor
$: n("<[0 ~ ~ 3 ~ ~ 2 ~] [0 ~ ~ 3 ~ 5 4 ~]>").scale("C#4:minor")
  .s("gm_string_ensemble_1").gain(0.3).room(0.4)

// .analyze(1) a totes les pistes perquè els visuals ho sentin
all(x => x.analyze(1))`,
    },
  },
  {
    id: 'gfunk',
    name: { en: 'G-funk', es: 'G-funk', ca: 'G-funk' },
    code: {
      en: `// G-funk 92: LinnDrum, rolling synth bass, the whiny lead and Rhodes chords
// Every $: line is a track that plays with the rest: write _$: to mute one
setcps(92 / 60 / 4)

$: s("bd ~ ~ bd ~ ~ bd ~ ~ ~ bd ~ ~ ~ ~ ~").bank("LinnDrum")
$: s("~ [sd,cp]").bank("LinnDrum").gain(0.9)
// swung sixteenths
$: s("hh*16").bank("LinnDrum").gain("0.35 0.2").swing(4)
// the bass that rolls under everything
$: note("<[g1 ~ g1 bb1 ~ c2 ~ d2] [eb1 ~ eb1 g1 ~ bb1 ~ c2]>")
  .s("gm_synth_bass_1").lpf(900).gain(0.8)
// Rhodes, ninth chords
$: chord("<Gm9 Eb^9>").voicing().s("gm_epiano1").gain(0.35).room(0.3)
// the whistle-like lead: a sine with vibrato
$: note("<[d5 ~ ~ ~ f5 ~ d5 c5] [bb4 ~ ~ ~ ~ ~ g4 ~]>")
  .s("sine").vib(5).vibmod(0.25).attack(0.05).release(0.4).gain(0.3)

// .analyze(1) on every track so the visuals hear it
all(x => x.analyze(1))`,
      es: `// G-funk 92: LinnDrum, bajo de sinte que rueda, el lead chillón y acordes de Rhodes
// Cada línea $: es una pista que suena con el resto: escribe _$: para silenciar una
setcps(92 / 60 / 4)

$: s("bd ~ ~ bd ~ ~ bd ~ ~ ~ bd ~ ~ ~ ~ ~").bank("LinnDrum")
$: s("~ [sd,cp]").bank("LinnDrum").gain(0.9)
// semicorcheas con swing
$: s("hh*16").bank("LinnDrum").gain("0.35 0.2").swing(4)
// el bajo que rueda por debajo de todo
$: note("<[g1 ~ g1 bb1 ~ c2 ~ d2] [eb1 ~ eb1 g1 ~ bb1 ~ c2]>")
  .s("gm_synth_bass_1").lpf(900).gain(0.8)
// Rhodes, acordes de novena
$: chord("<Gm9 Eb^9>").voicing().s("gm_epiano1").gain(0.35).room(0.3)
// el lead que parece un silbido: una senoidal con vibrato
$: note("<[d5 ~ ~ ~ f5 ~ d5 c5] [bb4 ~ ~ ~ ~ ~ g4 ~]>")
  .s("sine").vib(5).vibmod(0.25).attack(0.05).release(0.4).gain(0.3)

// .analyze(1) en todas las pistas para que los visuales lo oigan
all(x => x.analyze(1))`,
      ca: `// G-funk 92: LinnDrum, baix de sinte que roda, el lead xisclaire i acords de Rhodes
// Cada línia $: és una pista que sona amb la resta: escriu _$: per silenciar-ne una
setcps(92 / 60 / 4)

$: s("bd ~ ~ bd ~ ~ bd ~ ~ ~ bd ~ ~ ~ ~ ~").bank("LinnDrum")
$: s("~ [sd,cp]").bank("LinnDrum").gain(0.9)
// semicorxeres amb swing
$: s("hh*16").bank("LinnDrum").gain("0.35 0.2").swing(4)
// el baix que roda per sota de tot
$: note("<[g1 ~ g1 bb1 ~ c2 ~ d2] [eb1 ~ eb1 g1 ~ bb1 ~ c2]>")
  .s("gm_synth_bass_1").lpf(900).gain(0.8)
// Rhodes, acords de novena
$: chord("<Gm9 Eb^9>").voicing().s("gm_epiano1").gain(0.35).room(0.3)
// el lead que sembla un xiulet: una sinusoide amb vibrato
$: note("<[d5 ~ ~ ~ f5 ~ d5 c5] [bb4 ~ ~ ~ ~ ~ g4 ~]>")
  .s("sine").vib(5).vibmod(0.25).attack(0.05).release(0.4).gain(0.3)

// .analyze(1) a totes les pistes perquè els visuals ho sentin
all(x => x.analyze(1))`,
    },
  },
  {
    id: 'phonk',
    name: { en: 'Phonk', es: 'Phonk', ca: 'Phonk' },
    code: {
      en: `// Phonk 130: the Memphis cowbell melody, a driven 808 and a dusty choir
// Every $: line is a track that plays with the rest: write _$: to mute one
setcps(130 / 60 / 4)

$: s("bd ~ ~ bd ~ ~ bd ~ ~ ~ bd ~ ~ ~ ~ ~").bank("RolandTR808").gain(1.2)
$: s("~ cp ~ cp").bank("RolandTR808")
$: s("hh*8").bank("RolandTR808").gain("0.5 0.3").ply("<1 1 1 2>")
// the cowbell plays the tune
$: note("<[c4 c4 eb4 c4 g4 f4 eb4 c4] [c4 c4 eb4 f4 g4 bb4 g4 f4]>")
  .s("cb").bank("RolandTR808").gain(0.45)
// 808 on the kick's rhythm, one note per bar
$: note("<c2 c2 eb2 g1>").struct("x ~ ~ x ~ ~ x ~ ~ ~ x ~ ~ ~ ~ ~")
  .s("sine").decay(0.5).sustain(0).shape(0.45).gain(0.9)
$: n("<0 3>").scale("C3:minor").s("gm_choir_aahs").gain(0.25).room(0.5)

// .analyze(1) on every track so the visuals hear it
all(x => x.analyze(1))`,
      es: `// Phonk 130: la melodía de cencerro de Memphis, un 808 saturado y un coro polvoriento
// Cada línea $: es una pista que suena con el resto: escribe _$: para silenciar una
setcps(130 / 60 / 4)

$: s("bd ~ ~ bd ~ ~ bd ~ ~ ~ bd ~ ~ ~ ~ ~").bank("RolandTR808").gain(1.2)
$: s("~ cp ~ cp").bank("RolandTR808")
$: s("hh*8").bank("RolandTR808").gain("0.5 0.3").ply("<1 1 1 2>")
// el cencerro toca la melodía
$: note("<[c4 c4 eb4 c4 g4 f4 eb4 c4] [c4 c4 eb4 f4 g4 bb4 g4 f4]>")
  .s("cb").bank("RolandTR808").gain(0.45)
// 808 al ritmo del bombo, una nota por compás
$: note("<c2 c2 eb2 g1>").struct("x ~ ~ x ~ ~ x ~ ~ ~ x ~ ~ ~ ~ ~")
  .s("sine").decay(0.5).sustain(0).shape(0.45).gain(0.9)
$: n("<0 3>").scale("C3:minor").s("gm_choir_aahs").gain(0.25).room(0.5)

// .analyze(1) en todas las pistas para que los visuales lo oigan
all(x => x.analyze(1))`,
      ca: `// Phonk 130: la melodia d'esquellot de Memphis, un 808 saturat i un cor polsós
// Cada línia $: és una pista que sona amb la resta: escriu _$: per silenciar-ne una
setcps(130 / 60 / 4)

$: s("bd ~ ~ bd ~ ~ bd ~ ~ ~ bd ~ ~ ~ ~ ~").bank("RolandTR808").gain(1.2)
$: s("~ cp ~ cp").bank("RolandTR808")
$: s("hh*8").bank("RolandTR808").gain("0.5 0.3").ply("<1 1 1 2>")
// l'esquellot toca la melodia
$: note("<[c4 c4 eb4 c4 g4 f4 eb4 c4] [c4 c4 eb4 f4 g4 bb4 g4 f4]>")
  .s("cb").bank("RolandTR808").gain(0.45)
// 808 al ritme del bombo, una nota per compàs
$: note("<c2 c2 eb2 g1>").struct("x ~ ~ x ~ ~ x ~ ~ ~ x ~ ~ ~ ~ ~")
  .s("sine").decay(0.5).sustain(0).shape(0.45).gain(0.9)
$: n("<0 3>").scale("C3:minor").s("gm_choir_aahs").gain(0.25).room(0.5)

// .analyze(1) a totes les pistes perquè els visuals ho sentin
all(x => x.analyze(1))`,
    },
  },
  {
    id: 'oldschool',
    name: { en: 'Old school 808', es: 'Old school 808', ca: 'Old school 808' },
    code: {
      en: `// Old school 100: the mid-80s 808, claps on the snare and orchestra stabs
// Every $: line is a track that plays with the rest: write _$: to mute one
setcps(100 / 60 / 4)

$: s("bd ~ ~ ~ ~ ~ ~ bd ~ ~ bd ~ ~ ~ ~ ~").bank("RolandTR808").gain(1.2)
$: s("~ [sd,cp]").bank("RolandTR808")
$: s("[~ hh]*4").bank("RolandTR808").gain(0.5)
$: s("~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ oh ~").bank("RolandTR808").gain(0.4)
// the stab every 80s record had
$: note("<[e3 ~ ~ ~ ~ ~ ~ ~] [g3 ~ ~ ~ ~ ~ a3 ~]>").s("gm_orchestra_hit").gain(0.4)

// .analyze(1) on every track so the visuals hear it
all(x => x.analyze(1))`,
      es: `// Old school 100: el 808 de mediados de los 80, palmas con la caja y golpes de orquesta
// Cada línea $: es una pista que suena con el resto: escribe _$: para silenciar una
setcps(100 / 60 / 4)

$: s("bd ~ ~ ~ ~ ~ ~ bd ~ ~ bd ~ ~ ~ ~ ~").bank("RolandTR808").gain(1.2)
$: s("~ [sd,cp]").bank("RolandTR808")
$: s("[~ hh]*4").bank("RolandTR808").gain(0.5)
$: s("~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ oh ~").bank("RolandTR808").gain(0.4)
// el golpe de orquesta que llevaba cualquier disco de los 80
$: note("<[e3 ~ ~ ~ ~ ~ ~ ~] [g3 ~ ~ ~ ~ ~ a3 ~]>").s("gm_orchestra_hit").gain(0.4)

// .analyze(1) en todas las pistas para que los visuales lo oigan
all(x => x.analyze(1))`,
      ca: `// Old school 100: el 808 de mitjan anys 80, picades de mans amb la caixa i cops d'orquestra
// Cada línia $: és una pista que sona amb la resta: escriu _$: per silenciar-ne una
setcps(100 / 60 / 4)

$: s("bd ~ ~ ~ ~ ~ ~ bd ~ ~ bd ~ ~ ~ ~ ~").bank("RolandTR808").gain(1.2)
$: s("~ [sd,cp]").bank("RolandTR808")
$: s("[~ hh]*4").bank("RolandTR808").gain(0.5)
$: s("~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ oh ~").bank("RolandTR808").gain(0.4)
// el cop d'orquestra que portava qualsevol disc dels 80
$: note("<[e3 ~ ~ ~ ~ ~ ~ ~] [g3 ~ ~ ~ ~ ~ a3 ~]>").s("gm_orchestra_hit").gain(0.4)

// .analyze(1) a totes les pistes perquè els visuals ho sentin
all(x => x.analyze(1))`,
    },
  },
  {
    id: 'dembow',
    name: { en: 'Dembow', es: 'Dembow', ca: 'Dembow' },
    code: {
      en: `// Dembow 95: kick on every beat, the 3-3-2 snare and a minor loop
// Every $: line is a track that plays with the rest: write _$: to mute one
setcps(95 / 60 / 4)

$: s("bd*4").bank("RolandTR808").gain(1.1)
// the dembow: snare on the 4th, 7th, 12th and 15th sixteenths
$: s("~ ~ ~ sd ~ ~ sd ~ ~ ~ ~ sd ~ ~ sd ~").bank("RolandTR808")
$: s("hh*8").bank("RolandTR808").gain("0.4 0.25")
$: note("<a1 f1 c2 g1>").struct("x ~ ~ x ~ ~ x ~ x ~ ~ x ~ ~ x ~")
  .s("sine").decay(0.4).sustain(0).shape(0.3).gain(0.85)
// i - VI - III - VII in A minor
$: chord("<Am F C G>").voicing().s("gm_pad_poly").gain(0.3).room(0.3)

// .analyze(1) on every track so the visuals hear it
all(x => x.analyze(1))`,
      es: `// Dembow 95: bombo en cada tiempo, la caja 3-3-2 y un bucle menor
// Cada línea $: es una pista que suena con el resto: escribe _$: para silenciar una
setcps(95 / 60 / 4)

$: s("bd*4").bank("RolandTR808").gain(1.1)
// el dembow: caja en la 4.ª, 7.ª, 12.ª y 15.ª semicorchea
$: s("~ ~ ~ sd ~ ~ sd ~ ~ ~ ~ sd ~ ~ sd ~").bank("RolandTR808")
$: s("hh*8").bank("RolandTR808").gain("0.4 0.25")
$: note("<a1 f1 c2 g1>").struct("x ~ ~ x ~ ~ x ~ x ~ ~ x ~ ~ x ~")
  .s("sine").decay(0.4).sustain(0).shape(0.3).gain(0.85)
// i - VI - III - VII en la menor
$: chord("<Am F C G>").voicing().s("gm_pad_poly").gain(0.3).room(0.3)

// .analyze(1) en todas las pistas para que los visuales lo oigan
all(x => x.analyze(1))`,
      ca: `// Dembow 95: bombo a cada temps, la caixa 3-3-2 i un bucle menor
// Cada línia $: és una pista que sona amb la resta: escriu _$: per silenciar-ne una
setcps(95 / 60 / 4)

$: s("bd*4").bank("RolandTR808").gain(1.1)
// el dembow: caixa a la 4a, 7a, 12a i 15a semicorxera
$: s("~ ~ ~ sd ~ ~ sd ~ ~ ~ ~ sd ~ ~ sd ~").bank("RolandTR808")
$: s("hh*8").bank("RolandTR808").gain("0.4 0.25")
$: note("<a1 f1 c2 g1>").struct("x ~ ~ x ~ ~ x ~ x ~ ~ x ~ ~ x ~")
  .s("sine").decay(0.4).sustain(0).shape(0.3).gain(0.85)
// i - VI - III - VII en la menor
$: chord("<Am F C G>").voicing().s("gm_pad_poly").gain(0.3).room(0.3)

// .analyze(1) a totes les pistes perquè els visuals ho sentin
all(x => x.analyze(1))`,
    },
  },
  {
    id: 'dnb',
    name: { en: 'Drum and bass 174', es: 'Drum and bass 174', ca: 'Drum and bass 174' },
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
      ca: `// Drum and bass 174: two-step, caixes fantasma, baix reese i un pad
setcps(174 / 60 / 4)

stack(
  // two-step: bombo a l'1 i a la meitat del 3, caixa al 2 i al 4
  s("bd ~ ~ ~ ~ ~ ~ ~ ~ ~ bd ~ ~ ~ ~ ~").bank("EmuSP12").gain(1.1),
  s("~ ~ ~ ~ sd ~ ~ ~ ~ ~ ~ ~ sd ~ ~ ~").bank("EmuSP12").room(0.2),
  // caixes fantasma, els cops fluixos del mig
  s("~ ~ ~ ~ ~ ~ ~ sd ~ sd ~ ~ ~ ~ ~ sd").bank("EmuSP12").gain(0.3),
  // hi-hats embrutits perquè soni a break samplejat
  s("hh*8, ~ oh").bank("EmuSP12").gain("0.35 0.2").crush(9),
  // baix reese: dues serres una mica desafinades i un filtre que s'obre a poc a poc
  note("<e1 e1 g1 [d1 c1]>").s("sawtooth").lpf(sine.range(200, 900).slow(8)).gain(0.45),
  note("<e1 e1 g1 [d1 c1]>").add(note(0.12)).s("sawtooth").lpf(sine.range(200, 900).slow(8)).gain(0.45),
  chord("<Em9 Em9 G^7 D>").voicing().s("gm_pad_warm").gain(0.3).room(0.6)
).analyze(1)`,
    },
  },
  {
    id: 'house-909',
    name: { en: 'House 909', es: 'House 909', ca: 'House 909' },
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
      ca: `// House 124: 909 i orgue
setcps(124 / 60 / 4)

stack(
  // Roland TR-909, bombo a negres
  s("bd*4").bank("RolandTR909").gain(0.85),
  s("~ cp ~ cp").bank("RolandTR909").gain(0.7),
  s("~ oh ~ oh ~ oh ~ oh").bank("RolandTR909").gain(0.35),
  s("hh*16").bank("RolandTR909").gain(0.2),
  // cops d'orgue
  chord("<Am7 Dm7 G7 C^7>").voicing().s("gm_drawbar_organ").struct("~ x ~ ~ ~ x ~ ~").gain(0.4),
  note("<a1 d2 g1 c2>*4").s("triangle").lpf(400).gain(0.6)
).analyze(1)`,
    },
  },
  {
    id: 'hola',
    name: { en: 'Hello Strudel', es: 'Hola Strudel', ca: 'Hola Strudel' },
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
      ca: `// El mínim: un ritme i una melodia
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
    name: { en: 'My samples', es: 'Mis samples', ca: 'Els meus samples' },
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
      ca: `// Els teus propis sons
// 1. Obre "Samples" (a dalt a la dreta) i arrossega-hi WAV o MP3
// 2. Fes clic en un sample per copiar-ne el nom
// 3. Canvia "bd" i "sd" pels teus
setcps(85 / 60 / 4)

stack(
  s("bd ~ bd ~, ~ sd ~ sd"),
  s("hh*8").gain(0.3)
).analyze(1)`,
    },
  },
  {
    id: 'mpk',
    name: { en: 'MPK Mini', es: 'MPK Mini', ca: 'MPK Mini' },
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
      ca: `// Akai MPK Mini Mk II
// Tecles → piano · pads del banc B → bateria (el banc A comparteix notes amb les tecles)
// Joystick: amunt (igual que el knob 1) afegeix eco, cap als costats desafina el piano i el visual
// Els knobs comencen a 0: puja el 4 perquè entri el ritme i el 2 per obrir el filtre
// El knob 7 és el volum general i el 8 la mida de l'ASCII, en qualsevol patró
// Full Level, Note Repeat i l'arpegiador funcionen al mateix MPK.
// Van al tempo del MPK (120 si no en marques un altre): mantén setcps igual
// Mode CC: mantén el pad 1 per tallar el ritme i el pad 2 per embrutir el piano
// Mode PROG CHANGE: cada pad tria un visual
// Els knobs van pel canal 1 i els pads en mode CC pel 10: d'aquí knob(n, 1) i pad(n)
// 1. Obre el panell MIDI i prem "Activar MIDI"
// 2. Tria "Del codi" a Visual per veure el visual d'aquest patró
await initHydra()

// l'instrument de les tecles: 'piano', 'gm_epiano1', 'gm_drawbar_organ',
// 'gm_church_organ', 'gm_string_ensemble_1', 'gm_pad_warm', 'gm_vibraphone',
// 'gm_marimba', 'gm_acoustic_bass', 'sawtooth'… (més a la Xuleta)
const sound = 'piano'

const mpk = 'MPK Mini'
const knob = await midin(mpk)
const keys = await midikeys(mpk)
const pad = (n) => knob(n - 1, 10)

// knob 5: quants miralls · knob 6: com de ràpid gira
osc(10, 0.05, 1)
  .color(0.34, 0.4, 0.12)
  .kaleid(H(knob(5, 1).range(2, 8)))
  .rotate(0, H(knob(6, 1).range(0, 0.3)))
  .scale(() => 1 + bass())
  .scrollX(() => bend() * 0.2)
  .out()

setcps(120 / 60 / 4)

// els pads del banc B envien les notes 32 a 39
const kit = ['bd', 'sd', 'hh', 'oh', 'cp', 'rim', 'lt', 'ht']

stack(
  // un ritme sobre el qual tocar · knob 4: el seu volum
  s("bd ~ ~ bd, ~ sd, hh*8").gain(knob(4, 1).range(0, 0.9).mul(pad(1).mul(-1).add(1))),
  // knob 2: filtre · knob 3: reverb
  // joystick amunt: eco · cap als costats: desafina fins a dos semitons (cada nota nova)
  keys().s(sound).gain(0.7)
    .lpf(knob(2, 1).range(300, 8000)).room(knob(3, 1).range(0, 0.8))
    .delay(knob(1, 1).range(0, 0.6)).speed(ref(() => 2 ** (bend() * 2 / 12)))
    .crush(pad(2).range(16, 3))
    // els pads passen a bateria, més fort = més volum; les tecles continuen sent piano.
    // El bitcrush només s'activa mentre mantens el pad 2: cada nota amb bitcrush
    // necessita el seu propi processador d'àudio, i amb acords s'acumulen de seguida.
    // Les tecles no baixen mai del 35 % de volum: l'arpegiador repeteix la força
    // de l'acord, i un acord suau el deixava gairebé en silenci
    .withValue(({ crush, ...v }) => v.note < 40
      ? { s: kit[v.note - 32] ?? 'bd', gain: v.velocity * 0.8 }
      : { ...v, velocity: 0.35 + v.velocity * 0.65, ...(crush < 15 ? { crush } : {}) })
).analyze(1)`,
    },
  },
  {
    id: 'mpc',
    name: { en: 'Any MIDI controller', es: 'Cualquier controlador MIDI', ca: 'Qualsevol controlador MIDI' },
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
      ca: `// Qualsevol controlador MIDI: un punt de partida
// 1. Obre el panell MIDI i prem "Activar MIDI"
// 2. Toca pads i gira knobs per veure'n els números
// 3. Canvia 'MIDI' per part del nom del teu aparell i els números de knob(...) pels teus
const knob = await midin('MIDI')
const pads = await midikeys('MIDI')

setcps(90 / 60 / 4)

stack(
  s("bd*2, ~ sd, hh*8").gain(0.8),
  // les tecles i els pads toquen el piano; el knob 2 obre el filtre
  pads().s("piano").lpf(knob(2).range(300, 5000))
).analyze(1)`,
    },
  },
  {
    id: 'touchme',
    name: { en: 'TouchMe', es: 'TouchMe', ca: 'TouchMe' },
    code: {
      en: `// TouchMe (Playtronica): hold its metal and touch someone.
// Its notes play on their own (MIDI panel, "Play without Play");
// here the touch also opens the bass and wakes up the hi-hats.
// touch() goes from 0 to 1 with how much you touch; touching() is true while you do
setcps(84 / 60 / 4)

stack(
  s("bd ~ ~ bd ~ ~ sd ~, ~ ~ ~ ~ ~ ~ ~ bd").bank("RolandTR808").gain(0.9),
  note("<c2 ab1 f1 g1>").s("sawtooth")
    .lpf(ref(() => 150 + touch() * 3000)).lpq(8).gain(0.4),
  s("hh*16").bank("RolandTR808")
    .gain(ref(() => (touching() ? 0.45 : 0.08)))
).analyze(1)`,
      es: `// TouchMe (Playtronica): coge su metal y toca a alguien.
// Sus notas suenan solas (panel MIDI, "Tocar sin Play");
// aquí además el contacto abre el bajo y despierta los charles.
// touch() va de 0 a 1 según cuánto os tocáis; touching() es true mientras os tocáis
setcps(84 / 60 / 4)

stack(
  s("bd ~ ~ bd ~ ~ sd ~, ~ ~ ~ ~ ~ ~ ~ bd").bank("RolandTR808").gain(0.9),
  note("<c2 ab1 f1 g1>").s("sawtooth")
    .lpf(ref(() => 150 + touch() * 3000)).lpq(8).gain(0.4),
  s("hh*16").bank("RolandTR808")
    .gain(ref(() => (touching() ? 0.45 : 0.08)))
).analyze(1)`,
      ca: `// TouchMe (Playtronica): agafa'n el metall i toca algú.
// Les seves notes sonen soles (panell MIDI, "Tocar sense Play");
// aquí, a més, el contacte obre el baix i desperta els hi-hats.
// touch() va de 0 a 1 segons quant us toqueu; touching() és true mentre us toqueu
setcps(84 / 60 / 4)

stack(
  s("bd ~ ~ bd ~ ~ sd ~, ~ ~ ~ ~ ~ ~ ~ bd").bank("RolandTR808").gain(0.9),
  note("<c2 ab1 f1 g1>").s("sawtooth")
    .lpf(ref(() => 150 + touch() * 3000)).lpq(8).gain(0.4),
  s("hh*16").bank("RolandTR808")
    .gain(ref(() => (touching() ? 0.45 : 0.08)))
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
  const match = presets.find((preset) => LANGS.some((l) => preset.code[l] === code));
  return match ? pick(match.code) : code;
}
