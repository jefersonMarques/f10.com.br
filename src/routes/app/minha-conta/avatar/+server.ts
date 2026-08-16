import { error, redirect, type RequestHandler } from "@sveltejs/kit";
import { getUserAvatarResponse } from "$lib/server/account/userAccountRepository";
import { getSessionUser, SESSION_COOKIE_NAME } from "$lib/server/auth/session";

export const GET: RequestHandler = async ({ cookies }) => {
  const token = cookies.get(SESSION_COOKIE_NAME);
  if (!token) throw redirect(303, "/login?returnTo=%2Fapp%2Fminha-conta");
  const session = await getSessionUser(token);
  if (!session) {
    cookies.delete(SESSION_COOKIE_NAME, { path: "/" });
    throw redirect(303, "/login?returnTo=%2Fapp%2Fminha-conta");
  }

  const response = await getUserAvatarResponse(session.user.id).catch(() => null);
  if (!response) throw error(404, "Avatar não encontrado.");
  return response;
};
