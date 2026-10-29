// Hydra visuals, picked apart from the sound. Two kinds of sync:
// - H("...") follows Strudel's clock: it lands exactly on the beat.
// - bass(), mid(), high(), level() listen to the audio (the pattern needs .analyze(1)).

import { attachAscii } from './ascii';
import { attachClips } from './clips';
import { stopRidges } from './ridges';
import { connectSource } from './video';
import { withVj } from './vj';
import type { Localized } from './i18n';

// camera: the visual uses s0 (the webcam, or the video or tab picked in the
// Video panel); it is switched on only while picked
// clips: shows the clips (s2), fired from patterns with .video() or the pads
export type Visual = { id: string; name: Localized; code: string; camera?: boolean; clips?: boolean };

export const CODE_VISUAL = 'code';
export const AUTO_VISUAL = 'auto';

// The Visual menu groups them, so 55 looks are not one long list. The ones
// that are not looks (from the code, automatic, none) stay at the top.
export type VisualGroup = 'top' | 'sound' | 'touch' | 'voice' | 'cam' | 'clips';
export function visualGroup(visual: Visual): VisualGroup {
  if (visual.id === CODE_VISUAL || visual.id === AUTO_VISUAL || visual.id === 'ninguno') return 'top';
  if (visual.clips) return 'clips';
  if (visual.camera) return 'cam';
  if (visual.id.startsWith('tacto')) return 'touch';
  if (visual.id.startsWith('voz')) return 'voice';
  return 'sound';
}

