import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { listPublicSupportChatEntryOptions } from "$lib/server/support/supportChatEntryRepository";
import { getSupportAvailabilityStatus } from "$lib/server/support/publicSupportStatus";
import { isChatEntryVisible } from "$lib/support/chatEntryRouting";

export const GET: RequestHandler = async () => {
  const headers = { "Cache-Control": "no-store" };
  try {
    const [options, availability] = await Promise.all([
      listPublicSupportChatEntryOptions(),
      getSupportAvailabilityStatus(),
    ]);
    return json({ options: options.filter((option) => isChatEntryVisible(option, availability)) }, { headers });
  } catch {
    return json({ options: [] }, { status: 503, headers });
  }
};
