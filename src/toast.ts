// A short message at the bottom of the screen, for actions picked from the
// menu (which closes at once, so a label change there would go unseen)
let timer: number | undefined;

export function toast(text: string) {
  let element = document.getElementById('toast');
  if (!element) {
    element = document.createElement('p');
    element.id = 'toast';
    element.className = 'toast';
    element.setAttribute('role', 'status');
    document.body.append(element);
  }
  element.textContent = text;
  element.hidden = false;
  clearTimeout(timer);
  timer = window.setTimeout(() => (element.hidden = true), 2500);
}