export const visuals: Visual[] = [
  { id: CODE_VISUAL, name: { en: 'From the code', es: 'Del código', ca: 'Del codi' }, code: '' },
  {
    id: 'lima',
    name: { en: 'Lime (bar)', es: 'Lima (compás)', ca: 'Llima (compàs)' },
    code: `osc(6, 0.03, 0.8)
  .color(...tint(0.4))
  .modulate(noise(1.5), 0.25)
  .kaleid(H("<3 3 4 6>"))
  .out()`,
  },
  {
    id: 'corcheas',
    name: { en: 'Pulse (eighths)', es: 'Pulso (corcheas)', ca: 'Pols (corxeres)' },
    code: `shape(4, 0.35, 0.02)
  .repeat(3, 3)
  .scale(H("1.25 1 1 1.1 1 1.25 1 1"))
  .color(...tint(0.4))
  .modulateRotate(osc(2, 0.1), 0.3)
  .out()`,
  },
  {
    id: 'graves',
    name: { en: 'Tunnel (bass)', es: 'Túnel (graves)', ca: 'Túnel (greus)' },
    code: `osc(20, 0.05, 0.4)
  .kaleid(4)
  .color(...tint(0.4))
  .scale(() => 0.8 + bass() * 1.2)
  .modulate(noise(2), () => high() * 0.3)
  .out()`,
  },
  {
    id: 'celdas',
    name: { en: 'Cells (volume)', es: 'Celdas (volumen)', ca: 'Cel·les (volum)' },
    code: `voronoi(6, 0.3, 0.2)
  .color(...tint(0.3))
  .modulate(osc(3, 0.05), () => mid() * 0.6)
  .brightness(() => level() * 0.3 - 0.1)
  .out()`,
  },
  {
    id: 'eco',
    name: { en: 'Echo (bar)', es: 'Eco (compás)', ca: 'Eco (compàs)' },
    code: `shape(H("<3 4 5 6>"), 0.3, 0.01)
  .color(...tint(0.4))
  .rotate(0, 0.1)
  .diff(src(o0).scale(1.02).rotate(0.01))
  .out()`,
  },
  {
    id: 'glitch',
    name: { en: 'Glitch (highs)', es: 'Glitch (agudos)', ca: 'Glitch (aguts)' },
    code: `osc(40, 0.1, 1.2)
  .color(...tint(0.4))
  .modulate(noise(3).pixelate(8, 8), () => high() * 0.6)
  .posterize(3, 0.6)
  .scrollX(() => (Math.random() - 0.5) * high() * 0.08)
  .out()`,
  },
  {
    id: 'plasma',
    name: { en: 'Plasma (bar)', es: 'Plasma (compás)', ca: 'Plasma (compàs)' },
    code: `voronoi(8, 0.4, 0.3)
  .modulateScale(osc(6, 0.05), 0.6)
  .color(...tint(0.42))
  .hue(H("<0 0.05 0 0.95>"))
  .out()`,
  },
  // Picks the others by itself; after the first eight so the PROG CHANGE pads keep theirs
  { id: AUTO_VISUAL, name: { en: 'Auto', es: 'Automático', ca: 'Automàtic' }, code: '' },
  {
    id: 'anillos',
    name: { en: 'Rings (kick)', es: 'Anillos (bombo)', ca: 'Anells (bombo)' },
    code: `shape(64, 0.42, 0.01)
  .diff(shape(64, 0.3, 0.01))
  .repeat(2, 2)
  .scale(() => 0.9 + bass() * 0.5)
  .color(...tint(0.6))
  .modulateRotate(osc(1, 0.05), 0.2)
  .out()`,
  },
  {
    id: 'estela',
    name: { en: 'Trails (bar)', es: 'Estela (compás)', ca: 'Estela (compàs)' },
    code: `shape(H("<3 4 6 8>"), 0.2, 0.01)
  .rotate(0, 0.2)
  .color(...tint(0.4))
  .blend(src(o0).scale(1.02).rotate(0.01), 0.85)
  .out()`,
  },
  {
    id: 'moire',
    name: { en: 'Moiré (bass)', es: 'Moiré (graves)', ca: 'Moiré (greus)' },
    code: `osc(60, -0.015, 0.3)
  .diff(osc(60, 0.08).rotate(Math.PI / 2))
  .modulateScale(noise(3.5, 0.25), 0.6)
  .color(...tint(0.5))
  .scale(() => 1 + bass() * 0.3)
  .out()`,
  },
  {
    id: 'chispas',
    name: { en: 'Sparks (highs)', es: 'Chispas (agudos)', ca: 'Espurnes (aguts)' },
    code: `noise(300, 0.1)
  .thresh(() => 0.55 - high() * 0.3, 0.02)
  .color(...tint(1))
  .scrollY(0, -0.05)
  .blend(src(o0).scale(1.01), 0.6)
  .out()`,
  },
  {
    id: 'vortice',
    name: { en: 'Vortex (bar)', es: 'Vórtice (compás)', ca: 'Vòrtex (compàs)' },
    code: `osc(12, 0.05, 0)
  .modulateKaleid(voronoi(6, 0.5, 0.3), 8)
  .rotate(0, H("<0.1 0.25>"))
  .contrast(1.4)
  .color(...tint(0.7))
  .out()`,
  },
  {
    id: 'liquido',
    name: { en: 'Liquid (mids)', es: 'Líquido (medios)', ca: 'Líquid (mitjos)' },
    code: `osc(4, 0.1, 1.2)
  .modulate(noise(2).add(gradient(), -1), () => 0.4 + mid() * 0.6)
  .color(...tint(0.4))
  .saturate(0.6)
  .out()`,
  },
  {
    id: 'flash',
    name: { en: 'Flash (beat)', es: 'Destello (pulso)', ca: 'Llampada (pols)' },
    // On the beat, not on the bass: a long 808 keeps bass() high between kicks
    code: `solid(...tint(0.7))
  .mult(shape(4, H("[1.4 0 0 0]*4"), 0.5))
  .blend(src(o0).scale(1.03), 0.75)
  .out()`,
  },
  {
    id: 'matrix',
    name: { en: 'Matrix (rain)', es: 'Matrix (lluvia)', ca: 'Matrix (pluja)' },
    // Green on purpose, whatever the theme: that is the look
    code: `noise(80, 0.05)
  .pixelate(64, 64)
  .thresh(0.62, 0.02)
  .scale(1, 1, 6)
  .scrollY(0, -0.12)
  .color(0.2, 1, 0.35)
  .blend(src(o0).scrollY(-0.004), 0.85)
  .out()`,
  },
  {
    id: 'vhs',
    name: { en: 'VHS (bar)', es: 'VHS (compás)', ca: 'VHS (compàs)' },
    code: `osc(8, 0.05, 1.2)
  .color(...tint(0.6))
  .modulate(noise(2, 0.1), 0.05)
  .add(osc(300, 0, 0).rotate(Math.PI / 2).thresh(0.5).color(0.1, 0.1, 0.1), -1)
  .scrollY(H("<0 0 0 0.02>"))
  .out()`,
  },
  {
    id: 'hipnosis',
    name: { en: 'Hypnosis (volume)', es: 'Hipnosis (volumen)', ca: 'Hipnosi (volum)' },
    code: `osc(30, 0.1, 0)
  .kaleid(64)
  .modulateRotate(osc(1, 0.1), () => 1 + level() * 2)
  .color(...tint(0.5))
  .out()`,
  },
  {
    id: 'ondas',
    name: { en: 'Waves (mids)', es: 'Ondas (medios)', ca: 'Ones (mitjos)' },
    code: `osc(40, 0.02, 0)
  .thresh(0.5, 0.02)
  .modulate(osc(3, 0.1).rotate(Math.PI / 2), () => 0.1 + mid() * 0.4)
  .color(...tint(0.5))
  .out()`,
  },
  {
    id: 'terremoto',
    name: { en: 'Quake (kick)', es: 'Terremoto (bombo)', ca: 'Terratrèmol (bombo)' },
    code: `voronoi(12, 0.2, 0.1)
  .color(...tint(0.55))
  .scrollX(() => (Math.random() - 0.5) * bass() * 0.08)
  .scrollY(() => (Math.random() - 0.5) * bass() * 0.08)
  .scale(() => 1 + bass() * 0.15)
  .out()`,
  },
  {
    id: 'lineas',
    name: { en: 'Lines (Unknown Pleasures)', es: 'Líneas (Unknown Pleasures)', ca: 'Línies (Unknown Pleasures)' },
    code: `ridges()
src(s1)
  .color(...tint(1))
  .out()`,
  },
  {
    id: 'tacto',
    name: { en: 'Touch (TouchMe)', es: 'Tacto (TouchMe)', ca: 'Tacte (TouchMe)' },
    code: `osc(8, 0.04, () => 0.2 + touch() * 0.25)
  .kaleid(() => 3 + Math.round(touch() * 5))
  .color(...tint(1))
  .modulate(noise(3), () => 0.05 + touch() * 0.5)
  .scale(() => 1.2 - touch() * 0.5)
  .brightness(() => touch() * 0.35 - 0.2)
  .out()`,
  },
  {
    id: 'tacto-ondas',
    name: { en: 'Touch (ripples)', es: 'Tacto (ondas)', ca: 'Tacte (ones)' },
    code: `osc(() => 12 + touch() * 48, () => 0.04 + touch() * 0.3, 0)
  .kaleid(64)
  .color(...tint(1))
  .mask(shape(64, () => 0.25 + touch() * 0.75, 0.25))
  .scale(() => 1 + touchPulse() * 0.25)
  .brightness(() => touchPulse() * 0.35 + touch() * 0.15 - 0.15)
  .out()`,
  },
  {
    id: 'tacto-chispas',
    name: { en: 'Touch (sparks)', es: 'Tacto (chispas)', ca: 'Tacte (espurnes)' },
    code: `noise(() => 4 + touch() * 26, () => 0.2 + touch() * 1.5)
  .thresh(() => 0.85 - touch() * 0.45 - touchPulse() * 0.25, 0.04)
  .color(...tint(1))
  .blend(src(o0).scale(1.01).rotate(0.002), () => 0.6 + touch() * 0.3)
  .out()`,
  },
  {
    id: 'tacto-latido',
    name: { en: 'Touch (heartbeat)', es: 'Tacto (latido)', ca: 'Tacte (batec)' },
    code: `shape(64, () => 0.16 + touch() * 0.22 + touchPulse() * 0.14, () => 0.02 + touch() * 0.18)
  .color(...tint(1))
  .modulate(osc(6, 0.1), () => touch() * 0.12)
  .blend(src(o0).scale(() => 1.03 + touchPulse() * 0.06), 0.55)
  .brightness(() => touchPulse() * 0.2 - 0.05)
  .out()`,
  },
  {
    id: 'voz',
    name: { en: 'Voice (colour by note)', es: 'Voz (color por nota)', ca: 'Veu (color per nota)' },
    code: `osc(10, 0.03, 0)
  .kaleid(5)
  .color(() => voiceColor(0), () => voiceColor(1), () => voiceColor(2))
  .scale(() => 1.3 - voiceLevel() * 0.6)
  .modulate(noise(2.5), () => 0.05 + voiceLevel() * 0.4)
  .brightness(() => voiceLevel() * 0.3 - 0.15)
  .out()`,
  },
  {
    id: 'voz-formas',
    name: { en: 'Voice (shapes by pitch)', es: 'Voz (formas por altura)', ca: 'Veu (formes per altura)' },
    code: `shape(() => 3 + Math.round((voiceHeld() % 24) / 4), 0.28, 0.01)
  .repeat(2, 2)
  .rotate(() => voiceHeld() / 12, 0.05)
  .scale(() => 0.7 + voiceLevel() * 0.9)
  .color(() => voiceColor(0), () => voiceColor(1), () => voiceColor(2))
  .modulateScale(osc(4, 0.1), () => voiceLevel() * 0.5)
  .blend(src(o0).scale(1.015).rotate(0.004), 0.82)
  .out()`,
  },
  {
    id: 'cam',
    name: { en: 'Webcam (warp)', es: 'Webcam (deformada)', ca: 'Webcam (deformada)' },
    camera: true,
    code: `src(s0)
  .saturate(0.3)
  .color(...tint(0.9))
  .modulate(noise(3), () => bass() * 0.2)
  .out()`,
  },
  {
    id: 'cam-kaleid',
    name: { en: 'Webcam (kaleidoscope)', es: 'Webcam (caleidoscopio)', ca: 'Webcam (calidoscopi)' },
    camera: true,
    code: `src(s0)
  .kaleid(H("<4 6 8>"))
  .rotate(0, 0.05)
  .color(...tint(0.9))
  .out()`,
  },
  {
    id: 'cam-pixel',
    name: { en: 'Webcam (pixels)', es: 'Webcam (píxeles)', ca: 'Webcam (píxels)' },
    camera: true,
    code: `src(s0)
  .pixelate(() => 90 - bass() * 70, () => 60 - bass() * 45)
  .posterize(4, 0.6)
  .color(...tint(0.9))
  .out()`,
  },
  {
    id: 'cam-trails',
    name: { en: 'Webcam (trails)', es: 'Webcam (estela)', ca: 'Webcam (estela)' },
    camera: true,
    code: `src(s0)
  .color(...tint(0.9))
  .blend(src(o0).scale(1.01), 0.8)
  .out()`,
  },
  {
    id: 'cam-thermal',
    name: { en: 'Webcam (thermal)', es: 'Webcam (térmica)', ca: 'Webcam (tèrmica)' },
    camera: true,
    code: `src(s0)
  .saturate(0)
  .contrast(1.4)
  .colorama(() => 0.2 + bass() * 0.2)
  .out()`,
  },
  {
    id: 'cam-rgb',
    name: { en: 'Webcam (RGB split)', es: 'Webcam (RGB desplazado)', ca: 'Webcam (RGB desplaçat)' },
    camera: true,
    code: `src(s0)
  .color(1, 0, 0)
  .add(src(s0).scrollX(() => 0.01 + bass() * 0.04).color(0, 1, 0))
  .add(src(s0).scrollX(() => -0.01 - bass() * 0.04).color(0, 0, 1))
  .out()`,
  },
  {
    id: 'cam-contrast',
    name: { en: 'Webcam (high contrast)', es: 'Webcam (alto contraste)', ca: 'Webcam (alt contrast)' },
    camera: true,
    code: `src(s0)
  .thresh(() => 0.45 + mid() * 0.2, 0.04)
  .color(...tint(1))
  .out()`,
  },
  {
    id: 'cam-matrix',
    name: { en: 'Webcam (Matrix)', es: 'Webcam (Matrix)', ca: 'Webcam (Matrix)' },
    camera: true,
    code: `src(s0)
  .saturate(0)
  .contrast(1.6)
  .color(0.1, 1, 0.3)
  .add(noise(80, 0.05).pixelate(64, 64).thresh(0.8, 0.02).scale(1, 1, 6).scrollY(0, -0.1).color(0, 0.6, 0.1))
  .out()`,
  },
  {
    id: 'cam-mirror',
    name: { en: 'Webcam (mirror)', es: 'Webcam (espejo)', ca: 'Webcam (mirall)' },
    camera: true,
    code: `src(s0)
  .kaleid(2)
  .rotate(Math.PI / 2)
  .color(...tint(0.9))
  .modulate(noise(2), () => bass() * 0.1)
  .out()`,
  },
  {
    id: 'cam-vhs',
    name: { en: 'Webcam (VHS)', es: 'Webcam (VHS)', ca: 'Webcam (VHS)' },
    camera: true,
    code: `src(s0)
  .modulate(noise(3, 0.2), 0.015)
  .add(src(s0).scrollX(0.006).color(1, 0, 0.2), 0.35)
  .add(osc(300, 0, 0).rotate(Math.PI / 2).thresh(0.5).color(0.1, 0.1, 0.1), -1)
  .scrollY(() => high() * 0.02)
  .out()`,
  },
  {
    id: 'cam-pop',
    name: { en: 'Webcam (pop art)', es: 'Webcam (pop art)', ca: 'Webcam (pop art)' },
    camera: true,
    code: `src(s0)
  .saturate(3)
  .posterize(3, 0.5)
  .repeat(2, 2)
  .colorama(H("<0.1 0.3 0.5 0.7>"))
  .out()`,
  },
  {
    id: 'cam-ghost',
    name: { en: 'Webcam (ghost)', es: 'Webcam (fantasma)', ca: 'Webcam (fantasma)' },
    camera: true,
    code: `src(s0)
  .color(...tint(0.9))
  .diff(src(o0).scale(1.02).rotate(0.005))
  .blend(src(o0), 0.5)
  .out()`,
  },
  {
    id: 'clips',
    name: { en: 'Clips', es: 'Clips', ca: 'Clips' },
    clips: true,
    code: `src(s2)
  .out()`,
  },
  {
    id: 'clips-bass',
    name: { en: 'Clips (warp on the bass)', es: 'Clips (deformados con graves)', ca: 'Clips (deformats amb greus)' },
    clips: true,
    code: `src(s2)
  .modulate(noise(3, 0.2), () => bass() * 0.25)
  .scale(() => 1 + bass() * 0.12)
  .out()`,
  },
  {
    id: 'clips-vhs',
    name: { en: 'Clips (VHS)', es: 'Clips (VHS)', ca: 'Clips (VHS)' },
    clips: true,
    code: `src(s2)
  .modulate(noise(3, 0.2), 0.012)
  .add(src(s2).scrollX(() => 0.004 + high() * 0.02).color(1, 0, 0.2), 0.4)
  .add(osc(300, 0, 0).rotate(Math.PI / 2).thresh(0.5).color(0.1, 0.1, 0.1), -1)
  .scrollY(H("<0 0 0 0.03>"))
  .out()`,
  },
  {
    id: 'clips-trails',
    name: { en: 'Clips (trails)', es: 'Clips (estela)', ca: 'Clips (estela)' },
    clips: true,
    code: `src(s2)
  .blend(src(o0).scale(1.01), () => 0.55 + mid() * 0.35)
  .out()`,
  },
  {
    id: 'clips-kaleid',
    name: { en: 'Clips (kaleidoscope)', es: 'Clips (caleidoscopio)', ca: 'Clips (calidoscopi)' },
    clips: true,
    code: `src(s2)
  .kaleid(H("<4 6 8 3>"))
  .rotate(0, 0.05)
  .out()`,
  },
  {
    id: 'clips-tint',
    name: { en: 'Clips (theme colour, posterised)', es: 'Clips (color del tema, posterizados)', ca: 'Clips (color del tema, posteritzats)' },
    clips: true,
    code: `src(s2)
  .saturate(0)
  .posterize(4, 0.6)
  .color(...tint(1))
  .contrast(() => 1.2 + level() * 0.6)
  .out()`,
  },
  {
    id: 'clips-feedback',
    name: { en: 'Clips (feedback on the kick)', es: 'Clips (realimentación con el bombo)', ca: 'Clips (realimentació amb el bombo)' },
    clips: true,
    // The last frame, a little bigger and turned, under the new one: a tunnel
    // that slams outwards on the kick
    code: `src(o0)
  .scale(() => 1.025 + bass() * 0.1)
  .rotate(() => 0.006 + bass() * 0.04)
  .color(0.97, 0.92, 1)
  .blend(src(s2), () => 0.5 - bass() * 0.3)
  .out()`,
  },
  {
    id: 'clips-rgb',
    name: { en: 'Clips (broken signal)', es: 'Clips (señal rota)', ca: 'Clips (senyal trencat)' },
    clips: true,
    code: `src(s2)
  .color(1, 0, 0)
  .add(src(s2).scrollX(() => 0.008 + bass() * 0.05).color(0, 1, 0))
  .add(src(s2).scrollX(() => -0.008 - bass() * 0.05).color(0, 0, 1))
  .modulate(osc(200, 0, 0).rotate(Math.PI / 2).thresh(0.97), () => high() * 0.15)
  .scrollY(H("<0 0 0.05 0>"))
  .out()`,
  },
  {
    id: 'clips-dots',
    name: { en: 'Clips (dot screen)', es: 'Clips (pantalla de puntos)', ca: 'Clips (pantalla de punts)' },
    clips: true,
    code: `src(s2)
  .pixelate(96, 54)
  .mult(shape(32, () => 0.55 + bass() * 0.35, 0.25).repeat(96, 54))
  .saturate(0)
  .color(1, 0.45, 0.15)
  .contrast(1.4)
  .out()`,
  },
  {
    id: 'clips-static',
    name: { en: 'Clips (out of the static)', es: 'Clips (saliendo de la estática)', ca: "Clips (sortint de l'estàtica)" },
    clips: true,
    code: `noise(400, 0.8)
  .thresh(0.5, 0.2)
  .saturate(0)
  .blend(src(s2).contrast(1.3), () => Math.min(1, 0.25 + level() * 1.4))
  .out()`,
  },
  {
    id: 'clips-light',
    name: { en: 'Clips (light and glow)', es: 'Clips (luz y brillo)', ca: 'Clips (llum i brillantor)' },
    clips: true,
    code: `src(s2)
  .add(src(s2).luma(0.55, 0.2).scale(1.02).color(1, 0.85, 0.6), () => 0.6 + high() * 0.8)
  .add(src(o0).scale(1.015), 0.4)
  .brightness(() => bass() * 0.12)
  .out()`,
  },
  {
    id: 'clips-mosh',
    name: { en: 'Clips (datamosh)', es: 'Clips (datamosh)', ca: 'Clips (datamosh)' },
    clips: true,
    // The last frame pushed around by the new picture's own shapes, refreshed
    // whole only once a bar: shots melt into each other, then snap back
    code: `src(o0)
  .modulate(src(s2).add(src(o0), -1), () => 0.02 + bass() * 0.06)
  .blend(src(s2), H("<[0.9 0.04 0.04 0.04]>"))
  .out()`,
  },
  {
    id: 'clips-crash',
    name: { en: 'Clips (crashing on the highs)', es: 'Clips (petando con los agudos)', ca: 'Clips (petant amb els aguts)' },
    clips: true,
    code: `src(s2)
  .modulate(osc(6, 0, 0).rotate(Math.PI / 2).pixelate(1, 12).posterize(3, 1), () => high() * 0.35)
  .pixelate(() => (high() > 0.35 ? 40 : 2000), () => (high() > 0.35 ? 22 : 2000))
  .posterize(() => (bass() > 0.5 ? 3 : 32), 0.8)
  .scrollY(() => (Math.random() < high() * 0.3 ? Math.random() * 0.2 : 0))
  .out()`,
  },
  {
    id: 'clips-cam',
    name: { en: 'Clips over the webcam', es: 'Clips sobre la webcam', ca: 'Clips sobre la webcam' },
    clips: true,
    camera: true,
    code: `src(s0)
  .saturate(0.2)
  .color(...tint(0.8))
  .blend(src(s2), () => 0.5 + bass() * 0.5)
  .out()`,
  },
  { id: 'ninguno', name: { en: 'No visuals', es: 'Sin visuales', ca: 'Sense visuals' }, code: `solid(0, 0, 0, 0).out()` },
];

