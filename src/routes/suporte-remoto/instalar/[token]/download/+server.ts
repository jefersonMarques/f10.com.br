import { error, redirect, type RequestHandler } from "@sveltejs/kit";
import { markRemoteEnrollmentDownloaded } from "$lib/server/remote/remoteDeviceEnrollmentRepository";

function validToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{40,120}$/.test(value);
}

export const GET: RequestHandler = async ({ params }) => {
  if (!validToken(params.token ?? "")) throw error(404, "Solicitação não encontrada.");

  try {
    const agentUrl = await markRemoteEnrollmentDownloaded(params.token ?? "");
    throw redirect(302, agentUrl);
  } catch (cause) {
    if (cause && typeof cause === "object" && "status" in cause && cause.status === 302) throw cause;
    throw error(410, "Este link de instalação expirou ou foi cancelado.");
  }
};
