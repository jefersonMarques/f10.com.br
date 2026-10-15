// Cópia controlada de MP4 externo para o armazenamento nativo do F10.
// A origem é validada também a cada redirecionamento (evita SSRF).
const MAX_BYTES = 90 * 1024 * 1024;
const MAX_REDIRECTS = 3;

function approvedUrl(raw: string): URL {
  const url = new URL(raw);
  const host = url.hostname.toLowerCase();
  const allowed = host === "f10.com.br" || host === "www.f10.com.br"
    || host === "s3.amazonaws.com"
    || /(^|\.)s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/i.test(host)
    || /(^|\.)movidesk\.com$/i.test(host)
    || /^objectstorage\.[a-z0-9-]+\.oraclecloud\.com$/i.test(host);
  if (url.protocol !== "https:" || !allowed || !/\.mp4$/i.test(url.pathname)) {
    throw new Error("MOVIDESK_VIDEO_SOURCE_NOT_ALLOWED");
  }
  return url;
}

export async function downloadMovideskMp4(source: string): Promise<Uint8Array> {
  let url = approvedUrl(source);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(90_000),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) throw new Error("MOVIDESK_VIDEO_REDIRECT_INVALID");
      url = approvedUrl(new URL(location, url).href);
      continue;
    }
    if (!response.ok || !response.body) {
      await response.body?.cancel();
      throw new Error("MOVIDESK_VIDEO_DOWNLOAD_FAILED");
    }
    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared > MAX_BYTES) {
      await response.body.cancel();
      throw new Error("MOVIDESK_VIDEO_TOO_LARGE");
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;
        length += value.byteLength;
        if (length > MAX_BYTES) {
          throw new Error("MOVIDESK_VIDEO_TOO_LARGE");
        }
        chunks.push(value);
      }
    } finally {
      await reader.cancel().catch(() => undefined);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    if (bytes.length < 12 || new TextDecoder().decode(bytes.subarray(4, 8)) !== "ftyp") {
      throw new Error("MOVIDESK_VIDEO_NOT_MP4");
    }
    return bytes;
  }
  throw new Error("MOVIDESK_VIDEO_REDIRECT_LIMIT");
}
