import { and, eq } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { helpPublications } from "$lib/server/db/helpPublications";
import { compileHelpKnowledgeDocument } from "$lib/server/help/helpKnowledgeCompiler";
import {
  getStructuredHelpContent,
  publishStructuredHelpContent,
} from "$lib/server/help/structuredHelpRepository";

export async function publishHelpKnowledgeContent(
  actorUserId: string,
  contentId: string,
): Promise<void> {
  const content = await getStructuredHelpContent(contentId);
  if (!content) throw new Error("CONTENT_NOT_FOUND");

  const knowledge = compileHelpKnowledgeDocument(content);
  await publishStructuredHelpContent(actorUserId, contentId);

  const db = getDatabase();
  const [publication] = await db
    .select({ snapshot: helpPublications.snapshot })
    .from(helpPublications)
    .where(
      and(
        eq(helpPublications.entityType, "content"),
        eq(helpPublications.entityId, contentId),
      ),
    )
    .limit(1);

  if (!publication) throw new Error("HELP_PUBLICATION_NOT_FOUND");

  const { assistant: _assistant, ...snapshot } = publication.snapshot;

  await db
    .update(helpPublications)
    .set({
      snapshot: {
        ...snapshot,
        knowledge,
      },
    })
    .where(
      and(
        eq(helpPublications.entityType, "content"),
        eq(helpPublications.entityId, contentId),
      ),
    );
}
