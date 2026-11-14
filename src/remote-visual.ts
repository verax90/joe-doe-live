// The phone's Visual tab (mando.ts), on the studio's side: a second person
// plays the picture while the first plays the music. They pick the visual
// (or jump to another), hit a kick, a snare or the hats by hand (what the
// drums do to the visuals and the clips, without a drum), move the VJ
// effects, and drag the point the Motion visuals follow, with no webcam.
import { hearRole, type Role } from './clips-react';
import { applyColour, colourNow, onColour, PALETTES } from './finish';
import { onLangChange, pick as inLanguage } from './i18n';
import { holdMotionPoint } from './motion';
import {
  addPhoneGreeting,
  REMOTE_HIT_EVENT,
  REMOTE_LOOK_EVENT,
  REMOTE_PALETTE_EVENT,
  REMOTE_POINT_EVENT,
  REMOTE_VISUAL_EVENT,
  REMOTE_VJ_EVENT,
  sendToPhones,
  type StudioMessage,
  type VisualItem,
} from './remote';
import { GLIDE_MS, VJ_CONTROLS, onVjLook, recallLook, resetVj, savedLooks, setVjControl, vjPositions, type VjControl } from './vj';

type Options = {
  // what the phone may pick, in the studio's language (no webcam visuals:
  // the camera only turns on from the studio itself)
  list: () => VisualItem[];
  current: () => string;
  pick: (id: string) => void;
};

// Another visual than the one showing, out of those that draw by themselves
export function nextVisual(items: VisualItem[], current: string, random = Math.random) {
  const pool = items.filter((item) => item.id !== current && !['auto', 'ninguno'].includes(item.id));
  return pool.length ? pool[Math.floor(random() * pool.length)].id : undefined;
}

export function setupRemoteVisual({ list, current, pick }: Options) {
  const vjNames = () => VJ_CONTROLS.map((control) => ({ id: control.id, name: control.name }));
  const hello = (): StudioMessage => ({
    t: 'visuals',
    items: list(),
    current: current(),
    vj: vjPositions(),
    looks: savedLooks(),
    vjNames: vjNames(),
    palettes: PALETTES.map((palette) => ({ id: palette.id, name: inLanguage(palette.name) })),
    palette: colourNow().palette,
  });
  addPhoneGreeting(hello);
  onLangChange(() => sendToPhones(hello()));
  // a look recalled or saved, Surprise me, All neutral: the phone's sliders and memories follow
  onVjLook(() => sendToPhones({ t: 'vj', vj: vjPositions(), looks: savedLooks() }));
  // the palette from the phone, and the phone told when it changes here (a look, the dice)
  window.addEventListener(REMOTE_PALETTE_EVENT, (event) => {
    const id = (event as CustomEvent<string>).detail;
    if (PALETTES.some((palette) => palette.id === id)) applyColour({ palette: id });
  });
  onColour(() => sendToPhones({ t: 'palette', id: colourNow().palette }));
  window.addEventListener(REMOTE_LOOK_EVENT, (event) => void recallLook((event as CustomEvent<number>).detail, GLIDE_MS));
  // picked on the studio, by a MIDI program change, by another phone
  const tell = () => sendToPhones({ t: 'visual', id: current() });
  document.querySelector('#visual')?.addEventListener('change', tell);

  window.addEventListener(REMOTE_VISUAL_EVENT, (event) => {
    const asked = (event as CustomEvent<string | null>).detail;
    const id = asked ?? nextVisual(list(), current());
    if (!id || !list().some((item) => item.id === id)) return;
    pick(id);
    tell();
  });
  window.addEventListener(REMOTE_HIT_EVENT, (event) => hearRole((event as CustomEvent<Role>).detail));
  window.addEventListener(REMOTE_POINT_EVENT, (event) => holdMotionPoint((event as CustomEvent<{ x: number; y: number } | null>).detail));
  window.addEventListener(REMOTE_VJ_EVENT, (event) => {
    const detail = (event as CustomEvent<{ c: VjControl; v: number } | null>).detail;
    // the effects only show with VJ on: moving one from the phone turns it on
    const toggle = document.querySelector<HTMLInputElement>('#vj-on');
    if (detail && toggle && !toggle.checked) toggle.click();
    if (detail) setVjControl(detail.c, detail.v);
    else resetVj();
  });
}