type Global = typeof globalThis & {
  initHydra?: (options?: Record<string, unknown>) => Promise<unknown>;
  getAnalyzerData?: (type: 'frequency' | 'time', id?: number) => Float32Array;
  getAudioContext?: () => AudioContext;
  bass?: () => number;
  mid?: () => number;
  high?: () => number;
  level?: () => number;
  H?: (pattern: unknown) => () => number;
  mini?: (text: string) => unknown;
};

const g = globalThis as Global;

// The built-in visuals run as plain JavaScript, without the Strudel transpiler
// that turns "..." into mini-notation in your code: there H("<3 4>") got the
// bare string and Hydra ignored it, so they never followed the bar. This H
// parses the string first
const barH = (pattern: unknown) => g.H!(typeof pattern === 'string' && g.mini ? g.mini(pattern) : pattern);
const run = (code: string) => {
  stopRidges(); // the Lines visual starts it again if it is the one running
  new Function('H', withVj(code))(barH);
};

// One analysis per frame: bass(), mid(), high() and level() are called several
// times per frame by a single visual, and each read used to copy the spectrum
let cached: { at: number; data: Float32Array | undefined } = { at: -1, data: undefined };
function spectrum() {
  const now = performance.now();
  if (now - cached.at > 8) {
    try {
      cached = { at: now, data: g.getAnalyzerData?.('frequency', 1) };
    } catch {
      cached = { at: now, data: undefined };
    }
  }
  return cached.data;
}

