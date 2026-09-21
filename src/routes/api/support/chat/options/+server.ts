import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { listPublicSupportChatEntryOptions } from "$lib/server/support/supportChatEntryRepository";

export const GET: RequestHandler = async () => {
  try {
    return json({ options: await listPublicSupportChatEntryOptions() });
  } catch {
    return json({ options: [] }, { status: 200 });
  }
};
