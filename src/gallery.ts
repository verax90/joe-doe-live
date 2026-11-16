// The visuals' gallery (More → Visuals → Gallery, or the grid button next to
// the Visual menu): every look as a card with its picture, in groups, with
// a search, favourites (the star) and «another at random» within what is
// shown. A click puts it on at once and the panel stays open to keep
// browsing. The pictures: the looks that do not need a camera come with
// one (public/thumbs, made with scripts/probe), and any look you have had
// on for a couple of seconds keeps a small picture of how it looked for you
// (so the webcam ones show your own picture after their first time).
import { onHydraFrame } from './ascii';
import { onLangChange, pick, t, type StringKey } from './i18n';
import { readStorage, writeStorage } from './storage';
import { visualGroup, visuals, type Visual, type VisualGroup } from './visuals';

const FAVOURITES_KEY = 'jdl:visual-favourites';
const THUMBS_KEY = 'jdl:visual-thumbs';
const FILTER_KEY = 'jdl:gallery-filter';
const MAX_THUMBS = 160;

type Filter = 'all' | 'favourites' | Exclude<VisualGroup, 'top'>;
const FILTERS: Filter[] = ['favourites', 'all', 'sound', 'retro', 'machines', 'motion', 'cam', 'voice', 'touch', 'clips'];

// Accents and case do not matter when searching: «camara» finds «Cámara»
export const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export function galleryMatches(visual: Visual, filter: Filter, query: string, favourites: Set<string>, name: string) {
  const group = visualGroup(visual);
  if (group === 'top') return false;
  if (filter === 'favourites' && !favourites.has(visual.id)) return false;
  if (filter !== 'all' && filter !== 'favourites' && group !== filter) return false;
  const words = fold(query).split(/\s+/).filter(Boolean);
  const haystack = fold(`${name} ${visual.id}`);
  return words.every((word) => haystack.includes(word));
}

// On a card the group is already said: «Webcam (hexagons)» is «Hexagons»
export function cardName(name: string) {
  const inner = /^Webcam \((.+)\)$/.exec(name)?.[1];
  return inner ? inner[0].toUpperCase() + inner.slice(1) : name;
}

// Another one at random from those shown, never the one on now
export function pickAnother(ids: string[], current: string, random = Math.random) {
  const others = ids.filter((id) => id !== current);
  if (!others.length) return undefined;
  return others[Math.floor(random() * others.length)];
}

