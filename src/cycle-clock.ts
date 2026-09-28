// When each bar sounds, on the audio clock, read from Strudel itself: a
// silent event on every beat rides along with whatever plays, and Strudel
// hands it the exact time it schedules that beat for. Anything that must
// land on the bar you hear (the sampler, the riff recorder) asks here instead
// of guessing Strudel's look-ahead.
type Hap = { whole?: { begin: { valueOf(): number } } };
type PatternLike = {
  onTrigger(fn: (hap: Hap, now: number, cps: number, target: number) => void, dominant?: boolean): unknown;
  fast(factor: number): PatternLike;
};
type Globals = { pure: (value: unknown) => PatternLike; stack: (...patterns: unknown[]) => unknown };
type Scheduler = { started?: boolean; setPattern(pattern: unknown, autostart?: boolean): Promise<void> };

let last: { cycle: number; time: number; cps: number } | undefined;

export function setupCycleClock(scheduler: Scheduler | undefined) {
  if (!scheduler) return;
  const g = globalThis as unknown as Globals;
  // four a bar, so a tempo change is picked up within a beat
  const probe = () =>
    g.pure(1).fast(4).onTrigger((hap, _now, cps, target) => {
      last = { cycle: Number(hap.whole?.begin.valueOf()), time: target, cps };
    }, true);
  const setPattern = scheduler.setPattern.bind(scheduler);
  scheduler.setPattern = (pattern, autostart) => {
    if (!scheduler.started) last = undefined; // Play starts again from cycle 0
    return setPattern(pattern ? g.stack(pattern, probe()) : pattern, autostart);
  };
}

// The cycle sounding at an audio clock time, or undefined before Strudel has
// scheduled a bar
export const heardCycle = (audioTime: number) => (last ? last.cycle + (audioTime - last.time) * last.cps : undefined);

// When a cycle sounds, on the audio clock
export const audioTimeOfCycle = (cycle: number) => (last ? last.time + (cycle - last.cycle) / last.cps : undefined);

// Waits (a little) for the first bar to be scheduled
export async function whenCycleKnown(timeoutMs = 1500) {
  const start = performance.now();
  while (!last && performance.now() - start < timeoutMs) await new Promise((resolve) => setTimeout(resolve, 20));
  return Boolean(last);
}
