// The pattern list: the built-in patterns and the ones you saved in this
// browser, with Save and Delete in the More menu
import { onLangChange, t } from './i18n';
import { builtInPresets, type Preset } from './presets';
import { readStorage, writeStorage } from './storage';
import type { StrudelMirror } from './strudel';
import { withTransition } from './transition';

const SAVED_KEY = 'jdl:saved';

// onLoad: a pattern is about to replace the code (the scenes start over)
export function setupLibrary(editor: StrudelMirror, onLoad: () => void) {
  const select = document.querySelector<HTMLSelectElement>('#preset')!;
  const saveButton = document.querySelector<HTMLButtonElement>('#save')!;
  const deleteButton = document.querySelector<HTMLButtonElement>('#delete')!;
  let saved = readStorage<Preset[]>(SAVED_KEY, []);

  const all = () => [...builtInPresets(), ...saved];
  const isSaved = (id: string) => saved.some((preset) => preset.id === id);

  function render(selectedId?: string) {
    select.replaceChildren(new Option(t('patternsPlaceholder'), ''));
    const addGroup = (label: string, presets: Preset[]) => {
      if (!presets.length) return;
      const group = document.createElement('optgroup');
      group.label = label;
      group.append(...presets.map((preset) => new Option(preset.name, preset.id)));
      select.append(group);
    };
    addGroup(t('groupIncluded'), builtInPresets());
    addGroup(t('groupSaved'), saved);
    select.value = selectedId ?? '';
    deleteButton.hidden = !isSaved(select.value);
  }

  const load = (preset: Preset) => {
    onLoad();
    withTransition(() => editor.setCode(preset.code));
  };

  select.addEventListener('change', () => {
    const preset = all().find((p) => p.id === select.value);
    deleteButton.hidden = !isSaved(select.value);
    if (preset) load(preset);
  });

  saveButton.addEventListener('click', () => {
    const current = saved.find((p) => p.id === select.value);
    const name = prompt(t('savePrompt'), current?.name ?? '');
    if (!name) return;
    const existing = saved.find((p) => p.name === name);
    if (existing) existing.code = editor.code;
    else saved.push({ id: `saved-${Date.now()}`, name, code: editor.code });
    writeStorage(SAVED_KEY, saved);
    render((existing ?? saved.at(-1))!.id);
  });

  deleteButton.addEventListener('click', () => {
    const preset = saved.find((p) => p.id === select.value);
    if (!preset || !confirm(t('deleteConfirm', { name: preset.name }))) return;
    saved = saved.filter((p) => p !== preset);
    writeStorage(SAVED_KEY, saved);
    render();
  });

  onLangChange(() => render(select.value || undefined));

  return {
    render,
    // A MIDI program change: program 0 is the first pattern in the list
    playProgram(program: number) {
      const list = all();
      const preset = list[program % list.length];
      select.value = preset.id;
      load(preset);
      void editor.evaluate();
    },
  };
}
