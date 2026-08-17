import { redirect, type RequestHandler } from "@sveltejs/kit";
import { consumeHelpTrainingInvite } from "$lib/server/help/helpTrainingRepository";
import { setHelpTrainingSessionCookie } from "$lib/server/help/helpTrainingSession";

export const GET: RequestHandler = async ({ params, cookies }) => {
  const token = params.token?.trim() ?? "";
  if (!token) throw redirect(303, "/treinamento?convite=invalido");

  try {
    const session = await consumeHelpTrainingInvite(token);
    setHelpTrainingSessionCookie(cookies, session.sessionToken, session.expiresAt);
    throw redirect(303, "/treinamento");
  } catch (cause) {
    if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
    const reason = cause instanceof Error && cause.message === "TRAINING_INVITE_ALREADY_USED" ? "usado" : "invalido";
    throw redirect(303, `/treinamento?convite=${reason}`);
  }
};
