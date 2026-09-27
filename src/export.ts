// Export and open: copy the code, download it as a .js file (Strudel code is
// JavaScript; there is no Strudel file format, strudel.cc takes it pasted) and
// open such a file again, from the menu or dropped on the page
import { t } from './i18n';
import { toast } from './toast';

const HEADER = '// live.joedoe.dev · ';

// First line of a download: where it comes from and how to open it. A file
// opened and downloaded again gets a fresh one, not a second
export function withHeader(code: string, header: string) {
  const body = code.startsWith(HEADER) ? code.slice(code.indexOf('\n') + 1) : code;
  return `${HEADER}${header}\n${body}`;
}

// The date on your clock (toISOString would give yesterday after midnight in Spain)
const localDay = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

// A session for the joedoe.dev gallery (src/content/sessions there): the
// title, today's date, the visual, and the code in a fenced block. A longer
// fence when the code itself holds one, so the file always parses
export function sessionMarkdown(code: string, options: { title: string; visual: string; date: Date }) {
  const day = localDay(options.date);
  const fence = code.includes('```') ? '````' : '```';
  return [
    '---',
    `title: ${JSON.stringify(options.title)}`,
    `date: ${day}`,
    `visual: ${JSON.stringify(options.visual)}`,
    '# video: "https://youtu.be/…"   (optional: the recording or the stream)',
    '# note: "…"                     (optional)',
    '---',
    '',
    `${fence}js`,
    code.replace(/\s+$/, ''),
    fence,
    '',
  ].join('\n');
}

// "Beats at dawn!" -> "beats-at-dawn"
export const slugify = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'session';

export const isCodeFile = (file: File) => /\.(js|mjs|txt|strudel)$/i.test(file.name);

const stamp = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
};

export const exportFileName = (date = new Date()) => `joe-doe-live-${stamp(date)}.js`;

type Editor = { code: string; setCode(code: string): void };

export function setupExport(editor: Editor, getVisual: () => string) {
  const getCode = () => editor.code;
  document.querySelector('#copy-code')!.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(getCode());
      toast(t('codeCopied'));
    } catch {
      toast(t('copyFailed'));
    }
  });

  document.querySelector('#download-code')!.addEventListener('click', () => {
    const now = new Date();
    const name = exportFileName(now);
    const text = withHeader(getCode(), t('codeHeader', { date: stamp(now) }));
    const url = URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: name });
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(t('codeDownloaded', { name }));
  });

  document.querySelector('#save-session')!.addEventListener('click', () => {
    const title = prompt(t('sessionPrompt'), '')?.trim();
    if (!title) return;
    const now = new Date();
    const name = `${localDay(now)}-${slugify(title)}.md`;
    const text = sessionMarkdown(getCode(), { title, visual: getVisual(), date: now });
    const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }));
    Object.assign(document.createElement('a'), { href: url, download: name }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(t('sessionSaved', { name }));
  });

  // Open: replaces the code in one undoable step (↶ brings yours back)
  const open = async (file: File) => {
    try {
      editor.setCode(await file.text());
      toast(t('codeOpened', { name: file.name }));
    } catch {
      toast(t('codeOpenFailed', { name: file.name }));
    }
  };
  const input = document.querySelector<HTMLInputElement>('#open-code-input')!;
  document.querySelector('#open-code')!.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    input.value = '';
    if (file) void open(file);
  });
  // A .js dropped on the page opens; audio files stay with the samples panel
  window.addEventListener('drop', (event) => {
    const files = [...(event.dataTransfer?.files ?? [])];
    if (files.length !== 1 || !isCodeFile(files[0])) return;
    event.preventDefault();
    void open(files[0]);
  });
}
