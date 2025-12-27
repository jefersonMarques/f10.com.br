import type { RequestHandler } from "@sveltejs/kit";

import path from "node:path";
import { existsSync, createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";

const FILE_NAME = "InstaladorF10.exe";

function resolveFilePath(): string {
  // pt-BR: tentamos primeiro em /static (fonte), depois em /build/client (gerado no build)
  const candidates = [
    path.join(process.cwd(), "static", FILE_NAME),
    path.join(process.cwd(), "build", "client", FILE_NAME),
  ];

  for (const p of candidates) {
    if (existsSync(p)) return p;
  }

  // pt-BR: fallback só pra retornar um path “inteligível” no erro
  return candidates[0];
}

export const GET: RequestHandler = async () => {
  const filePath = resolveFilePath();

  if (!existsSync(filePath)) {
    return new Response(
      JSON.stringify({ success: false, message: "Arquivo não encontrado.", filePath }),
      {
        status: 404,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store, max-age=0"
        }
      }
    );
  }

  const fileInfo = await stat(filePath);

  // pt-BR: Node stream -> Web stream (necessário pro Response)
  const nodeStream = createReadStream(filePath);
  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;

  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${FILE_NAME}"`,
      "Content-Length": String(fileInfo.size),
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff"
    }
  });
};
