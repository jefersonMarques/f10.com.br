import { env } from "$env/dynamic/private";
import {
  claimNextEmailInboundEvent,
  completeEmailInboundEvent,
  failEmailInboundEvent,
  processEmailInboundEvent,
  recoverStaleEmailInboundEvents,
} from "$lib/server/support/emailInboundService";

const POLL_INTERVAL_MS = 4_000;
let started = false;

async function runWorkerLoop(): Promise<void> {
  await recoverStaleEmailInboundEvents();

  while (true) {
    await recoverStaleEmailInboundEvents();
    const event = await claimNextEmailInboundEvent();
    if (!event) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      continue;
    }

    try {
      const outcome = await processEmailInboundEvent(event);
      await completeEmailInboundEvent(event.id, outcome);
      console.info("[support-email-worker] event processed", {
        eventId: event.id,
        eventType: event.eventType,
        ticketId: outcome.ticketId,
        status: outcome.status,
      });
    } catch (cause) {
      console.error("[support-email-worker] processing failed", {
        eventId: event.id,
        eventType: event.eventType,
        attempt: event.attemptCount,
        cause,
      });
      await failEmailInboundEvent(event, cause).catch((failureCause) => {
        console.error("[support-email-worker] failed to persist event failure", {
          eventId: event.id,
          failureCause,
        });
      });
    }
  }
}

export function startSupportEmailInboundWorker(): void {
  if (started || env.F10_BREVO_EMAIL_WORKER !== "1") return;
  started = true;

  console.info("[support-email-worker] started", { pid: process.pid });

  void runWorkerLoop().catch((cause) => {
    console.error("[support-email-worker] fatal loop failure", { cause });
    setTimeout(() => process.exit(1), 100);
  });
}