// Average energy of a frequency band, from 0 to 1
function band(lowHz: number, highHz: number) {
  const data = spectrum();
  if (!data?.length || !g.getAudioContext) return 0;
  const nyquist = g.getAudioContext().sampleRate / 2;
  const from = Math.floor((lowHz / nyquist) * data.length);
  const to = Math.max(from + 1, Math.floor((highHz / nyquist) * data.length));
  let sum = 0;
  for (let i = from; i < to; i++) {
    const db = Number.isFinite(data[i]) ? data[i] : -100;
    sum += Math.min(1, Math.max(0, (db + 90) / 60));
  }
  return sum / (to - from);
}

// Available in Hydra code (the built-in visuals and your patterns)
g.bass = () => band(20, 150);
g.mid = () => band(150, 2000);
g.high = () => band(2000, 10000);
g.level = () => band(20, 10000);

// Strudel loads Hydra from unpkg.com; this uses the copy bundled with the
// studio instead, also for an initHydra() written in your patterns.
// Half resolution by default: a quarter of the pixels to draw, which leaves CPU
// for the audio. These visuals are soft anyway; initHydra({ pixelRatio: 1 }) for full.
export function useBundledHydra(src: string) {
  const original = g.initHydra as ((options?: Record<string, unknown>) => Promise<unknown>) | undefined;
  if (!original) return;
  g.initHydra = async (options: Record<string, unknown> = {}) => {
    const hydra = await original({ src, pixelRatio: 0.5, pixelated: false, ...options });
    pixelRatio = typeof options.pixelRatio === 'number' ? options.pixelRatio : 0.5;
    capFrameRate();
    followWindowSize(hydra as { setResolution?: (width: number, height: number) => void });
    return hydra;
  };
}

