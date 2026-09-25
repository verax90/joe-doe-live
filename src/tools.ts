// Panel "Herramientas": otras herramientas de live coding y sonido que funcionan
// en el navegador. La lista vive en joedoe.dev/art (un .md por enlace) y aquí
// solo se lee; si no se puede leer, se usa la copia que va con el estudio.
import fallback from './tools-fallback.json';
import { pick, t, type StringKey } from './i18n';

type Tool = {
  title: string;
  url: string;
  category: 'livecoding' | 'sound';
  note: { es: string; en: string };
  embed: boolean;
};

const SOURCE = 'https://joedoe.dev/art/runs.json';

const groups: { category: Tool['category']; label: StringKey }[] = [
  { category: 'livecoding', label: 'groupLivecoding' },
  { category: 'sound', label: 'groupSound' },
];

async function loadTools(): Promise<Tool[]> {
  try {
    const response = await fetch(SOURCE, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(String(response.status));
    return (await response.json()) as Tool[];
  } catch {
    return fallback as Tool[];
  }
}

export function setupToolsPanel(onEmbedOpen: () => void) {
  const list = document.querySelector<HTMLElement>('#tool-list')!;
  const embed = document.querySelector<HTMLElement>('#embed')!;
  const frame = document.querySelector<HTMLIFrameElement>('#embed-frame')!;
  const title = document.querySelector<HTMLElement>('#embed-title')!;
  const external = document.querySelector<HTMLAnchorElement>('#embed-open')!;
  const close = document.querySelector<HTMLButtonElement>('#embed-close')!;

  const openEmbed = (tool: Tool) => {
    onEmbedOpen();
    // Cierra el panel para dejar la herramienta a la vista
    document.querySelector<HTMLElement>('#tools')!.hidden = true;
    document.querySelector('#toggle-tools')!.setAttribute('aria-pressed', 'false');
    title.textContent = tool.title;
    external.href = tool.url;
    frame.src = tool.url;
    embed.hidden = false;
    close.focus();
  };

  const closeEmbed = () => {
    // Vaciar el iframe corta también su sonido
    frame.src = 'about:blank';
    embed.hidden = true;
  };

  close.addEventListener('click', closeEmbed);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !embed.hidden) closeEmbed();
  });

  loadTools().then((tools) => {
    list.replaceChildren();
    for (const group of groups) {
      const items = tools.filter((tool) => tool.category === group.category);
      if (!items.length) continue;
      const heading = document.createElement('h3');
      heading.textContent = t(group.label);
      const ul = document.createElement('ul');
      ul.className = 'panel-list tool-list';
      for (const tool of items) {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.className = 'tool-name';
        link.href = tool.url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = `${tool.title} ↗`;
        const note = document.createElement('p');
        note.className = 'tool-note';
        note.textContent = pick(tool.note);
        li.append(link, note);
        if (tool.embed) {
          const tryHere = document.createElement('button');
          tryHere.type = 'button';
          tryHere.className = 'control tool-try';
          tryHere.textContent = t('tryHere');
          tryHere.addEventListener('click', () => openEmbed(tool));
          li.append(tryHere);
        }
        ul.append(li);
      }
      list.append(heading, ul);
    }
  });
}
