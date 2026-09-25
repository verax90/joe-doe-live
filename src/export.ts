// Export: copy the code or download it as a .js file you can open in any
// Strudel (strudel.cc) or keep with your projects
import { t } from './i18n';
import { toast } from './toast';

export function exportFileName(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
  return `joe-doe-live-${stamp}.js`;
}

export function setupExport(getCode: () => string) {
  document.querySelector('#copy-code')!.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(getCode());
      toast(t('codeCopied'));
    } catch {
      toast(t('copyFailed'));
    }
  });

  document.querySelector('#download-code')!.addEventListener('click', () => {
    const name = exportFileName();
    const url = URL.createObjectURL(new Blob([getCode()], { type: 'text/javascript' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: name });
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(t('codeDownloaded', { name }));
  });
}
