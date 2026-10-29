// Finding footage for the clips: public-domain and free archives searched
// from the browser.
// - Internet Archive (with the Prelinger collection of old ephemeral films
//   and the VHS Vault): search and file lists allow pages to read them, the
//   video files do not, so they come through a small proxy (/ia/…: Vite's in
//   development, a Cloudflare Worker online, see worker/ia-proxy.js).
// - NASA's image and video library: search and file lists directly, the
//   videos through the same proxy (its CDN does not always allow it).
// - Wikimedia Commons allows it directly.
// A picked result is downloaded whole into the browser: cutting between
// moments of a video is only quick when the whole file is at hand.

export type SourceId = 'prelinger' | 'vhs' | 'archive' | 'nasa' | 'commons';

export type Found = {
  source: SourceId;
  id: string;
  title: string;
  year?: string;
  thumb: string;
  page: string; // where it lives, for the credit and its licence
};

export type Resolved = { url: string; size?: number; preview: string };

// Videos larger than this are not downloaded (the browser keeps them all)
export const MAX_BYTES = 150 * 1024 * 1024;

export const IA_PROXY = (import.meta.env.VITE_IA_PROXY as string | undefined) ?? '/ia';

const IA_COLLECTION: Partial<Record<SourceId, string>> = { prelinger: 'prelinger', vhs: 'vhsvault' };

// Quick ideas for each source, to find odd things without knowing what to type
export const SUGGESTIONS: Record<SourceId, string[]> = {
  prelinger: ['atomic', 'hygiene', 'dance', 'industrial', 'television', 'future', 'robot', 'psychedelic', 'car', 'kitchen'],
  vhs: ['aerobics', 'commercials', 'karaoke', 'public access', 'tutorial', 'wrestling', 'cartoon', 'infomercial'],
  archive: ['test pattern', 'computer animation', 'demoscene', 'stock footage', 'microscope', 'hypnosis', 'oscilloscope', 'fractal'],
  nasa: ['rocket launch', 'apollo', 'sun', 'aurora', 'mars', 'astronaut', 'earth from space', 'wind tunnel'],
  commons: ['glitch', 'kaleidoscope', 'timelapse', 'fire', 'ink', 'jellyfish', 'slow motion', 'microscopy'],
};

// ── Internet Archive ────────────────────────────────────────────────────────

