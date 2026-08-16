import { error, type RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { getUserAvatarResponse } from "$lib/server/account/userAccountRepository";
import { getDatabase } from "$lib/server/db";
import { users } from "$lib/server/db/schema";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const GET: RequestHandler = async ({ params }) => {
  const userId = params.userId ?? "";
  if (!isUuid(userId)) throw error(404, "Avatar não encontrado.");

  const db = getDatabase();
  const [user] = await db
    .select({ status: users.status })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user || user.status !== "active") throw error(404, "Avatar não encontrado.");

  const response = await getUserAvatarResponse(userId).catch(() => null);
  if (!response) throw error(404, "Avatar não encontrado.");
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "public, max-age=300");
  return new Response(response.body, { status: response.status, headers });
};
