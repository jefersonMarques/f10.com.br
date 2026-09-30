import { and, desc, eq, gt, lte } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { iframeF10Notices } from "$lib/server/db/iframeF10Schema";

export type IframeF10NoticeSeverity = "info" | "warning" | "critical";

export type IframeF10NoticeInput = {
  title: string;
  message: string;
  severity: IframeF10NoticeSeverity;
  startsAt: Date;
  expiresAt: Date;
  active: boolean;
  requiresAcknowledgement: boolean;
};

export async function listIframeF10Notices() {
  return getDatabase()
    .select()
    .from(iframeF10Notices)
    .orderBy(desc(iframeF10Notices.createdAt));
}

export async function listActiveIframeF10Notices(now = new Date()) {
  const rows = await getDatabase()
    .select()
    .from(iframeF10Notices)
    .where(
      and(
        eq(iframeF10Notices.active, true),
        lte(iframeF10Notices.startsAt, now),
        gt(iframeF10Notices.expiresAt, now),
      ),
    )
    .orderBy(desc(iframeF10Notices.createdAt));

  const severityRank: Record<IframeF10NoticeSeverity, number> = {
    critical: 3,
    warning: 2,
    info: 1,
  };

  return rows
    .sort(
      (left, right) =>
        severityRank[right.severity] - severityRank[left.severity]
        || right.createdAt.getTime() - left.createdAt.getTime(),
    )
    .map((notice) => ({
      id: notice.id,
      title: notice.title,
      message: notice.message,
      severity: notice.severity,
      startsAt: notice.startsAt,
      expiresAt: notice.expiresAt,
      requiresAcknowledgement: notice.requiresAcknowledgement,
    }));
}

export async function createIframeF10Notice(
  actorUserId: string,
  input: IframeF10NoticeInput,
): Promise<void> {
  await getDatabase().insert(iframeF10Notices).values({
    ...input,
    createdBy: actorUserId,
    updatedBy: actorUserId,
  });
}

export async function setIframeF10NoticeActive(
  actorUserId: string,
  noticeId: string,
  active: boolean,
): Promise<void> {
  await getDatabase()
    .update(iframeF10Notices)
    .set({ active, updatedBy: actorUserId, updatedAt: new Date() })
    .where(eq(iframeF10Notices.id, noticeId));
}

export async function deleteIframeF10Notice(noticeId: string): Promise<void> {
  await getDatabase().delete(iframeF10Notices).where(eq(iframeF10Notices.id, noticeId));
}