export function archiveQuery(text: string, source: SourceId) {
  const collection = IA_COLLECTION[source];
  const words = text.trim().replace(/[()":]/g, ' ').trim();
  return [words && `(${words})`, collection && `collection:${collection}`, 'mediatype:movies'].filter(Boolean).join(' AND ');
}

type ArchiveDoc = { identifier: string; title?: string | string[]; year?: string | number };

export function parseArchiveSearch(data: { response?: { docs?: ArchiveDoc[] } }, source: SourceId): Found[] {
  return (data.response?.docs ?? []).map((doc) => ({
    source,
    id: doc.identifier,
    title: (Array.isArray(doc.title) ? doc.title[0] : doc.title) ?? doc.identifier,
    year: doc.year ? String(doc.year) : undefined,
    thumb: `https://archive.org/services/img/${encodeURIComponent(doc.identifier)}`,
    page: `https://archive.org/details/${encodeURIComponent(doc.identifier)}`,
  }));
}

type ArchiveFile = { name: string; format?: string; size?: string; source?: string };
type ArchiveMetadata = { server?: string; dir?: string; files?: ArchiveFile[] };

// The lightest video an item has that every browser plays: an MP4 (the
// archive's own 512Kb or h.264 copies), else WebM or Ogg
export function pickArchiveFile(meta: ArchiveMetadata): Resolved | null {
  if (!meta.server || !meta.dir || !meta.files) return null;
  const rank = (file: ArchiveFile) => (/\.mp4$/i.test(file.name) ? 0 : /\.webm$/i.test(file.name) ? 1 : /\.ogv$/i.test(file.name) ? 2 : -1);
  const videos = meta.files
    .filter((file) => rank(file) >= 0 && Number(file.size) > 0)
    .sort((a, b) => rank(a) - rank(b) || Number(a.size) - Number(b.size));
  const file = videos[0];
  if (!file) return null;
  const path = `${meta.dir}/${file.name.split('/').map(encodeURIComponent).join('/')}`;
  return {
    url: `${IA_PROXY}/${meta.server}${path}`,
    size: Number(file.size),
    preview: `https://${meta.server}${path}`,
  };
}

// "https://archive.org/details/DuckandC1951" -> "DuckandC1951"
export function archiveIdFromUrl(text: string) {
  const match = text.trim().match(/archive\.org\/(?:details|download|embed)\/([^/?#\s]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// ── NASA ────────────────────────────────────────────────────────────────────

type NasaItem = { href: string; data?: { nasa_id: string; title?: string; date_created?: string }[]; links?: { href: string }[] };

export function parseNasaSearch(data: { collection?: { items?: NasaItem[] } }): Found[] {
  return (data.collection?.items ?? [])
    .filter((item) => item.data?.[0])
    .map((item) => {
      const info = item.data![0];
      return {
        source: 'nasa' as const,
        id: info.nasa_id,
        title: info.title ?? info.nasa_id,
        year: info.date_created?.slice(0, 4),
        thumb: (item.links?.[0]?.href ?? '').replace(/^http:/, 'https:'),
        page: `https://images.nasa.gov/details/${encodeURIComponent(info.nasa_id)}`,
      };
    });
}

// NASA's files list: the phone-sized copy first, it is plenty for clips.
// Its CDN sometimes keeps a copy without the header that lets pages read it,
// so the download goes through the proxy too
export function pickNasaFile(files: string[]): Resolved | null {
  const order = ['~mobile.mp4', '~small.mp4', '~preview.mp4', '~medium.mp4', '~large.mp4', '~orig.mp4'];
  for (const ending of order) {
    const file = files.find((url) => url.endsWith(ending));
    if (file) {
      const preview = encodeURI(decodeURI(file.replace(/^http:/, 'https:')));
      const { host, pathname } = new URL(preview);
      return { url: `${IA_PROXY}/${host}${pathname}`, preview };
    }
  }
  return null;
}

// ── Wikimedia Commons ───────────────────────────────────────────────────────

type CommonsDerivative = { src: string; type: string; height: number; bandwidth?: number };
type CommonsPage = {
  title: string;
  videoinfo?: { url: string; size?: number; duration?: number; descriptionurl: string; mediatype?: string; derivatives?: CommonsDerivative[] }[];
  imageinfo?: { thumburl?: string }[];
};

export function parseCommonsSearch(data: { query?: { pages?: Record<string, CommonsPage & { index?: number }> } }): Found[] {
  return Object.values(data.query?.pages ?? {})
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .filter((page) => page.videoinfo?.[0]?.mediatype === 'VIDEO')
    .map((page) => ({
      source: 'commons' as const,
      id: page.title,
      title: page.title.replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, '').replace(/_/g, ' '),
      thumb: page.imageinfo?.[0]?.thumburl ?? '',
      page: page.videoinfo![0].descriptionurl,
    }));
}

// The smallest copy at least 240 lines tall that this browser plays, with its
// size worked out from its bit rate when the original is too big
export function pickCommonsFile(page: CommonsPage, canPlay: (type: string) => boolean = () => true): Resolved | null {
  const info = page.videoinfo?.[0];
  if (!info) return null;
  const copies = (info.derivatives ?? [])
    .filter((copy) => copy.height >= 240 && !/quicktime/.test(copy.type) && canPlay(copy.type))
    .sort((a, b) => a.height - b.height);
  const copy = copies[0];
  if (copy) {
    const size = copy.bandwidth && info.duration ? Math.round((copy.bandwidth * info.duration) / 8) : undefined;
    return { url: copy.src, size, preview: copy.src };
  }
  return { url: info.url, size: info.size, preview: info.url };
}

// ── Searching and fetching ──────────────────────────────────────────────────

const getJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as T;
};

const PAGE_SIZE = 24;

export async function search(source: SourceId, text: string, page = 1): Promise<Found[]> {
  if (source === 'nasa') {
    const params = new URLSearchParams({ q: text || 'space', media_type: 'video', page: String(page), page_size: String(PAGE_SIZE) });
    return parseNasaSearch(await getJson(`https://images-api.nasa.gov/search?${params}`));
  }
  if (source === 'commons') {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      origin: '*',
      generator: 'search',
      gsrnamespace: '6',
      gsrsearch: `filetype:video ${text}`,
      gsrlimit: String(PAGE_SIZE),
      gsroffset: String((page - 1) * PAGE_SIZE),
      prop: 'videoinfo|imageinfo',
      viprop: 'url|size|mediatype',
      iiprop: 'url',
      iiurlwidth: '320',
    });
    return parseCommonsSearch(await getJson(`https://commons.wikimedia.org/w/api.php?${params}`));
  }
  const params = new URLSearchParams({ q: archiveQuery(text, source), rows: String(PAGE_SIZE), page: String(page), output: 'json' });
  for (const field of ['identifier', 'title', 'year']) params.append('fl[]', field);
  // Without words, the most watched first; with words, the best match
  if (!text.trim()) params.append('sort[]', 'downloads desc');
  return parseArchiveSearch(await getJson(`https://archive.org/advancedsearch.php?${params}`), source);
}

// Which file to download for a result
export async function resolve(found: Found): Promise<Resolved | null> {
  if (found.source === 'nasa') {
    const data = await getJson<{ collection?: { items?: { href: string }[] } }>(`https://images-api.nasa.gov/asset/${encodeURIComponent(found.id)}`);
    return pickNasaFile((data.collection?.items ?? []).map((item) => item.href));
  }
  if (found.source === 'commons') {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      origin: '*',
      titles: found.id,
      prop: 'videoinfo',
      viprop: 'url|size|derivatives|mediatype',
    });
    const data = await getJson<{ query?: { pages?: Record<string, CommonsPage> } }>(`https://commons.wikimedia.org/w/api.php?${params}`);
    const page = Object.values(data.query?.pages ?? {})[0];
    const probe = document.createElement('video');
    return page ? pickCommonsFile(page, (type) => probe.canPlayType(type) !== '') : null;
  }
  return pickArchiveFile(await getJson<ArchiveMetadata>(`https://archive.org/metadata/${encodeURIComponent(found.id)}`));
}

