import { error, type RequestHandler } from "@sveltejs/kit";
import { markRemoteEnrollmentDownloaded } from "$lib/server/remote/remoteDeviceEnrollmentRepository";

const MAX_AGENT_BYTES = 50 * 1024 * 1024;

function validToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{40,120}$/.test(value);
}

export const GET: RequestHandler = async ({ params }) => {
  const token = params.token ?? "";
  if (!validToken(token)) throw error(404, "Solicitação não encontrada.");

  let agentUrl = "";
  try {
    agentUrl = await markRemoteEnrollmentDownloaded(token);
  } catch {
    throw error(410, "Este link de instalação expirou ou foi cancelado.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const upstream = await fetch(agentUrl, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: { Accept: "application/octet-stream,*/*" },
    });

    if (!upstream.ok || !upstream.body) {
      throw error(502, "O instalador remoto não está disponível agora.");
    }

    const contentLength = Number(upstream.headers.get("content-length") ?? "0");
    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_AGENT_BYTES
    ) {
      throw error(502, "O instalador remoto retornou um tamanho inesperado.");
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "application/octet-stream",
        "Content-Disposition": 'attachment; filename="F10-Suporte-Remoto.exe"',
        "Cache-Control": "no-store, private",
        "X-Content-Type-Options": "nosniff",
        ...(contentLength > 0 ? { "Content-Length": String(contentLength) } : {}),
      },
    });
  } catch (cause) {
    if (cause && typeof cause === "object" && "status" in cause) throw cause;
    throw error(502, "Não foi possível baixar o instalador remoto agora.");
  } finally {
    clearTimeout(timeout);
  }
};
