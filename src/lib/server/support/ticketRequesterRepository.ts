import { eq } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { ticketRequesterProfiles } from "$lib/server/db/ticketRequesterSchema";
import { ticketEvents, tickets } from "$lib/server/db/supportSchema";
import { getPermissionScope, hasPermission } from "$lib/server/auth/permissions";
import { requireAccessibleCustomerContact } from "$lib/server/support/customerDirectoryRepository";
import { requireTicketAccess, type SupportPermissionMap } from "$lib/server/support/supportAccess";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireRequesterEditor(
  actorUserId: string,
  permissions: SupportPermissionMap,
  ticketId: string,
): Promise<void> {
  const scope = getPermissionScope(permissions, "tickets.reply");
  if (!scope || !hasPermission(permissions, "customers.view")) {
    throw new Error("TICKET_REQUESTER_EDIT_FORBIDDEN");
  }
  await requireTicketAccess(actorUserId, scope, ticketId);
}

export async function saveTicketRequesterDisplay(
  actorUserId: string,
  permissions: SupportPermissionMap,
  ticketId: string,
  input: { name: string; email: string },
): Promise<void> {
  await requireRequesterEditor(actorUserId, permissions, ticketId);

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (name.length > 120 || email.length > 254 || (email && !EMAIL.test(email))) {
    throw new Error("TICKET_REQUESTER_DETAILS_INVALID");
  }

  const now = new Date();
  await getDatabase().transaction(async (tx) => {
    await tx.insert(ticketRequesterProfiles).values({
      ticketId,
      displayName: name || null,
      displayEmail: email || null,
      updatedBy: actorUserId,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: ticketRequesterProfiles.ticketId,
      set: {
        displayName: name || null,
        displayEmail: email || null,
        updatedBy: actorUserId,
        updatedAt: now,
      },
    });
    await tx.update(tickets).set({ updatedAt: now }).where(eq(tickets.id, ticketId));
    await tx.insert(ticketEvents).values({
      ticketId,
      actorUserId,
      eventType: "ticket.requester.display_updated",
      metadata: { nameOverridden: Boolean(name), emailOverridden: Boolean(email) },
    });
  });
}

export async function linkTicketRequesterContact(
  actorUserId: string,
  permissions: SupportPermissionMap,
  ticketId: string,
  contactId: string | null,
): Promise<void> {
  await requireRequesterEditor(actorUserId, permissions, ticketId);
  if (contactId && !UUID.test(contactId)) throw new Error("TICKET_REQUESTER_CONTACT_INVALID");
  if (contactId) {
    await requireAccessibleCustomerContact(actorUserId, permissions, contactId);
  }

  const now = new Date();
  await getDatabase().transaction(async (tx) => {
    const [ticket] = await tx.select({ id: tickets.id })
      .from(tickets).where(eq(tickets.id, ticketId)).limit(1);
    if (!ticket) throw new Error("TICKET_NOT_FOUND");

    await tx.insert(ticketRequesterProfiles).values({
      ticketId,
      customerContactId: contactId,
      displayName: null,
      displayEmail: null,
      updatedBy: actorUserId,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: ticketRequesterProfiles.ticketId,
      set: {
        customerContactId: contactId,
        displayName: null,
        displayEmail: null,
        updatedBy: actorUserId,
        updatedAt: now,
      },
    });

    await tx.update(tickets).set({ updatedAt: now }).where(eq(tickets.id, ticketId));
    await tx.insert(ticketEvents).values({
      ticketId,
      actorUserId,
      eventType: contactId ? "ticket.requester.contact_linked" : "ticket.requester.contact_unlinked",
      metadata: { requesterContactId: contactId },
    });
  });
}