// A link pasted by hand: an Internet Archive item, or a video file on a site
// that lets pages read it
export async function resolveLink(text: string): Promise<{ found: Found; file: Resolved } | null> {
  const id = archiveIdFromUrl(text);
  if (id) {
    const found = parseArchiveSearch({ response: { docs: [{ identifier: id }] } }, 'archive')[0];
    const file = await resolve(found);
    return file ? { found, file } : null;
  }
  let url: URL;
  try {
    url = new URL(text.trim());
  } catch {
    return null;
  }
  if (!/\.(mp4|webm|ogv|mov|m4v)$/i.test(url.pathname)) return null;
  const title = decodeURIComponent(url.pathname.split('/').pop() ?? 'video');
  return {
    found: { source: 'archive', id: url.href, title, thumb: '', page: url.href },
    file: { url: url.href, preview: url.href },
  };
}

// Downloads a file whole, telling how far it got (0 to 1, or -1 when the
// size is unknown)
export async function download(url: string, onProgress: (done: number) => void, signal?: AbortSignal, maxBytes = MAX_BYTES): Promise<Blob> {
  // A CDN can hand back a copy saved without the header that lets pages read
  // it (NASA's does now and then): once more, past any saved copy
  const response = await fetch(url, { signal }).catch(() =>
    fetch(`${url}${url.includes('?') ? '&' : '?'}fresh=${Date.now()}`, { signal, cache: 'no-store' }),
  );
  if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
  const total = Number(response.headers.get('content-length')) || 0;
  if (total > maxBytes) throw new Error('too big');
  const reader = response.body.getReader();
  const chunks: BlobPart[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (received > maxBytes) {
      await reader.cancel();
      throw new Error('too big');
    }
    onProgress(total ? received / total : -1);
  }
  return new Blob(chunks, { type: response.headers.get('content-type') ?? 'video/mp4' });
}