// 30 frames a second instead of 60: Hydra draws on the same thread that
// schedules the notes, and these visuals look the same at half the work.
// Hydra copies the global fps into its settings on every frame, so the global
// is what has to be set. A pattern can still ask for more with fps = 60
function capFrameRate() {
  const globals = globalThis as { fps?: number };
  if (!globals.fps) globals.fps = 30;
}

// Hydra draws at its box on screen (the window, or the 9:16 column of the
// vertical framing) times the pixel ratio. Strudel resizes the canvas to the
// window, so after a resize, or when the framing changes, Hydra is told the
// size of its actual box, or it would draw stretched or in a corner
let followed: { setResolution?: (width: number, height: number) => void } | undefined;
let pixelRatio = 0.5;

export function fitVisuals() {
  const canvas = document.getElementById('hydra-canvas') as HTMLCanvasElement | null;
  if (!canvas || !followed?.setResolution) return;
  const box = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(box.width * pixelRatio));
  const height = Math.max(1, Math.round(box.height * pixelRatio));
  canvas.width = width;
  canvas.height = height;
  followed.setResolution(width, height);
}

function followWindowSize(hydra: { setResolution?: (width: number, height: number) => void }) {
  if (followed === hydra || !hydra?.setResolution) return;
  followed = hydra;
  fitVisuals();
  let timer: number | undefined;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = window.setTimeout(fitVisuals, 300);
  });
}

