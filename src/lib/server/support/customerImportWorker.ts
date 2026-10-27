import { env } from "$env/dynamic/private";
import { processF10CustomerSyncOnce } from "$lib/server/support/f10CustomerSyncRepository";
import {
  listRunningCustomerImportBatches,
  processCustomerImportBatch,
} from "$lib/server/support/customerImportRepository";

const POLL_INTERVAL_MS = 5_000;
let started = false;

async function runCustomerImportWorker(): Promise<void> {
  while (true) {
    try {
      const batches = await listRunningCustomerImportBatches();
      for (const batchId of batches) {
        await processCustomerImportBatch(batchId, null);
      }
    } catch (cause) {
      const code = cause instanceof Error ? cause.name : "UNKNOWN";
      console.error("[customer-import-worker] batch unavailable", { code });
    }

    try {
      await processF10CustomerSyncOnce();
    } catch (cause) {
      const code = cause instanceof Error ? cause.name : "UNKNOWN";
      console.error("[f10-customer-sync-worker] diagnostic unavailable", { code });
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

export function startCustomerImportWorker(): void {
  if (started || env.F10_CUSTOMER_IMPORT_WORKER !== "1") return;
  started = true;
  void runCustomerImportWorker();
}
