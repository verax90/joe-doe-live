// Runs a DOM update as a View Transition when the browser supports it (and the
// person has not asked for reduced motion); otherwise just runs it.
type ViewTransition = { ready: Promise<void>; finished: Promise<void> };
type WithTransitions = Document & { startViewTransition?: (update: () => void) => ViewTransition };

export function withTransition(update: () => void) {
  const doc = document as WithTransitions;
  // A hidden tab aborts the transition anyway (the update still runs)
  if (!doc.startViewTransition || document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    update();
    return;
  }
  const transition = doc.startViewTransition(update);
  // An aborted animation is not an error: the update has been applied
  transition.ready.catch(() => {});
  transition.finished.catch(() => {});
}
