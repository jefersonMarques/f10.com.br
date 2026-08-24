import { eq } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import { helpContents } from "$lib/server/db/structuredHelpSchema";

const MAX_QUICK_GUIDE_CHARS = 12_000;

export async function updateHelpQuickGuide(
  actorUserId: string,
  contentId: string,
  quickGuideInput: string,
): Promise<void> {
  const quickGuide = quickGuideInput.trim();
  if (quickGuide.length > MAX_QUICK_GUIDE_CHARS) throw new Error("QUICK_GUIDE_TOO_LONG");

  const db = getDatabase();
  const [content] = await db
    .select({ status: helpContents.status })
    .from(helpContents)
    .where(eq(helpContents.id, contentId))
    .limit(1);
  if (!content) throw new Error("CONTENT_NOT_FOUND");
  if (content.status === "archived") throw new Error("CONTENT_ARCHIVED");

  await db
    .update(helpContents)
    .set({
      quickGuide,
      status: "draft",
      updatedBy: actorUserId,
      updatedAt: new Date(),
    })
    .where(eq(helpContents.id, contentId));

  await recordAuditEvent({
    actorUserId,
    action: "help.content.quick_guide.updated",
    entityType: "help_content",
    entityId: contentId,
    metadata: { hasQuickGuide: Boolean(quickGuide) },
  });
}
