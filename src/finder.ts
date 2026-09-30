// Quick finder (Ctrl+K, or More → Search): type a few letters and Enter.
// It finds every item of the More menu (panels, view toggles, export…), the
// bar's buttons, the patterns and the visuals, so nothing needs hunting in
// a menu that keeps growing. Accents and case do not matter; what starts
// with the letters comes first.
import { t } from './i18n';

export type Entry = { label: string; kind: string; run: () => void };

// Lower case and without accents: "Micrófono" → "microfono"
export const plain = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

// Entries matching the query, best first: the label starting with it, then a
// word in it starting with it, then containing it anywhere (label or kind)
export function rank(entries: Entry[], query: string, limit = 8) {
  const q = plain(query);
  if (!q) return entries.slice(0, limit);
  const score = (entry: Entry) => {
    const label = plain(entry.label);
    if (label.startsWith(q)) return 0;
    if (label.split(/[\s/(·-]+/).some((word) => word.startsWith(q))) return 1;
    if (label.includes(q)) return 2;
    if (plain(entry.kind).includes(q)) return 3;
    return -1;
  };
  return entries
    .map((entry, index) => ({ entry, index, score: score(entry) }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .slice(0, limit)
    .map((item) => item.entry);
}

const text = (element: Element) => (element.getAttribute('aria-label') || element.textContent || '').replace(/\s+/g, ' ').trim();

// Everything there is to find, read from the page as it is now (language,
// patterns and visuals included)
function collect(): Entry[] {
  const entries: Entry[] = [];
  for (const id of ['play', 'stop', 'record', 'undo', 'redo', 'tap']) {
    const button = document.getElementById(id) as HTMLButtonElement | null;
    if (button) entries.push({ label: text(button).replace(/^[▶■]\s*/, ''), kind: t('finderAction'), run: () => button.click() });
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>('#menu .menu-item')) {
    // not the finder itself, nor what is hidden now (Delete with nothing saved)
    if (button.id === 'finder-open' || button.closest('[hidden]:not(#menu)')) continue;
    const group = button.closest('.menu-group, .menu-footer')?.querySelector('.menu-group-title')?.textContent?.trim() ?? '';
    entries.push({ label: text(button), kind: group, run: () => button.click() });
  }
  const options = (id: string, kind: string) => {
    const select = document.getElementById(id) as HTMLSelectElement | null;
    for (const option of select?.options ?? []) {
      if (option.disabled || !option.value) continue;
      entries.push({
        label: option.textContent?.trim() ?? option.value,
        kind,
        run: () => {
          select!.value = option.value;
          select!.dispatchEvent(new Event('change', { bubbles: true }));
        },
      });
    }
  };
  options('preset', t('finderPattern'));
  options('visual', t('finderVisual'));
  return entries;
}

export function setupFinder() {
  const dialog = document.createElement('dialog');
  dialog.className = 'ask-dialog finder';
  dialog.setAttribute('aria-label', t('finderTitle'));
  dialog.innerHTML = `<input class="control finder-input" type="text" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-controls="finder-list" />
    <ul id="finder-list" class="finder-list" role="listbox"></ul>`;
  document.body.append(dialog);
  const input = dialog.querySelector<HTMLInputElement>('.finder-input')!;
  const list = dialog.querySelector<HTMLUListElement>('.finder-list')!;
  let entries: Entry[] = [];
  let shown: Entry[] = [];
  let active = 0;

  const render = () => {
    shown = rank(entries, input.value);
    active = Math.min(active, Math.max(0, shown.length - 1));
    list.replaceChildren(
      ...shown.map((entry, index) => {
        const item = document.createElement('li');
        item.id = `finder-${index}`;
        item.className = 'finder-item';
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', String(index === active));
        const label = document.createElement('span');
        label.textContent = entry.label;
        const kind = document.createElement('span');
        kind.className = 'finder-kind';
        kind.textContent = entry.kind;
        item.append(label, kind);
        item.addEventListener('pointerdown', (event) => {
          event.preventDefault();
          choose(index);
        });
        return item;
      }),
    );
    if (!shown.length) {
      const empty = document.createElement('li');
      empty.className = 'finder-empty';
      empty.textContent = t('finderNothing');
      list.append(empty);
    }
    input.setAttribute('aria-activedescendant', shown.length ? `finder-${active}` : '');
  };

  const choose = (index: number) => {
    const entry = shown[index];
    if (!entry) return;
    dialog.close();
    entry.run();
  };

  const open = () => {
    if (dialog.open) return;
    // the More menu, if open, gives way
    const menu = document.getElementById('menu');
    if (menu && !menu.hidden) document.getElementById('menu-toggle')?.click();
    entries = collect();
    input.placeholder = t('finderPlaceholder');
    input.value = '';
    active = 0;
    render();
    dialog.showModal();
    input.focus();
  };

  input.addEventListener('input', () => {
    active = 0;
    render();
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      active = shown.length ? (active + step + shown.length) % shown.length : 0;
      render();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(active);
    }
  });
  // a click on the dimmed backdrop closes it
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  // Ctrl+K (⌘K) from anywhere, the editor included
  window.addEventListener(
    'keydown',
    (event) => {
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        event.stopPropagation();
        open();
      }
    },
    true,
  );
  document.getElementById('finder-open')?.addEventListener('click', open);
}
