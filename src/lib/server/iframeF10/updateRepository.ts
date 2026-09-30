import { randomUUID } from "node:crypto";
import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import { iframeF10Updates } from "$lib/server/db/iframeF10Schema";
import {
  deleteAssetObject,
  getAssetObject,
  putAssetObject,
} from "$lib/server/storage/assetStorage";

const MAX_COVER_BYTES = 8 * 1024 * 1024;

const COVER_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);

export type IframeF10UpdateInput = {
  title: string;
  bodyMarkdown: string;
  pinned: boolean;
  active: boolean;
  expiresAt: Date | null;
};

export type IframeF10CoverInput = {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
};

function normalizeSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function validateCover(input: IframeF10CoverInput): { extension: string; mimeType: string } {
  const mimeType = input.mimeType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  const extension = COVER_TYPES.get(mimeType);
  if (!extension) throw new Error("UPDATE_COVER_TYPE_INVALID");
  if (input.bytes.byteLength < 1 || input.bytes.byteLength > MAX_COVER_BYTES) {
    throw new Error("UPDATE_COVER_SIZE_INVALID");
  }

  const bytes = input.bytes;
  const isPng = mimeType === "image/png"
    && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isJpeg = mimeType === "image/jpeg"
    && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isWebp = mimeType === "image/webp"
    && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF"
    && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";

  if (!isPng && !isJpeg && !isWebp) throw new Error("UPDATE_COVER_CONTENT_INVALID");
  return { extension, mimeType };
}

async function uploadCover(
  updateId: string,
  input: IframeF10CoverInput,
): Promise<{ storageKey: string; contentType: string; originalName: string }> {
  const { extension, mimeType } = validateCover(input);
  const storageKey = "iframef10/updates/" + updateId + "/" + randomUUID() + "." + extension;
  await putAssetObject(storageKey, input.bytes, mimeType);
  return {
    storageKey,
    contentType: mimeType,
    originalName: input.fileName.trim().slice(0, 240) || "capa." + extension,
  };
}

export async function listIframeF10UpdatesAdmin() {
  return getDatabase()
    .select()
    .from(iframeF10Updates)
    .orderBy(desc(iframeF10Updates.pinned), desc(iframeF10Updates.createdAt));
}

export async function listActiveIframeF10Updates(now = new Date()) {
  return getDatabase()
    .select()
    .from(iframeF10Updates)
    .where(
      and(
        eq(iframeF10Updates.active, true),
        or(isNull(iframeF10Updates.expiresAt), gt(iframeF10Updates.expiresAt, now)),
      ),
    )
    .orderBy(desc(iframeF10Updates.pinned), desc(iframeF10Updates.createdAt));
}

