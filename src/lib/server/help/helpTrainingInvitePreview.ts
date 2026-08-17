import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  helpTrainingInvites,
  helpTrainingVersions,
} from "$lib/server/db/helpTrainingSchema";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function previewHelpTrainingInvite(rawToken: string) {
  const db = getDatabase();
  const [invite] = await db
    .select()
    .from(helpTrainingInvites)
    .where(eq(helpTrainingInvites.tokenHash, sha256(rawToken)))
    .limit(1);
  if (!invite || invite.revokedAt || invite.consumedAt || invite.expiresAt <= new Date()) return null;

  const [version] = await db
    .select({ snapshot: helpTrainingVersions.snapshot })
    .from(helpTrainingVersions)
    .where(eq(helpTrainingVersions.id, invite.versionId))
    .limit(1);
  if (!version) return null;

  return {
    participantName: invite.participantName,
    organizationName: invite.organizationName,
    trainingTitle: version.snapshot.title,
    audience: version.snapshot.audience,
    description: version.snapshot.description,
    welcomeMessage: version.snapshot.welcomeMessage,
  };
}
