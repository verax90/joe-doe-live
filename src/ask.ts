// The studio's own small questions (a name to save under, "delete this?"),
// in place of the browser's prompt() and confirm(), which look like the
// browser, not the studio. Enter answers, Escape cancels.
import { t } from './i18n';

let dialog: HTMLDialogElement | undefined;

function build() {
  const element = document.createElement('dialog');
  element.className = 'ask-dialog';
  element.innerHTML = `<form method="dialog">
    <p class="ask-message"></p>
    <input class="control ask-input" type="text" autocomplete="off" spellcheck="false" />
    <div class="ask-buttons">
      <button class="control" type="button" value="cancel"></button>
      <button class="control control-accent" type="submit" value="ok"></button>
    </div>
  </form>`;
  // a click on the dimmed backdrop cancels
  element.addEventListener('click', (event) => {
    if (event.target === element) element.close('cancel');
  });
  element.querySelector('button[value="cancel"]')!.addEventListener('click', () => element.close('cancel'));
  document.body.append(element);
  return element;
}

function ask(message: string, input: string | null, okLabel: string) {
  dialog ??= build();
  const box = dialog;
  const field = box.querySelector<HTMLInputElement>('.ask-input')!;
  box.querySelector('.ask-message')!.textContent = message;
  field.hidden = input === null;
  field.value = input ?? '';
  box.querySelector('button[value="cancel"]')!.textContent = t('cancel');
  box.querySelector('button[value="ok"]')!.textContent = okLabel;
  box.returnValue = '';
  box.showModal();
  if (input !== null) field.select();
  else box.querySelector<HTMLButtonElement>('button[value="ok"]')!.focus();
  return new Promise<{ ok: boolean; value: string }>((resolve) => {
    box.addEventListener('close', () => resolve({ ok: box.returnValue === 'ok', value: field.value.trim() }), { once: true });
  });
}

// A text answer, or null when cancelled or left empty
export async function askText(message: string, initial = '') {
  const { ok, value } = await ask(message, initial, t('ok'));
  return ok && value ? value : null;
}

// Yes or no; okLabel names the action (Delete)
export async function askConfirm(message: string, okLabel = t('ok')) {
  return (await ask(message, null, okLabel)).ok;
}
