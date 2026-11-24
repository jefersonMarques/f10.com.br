import { building } from "$app/environment";
import { env } from "$env/dynamic/private";
import { processChatWaitingReminders } from "$lib/server/support/chatWaitingService";

const POLL_INTERVAL_MS = 5_000;
let started = false;

async function run(): Promise<void> {
  try { await processChatWaitingReminders(); }
  catch (cause) { console.error("[chat.waiting.worker]", { cause }); }
  finally { setTimeout(() => void run(), POLL_INTERVAL_MS).unref(); }
}

export function startChatWaitingWorker(): void {
  if (started || building || !env.DATABASE_URL || env.F10_CHAT_WAITING_WORKER === "0") return;
  started = true;
  setTimeout(() => void run(), POLL_INTERVAL_MS).unref();
}
