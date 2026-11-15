// Hydra visuals, picked apart from the sound. Two kinds of sync:
// - H("...") follows Strudel's clock: it lands exactly on the beat.
// - bass(), mid(), high(), level() listen to the audio (the pattern needs .analyze(1)).

import { attachAscii } from './ascii';
import { attachClips } from './clips';
import { kickCount, kickHit } from './hits';
import { stopRidges } from './ridges';
import { finishCode, visualComesIn, type Quality } from './finish';
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
export type VisualGroup = 'top' | 'sound' | 'machines' | 'motion' | 'touch' | 'voice' | 'cam' | 'clips';
export function visualGroup(visual: Visual): VisualGroup {
  if (visual.id === CODE_VISUAL || visual.id === AUTO_VISUAL || visual.id === 'ninguno') return 'top';
  if (visual.clips) return 'clips';
  if (visual.camera) return 'cam';
  if (visual.id.startsWith('maq')) return 'machines';
  if (visual.id.startsWith('mov')) return 'motion';
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
    code: `cells(() => time * 0.35, () => level() * 1.5, () => kickHit(), 5)
  .color(...tint(0.6))
  .modulate(noise(2, 0.1), () => mid() * 0.08)
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
    // a clean signal (bars and a ring) kept in o3, and what shows is that
    // signal breaking: the highs say how badly, every hat breaks it another way
    code: `osc(5, 0.03, 1.4)
  .posterize(5, 0.7)
  .color(...tint(0.75))
  .add(shape(64, 0.32, 0.01).sub(shape(64, 0.26, 0.01)).color(...tint(1)).rotate(0, 0.05))
  .out(o3)
glitchOf(o3, () => 0.1 + high() * 1.5 + hatHit() * 0.6, () => time * 13 + kickCount() * 5)
  .out()`,
  },
  {
    id: 'plasma',
    name: { en: 'Plasma (bar)', es: 'Plasma (compás)', ca: 'Plasma (compàs)' },
    code: `plasma(() => time * 0.07, 0, H("<0.15 0.5 0.15 0.9>"))
  .color(...tint(0.5))
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
    code: `matrixRain(o0, 1, 0, () => kickHit())
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
    code: `cells(() => time * 0.2, () => bass() * 1.3, () => kickHit(), 9)
  .color(...tint(0.6))
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
    id: 'maq-anillos',
    name: { en: 'Rings (kick)', es: 'Anillos (bombo)', ca: 'Anells (bombo)' },
    code: `rings(() => kickCount() * 0.37 + time * 0.08, () => kickHit(), () => hatHit())
  .color(...tint(1))
  .add(src(o0).scale(1.02), () => 0.35 + snareHit() * 0.3)
  .out()`,
  },
  {
    id: 'maq-rejilla',
    name: { en: 'Grid (kick and snare)', es: 'Rejilla (bombo y caja)', ca: 'Reixa (bombo i caixa)' },
    code: `gridFloor(() => time * 0.6, () => kickHit(), () => snareHit())
  .color(...tint(1))
  .add(shape(64, () => 0.12 + kickHit() * 0.08, 0.3).scrollY(-0.12).color(...tint(0.7)), () => 0.6 + snareHit() * 0.4)
  .out()`,
  },
  {
    id: 'maq-mosh',
    name: { en: 'Melt (live datamosh)', es: 'Derretido (datamosh en vivo)', ca: 'Fos (datamosh en viu)' },
    code: `src(o0)
  .mosh(noise(3, 0.25).pixelate(32, 18), () => 0.003 + bass() * 0.006 + snareHit() * 0.02)
  .blend(osc(24, 0.05, 0.9).kaleid(5).modulate(noise(2), 0.2).color(...tint(1.1)), () => (keyframe() ? 1 : 0.004))
  .out()`,
  },
  {
    id: 'maq-espectro',
    name: { en: 'Spectrum (bars)', es: 'Espectro (barras)', ca: 'Espectre (barres)' },
    code: `spectrumBars(() => spec(0), () => spec(1), () => spec(2), () => spec(3), () => spec(4), () => spec(5), () => spec(6), () => spec(7))
  .color(...tint(1.1))
  .add(src(o0).scale(1.01).color(0.9, 0.9, 0.9), () => 0.45 + kickHit() * 0.25)
  .out()`,
  },
  {
    id: 'maq-tunel',
    name: { en: 'Tunnel (the kick pushes)', es: 'Túnel (el bombo empuja)', ca: 'Túnel (el bombo empeny)' },
    code: `tunnel(() => time * 0.35 + kickCount() * 0.25, () => snareHit() * 1.5, () => kickHit())
  .color(...tint(1))
  .add(src(o0).scale(1.03), () => 0.25 + hatHit() * 0.2)
  .out()`,
  },
  {
    id: 'maq-senal',
    name: { en: 'Broken signal (snare)', es: 'Señal rota (caja)', ca: 'Senyal trencat (caixa)' },
    code: `rings(() => time * 0.1 + kickCount() * 0.37, () => kickHit(), () => hatHit())
  .color(...tint(1))
  .tear(() => 0.04 + snareHit() * 0.9, () => time * 12)
  .add(src(o0).scrollX(() => 0.004 + hatHit() * 0.02).color(1, 0.2, 0.6), 0.3)
  .out()`,
  },
  {
    id: 'maq-plasma',
    name: { en: 'Liquid (the kick stirs it)', es: 'Líquido (el bombo lo remueve)', ca: 'Líquid (el bombo el remena)' },
    code: `plasma(() => time * 0.1 + kickCount() * 0.11, () => kickHit(), () => bass())
  .color(...tint(1))
  .out()`,
  },
  {
    id: 'maq-estrellas',
    name: { en: 'Star jump (kick)', es: 'Salto de estrellas (bombo)', ca: "Salt d'estrelles (bombo)" },
    code: `starfield(() => time * 0.25 + kickCount() * 0.3, () => kickHit(), () => snareHit())
  .color(...tint(1.3))
  .add(src(o0).scale(1.04), () => 0.3 + kickHit() * 0.4)
  .out()`,
  },
  {
    id: 'maq-metabolas',
    name: { en: 'Blobs (they swell on the kick)', es: 'Metabolas (se hinchan con el bombo)', ca: 'Metaboles (s’inflen amb el bombo)' },
    code: `metaballs(() => time * 0.5 + kickCount() * 0.2, () => kickHit())
  .color(...tint(1))
  .out()`,
  },
  {
    id: 'maq-ondas',
    name: { en: 'Ripples (lows and hats)', es: 'Ondas (graves y platos)', ca: 'Ones (greus i plats)' },
    code: `ripples(() => time * 0.6 + kickCount() * 0.5, () => bass(), () => hatHit())
  .color(...tint(1))
  .out()`,
  },
  {
    id: 'mov-luz',
    name: { en: 'Light (follows you)', es: 'Luz (te sigue)', ca: 'Llum (et segueix)' },
    code: `shape(64, () => 0.02 + motion() * 0.1, 0.25)
  .scrollX(() => 0.5 - motionX())
  .scrollY(() => 0.5 - motionY())
  .color(...tint(0.5))
  .add(src(o0).scale(1.012).modulate(noise(3, 0.2), 0.006).color(0.97, 0.97, 0.97), () => 0.72 + kickHit() * 0.15)
  .out()`,
  },
  {
    id: 'mov-anillos',
    name: { en: 'Rings (around you)', es: 'Anillos (a tu alrededor)', ca: 'Anells (al teu voltant)' },
    code: `rings(() => time * 0.15 + kickCount() * 0.37, () => Math.max(motion(), kickHit()), () => hatHit())
  .scrollX(() => 0.5 - motionX())
  .scrollY(() => 0.5 - motionY())
  .color(...tint(1))
  .add(src(o0).scale(1.02), 0.4)
  .out()`,
  },
  {
    id: 'mov-mosh',
    name: { en: 'Melt (stirred by you)', es: 'Derretido (lo remueves tú)', ca: 'Fos (el remenes tu)' },
    code: `src(o0)
  .mosh(noise(3, 0.25).pixelate(32, 18).scrollX(() => motionX()).scrollY(() => motionY()), () => 0.002 + motion() * 0.03)
  .blend(osc(24, 0.05, 0.9).kaleid(5).modulate(noise(2), 0.2).color(...tint(1.1)), () => (keyframe() ? 1 : 0.004))
  .out()`,
  },
  {
    id: 'cam-mosh',
    name: { en: 'Webcam (live datamosh)', es: 'Webcam (datamosh en vivo)', ca: 'Webcam (datamosh en viu)' },
    camera: true,
    // o3 keeps the camera's frame from before: the picture is pushed by how
    // each block of it moved since then
    code: `src(s0).out(o3)
flowMosh(o0, s0, o3, () => 1 + bass() * 1.5)
  .blend(src(s0), () => (keyframe() ? 1 : 0))
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
    id: 'cam-glitch',
    name: { en: 'Webcam (glitch)', es: 'Webcam (glitch)', ca: 'Webcam (glitch)' },
    camera: true,
    code: `glitchOf(s0, () => 0.12 + high() * 1.4 + hatHit() * 0.6 + kickHit() * 0.3, () => time * 13 + kickCount() * 5)
  .out()`,
  },
  {
    id: 'cam-contornos',
    name: { en: 'Webcam (neon outlines)', es: 'Webcam (contornos de neón)', ca: 'Webcam (contorns de neó)' },
    camera: true,
    code: `edges(s0, () => 2.2 + bass() * 3)
  .color(...tint(1.3))
  .add(src(o0).scale(1.012), () => 0.3 + kickHit() * 0.3)
  .out()`,
  },
  {
    id: 'cam-termica',
    name: { en: 'Webcam (thermal camera)', es: 'Webcam (cámara térmica)', ca: 'Webcam (càmera tèrmica)' },
    camera: true,
    code: `thermal(s0, () => bass() * 0.2 + kickHit() * 0.15)
  .out()`,
  },
  {
    id: 'cam-barrido',
    name: { en: 'Webcam (slit scan)', es: 'Webcam (barrido)', ca: 'Webcam (escombrat)' },
    camera: true,
    // one column of the camera at a time, laid side by side: what moves in
    // front of it is stretched or squeezed by how fast it goes
    code: `slitScan(o0, s0, 0.004)
  .out()`,
  },
  {
    id: 'cam-puntos',
    name: { en: 'Webcam (dots)', es: 'Webcam (puntos)', ca: 'Webcam (punts)' },
    camera: true,
    code: `src(s0)
  .pixelate(64, 36)
  .vjDots(dotField(64), 1)
  .saturate(0)
  .color(...tint(1.3))
  .out()`,
  },
  {
    id: 'cam-fantasma',
    name: { en: 'Webcam (ghost: only what moves)', es: 'Webcam (fantasma: solo lo que se mueve)', ca: 'Webcam (fantasma: només el que es mou)' },
    camera: true,
    code: `src(s0).out(o3)
motionOnly(s0, o3, () => 3 + bass() * 4)
  .color(...tint(1.3))
  .add(src(o0).scale(1.006).color(0.86, 0.86, 0.86), 1)
  .out()`,
  },
  {
    id: 'cam-comic',
    name: { en: 'Webcam (comic)', es: 'Webcam (cómic)', ca: 'Webcam (còmic)' },
    camera: true,
    code: `comic(s0, 4)
  .saturate(1.5)
  .out()`,
  },
  {
    id: 'cam-matrix',
    name: { en: 'Webcam (Matrix)', es: 'Webcam (Matrix)', ca: 'Webcam (Matrix)' },
    camera: true,
    // you, made of falling characters: the camera decides which ones are lit
    code: `matrixRain(s0, 1, 0.9, () => kickHit())
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
    id: 'clips-mosh-vivo',
    name: { en: 'Clips (live datamosh)', es: 'Clips (datamosh en vivo)', ca: 'Clips (datamosh en viu)' },
    clips: true,
    code: `src(s2).out(o3)
flowMosh(o0, s2, o3, () => 1 + bass() * 1.5 + snareHit())
  .blend(src(s2), () => (keyframe() ? 1 : 0))
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
let running = '';
const run = (code: string) => {
  stopRidges(); // the Lines visual starts it again if it is the one running
  // another visual fades in; the same one drawn again (a new Play, the VJ
  // switched on) does not blink
  visualComesIn(code, code !== running);
  if (code !== running) cameInAt = performance.now();
  running = code;
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

// Average energy of a frequency band of a spectrum in dB, from 0 to 1
export function bandOf(data: ArrayLike<number> | undefined, nyquist: number, lowHz: number, highHz: number) {
  if (!data?.length) return 0;
  const from = Math.min(data.length - 1, Math.floor((lowHz / nyquist) * data.length));
  const to = Math.min(data.length, Math.max(from + 1, Math.floor((highHz / nyquist) * data.length)));
  let sum = 0;
  for (let i = from; i < to; i++) {
    const db = Number.isFinite(data[i]) ? data[i] : -100;
    sum += Math.min(1, Math.max(0, (db + 90) / 60));
  }
  return sum / (to - from);
}

// Another thing to listen to besides the studio's own sound: the hardware on
// an audio input (machines.ts). The louder of the two moves the visuals
let extraBand: ((lowHz: number, highHz: number) => number) | undefined;
export const setExtraBand = (read: typeof extraBand) => (extraBand = read);

function band(lowHz: number, highHz: number) {
  const data = spectrum();
  const own = data?.length && g.getAudioContext ? bandOf(data, g.getAudioContext().sampleRate / 2, lowHz, highHz) : 0;
  return extraBand ? Math.max(own, extraBand(lowHz, highHz)) : own;
}

// Available in Hydra code (the built-in visuals and your patterns)
g.bass = () => band(20, 150);
g.mid = () => band(150, 2000);
g.high = () => band(2000, 10000);
g.level = () => band(20, 10000);
// The spectrum in eight steps, low to high (0 to 7), for bars: spec(0) is the sub
const SPEC_EDGES = [30, 80, 160, 320, 640, 1280, 2500, 5000, 12000];
(g as { spec?: (step: number) => number }).spec = (step) => {
  const i = Math.min(7, Math.max(0, Math.floor(step)));
  return band(SPEC_EDGES[i], SPEC_EDGES[i + 1]);
};

// Shaders of the studio's own, written in GLSL and added to Hydra as new
// functions (also there for your code under "From the code"):
// rings(phase, kick, sparkle), gridFloor(scroll, bump, flash),
// plasma(flow, push, detail), starfield(travel, streak, flash),
// cells(drift, loud, pulse, count),
// metaballs(drift, swell), ripples(phase, tight, glint),
// tunnel(travel, twist, pulse) and spectrumBars(eight levels) draw;
// .tear(amount, seed) shifts some scanlines sideways, like a bad signal;
// .mosh(texture, amount) moves each pixel by what the texture says there, in
// steps, which over src(o0) smears the picture in blocks like a video that
// lost its keyframes (a datamosh), until something redraws it: the
// texture's brightness picks one of eight directions and how far
export const SHADERS = [
  {
    name: 'rings',
    type: 'src',
    inputs: [
      { type: 'float', name: 'phase', default: 0 },
      { type: 'float', name: 'kick', default: 0 },
      { type: 'float', name: 'sparkle', default: 0 },
    ],
    glsl: `
  vec2 p = _st - 0.5;
  p.x *= resolution.x / resolution.y;
  float r = length(p);
  float a = atan(p.y, p.x);
  float wobble = sin(a * 6.0 + phase * 6.2831) * 0.015 * (1.0 + kick * 4.0);
  float wave = fract((r + wobble) * 7.0 - phase - kick * 0.35);
  float ring = smoothstep(0.5, 0.42, abs(wave - 0.5) * (1.6 - kick));
  float core = smoothstep(0.12 + kick * 0.2, 0.0, r);
  float grain = fract(sin(dot(floor(_st * 220.0) + floor(time * 30.0), vec2(12.9898, 78.233))) * 43758.5453);
  float v = ring * (0.35 + kick * 0.65) * smoothstep(0.95, 0.2, r) + core * kick + step(0.985, grain) * sparkle;
  return vec4(vec3(v), 1.0);`,
  },
  {
    name: 'gridFloor',
    type: 'src',
    inputs: [
      { type: 'float', name: 'scroll', default: 0 },
      { type: 'float', name: 'bump', default: 0 },
      { type: 'float', name: 'flash', default: 0 },
    ],
    glsl: `
  vec2 p = _st - 0.5;
  p.x *= resolution.x / resolution.y;
  float horizon = 0.08 + bump * 0.04;
  float y = horizon - p.y;
  float depth = 0.35 / max(abs(y), 0.004);
  vec2 g = vec2(p.x * depth * 1.4, depth + scroll * (y > 0.0 ? 1.0 : -1.0));
  vec2 cell = abs(fract(g) - 0.5);
  float line = smoothstep(0.46, 0.5, max(cell.x, cell.y));
  float fade = smoothstep(0.0, 0.25, abs(y)) * (y > 0.0 ? 1.0 : 0.35);
  float glow = exp(-abs(y) * (14.0 - flash * 9.0)) * (0.35 + flash);
  return vec4(vec3(line * fade * (0.6 + bump * 0.6) + glow), 1.0);`,
  },
  {
    name: 'spectrumBars',
    type: 'src',
    inputs: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ type: 'float', name: `b${i}`, default: 0 })),
    glsl: `
  float n = 8.0;
  float i = floor(_st.x * n);
  float x = fract(_st.x * n);
  float v = i < 1.0 ? b0 : i < 2.0 ? b1 : i < 3.0 ? b2 : i < 4.0 ? b3 : i < 5.0 ? b4 : i < 6.0 ? b5 : i < 7.0 ? b6 : b7;
  v = min(v * 1.6, 1.0); // a beat seldom fills the scale: taller
  float h = 1.0 - _st.y;
  float lamp = step(0.2, fract(h * 22.0)) * step(0.1, x) * step(x, 0.9);
  float lit = step(h, v * 0.92 + 0.02);
  float top = step(abs(h - (v * 0.92 + 0.02)), 0.02);
  return vec4(vec3(lamp * (lit * (0.35 + 0.65 * h) + top) + lamp * 0.03), 1.0);`,
  },
  {
    name: 'tunnel',
    type: 'src',
    inputs: [
      { type: 'float', name: 'travel', default: 0 },
      { type: 'float', name: 'twist', default: 0 },
      { type: 'float', name: 'pulse', default: 0 },
    ],
    glsl: `
  vec2 p = _st - 0.5;
  p.x *= resolution.x / resolution.y;
  float r = length(p);
  float depth = 0.25 / max(r, 0.02) + travel;
  float around = atan(p.y, p.x) / 6.2831853 * 8.0 + twist * sin(depth * 2.0);
  float tile = abs(step(0.5, fract(depth * 2.0)) - step(0.5, fract(around)));
  float fog = smoothstep(0.02, 0.45, r);
  return vec4(vec3(tile * fog * (0.45 + pulse * 0.55) + smoothstep(0.18, 0.0, r) * pulse), 1.0);`,
  },
  {
    name: 'tear',
    type: 'coord',
    inputs: [
      { type: 'float', name: 'amount', default: 0.1 },
      { type: 'float', name: 'seed', default: 0 },
    ],
    glsl: `
  float line = floor(_st.y * 28.0);
  float n = fract(sin(line * 91.7 + floor(seed) * 13.3) * 43758.5453);
  float torn = step(1.0 - amount, n);
  return vec2(_st.x + (n - 0.5) * amount * 0.5 * torn, _st.y);`,
  },
  {
    // A liquid: noise bent by noise bent by noise, with contour lines on it
    name: 'plasma',
    type: 'src',
    inputs: [
      { type: 'float', name: 'flow', default: 0 },
      { type: 'float', name: 'push', default: 0 },
      { type: 'float', name: 'detail', default: 0 },
    ],
    glsl: `
  vec2 p = (_st - 0.5) * vec2(resolution.x / resolution.y, 1.0) * 2.2;
  vec2 q = vec2(_noise(vec3(p, flow)), _noise(vec3(p + 5.2, flow)));
  vec2 w = vec2(_noise(vec3(p + 2.6 * q + 1.7, flow * 1.3)), _noise(vec3(p + 2.6 * q + 9.2, flow * 1.3)));
  float v = 0.5 + 0.5 * _noise(vec3(p + (2.2 + push * 1.8) * w, flow * 0.7));
  v = v * v * (3.0 - 2.0 * v);
  float lines = pow(1.0 - abs(sin(v * 12.566 * (0.6 + detail))), 7.0);
  return vec4(vec3(v * 0.6 + lines * 0.4 + push * 0.12), 1.0);`,
  },
  {
    // Stars coming at you along a tunnel: three layers of them, each star a
    // cell of angle and depth, stretched into a streak by the kick
    name: 'starfield',
    type: 'src',
    inputs: [
      { type: 'float', name: 'travel', default: 0 },
      { type: 'float', name: 'streak', default: 0 },
      { type: 'float', name: 'flash', default: 0 },
    ],
    glsl: `
  vec2 p = (_st - 0.5) * vec2(resolution.x / resolution.y, 1.0);
  float r = length(p);
  float a = atan(p.y, p.x) / 6.2831853;
  float v = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float n = 44.0 + fi * 28.0;
    vec2 g = vec2(a * n, 0.5 / max(r, 0.01) * (1.0 + fi * 0.45) + travel * (1.0 + fi * 0.6));
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    float rnd = fract(sin(dot(id + fi * 7.0, vec2(127.1, 311.7))) * 43758.5453);
    f.y /= 1.0 + streak * 7.0;
    v += step(0.84, rnd) * smoothstep(0.32, 0.0, length(f)) * smoothstep(0.03, 0.3, r) * (0.5 + rnd * 0.5);
  }
  return vec4(vec3(v * (0.8 + streak * 0.6) + flash * 0.25 * smoothstep(0.45, 0.0, r)), 1.0);`,
  },
  {
    // Seven blobs that merge where they meet, each on its own slow path
    name: 'metaballs',
    type: 'src',
    inputs: [
      { type: 'float', name: 'drift', default: 0 },
      { type: 'float', name: 'swell', default: 0 },
    ],
    glsl: `
  vec2 p = (_st - 0.5) * vec2(resolution.x / resolution.y, 1.0) * 2.0;
  float f = 0.0;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    vec2 c = vec2(sin(drift * (0.7 + fi * 0.13) + fi * 2.1), cos(drift * (0.5 + fi * 0.17) + fi * 1.3)) * (0.55 + 0.12 * sin(fi * 1.9));
    float size = 0.17 + 0.05 * sin(fi * 3.0) + swell * 0.08;
    vec2 d = p - c;
    f += size * size / max(dot(d, d), 0.0005);
  }
  float body = smoothstep(0.92, 1.08, f);
  float inside = clamp((f - 1.0) * 0.45, 0.0, 1.0);
  float halo = clamp(f * 0.3, 0.0, 1.0) * (1.0 - body);
  float rim = smoothstep(1.0, 1.2, f) - smoothstep(1.2, 1.8, f);
  return vec4(vec3(body * (0.45 + 0.55 * inside) + halo * 0.3 + rim * 0.35), 1.0);`,
  },
  {
    // Rings spreading from four points that wander, crossing each other
    name: 'ripples',
    type: 'src',
    inputs: [
      { type: 'float', name: 'phase', default: 0 },
      { type: 'float', name: 'tight', default: 0 },
      { type: 'float', name: 'glint', default: 0 },
    ],
    glsl: `
  vec2 p = (_st - 0.5) * vec2(resolution.x / resolution.y, 1.0) * 2.0;
  float v = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    vec2 c = 0.65 * vec2(sin(fi * 2.4 + phase * 0.13), cos(fi * 1.7 + phase * 0.11));
    float d = length(p - c);
    v += sin(d * (26.0 + tight * 16.0) - phase * 3.0) / (1.0 + d * 2.2);
  }
  v *= 0.45;
  float crest = pow(clamp(v, 0.0, 1.0), 2.5 - glint * 1.5);
  return vec4(vec3(0.22 + 0.25 * v + crest * (0.9 + glint * 0.6)), 1.0);`,
  },
  {
    // The digital rain: columns of characters, each column with a bright
    // head falling at its own pace and a tail fading behind it. A character
    // is a 5×7 pattern, mirrored so it reads as a sign and not as noise, and
    // changes now and then. With see above zero the picture given (the
    // webcam) lights the characters where it is bright, so it shows through
    // them; green whatever the theme, that being the look
    name: 'matrixRain',
    type: 'src',
    inputs: [
      { type: 'sampler2D', name: 'tex', default: NaN },
      { type: 'float', name: 'pace', default: 1 },
      { type: 'float', name: 'see', default: 0 },
      { type: 'float', name: 'pulse', default: 0 },
    ],
    glsl: `
  vec2 cells = vec2(72.0, 72.0 * resolution.y / resolution.x * 0.6);
  vec2 g = _st * cells;
  vec2 id = floor(g);
  vec2 f = fract(g);
  // with more contrast than the camera gives: a face against a wall has to stand out
  float shown = smoothstep(0.18, 0.8, dot(texture2D(tex, (id + 0.5) / cells).rgb, vec3(0.299, 0.587, 0.114))) * see;
  float r1 = fract(sin(id.x * 91.345) * 43758.5453);
  float r2 = fract(sin(id.x * 17.77 + 3.1) * 24634.6345);
  float y = id.y / cells.y;
  float head = time * pace * (0.12 + r1 * 0.22) + r2 * 7.0;
  float behind = fract(head - y);
  float behind2 = fract(head * 0.63 + r1 * 3.0 - y);
  float tail = exp(-behind * 7.0) + exp(-behind2 * 11.0) * 0.6;
  float tip = smoothstep(0.035, 0.0, behind) + smoothstep(0.03, 0.0, behind2) * 0.6;
  float turn = floor(time * (1.5 + r2 * 5.0) + r1 * 9.0 + id.y * 0.37);
  vec2 dot5 = floor(f * vec2(5.0, 7.0));
  dot5.x = min(dot5.x, 4.0 - dot5.x);
  float sign = step(0.52, fract(sin(dot(dot5 + id * 13.1 + turn * 7.7, vec2(127.1, 311.7))) * 43758.5453));
  sign *= step(0.12, f.x) * step(f.x, 0.88) * step(0.08, f.y) * step(f.y, 0.92);
  float lit = clamp(tail * (1.0 - see * 0.55) + shown * (0.5 + tail * 0.9) + pulse * 0.15 * tail, 0.0, 1.0);
  vec3 colour = vec3(0.08, 1.0, 0.32) * lit * sign + vec3(0.75, 1.0, 0.85) * tip * sign * (0.8 + pulse * 0.4);
  return vec4(colour, 1.0);`,
  },
  {
    // Outlines: how sharply the brightness changes around each point (the
    // difference across it, sideways and up and down, from eight looks)
    name: 'edges',
    type: 'src',
    inputs: [
      { type: 'sampler2D', name: 'tex', default: NaN },
      { type: 'float', name: 'strength', default: 2 },
    ],
    glsl: `
  vec2 px = 1.6 / resolution;
  vec3 w = vec3(0.299, 0.587, 0.114);
  float tl = dot(texture2D(tex, _st + px * vec2(-1.0, -1.0)).rgb, w);
  float tc = dot(texture2D(tex, _st + px * vec2(0.0, -1.0)).rgb, w);
  float tr = dot(texture2D(tex, _st + px * vec2(1.0, -1.0)).rgb, w);
  float ml = dot(texture2D(tex, _st + px * vec2(-1.0, 0.0)).rgb, w);
  float mr = dot(texture2D(tex, _st + px * vec2(1.0, 0.0)).rgb, w);
  float bl = dot(texture2D(tex, _st + px * vec2(-1.0, 1.0)).rgb, w);
  float bc = dot(texture2D(tex, _st + px * vec2(0.0, 1.0)).rgb, w);
  float br = dot(texture2D(tex, _st + px * vec2(1.0, 1.0)).rgb, w);
  float gx = tr + 2.0 * mr + br - tl - 2.0 * ml - bl;
  float gy = bl + 2.0 * bc + br - tl - 2.0 * tc - tr;
  return vec4(vec3(smoothstep(0.1, 0.6, length(vec2(gx, gy)) * strength)), 1.0);`,
  },
  {
    // A thermal camera: brightness as heat, from cold blue through purple and
    // red to a yellow that is almost white
    name: 'thermal',
    type: 'src',
    inputs: [
      { type: 'sampler2D', name: 'tex', default: NaN },
      { type: 'float', name: 'heat', default: 0 },
    ],
    glsl: `
  float t = clamp(dot(texture2D(tex, _st).rgb, vec3(0.299, 0.587, 0.114)) * 1.15 + heat, 0.0, 1.0);
  vec3 c0 = vec3(0.0, 0.0, 0.18);
  vec3 c1 = vec3(0.45, 0.0, 0.65);
  vec3 c2 = vec3(1.0, 0.1, 0.05);
  vec3 c3 = vec3(1.0, 0.65, 0.0);
  vec3 c4 = vec3(1.0, 1.0, 0.75);
  vec3 colour = t < 0.25 ? mix(c0, c1, t * 4.0) : t < 0.5 ? mix(c1, c2, (t - 0.25) * 4.0) : t < 0.75 ? mix(c2, c3, (t - 0.5) * 4.0) : mix(c3, c4, (t - 0.75) * 4.0);
  return vec4(colour, 1.0);`,
  },
  {
    // Slit scan: the left edge is the middle column of the camera right now;
    // the rest is what was there, moved along by one step
    name: 'slitScan',
    type: 'src',
    inputs: [
      { type: 'sampler2D', name: 'shown', default: NaN },
      { type: 'sampler2D', name: 'now', default: NaN },
      { type: 'float', name: 'shift', default: 0.004 },
    ],
    glsl: `
  if (_st.x < shift) return texture2D(now, vec2(0.5, _st.y));
  return texture2D(shown, _st - vec2(shift, 0.0));`,
  },
  {
    // Only what moved between the frame before (last) and this one (now)
    name: 'motionOnly',
    type: 'src',
    inputs: [
      { type: 'sampler2D', name: 'now', default: NaN },
      { type: 'sampler2D', name: 'last', default: NaN },
      { type: 'float', name: 'gain', default: 3 },
    ],
    glsl: `
  vec3 change = abs(texture2D(now, _st).rgb - texture2D(last, _st).rgb);
  return vec4(vec3(smoothstep(0.05, 0.4, dot(change, vec3(0.3333)) * gain)), 1.0);`,
  },
  {
    // A comic: the colours in a few flat steps, and black ink where there is an outline
    name: 'comic',
    type: 'src',
    inputs: [
      { type: 'sampler2D', name: 'tex', default: NaN },
      { type: 'float', name: 'steps', default: 4 },
    ],
    glsl: `
  vec2 px = 1.8 / resolution;
  vec3 w = vec3(0.299, 0.587, 0.114);
  vec3 flat3 = floor(texture2D(tex, _st).rgb * steps + 0.5) / steps;
  float l = dot(texture2D(tex, _st - vec2(px.x, 0.0)).rgb, w);
  float r = dot(texture2D(tex, _st + vec2(px.x, 0.0)).rgb, w);
  float u = dot(texture2D(tex, _st - vec2(0.0, px.y)).rgb, w);
  float d = dot(texture2D(tex, _st + vec2(0.0, px.y)).rgb, w);
  float ink = smoothstep(0.08, 0.3, length(vec2(r - l, d - u)) * 2.5);
  return vec4(flat3 * (1.0 - ink), 1.0);`,
  },
  {
    // Cells that fit each other like a honeycomb that will not keep still:
    // each point belongs to the nearest of a set of wandering centres. The
    // border is where the nearest and the next one are as near, drawn as a
    // bright seam; each cell is shaded darker towards its edge, and the
    // louder it gets the more of them light up (each has its own threshold)
    name: 'cells',
    type: 'src',
    inputs: [
      { type: 'float', name: 'drift', default: 0 },
      { type: 'float', name: 'loud', default: 0 },
      { type: 'float', name: 'pulse', default: 0 },
      { type: 'float', name: 'count', default: 5 },
    ],
    glsl: `
  vec2 p = (_st - 0.5) * vec2(resolution.x / resolution.y, 1.0) * count;
  vec2 ip = floor(p);
  vec2 fp = fract(p);
  float f1 = 8.0;
  float f2 = 8.0;
  vec2 owner = ip;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 q = ip + g;
      vec2 o = vec2(fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453), fract(sin(dot(q, vec2(269.5, 183.3))) * 43758.5453));
      o = 0.5 + 0.42 * sin(drift + 6.2831853 * o);
      vec2 r = g + o - fp;
      float d = dot(r, r);
      if (d < f1) {
        f2 = f1;
        f1 = d;
        owner = q;
      } else if (d < f2) {
        f2 = d;
      }
    }
  }
  f1 = sqrt(f1);
  f2 = sqrt(f2);
  float seam = 1.0 - smoothstep(0.0, 0.06 + pulse * 0.05, f2 - f1);
  float own = fract(sin(dot(owner, vec2(41.3, 289.1))) * 43758.5453);
  float on = smoothstep(1.02 - loud, 1.1 - loud, own);
  float relief = 1.0 - smoothstep(0.0, 0.75, f1);
  float face = (0.1 + 0.22 * own + on * 0.75) * (0.35 + 0.65 * relief);
  return vec4(vec3(face * (1.0 - seam) + seam * (0.55 + pulse * 0.45 + on * 0.2)), 1.0);`,
  },
  {
    // A picture breaking up, the way a bad signal or a corrupt file does.
    // Some rows of it jump sideways; some blocks are moved, crushed to a few
    // colours or turned negative; red and blue come apart; the rows that
    // jumped fill with static. amount says how much of all that, and every
    // whole step of seed breaks it somewhere else
    name: 'glitchOf',
    type: 'src',
    inputs: [
      { type: 'sampler2D', name: 'tex', default: NaN },
      { type: 'float', name: 'amount', default: 0.3 },
      { type: 'float', name: 'seed', default: 0 },
    ],
    glsl: `
  vec2 uv = _st;
  float t = floor(seed);
  float band = floor(uv.y * 30.0);
  float rb = fract(sin(band * 91.7 + t * 13.3) * 43758.5453);
  float jump = (rb - 0.5) * step(1.0 - amount * 0.5, rb) * 0.4;
  vec2 blk = floor(uv * vec2(14.0, 9.0));
  float rk = fract(sin(dot(blk + t * 3.7, vec2(127.1, 311.7))) * 43758.5453);
  float hit = step(1.0 - amount * 0.28, rk);
  uv.x += jump;
  uv += (vec2(fract(rk * 17.3), fract(rk * 71.9)) - 0.5) * 0.25 * hit;
  float apart = amount * 0.018 + abs(jump) * 0.2;
  vec3 colour = vec3(texture2D(tex, fract(uv + vec2(apart, 0.0))).r, texture2D(tex, fract(uv)).g, texture2D(tex, fract(uv - vec2(apart, 0.0))).b);
  colour = mix(colour, floor(colour * 3.0 + 0.5) / 3.0, hit);
  colour = mix(colour, 1.0 - colour, hit * step(0.88, fract(rk * 5.3)));
  float snow = fract(sin(dot(floor(_st * resolution * 0.5) + t, vec2(12.9898, 78.233))) * 43758.5453);
  colour += (snow - 0.5) * 0.6 * step(0.001, abs(jump));
  colour *= 0.86 + 0.14 * sin(_st.y * resolution.y * 1.6);
  return vec4(colour, 1.0);`,
  },
  {
    // The finish (finish.ts): the picture, a glow from what is bright around
    // each point (sixteen looks at the picture, on two rings), darker
    // corners and grain
    name: 'finish',
    type: 'src',
    inputs: [
      { type: 'sampler2D', name: 'tex', default: NaN },
      { type: 'float', name: 'glow', default: 0 },
      { type: 'float', name: 'grain', default: 0 },
      { type: 'float', name: 'vignette', default: 0 },
      // the palette: how much of it, and its four colours from dark to light
      { type: 'float', name: 'tone', default: 0 },
      ...['a', 'b', 'c', 'd'].flatMap((stop) => ['r', 'g', 'b'].map((part) => ({ type: 'float', name: `p${stop}${part}`, default: 0 }))),
      { type: 'float', name: 'lift', default: 1.5 },
      { type: 'float', name: 'dim', default: 1 },
      { type: 'float', name: 'tame', default: 0 },
    ],
    glsl: `
  vec3 base = texture2D(tex, _st).rgb;
  vec2 reach = vec2(resolution.y / resolution.x, 1.0) * 0.014;
  vec3 halo = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7853982;
    vec2 d = vec2(cos(a), sin(a)) * reach;
    halo += max(texture2D(tex, _st + d).rgb - 0.45, 0.0);
    halo += max(texture2D(tex, _st + d * 2.4).rgb - 0.45, 0.0) * 0.6;
  }
  vec3 colour = base + halo * glow * 0.42;
  // how bright it is, taken further by the Light slider (many visuals are
  // drawn dim, to sit behind the code) and with its low end lifted
  float light = pow(clamp(dot(colour, vec3(0.299, 0.587, 0.114)) * lift, 0.0, 1.0), 0.6);
  vec3 pa = vec3(par, pag, pab);
  vec3 pb = vec3(pbr, pbg, pbb);
  vec3 pc = vec3(pcr, pcg, pcb);
  vec3 pd = vec3(pdr, pdg, pdb);
  vec3 mapped = light < 0.3333 ? mix(pa, pb, light * 3.0) : light < 0.6667 ? mix(pb, pc, (light - 0.3333) * 3.0) : mix(pc, pd, (light - 0.6667) * 3.0);
  colour = mix(colour, mapped, tone);
  colour *= 1.0 - vignette * smoothstep(0.3, 0.85, distance(_st, vec2(0.5)));
  colour *= dim;
  colour *= 1.0 - tame * smoothstep(0.28, 0.8, dot(colour, vec3(0.299, 0.587, 0.114)));
  float speck = fract(sin(dot(floor(_st * resolution) + floor(time * 24.0) * 7.0, vec2(12.9898, 78.233))) * 43758.5453);
  colour += (speck - 0.5) * grain * 0.22;
  return vec4(colour, 1.0);`,
  },
  {
    // A datamosh that follows the picture: for each block, how it moved
    // between the frame before (last) and this one (now), from how its
    // brightness changed against its slope there; what shows (shown) is
    // pulled from where that block came from. Nothing new is drawn until a
    // keyframe, so a face smears along its own movement
    name: 'flowMosh',
    type: 'src',
    inputs: [
      { type: 'sampler2D', name: 'shown', default: NaN },
      { type: 'sampler2D', name: 'now', default: NaN },
      { type: 'sampler2D', name: 'last', default: NaN },
      { type: 'float', name: 'amount', default: 1 },
    ],
    glsl: `
  vec2 blocks = vec2(48.0, 27.0);
  vec2 at = (floor(_st * blocks) + 0.5) / blocks;
  vec2 e = 0.5 / blocks;
  vec3 w = vec3(0.299, 0.587, 0.114);
  float change = dot(texture2D(now, at).rgb - texture2D(last, at).rgb, w);
  float gx = dot(texture2D(now, at + vec2(e.x, 0.0)).rgb - texture2D(now, at - vec2(e.x, 0.0)).rgb, w);
  float gy = dot(texture2D(now, at + vec2(0.0, e.y)).rgb - texture2D(now, at - vec2(0.0, e.y)).rgb, w);
  vec2 slope = vec2(gx, gy);
  vec2 moved = clamp(-change * slope / (dot(slope, slope) + 0.004), -1.0, 1.0) * e * 2.0 * amount;
  return texture2D(shown, fract(_st - moved));`,
  },
  {
    // the VJ's dots: how far each pixel is from the middle of its cell (the
    // cells pixelate() makes), and the picture kept only inside a dot whose
    // size is how bright that cell is
    name: 'dotField',
    type: 'src',
    inputs: [{ type: 'float', name: 'cells', default: 96 }],
    glsl: `
  vec2 local = fract(_st * vec2(cells, cells * 0.5625) + 0.5) - 0.5;
  return vec4(vec3(length(local)), 1.0);`,
  },
  {
    name: 'vjDots',
    type: 'combine',
    inputs: [{ type: 'float', name: 'amount', default: 0 }],
    glsl: `
  float bright = dot(_c0.rgb, vec3(0.299, 0.587, 0.114));
  float radius = 0.12 + bright * 0.5;
  float inside = 1.0 - smoothstep(radius, radius + 0.07, _c1.r);
  return mix(_c0, vec4(_c0.rgb * inside * 1.25, _c0.a), step(0.001, amount));`,
  },
  {
    // the VJ's kaleidoscope: under two sides it leaves the picture alone
    name: 'vjKaleid',
    type: 'coord',
    inputs: [{ type: 'float', name: 'sides', default: 1 }],
    glsl: `
  if (sides < 1.5) return _st;
  vec2 p = _st - 0.5;
  float slice = 6.2831853 / floor(sides + 0.5);
  float a = abs(mod(atan(p.y, p.x), slice) - slice * 0.5);
  return vec2(cos(a), sin(a)) * length(p) + 0.5;`,
  },
  {
    name: 'mosh',
    type: 'combineCoord',
    inputs: [{ type: 'float', name: 'amount', default: 0.01 }],
    glsl: `
  float l = dot(_c0.rgb, vec3(0.3333));
  float turn = floor(l * 8.0 + 0.5) * 0.7853982;
  float push = min(abs(l) * 2.0, 1.0);
  vec2 v = vec2(cos(turn), sin(turn)) * push;
  return _st + v * amount;`,
  },
];
// When a datamosh draws the picture whole again: on a kick, and every few
// seconds anyway so it never melts to nothing with no drums around
// and for the first moment of a visual, so it opens on its own picture and
// not on what the one before left
let cameInAt = -Infinity;
(globalThis as { keyframe?: () => boolean }).keyframe = () =>
  kickHit() > 0.6 || (performance.now() / 1000) % 5 < 0.12 || performance.now() - cameInAt < 250;
let shadersIn: unknown;
function defineShaders(hydra: unknown) {
  const setFunction = (globalThis as { setFunction?: (shader: unknown) => void }).setFunction;
  if (shadersIn === hydra || !setFunction) return;
  // a copy each time: Hydra adds to the inputs of what it is given, and a
  // second Hydra (it starts over after a hush or new options) would get them twice
  for (const shader of SHADERS) setFunction({ ...shader, inputs: shader.inputs.map((input) => ({ ...input })) });
  shadersIn = hydra;
}

// Strudel loads Hydra from unpkg.com; this uses the copy bundled with the
// studio instead, also for an initHydra() written in your patterns.
// Half resolution by default: a quarter of the pixels to draw, which leaves CPU
// for the audio. These visuals are soft anyway; initHydra({ pixelRatio: 1 }) for full.
export function useBundledHydra(src: string) {
  const original = g.initHydra as ((options?: Record<string, unknown>) => Promise<unknown>) | undefined;
  if (!original) return;
  g.initHydra = async (options: Record<string, unknown> = {}) => {
    // always the same options: Strudel starts Hydra over when they change, and
    // the size is set afterwards anyway (fitVisuals), whatever the quality
    const hydra = await original({ src, pixelRatio: 0.5, pixelated: false, ...options });
    pixelRatio = typeof options.pixelRatio === 'number' ? options.pixelRatio : QUALITY[quality].ratio;
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
  // unset, or still the other quality's: a pattern's own fps = … is left alone
  if (!globals.fps || globals.fps === QUALITY.light.fps || globals.fps === QUALITY.high.fps) globals.fps = QUALITY[quality].fps;
}

// Light for making music (the notes come first), high for showing it
// (finish.ts chooses; Go live takes high by itself)
const QUALITY: Record<Quality, { ratio: number; fps: number }> = { light: { ratio: 0.5, fps: 30 }, high: { ratio: 1, fps: 60 } };
let quality: Quality = 'light';
export function setVisualQuality(next: Quality) {
  quality = next;
  pixelRatio = QUALITY[next].ratio;
  capFrameRate();
  fitVisuals();
}

// Hydra draws at its box on screen (the window, or the 9:16 column of the
// vertical framing) times the pixel ratio. Strudel resizes the canvas to the
// window, so after a resize, or when the framing changes, Hydra is told the
// size of its actual box, or it would draw stretched or in a corner
let followed: { setResolution?: (width: number, height: number) => void } | undefined;
let pixelRatio = QUALITY.light.ratio;

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
const AUTO_KICKS = 16; // stopped, with hardware being heard (machines.ts): about four bars of four on the floor
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
  const pool = visuals.filter((v) => v.code && !v.camera && !v.clips && !['ninguno', 'tacto', 'tacto-ondas', 'tacto-chispas', 'tacto-latido', 'voz', 'voz-formas'].includes(v.id) && !v.id.startsWith('mov'));
  const step = () => {
    const cycles = clock();
    if (cycles !== null) return `bar ${Math.floor(cycles / AUTO_BARS)}`;
    // no music at all would freeze it on one visual: the kicks while they come, the seconds too
    if (extraBand) return `kick ${Math.floor(kickCount() / AUTO_KICKS)} ${Math.floor(performance.now() / 1000 / (AUTO_SECONDS * 4))}`;
    return `time ${Math.floor(performance.now() / 1000 / AUTO_SECONDS)}`;
  };
  const next = () => {
    // with the studio stopped and hardware heard, only what moves with the
    // sound: a visual that waits for the bar (H) would stand still
    const jam = clock() === null && Boolean(extraBand);
    const choices = pool.filter((v) => v !== autoCurrent && !(jam && v.code.includes('H(')));
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

// The last pass over the picture (finish.ts): drawn into o2 and shown from
// there, or o0 shown as it is
function showFinish(wanted: boolean) {
  const code = wanted ? finishCode() : null;
  try {
    new Function(code ? `${code}\nrender(o2)` : 'render(o0)')();
  } catch (error) {
    console.warn('[finish]', error);
  }
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
  defineShaders(hydra);
  // The clips canvas is always s2, also for src(s2) in your own Hydra code
  attachClips();
  // your own Hydra code is shown as you wrote it, with no finish over it
  if (visual.id === CODE_VISUAL) return showFinish(false);
  showFinish(true);
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