export function setupGallery(select: HTMLSelectElement) {
  const panel = document.querySelector<HTMLElement>('#gallery')!;
  const grid = panel.querySelector<HTMLElement>('.gallery-grid')!;
  const chips = panel.querySelector<HTMLElement>('.gallery-filters')!;
  const tops = panel.querySelector<HTMLElement>('.gallery-tops')!;
  const search = panel.querySelector<HTMLInputElement>('#gallery-search')!;
  const random = panel.querySelector<HTMLButtonElement>('#gallery-random')!;
  const count = panel.querySelector<HTMLElement>('#gallery-count')!;
  const menuItem = document.querySelector<HTMLButtonElement>('#toggle-gallery')!;
  document.querySelector<HTMLButtonElement>('#visual-gallery')?.addEventListener('click', () => menuItem.click());

  let favourites = new Set(readStorage<string[]>(FAVOURITES_KEY, []));
  let thumbs = readStorage<Record<string, string>>(THUMBS_KEY, {});
  let filter = readStorage<Filter>(FILTER_KEY, 'all');
  if (!FILTERS.includes(filter)) filter = 'all';

  const put = (id: string) => {
    if (select.value === id) return;
    select.value = id;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    mark();
  };

  // The special ones (from the code, automatic, none) as buttons on top
  const renderTops = () => {
    tops.replaceChildren(
      ...visuals
        .filter((visual) => visualGroup(visual) === 'top')
        .map((visual) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'control gallery-top';
          button.dataset.id = visual.id;
          button.textContent = pick(visual.name);
          button.addEventListener('click', () => put(visual.id));
          return button;
        }),
    );
  };

  const renderChips = () => {
    chips.replaceChildren(
      ...FILTERS.map((which) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'gallery-filter';
        chip.dataset.filter = which;
        chip.setAttribute('aria-pressed', String(which === filter));
        chip.textContent = which === 'all' ? t('galleryAll') : which === 'favourites' ? `★ ${t('galleryFavourites')}` : t(`galleryGroup_${which}` as StringKey);
        chip.addEventListener('click', () => {
          filter = which;
          writeStorage(FILTER_KEY, filter);
          renderChips();
          renderGrid();
        });
        return chip;
      }),
    );
  };

  const shown = () => visuals.filter((visual) => galleryMatches(visual, filter, search.value, favourites, pick(visual.name)));

  const card = (visual: Visual) => {
    const item = document.createElement('div');
    item.className = 'gallery-card';
    item.dataset.id = visual.id;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'gallery-pick';
    button.addEventListener('click', () => put(visual.id));
    const picture = document.createElement('span');
    picture.className = 'gallery-picture';
    const own = thumbs[visual.id];
    if (own || !visual.camera) {
      const image = document.createElement('img');
      image.alt = '';
      image.loading = 'lazy';
      image.decoding = 'async';
      image.src = own ?? `/thumbs/${visual.id}.jpg`;
      // no picture shipped for it (clips, a new look): the placeholder stays
      image.addEventListener('error', () => image.remove());
      picture.append(image);
    }
    if (visual.camera) {
      const badge = document.createElement('span');
      badge.className = 'gallery-badge';
      badge.dataset.icon = 'camera';
      badge.title = t('galleryCamera');
      picture.append(badge);
    }
    const name = document.createElement('span');
    name.className = 'gallery-name';
    name.textContent = cardName(pick(visual.name));
    button.append(picture, name);
    const star = document.createElement('button');
    star.type = 'button';
    star.className = 'gallery-star';
    const starred = favourites.has(visual.id);
    star.setAttribute('aria-pressed', String(starred));
    star.setAttribute('aria-label', `${starred ? t('galleryUnstar') : t('galleryStar')}: ${pick(visual.name)}`);
    star.textContent = starred ? '★' : '☆';
    star.addEventListener('click', () => {
      if (favourites.has(visual.id)) favourites.delete(visual.id);
      else favourites.add(visual.id);
      writeStorage(FAVOURITES_KEY, [...favourites]);
      if (filter === 'favourites') renderGrid();
      else {
        const now = favourites.has(visual.id);
        star.setAttribute('aria-pressed', String(now));
        star.setAttribute('aria-label', `${now ? t('galleryUnstar') : t('galleryStar')}: ${pick(visual.name)}`);
        star.textContent = now ? '★' : '☆';
      }
    });
    item.append(button, star);
    return item;
  };

  const renderGrid = () => {
    const list = shown();
    grid.replaceChildren(...list.map(card));
    count.textContent = list.length === 1 ? t('galleryCountOne') : list.length ? t('galleryCount', { n: list.length }) : filter === 'favourites' && !search.value ? t('galleryNoFavourites') : t('galleryNothing');
    random.disabled = list.length < 2;
    mark();
  };

  // Which one is on: lit, in the grid and on top
  const mark = () => {
    for (const element of panel.querySelectorAll<HTMLElement>('.gallery-card, .gallery-top')) {
      element.classList.toggle('is-on', element.dataset.id === select.value);
    }
  };

  search.addEventListener('input', renderGrid);
  random.addEventListener('click', () => {
    const next = pickAnother(
      shown().map((visual) => visual.id),
      select.value,
    );
    if (next) {
      put(next);
      panel.querySelector<HTMLElement>(`.gallery-card[data-id="${CSS.escape(next)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  });

  // A picture of each look, a couple of seconds after it comes on (the
  // fade-in over), taken right after Hydra draws, while it can be read
  let pending = 0;
  const remember = () => {
    window.clearTimeout(pending);
    const id = select.value;
    const visual = visuals.find((v) => v.id === id);
    if (!visual || visualGroup(visual) === 'top') return;
    pending = window.setTimeout(() => {
      if (select.value !== id || document.hidden) return;
      const stop = onHydraFrame(() => {
        stop();
        const source = document.getElementById('hydra-canvas') as HTMLCanvasElement | null;
        if (!source?.width) return;
        const small = document.createElement('canvas');
        small.width = 192;
        small.height = 108;
        const context = small.getContext('2d');
        if (!context) return;
        // the middle of the picture, cut to 16:9 whatever the screen's shape
        const ratio = 16 / 9;
        const width = Math.min(source.width, source.height * ratio);
        const height = width / ratio;
        context.drawImage(source, (source.width - width) / 2, (source.height - height) / 2, width, height, 0, 0, 192, 108);
        // a black frame says nothing (the camera still waking up): not kept
        const pixels = context.getImageData(0, 0, 192, 108).data;
        let light = 0;
        for (let i = 0; i < pixels.length; i += 64) light += pixels[i] + pixels[i + 1] + pixels[i + 2];
        if (light / (pixels.length / 64) < 12) return;
        let picture = '';
        try {
          picture = small.toDataURL('image/jpeg', 0.7);
        } catch {
          return; // a tainted canvas (a video from elsewhere): no picture
        }
        delete thumbs[id];
        thumbs[id] = picture;
        const ids = Object.keys(thumbs);
        for (const old of ids.slice(0, Math.max(0, ids.length - MAX_THUMBS))) delete thumbs[old];
        writeStorage(THUMBS_KEY, thumbs);
        const image = panel.querySelector<HTMLElement>(`.gallery-card[data-id="${CSS.escape(id)}"] .gallery-picture`);
        if (image) {
          let img = image.querySelector('img');
          if (!img) {
            img = document.createElement('img');
            img.alt = '';
            image.prepend(img);
          }
          img.src = picture;
        }
      });
    }, 2600);
  };
  select.addEventListener('change', () => {
    mark();
    remember();
  });
  // other ways it changes (Auto, the phone, a shared link, a live set)
  let last = select.value;
  window.setInterval(() => {
    if (select.value === last) return;
    last = select.value;
    mark();
    remember();
  }, 700);

  const render = () => {
    search.placeholder = t('gallerySearch');
    renderTops();
    renderChips();
    renderGrid();
  };
  onLangChange(render);
  render();
  remember();
}
