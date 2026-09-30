// Save and share (More → Save and share…, or Ctrl+S to save at once): on top,
// the name and Save, in place; under it, one list of what else the code can
// do (copy the link, copy or download it, a session page, open a .js). The
// buttons keep their ids, so library.ts, export.ts and main.ts drive them as
// before; any of them closes the dialog (their own questions open on top).
import { t } from './i18n';

// The name offered when saving: a saved pattern keeps its own; a built-in one
// gets "(mine)", so the copy is told apart from the original in the list
export function suggestedName(selected: string, isSaved: boolean) {
  if (!selected) return '';
  return isSaved ? selected : t('projectMine', { name: selected });
}

export function setupProject() {
  const dialog = document.querySelector<HTMLDialogElement>('#project')!;
  const select = document.querySelector<HTMLSelectElement>('#preset')!;
  const name = document.querySelector<HTMLInputElement>('#save-name')!;
  const remove = document.querySelector<HTMLButtonElement>('#delete')!;

  const open = () => {
    const option = select.value ? select.selectedOptions[0] : undefined;
    const current = option?.textContent?.trim() ?? '';
    const saved = option?.parentElement?.getAttribute('label') === t('groupSaved');
    name.value = suggestedName(current, saved);
    remove.textContent = t('projectDeleteNamed', { name: current });
    if (!dialog.open) dialog.showModal();
    name.focus();
    name.select();
  };

  document.querySelector('#project-open')!.addEventListener('click', open);
  document.querySelector('#project-close')!.addEventListener('click', () => dialog.close());
  // a click on the dimmed backdrop closes it
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  // Enter in the name saves (the form's submit is Save's click)
  document.querySelector<HTMLFormElement>('#project-save')!.addEventListener('submit', (event) => event.preventDefault());
  for (const button of dialog.querySelectorAll<HTMLButtonElement>('.project-action, #save, #delete')) {
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