export async function getActiveIframeF10UpdateBySlug(slug: string, now = new Date()) {
  const [row] = await getDatabase()
    .select()
    .from(iframeF10Updates)
    .where(
      and(
        eq(iframeF10Updates.slug, slug),
        eq(iframeF10Updates.active, true),
        or(isNull(iframeF10Updates.expiresAt), gt(iframeF10Updates.expiresAt, now)),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getIframeF10UpdateCover(updateId: string) {
  const [row] = await getDatabase()
    .select({
      storageKey: iframeF10Updates.coverStorageKey,
      contentType: iframeF10Updates.coverContentType,
    })
    .from(iframeF10Updates)
    .where(eq(iframeF10Updates.id, updateId))
    .limit(1);
  if (!row?.storageKey || !row.contentType) return null;
  return row;
}

export async function readIframeF10UpdateCover(updateId: string): Promise<Response | null> {
  const cover = await getIframeF10UpdateCover(updateId);
  if (!cover) return null;
  const source = await getAssetObject(cover.storageKey);
  const headers = new Headers();
  headers.set("Content-Type", cover.contentType);
  headers.set("Cache-Control", "public, max-age=3600");
  const length = source.headers.get("content-length");
  if (length) headers.set("Content-Length", length);
  return new Response(source.body, { status: 200, headers });
}

export async function createIframeF10Update(
  actorUserId: string,
  input: IframeF10UpdateInput,
  cover: IframeF10CoverInput | null,
): Promise<string> {
  const id = randomUUID();
  const slugBase = normalizeSlug(input.title) || "novidade";
  const slug = slugBase + "-" + id.slice(0, 8);
  let uploaded: Awaited<ReturnType<typeof uploadCover>> | null = null;

  if (cover) uploaded = await uploadCover(id, cover);

  try {
    await getDatabase().insert(iframeF10Updates).values({
      id,
      slug,
      title: input.title.trim().slice(0, 160),
      bodyMarkdown: input.bodyMarkdown.trim().slice(0, 50_000),
      coverStorageKey: uploaded?.storageKey ?? null,
      coverContentType: uploaded?.contentType ?? null,
      coverOriginalName: uploaded?.originalName ?? null,
      pinned: input.pinned,
      active: input.active,
      expiresAt: input.expiresAt,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    });
  } catch (cause) {
    if (uploaded) await deleteAssetObject(uploaded.storageKey).catch(() => undefined);
    throw cause;
  }

  await recordAuditEvent({
    actorUserId,
    action: "iframe_f10.update.created",
    entityType: "iframe_f10_update",
    entityId: id,
    metadata: {
      slug,
      pinned: input.pinned,
      expiresAt: input.expiresAt?.toISOString() ?? null,
    },
  });
  return id;
}

export async function updateIframeF10Update(
  actorUserId: string,
  updateId: string,
  input: IframeF10UpdateInput,
  cover: IframeF10CoverInput | null,
  removeCover: boolean,
): Promise<void> {
  const db = getDatabase();
  const [current] = await db
    .select()
    .from(iframeF10Updates)
    .where(eq(iframeF10Updates.id, updateId))
    .limit(1);
  if (!current) throw new Error("UPDATE_NOT_FOUND");

  let uploaded: Awaited<ReturnType<typeof uploadCover>> | null = null;
  if (cover) uploaded = await uploadCover(updateId, cover);

  try {
    await db
      .update(iframeF10Updates)
      .set({
        title: input.title.trim().slice(0, 160),
        bodyMarkdown: input.bodyMarkdown.trim().slice(0, 50_000),
        pinned: input.pinned,
        active: input.active,
        expiresAt: input.expiresAt,
        coverStorageKey: uploaded?.storageKey ?? (removeCover ? null : current.coverStorageKey),
        coverContentType: uploaded?.contentType ?? (removeCover ? null : current.coverContentType),
        coverOriginalName: uploaded?.originalName ?? (removeCover ? null : current.coverOriginalName),
        updatedBy: actorUserId,
        updatedAt: new Date(),
      })
      .where(eq(iframeF10Updates.id, updateId));
  } catch (cause) {
    if (uploaded) await deleteAssetObject(uploaded.storageKey).catch(() => undefined);
    throw cause;
  }

  if ((uploaded || removeCover) && current.coverStorageKey) {
    await deleteAssetObject(current.coverStorageKey).catch(() => undefined);
  }

  await recordAuditEvent({
    actorUserId,
    action: "iframe_f10.update.updated",
    entityType: "iframe_f10_update",
    entityId: updateId,
    metadata: {
      pinned: input.pinned,
      active: input.active,
      expiresAt: input.expiresAt?.toISOString() ?? null,
    },
  });
}

export async function deleteIframeF10Update(
  actorUserId: string,
  updateId: string,
): Promise<void> {
  const db = getDatabase();
  const [current] = await db
    .select()
    .from(iframeF10Updates)
    .where(eq(iframeF10Updates.id, updateId))
    .limit(1);
  if (!current) return;

  await db.delete(iframeF10Updates).where(eq(iframeF10Updates.id, updateId));
  if (current.coverStorageKey) {
    await deleteAssetObject(current.coverStorageKey).catch(() => undefined);
  }

  await recordAuditEvent({
    actorUserId,
    action: "iframe_f10.update.deleted",
    entityType: "iframe_f10_update",
    entityId: updateId,
    metadata: { slug: current.slug },
  });
}
