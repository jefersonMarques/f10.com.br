import { randomUUID } from "node:crypto";
import path from "node:path";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getPermissionScope } from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import { users } from "$lib/server/db/schema";
import {
  supportTags,
  ticketAttachments,
  ticketEvents,
  ticketTags,
} from "$lib/server/db/supportSchema";
import {
  deleteAssetObject,
  getAssetStorageStatus,
  putAssetObject,
} from "$lib/server/storage/assetStorage";
import {
  requireTicketAccess,
  type SupportPermissionMap,
} from "$lib/server/support/supportAccess";
import { getSupportTicket } from "$lib/server/support/supportRepository";
import { getTicketWorkflowContext } from "$lib/server/support/ticketWorkflowRepository";

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const LABEL_COLORS = new Set([
  "green",
  "yellow",
  "orange",
  "red",
  "purple",
  "blue",
  "sky",
  "lime",
  "pink",
  "gray",
]);
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "application/zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function requireScope(permissions: SupportPermissionMap, permissionCode: string) {
  const scope = getPermissionScope(permissions, permissionCode);
  if (!scope) throw new Error("TICKET_PERMISSION_NOT_ALLOWED");
  return scope;
}

function sanitizeAttachmentName(fileName: string): string {
  const extension = path.extname(fileName).toLowerCase().slice(0, 12);
  const baseName = path.basename(fileName, path.extname(fileName));
  const safeBase = baseName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 80) || "arquivo";
  return `${safeBase}${extension}`;
}

export async function listTicketLabels() {
  const db = getDatabase();
  return db
    .select({ id: supportTags.id, name: supportTags.name, color: supportTags.color })
    .from(supportTags)
    .orderBy(asc(supportTags.name));
}

export async function listTicketLabelsForTickets(ticketIds: string[]) {
  if (ticketIds.length === 0) return [];
  const db = getDatabase();
  return db
    .select({
      ticketId: ticketTags.ticketId,
      id: supportTags.id,
      name: supportTags.name,
      color: supportTags.color,
    })
    .from(ticketTags)
    .innerJoin(supportTags, eq(ticketTags.tagId, supportTags.id))
    .where(inArray(ticketTags.ticketId, ticketIds))
    .orderBy(asc(supportTags.name));
}

export async function getTicketCard(
  actorUserId: string,
  permissions: SupportPermissionMap,
  ticketId: string,
) {
  const [details, workflowContext, labels] = await Promise.all([
    getSupportTicket(actorUserId, permissions, ticketId),
    getTicketWorkflowContext(actorUserId, permissions, ticketId),
    listTicketLabels(),
  ]);

  const db = getDatabase();
  const [tagRows, attachments] = await Promise.all([
    db
      .select({ tagId: ticketTags.tagId })
      .from(ticketTags)
      .where(eq(ticketTags.ticketId, ticketId)),
    db
      .select({
        id: ticketAttachments.id,
        originalName: ticketAttachments.originalName,
        contentType: ticketAttachments.contentType,
        sizeBytes: ticketAttachments.sizeBytes,
        uploadedBy: ticketAttachments.uploadedBy,
        uploadedByName: users.name,
        createdAt: ticketAttachments.createdAt,
      })
      .from(ticketAttachments)
      .leftJoin(users, eq(ticketAttachments.uploadedBy, users.id))
      .where(eq(ticketAttachments.ticketId, ticketId))
      .orderBy(desc(ticketAttachments.createdAt)),
  ]);
  const selectedTagIds = new Set(tagRows.map((row) => row.tagId));
  const selectedLabels = labels.filter((label) => selectedTagIds.has(label.id));
  const storageStatus = getAssetStorageStatus();

  return {
    details,
    workflowContext,
    labels,
    selectedLabels,
    attachments: attachments.map((attachment) => ({
      ...attachment,
      href: `/app/tickets/${ticketId}/attachments/${attachment.id}`,
      previewable:
        attachment.contentType.startsWith("image/") ||
        attachment.contentType === "application/pdf",
    })),
    attachmentsEnabled: storageStatus.configured,
  };
}

export async function createTicketLabel(
  actorUserId: string,
  permissions: SupportPermissionMap,
  name: string,
  color: string,
): Promise<string> {
  requireScope(permissions, "tickets.reply");
  const cleanName = name.trim();
  if (cleanName.length < 2 || cleanName.length > 40) {
    throw new Error("TICKET_LABEL_NAME_INVALID");
  }
  if (!LABEL_COLORS.has(color)) throw new Error("TICKET_LABEL_COLOR_INVALID");

  const db = getDatabase();
  const [existing] = await db
    .select({ id: supportTags.id })
    .from(supportTags)
    .where(eq(supportTags.name, cleanName))
    .limit(1);
  if (existing) return existing.id;

  const [created] = await db
    .insert(supportTags)
    .values({ name: cleanName, color })
    .returning({ id: supportTags.id });
  if (!created) throw new Error("TICKET_LABEL_NOT_CREATED");
  return created.id;
}

