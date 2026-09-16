import { Readable } from "node:stream";
import { error, type RequestHandler } from "@sveltejs/kit";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { createServiceRequestExport } from "$lib/server/serviceRequests/serviceRequestExport";
import { getTicketCard } from "$lib/server/support/ticketCardRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const GET: RequestHandler = async ({ cookies, params, url }) => {
  if (!isUuid(params.ticketId)) throw error(404, "Ticket não encontrado.");
  const { session, permissions } = await requireAppPermission(cookies, "tickets.view", url.pathname);

  try {
    await getTicketCard(session.user.id, permissions, params.ticketId);
    const serviceRequestExport = await createServiceRequestExport(params.ticketId);
    if (!serviceRequestExport) throw error(404, "Dados do formulário não encontrados.");

    const body = Readable.toWeb(serviceRequestExport.stream) as unknown as ReadableStream<Uint8Array>;
    return new Response(body, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${serviceRequestExport.filename}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (cause) {
    if (cause && typeof cause === "object" && "status" in cause) throw cause;
    throw error(404, "Ticket não encontrado ou fora do seu escopo de acesso.");
  }
};
