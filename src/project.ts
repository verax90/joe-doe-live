// Save and share (More → Save and share…, or Ctrl+S to save at once): the
// pattern saved in this browser, the link to share, the exports and opening
// a .js, together in one dialog instead of spread over the menu. The buttons
// keep their ids, so library.ts, export.ts and main.ts drive them as before;
// any of them closes the dialog (their own questions open on top of it).
import { t } from './i18n';

export function setupProject() {
  const dialog = document.querySelector<HTMLDialogElement>('#project')!;
  const now = document.querySelector<HTMLElement>('#project-now')!;
  const select = document.querySelector<HTMLSelectElement>('#preset')!;

  const open = () => {
    const name = select.value ? select.selectedOptions[0]?.textContent?.trim() : '';
    now.textContent = t('projectNow', { name: name || t('projectUnsaved') });
    if (!dialog.open) dialog.showModal();
  };

  document.querySelector('#project-open')!.addEventListener('click', open);
  document.querySelector('#project-close')!.addEventListener('click', () => dialog.close());
  // a click on the dimmed backdrop closes it
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  for (const button of dialog.querySelectorAll<HTMLButtonElement>('.project-card button')) {
    button.addEventListener('click', () => dialog.close());
  }

  // Ctrl+S (⌘S) saves, from anywhere, the editor included, instead of the
  // browser saving the page
  window.addEventListener(
    'keydown',
    (event) => {
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        event.stopPropagation();
        document.querySelector<HTMLButtonElement>('#save')!.click();
      }
    },
    true,
  );
  return { open };
}
