// Comparte el patrón en la propia URL: #v=<visual>&c=<código en base64url>

function toBase64Url(text: string) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(encoded: string) {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function buildShareUrl(code: string, visualId: string) {
  const params = new URLSearchParams({ v: visualId, c: toBase64Url(code) });
  return `${location.origin}${location.pathname}#${params}`;
}

export function readSharedPattern(): { code?: string; visualId?: string } {
  const params = new URLSearchParams(location.hash.slice(1));
  const encoded = params.get('c');
  let code: string | undefined;
  if (encoded) {
    try {
      code = fromBase64Url(encoded);
    } catch {
      code = undefined; // enlace roto: se ignora
    }
  }
  return { code, visualId: params.get('v') ?? undefined };
}
