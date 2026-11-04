// The full TidalCycles sample library (Dirt-Samples), as strudel.cc loads it,
// so code found online finds its sounds (bass, jvbass, arpy…). Strudel's
// editor only brings 9 of its banks. Names the studio already has (bd, sd,
// hh…) are left as they are, so existing patterns keep their sound. Only the
// list of names is fetched; each sound downloads the first time it plays.

const DIRT = 'https://raw.githubusercontent.com/tidalcycles/dirt-samples/master/strudel.json';

type SampleMap = Record<string, string[] | string>;
type Global = typeof globalThis & {
  samples?: (map: SampleMap, baseUrl?: string) => Promise<unknown>;
  soundMap?: { get(): Record<string, unknown> };
};

// The banks of the library that are not loaded yet, with where they live
export function missingBanks(library: SampleMap, loaded: Set<string>): SampleMap {
  const out: SampleMap = {};
  for (const [name, files] of Object.entries(library)) {
    if (name === '_base' || !loaded.has(name)) out[name] = files;
  }
  return out;
}

export async function loadDirtSamples() {
  const g = globalThis as Global;
  try {
    const library = (await (await fetch(DIRT)).json()) as SampleMap;
    // what Strudel loads after this wins anyway: its banks come first either way
    const loaded = new Set(Object.keys(g.soundMap?.get() ?? {}));
    await g.samples?.(missingBanks(library, loaded));
  } catch {
    // offline or GitHub down: the studio's own sounds still play
  }
}
