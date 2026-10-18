// What each MPK knob and the joystick just did, shown for a moment at the
// bottom of the screen: some only act in one pattern, or only show with the
// ASCII filter or the "From the code" visual, and without this they seemed
// dead. The label follows what is playing.
import { pick, type Localized } from './i18n';
import { BEND_EVENT, CC_EVENT, type CcDetail } from './midi';
import { VJ_CONTROLS } from './vj';

type Context = { code: string; playing: boolean; visual: string; ascii: boolean; vjKnobs?: boolean };
type Label = { name: Localized; hint?: Localized };

const L = (en: string, es: string, ca: string): Localized => ({ en, es, ca });

const UNUSED: Label = { name: L('Not used here', 'Sin uso aquí', 'Aquí no es fa servir'), hint: L('it acts in the "MPK Mini" pattern', 'actúa en el patrón "MPK Mini"', 'actua al patró "MPK Mini"') };
const FROM_CODE = L('pick the "From the code" visual to see it', 'elige el visual "Del código" para verlo', 'tria el visual "Del codi" per veure-ho');

// Knobs 1-8 on channel 1, as the MPK Mini Mk II sends them
export function knobLabel(knob: number, context: Context): Label {
  const mpkPattern = context.playing && context.code.includes("'MPK Mini'");
  const ownPattern = context.playing && !mpkPattern && context.code.includes('midin(');
  if (context.vjKnobs && knob <= VJ_CONTROLS.length) {
    const control = VJ_CONTROLS[knob - 1];
    return { name: { en: `VJ · ${control.name.en}`, es: `VJ · ${control.name.es}`, ca: `VJ · ${control.name.ca}` } };
  }
  if (knob === 7) return { name: L('Master volume', 'Volumen general', 'Volum general') };
  if (knob === 8) return { name: L('ASCII size', 'Tamaño del ASCII', "Mida de l'ASCII"), hint: context.ascii ? undefined : L('turn on More → ASCII filter', 'activa Más → Filtro ASCII', 'activa Més → Filtre ASCII') };
  if (ownPattern) return { name: L(`Knob ${knob} · in your pattern`, `Knob ${knob} · en tu patrón`, `Knob ${knob} · al teu patró`), hint: L(`read with knob(${knob}, 1)`, `se lee con knob(${knob}, 1)`, `es llegeix amb knob(${knob}, 1)`) };
  const keys = mpkPattern ? undefined : L('keys without Play', 'teclas sin Play', 'tecles sense Play');
  if (knob === 1) return { name: L('Echo', 'Eco', 'Eco'), hint: keys };
  if (knob === 2) return { name: L('Filter, dark to bright', 'Filtro, de apagado a brillante', "Filtre, d'apagat a brillant"), hint: keys };
  if (knob === 3) return { name: L('Reverb', 'Reverb', 'Reverb'), hint: keys };
  if (!mpkPattern) return UNUSED;
  if (knob === 4) return { name: L('Backing beat volume', 'Volumen del ritmo de fondo', 'Volum del ritme de fons') };
  const visualHint = context.visual === 'code' ? undefined : FROM_CODE;
  if (knob === 5) return { name: L('Mirrors in the visual', 'Espejos del visual', 'Miralls del visual'), hint: visualHint };
  return { name: L('Visual spin', 'Giro del visual', 'Gir del visual'), hint: visualHint };
}

export function bendLabel(context: Context): Label {
  const name = L('Joystick · pitch', 'Joystick · desafinar', 'Joystick · desafinar');
  if (!context.playing) return { name, hint: L('each new key without Play', 'cada tecla nueva sin Play', 'cada tecla nova sense Play') };
  if (context.code.includes('bend()')) return { name, hint: L('each new note', 'cada nota nueva', 'cada nota nova') };
  return { name, hint: L('this pattern does not use it', 'este patrón no lo usa', 'aquest patró no el fa servir') };
}

export function setupKnobHud(getContext: () => Context) {
  const hud = document.createElement('div');
  hud.className = 'knob-hud';
  hud.setAttribute('role', 'status');
  hud.hidden = true;
  const title = document.createElement('p');
  title.className = 'knob-hud-title';
  const bar = document.createElement('div');
  bar.className = 'knob-hud-bar';
  const fill = document.createElement('span');
  bar.append(fill);
  const hint = document.createElement('p');
  hint.className = 'knob-hud-hint';
  hud.append(title, bar, hint);
  document.body.append(hud);

  let timer: number | undefined;
  // value 0-1 fills from the left; centered (bend, -1 to 1) grows from the middle
  const show = (prefix: string, label: Label, value: number, centered = false) => {
    title.textContent = `${prefix} · ${pick(label.name)}`;
    hint.textContent = label.hint ? pick(label.hint) : '';
    hint.hidden = !label.hint;
    fill.style.left = centered ? `${50 + Math.min(0, value) * 50}%` : '0';
    fill.style.width = centered ? `${Math.abs(value) * 50}%` : `${value * 100}%`;
    hud.hidden = false;
    clearTimeout(timer);
    timer = window.setTimeout(() => (hud.hidden = true), 1500);
  };

  window.addEventListener(CC_EVENT, (event) => {
    const { cc, value, channel } = (event as CustomEvent<CcDetail>).detail;
    if (channel === 1 && cc >= 1 && cc <= 8) show(`K${cc}`, knobLabel(cc, getContext()), value);
  });
  window.addEventListener(BEND_EVENT, (event) => {
    const value = (event as CustomEvent<number>).detail;
    show('↔', bendLabel(getContext()), value, true);
  });
}
