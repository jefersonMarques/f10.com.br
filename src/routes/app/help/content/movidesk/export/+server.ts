import { Readable } from "node:stream";
import { error, type RequestHandler } from "@sveltejs/kit";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { isMovideskMigrationEnabled } from "$lib/server/help/movideskMigration";
import { createMovideskEditorialExport } from "$lib/server/help/movideskEditorialExport";

export const GET: RequestHandler = async ({ cookies, url }) => {
  if (!isMovideskMigrationEnabled()) throw error(404, "Ferramenta indisponível.");
  await requireAppPermission(cookies, "system.settings.manage", url.pathname);
  const result = await createMovideskEditorialExport();
  return new Response(Readable.toWeb(result.stream) as unknown as ReadableStream<Uint8Array>, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
};
