import { getDatabase } from "$lib/server/db";
import { customerActivityEvents } from "$lib/server/db/customerPortalSchema";
import { helpSearchEvents, helpSearchResults } from "$lib/server/db/helpSearchSchema";
import type { PublishedStructuredHelpSummary } from "$lib/server/help/publicStructuredHelpRepository";
import type { CustomerF10PortalSession } from "$lib/server/customerPortal/customerF10AuthRepository";

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export async function recordCustomerActivity(
  session: CustomerF10PortalSession,
  input: {
    eventType: string;
    source: string;
    path?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const db = getDatabase();
  await db.insert(customerActivityEvents).values({
    customerContactId: session.contactId,
    portalSessionId: session.sessionId,
    legacyUserId: session.legacyUserId,
    groupId: session.selectedGroupId,
    unitId: session.selectedUnitId,
    eventType: input.eventType,
    source: input.source,
    path: input.path?.slice(0, 1000) || null,
    metadata: input.metadata ?? {},
  });
}

export async function recordCustomerHelpSearch(
  session: CustomerF10PortalSession,
  query: string,
  results: PublishedStructuredHelpSummary[],
): Promise<void> {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return;

  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [event] = await tx
      .insert(helpSearchEvents)
      .values({
        customerContactId: session.contactId,
        source: "public",
        query: query.slice(0, 160),
        normalizedQuery,
        resultCount: results.length,
      })
      .returning({ id: helpSearchEvents.id });

    if (event && results.length > 0) {
      await tx.insert(helpSearchResults).values(
        results.slice(0, 50).map((result, index) => ({
          searchEventId: event.id,
          contentId: result.contentId,
          rank: index + 1,
          score: Math.max(0, 1 - index * 0.01),
          titleSnapshot: result.title,
        })),
      );
    }

    await tx.insert(customerActivityEvents).values({
      customerContactId: session.contactId,
      portalSessionId: session.sessionId,
      legacyUserId: session.legacyUserId,
      groupId: session.selectedGroupId,
      unitId: session.selectedUnitId,
      eventType: "help.search",
      source: "help_center",
      path: "/ajuda-f10",
      metadata: {
        query: query.slice(0, 160),
        normalizedQuery,
        resultCount: results.length,
        searchEventId: event?.id ?? null,
      },
    });
  });
}