export async function addTicketLabel(
  actorUserId: string,
  permissions: SupportPermissionMap,
  ticketId: string,
  tagId: string,
): Promise<void> {
  const scope = requireScope(permissions, "tickets.reply");
  await requireTicketAccess(actorUserId, scope, ticketId);

  const db = getDatabase();
  const [tag] = await db
    .select({ id: supportTags.id })
    .from(supportTags)
    .where(eq(supportTags.id, tagId))
    .limit(1);
  if (!tag) throw new Error("TICKET_LABEL_NOT_FOUND");

  await db.transaction(async (tx) => {
    await tx.insert(ticketTags).values({ ticketId, tagId }).onConflictDoNothing();
    await tx.insert(ticketEvents).values({
      ticketId,
      actorUserId,
      eventType: "ticket.label.added",
      metadata: { tagId },
    });
  });
}

export async function removeTicketLabel(
  actorUserId: string,
  permissions: SupportPermissionMap,
  ticketId: string,
  tagId: string,
): Promise<void> {
  const scope = requireScope(permissions, "tickets.reply");
  await requireTicketAccess(actorUserId, scope, ticketId);

  const db = getDatabase();
  await db.transaction(async (tx) => {
    await tx
      .delete(ticketTags)
      .where(and(eq(ticketTags.ticketId, ticketId), eq(ticketTags.tagId, tagId)));
    await tx.insert(ticketEvents).values({
      ticketId,
      actorUserId,
      eventType: "ticket.label.removed",
      metadata: { tagId },
    });
  });
}

export async function uploadTicketAttachment(
  actorUserId: string,
  permissions: SupportPermissionMap,
  ticketId: string,
  file: File,
): Promise<void> {
  const scope = requireScope(permissions, "tickets.reply");
  await requireTicketAccess(actorUserId, scope, ticketId);
  if (!file.name || file.size <= 0) throw new Error("TICKET_ATTACHMENT_EMPTY");
  if (file.size > MAX_ATTACHMENT_BYTES) throw new Error("TICKET_ATTACHMENT_TOO_LARGE");
  if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
    throw new Error("TICKET_ATTACHMENT_TYPE_NOT_ALLOWED");
  }
  if (!getAssetStorageStatus().configured) throw new Error("ASSET_STORAGE_NOT_CONFIGURED");

  const safeName = sanitizeAttachmentName(file.name);
  const displayName =
    path.basename(file.name).replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 180) ||
    safeName;
  const storageKey = `tickets/${ticketId}/${randomUUID()}-${safeName}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const stored = await putAssetObject(storageKey, bytes, file.type);
  const db = getDatabase();

  try {
    await db.transaction(async (tx) => {
      await tx.insert(ticketAttachments).values({
        ticketId,
        storageKey: stored.key,
        originalName: displayName,
        contentType: stored.contentType,
        sizeBytes: stored.size,
        checksumSha256: stored.checksumSha256,
        uploadedBy: actorUserId,
      });
      await tx.insert(ticketEvents).values({
        ticketId,
        actorUserId,
        eventType: "ticket.attachment.added",
        metadata: {
          fileName: displayName,
          contentType: stored.contentType,
          size: stored.size,
        },
      });
    });
  } catch (cause) {
    await deleteAssetObject(storageKey).catch(() => undefined);
    throw cause;
  }
}

export async function deleteTicketAttachment(
  actorUserId: string,
  permissions: SupportPermissionMap,
  ticketId: string,
  attachmentId: string,
): Promise<void> {
  const scope = requireScope(permissions, "tickets.reply");
  await requireTicketAccess(actorUserId, scope, ticketId);
  const db = getDatabase();
  const [attachment] = await db
    .select({
      id: ticketAttachments.id,
      storageKey: ticketAttachments.storageKey,
      originalName: ticketAttachments.originalName,
    })
    .from(ticketAttachments)
    .where(
      and(
        eq(ticketAttachments.id, attachmentId),
        eq(ticketAttachments.ticketId, ticketId),
      ),
    )
    .limit(1);
  if (!attachment) throw new Error("TICKET_ATTACHMENT_NOT_FOUND");

  await deleteAssetObject(attachment.storageKey);
  await db.transaction(async (tx) => {
    await tx.delete(ticketAttachments).where(eq(ticketAttachments.id, attachment.id));
    await tx.insert(ticketEvents).values({
      ticketId,
      actorUserId,
      eventType: "ticket.attachment.removed",
      metadata: { fileName: attachment.originalName },
    });
  });
}

export async function getTicketAttachmentForDownload(
  actorUserId: string,
  permissions: SupportPermissionMap,
  ticketId: string,
  attachmentId: string,
) {
  const scope = requireScope(permissions, "tickets.view");
  await requireTicketAccess(actorUserId, scope, ticketId);
  const db = getDatabase();
  const [attachment] = await db
    .select({
      id: ticketAttachments.id,
      storageKey: ticketAttachments.storageKey,
      originalName: ticketAttachments.originalName,
      contentType: ticketAttachments.contentType,
      sizeBytes: ticketAttachments.sizeBytes,
    })
    .from(ticketAttachments)
    .where(
      and(
        eq(ticketAttachments.id, attachmentId),
        eq(ticketAttachments.ticketId, ticketId),
      ),
    )
    .limit(1);
  if (!attachment) throw new Error("TICKET_ATTACHMENT_NOT_FOUND");
  return attachment;
}