// Auto: another built-in visual every few bars while it plays (every few
// seconds while stopped), on the bar line, never the same twice in a row and
// never a webcam one, so the camera only turns on when you ask for it, nor
// one that stays dark without its controller
const AUTO_BARS = 4;
const AUTO_SECONDS = 8;
let clock: () => number | null = () => null;
let autoTimer: number | undefined;
let autoCurrent: Visual | undefined;

// Cycles since Play, or null while stopped
export function setVisualClock(read: () => number | null) {
  clock = read;
}

function stopAuto() {
  clearInterval(autoTimer);
  autoTimer = undefined;
}

function startAuto() {
  // not the webcam ones, nor those that wait for a controller (Touch: the TouchMe)
  const pool = visuals.filter((v) => v.code && !v.camera && !v.clips && !['ninguno', 'tacto', 'tacto-ondas', 'tacto-chispas', 'tacto-latido', 'voz', 'voz-formas'].includes(v.id));
  const step = () => {
    const cycles = clock();
    return cycles === null ? Math.floor(performance.now() / 1000 / AUTO_SECONDS) : Math.floor(cycles / AUTO_BARS);
  };
  const next = () => {
    const choices = pool.filter((v) => v !== autoCurrent);
    autoCurrent = choices[Math.floor(Math.random() * choices.length)];
    run(autoCurrent.code);
  };
  let last = step();
  next();
  autoTimer = window.setInterval(() => {
    const now = step();
    if (now === last) return;
    last = now;
    next();
  }, 50);
}

export async function applyVisual(id: string) {
  const visual = visuals.find((v) => v.id === id);
  if (!visual || !g.initHydra) return;
  if (id !== AUTO_VISUAL) stopAuto();
  stopRidges();
  const hydra = await g.initHydra();
  // hush() in a pattern resets both, so they are set again on every visual
  capFrameRate();
  attachAscii(hydra);
  // The clips canvas is always s2, also for src(s2) in your own Hydra code
  attachClips();
  if (visual.id === CODE_VISUAL) return;
  if (visual.id === AUTO_VISUAL) {
    connectSource(false);
    // Already running (Ctrl+Enter runs the visual again): redraw the current
    // one instead of jumping to another
    if (autoTimer === undefined) startAuto();
    else if (autoCurrent) run(autoCurrent.code);
    return;
  }
  // The webcam, or the video or tab chosen in the Video panel
  connectSource(Boolean(visual.camera));
  run(visual.code);
}
