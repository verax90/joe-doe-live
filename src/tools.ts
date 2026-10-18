// Tools panel: other live coding and sound tools that run in the browser, and
// under them the reading (languages to install, communities, tutorials). The
// list is src/tools.json, one entry per link with its note in es and en; it
// used to be read from joedoe.dev/art, which no longer exists.
import tools from './tools.json';
import { onLangChange, pick, t, type StringKey } from './i18n';

type Tool = {
  title: string;
  url: string;
  category: 'livecoding' | 'sound';
  note: { es: string; en: string; ca: string };
  /** Opens and plays in the browser; false = for reading */
  runs: boolean;
  /** Works inside the studio's iframe (needs runs) */
  embed: boolean;
};

const groups: { category: Tool['category']; label: StringKey }[] = [
  { category: 'livecoding', label: 'groupLivecoding' },
  { category: 'sound', label: 'groupSound' },
];

export function setupToolsPanel(onEmbedOpen: () => void) {
  const list = document.querySelector<HTMLElement>('#tool-list')!;
  const embed = document.querySelector<HTMLElement>('#embed')!;
  const frame = document.querySelector<HTMLIFrameElement>('#embed-frame')!;
  const title = document.querySelector<HTMLElement>('#embed-title')!;
  const external = document.querySelector<HTMLAnchorElement>('#embed-open')!;
  const close = document.querySelector<HTMLButtonElement>('#embed-close')!;

  const openEmbed = (tool: Tool) => {
    onEmbedOpen();
    // Close the panel so the tool is in view
    document.querySelector<HTMLElement>('#tools')!.hidden = true;
    document.querySelector('#toggle-tools')!.setAttribute('aria-pressed', 'false');
    title.textContent = tool.title;
    external.href = tool.url;
    frame.src = tool.url;
    embed.hidden = false;
    close.focus();
  };

  const closeEmbed = () => {
    // Emptying the iframe cuts its sound too
    frame.src = 'about:blank';
    embed.hidden = true;
  };

  close.addEventListener('click', closeEmbed);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !embed.hidden) closeEmbed();
  });

  const render = (tools: Tool[]) => {
    list.replaceChildren();
    for (const group of groups) {
      const all = tools.filter((tool) => tool.category === group.category);
      if (!all.length) continue;
      const heading = document.createElement('h3');
      heading.textContent = t(group.label);
      const ul = toolList(all.filter((tool) => tool.runs));
      const reading = all.filter((tool) => !tool.runs);
      list.append(heading, ul);
      if (reading.length) {
        const more = document.createElement('details');
        more.className = 'tool-more';
        const summary = document.createElement('summary');
        summary.textContent = `${t('toolsMore')} (${reading.length})`;
        more.append(summary, toolList(reading));
        list.append(more);
      }
    }
  };
  function toolList(items: Tool[]) {
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
    return ul;
  }
  render(tools as Tool[]);
  onLangChange(() => render(tools as Tool[]));
}
