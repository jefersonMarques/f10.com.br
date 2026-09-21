import { redirect, type RequestHandler } from "@sveltejs/kit";
import { previewHelpTrainingInvite } from "$lib/server/help/helpTrainingInvitePreview";
import { setHelpTrainingInviteCookie } from "$lib/server/help/helpTrainingSession";

export const GET: RequestHandler = async ({ params, cookies }) => {
  const token = params.token?.trim() ?? "";
  if (!token) throw redirect(303, "/treinamento?convite=invalido");

  const invite = await previewHelpTrainingInvite(token);
  if (!invite) throw redirect(303, "/treinamento?convite=invalido");

  // GET never consumes the one-time token. This avoids e-mail security scanners
  // invalidating an invitation before the real participant confirms the start.
  setHelpTrainingInviteCookie(cookies, token);
  throw redirect(303, "/treinamento?entrada=1");
};
