export class PayloadTooLargeError extends Error {
  constructor() {
    super("PAYLOAD_TOO_LARGE");
  }
}

export class InvalidJsonError extends Error {
  constructor() {
    super("INVALID_JSON");
  }
}

export async function readLimitedJson(
  request: Request,
  maxBytes: number,
): Promise<Record<string, unknown>> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");

  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new PayloadTooLargeError();
  }

  if (!request.body) throw new InvalidJsonError();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new PayloadTooLargeError();
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const payload = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    payload.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const parsed = JSON.parse(new TextDecoder().decode(payload));

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new InvalidJsonError();
    }

    return parsed as Record<string, unknown>;
  } catch (cause) {
    if (cause instanceof InvalidJsonError) throw cause;
    throw new InvalidJsonError();
  }
}
