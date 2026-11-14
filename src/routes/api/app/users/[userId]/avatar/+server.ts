import { and, eq } from "drizzle-orm";
import { error, type RequestHandler } from "@sveltejs/kit";
import { requireAppAnyPermission } from "$lib/server/auth/authorization";
import { getUserAvatarResponse } from "$lib/server/account/userAccountRepository";
import { getDatabase } from "$lib/server/db";
import { users } from "$lib/server/db/schema";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const GET: RequestHandler = async ({ cookies, params, url }) => {
  await requireAppAnyPermission(
    cookies,
    ["users.view", "performance.view", "tickets.view", "chat.view", "tasks.view"],
    url.pathname,
  );

  const userId = params.userId ?? "";
  if (!UUID_PATTERN.test(userId)) throw error(404, "Usuário não encontrado.");

  const [user] = await getDatabase()
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, userId)))
    .limit(1);
  if (!user) throw error(404, "Usuário não encontrado.");

  const response = await getUserAvatarResponse(userId).catch(() => null);
  if (!response) throw error(404, "Foto não encontrada.");
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, max-age=300");
  return new Response(response.body, { status: response.status, headers });
};
