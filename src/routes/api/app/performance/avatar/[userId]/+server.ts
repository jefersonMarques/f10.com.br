import { error, type RequestHandler } from "@sveltejs/kit";
import { and, eq } from "drizzle-orm";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { getUserAvatarResponse } from "$lib/server/account/userAccountRepository";
import { getDatabase } from "$lib/server/db";
import { users } from "$lib/server/db/schema";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const GET: RequestHandler = async ({ cookies, params, url }) => {
  await requireAppPermission(cookies, "reports.view", url.pathname);
  if (!params.userId || !UUID_PATTERN.test(params.userId)) {
    throw error(404, "Usuário não encontrado.");
  }

  const [user] = await getDatabase().select({ id: users.id }).from(users)
    .where(and(eq(users.id, params.userId), eq(users.status, "active")))
    .limit(1);
  if (!user) throw error(404, "Usuário não encontrado.");

  const response = await getUserAvatarResponse(user.id);
  if (!response) throw error(404, "Foto não encontrada.");
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, max-age=300");
  return new Response(response.body, { status: response.status, headers });
};
