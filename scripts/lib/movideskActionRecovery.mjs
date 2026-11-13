import { createHash } from "node:crypto";
import { splitMovideskChatTranscript } from "./movideskSnapshot.mjs";

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizedText(value) {
  return typeof value === "string" ? value.replace(/\u0000/g, "").trim() : "";
}

function authorIdentity(value) {
  const author = asObject(value);
  return JSON.stringify({
    id: author.id == null ? null : String(author.id),
    profileType: Number(author.profileType) || null,
  });
}

function attachmentsSignature(value) {
  return JSON.stringify(Array.isArray(value) ? value : []);
}

export function activeSnapshotActions(ticket) {
  return Array.isArray(ticket?.actions)
    ? ticket.actions.filter((action) => action?.isDeleted !== true)
    : [];
}

export function actionSourceFingerprint(action) {
  const json = JSON.stringify(action);
  if (typeof json !== "string") throw new Error("SOURCE_ACTION_NOT_SERIALIZABLE");
  return {
    sourceActionJson: json,
    sourceSha256: createHash("sha256").update(json).digest("hex"),
  };
}

export function classifyDuplicateAction(firstAction, duplicateAction) {
  const bodyChanged = normalizedText(firstAction.description) !==
    normalizedText(duplicateAction.description);
  const htmlChanged = normalizedText(firstAction.htmlDescription) !==
    normalizedText(duplicateAction.htmlDescription);
  const authorChanged = authorIdentity(firstAction.createdBy) !==
    authorIdentity(duplicateAction.createdBy);
  const attachmentsChanged = attachmentsSignature(firstAction.attachments) !==
    attachmentsSignature(duplicateAction.attachments);
  const meaningfulChange = bodyChanged || htmlChanged || authorChanged || attachmentsChanged;
  const hasContent = Boolean(normalizedText(duplicateAction.description) ||
    normalizedText(duplicateAction.htmlDescription) ||
    (Array.isArray(duplicateAction.attachments) && duplicateAction.attachments.length));
  const parsedChatTranscript = Number(duplicateAction.origin) === 5 &&
    Boolean(splitMovideskChatTranscript(duplicateAction.description));

  return {
    bodyChanged,
    htmlChanged,
    authorChanged,
    attachmentsChanged,
    recoverMessage: meaningfulChange && hasContent && !parsedChatTranscript,
    needsChatReview: meaningfulChange && parsedChatTranscript,
  };
}

export function duplicateActionOccurrences(ticket) {
  const firstById = new Map();
  const counts = new Map();
  const duplicates = [];

  for (const action of activeSnapshotActions(ticket)) {
    const actionId = Number(action?.id);
    if (!Number.isSafeInteger(actionId) || actionId < 1 || actionId > 2147483647) {
      throw new Error("INVALID_SOURCE_ACTION_ID");
    }

    const occurrenceIndex = counts.get(actionId) ?? 0;
    counts.set(actionId, occurrenceIndex + 1);

    if (occurrenceIndex === 0) {
      firstById.set(actionId, action);
      continue;
    }

    const firstAction = firstById.get(actionId);
    duplicates.push({
      sourceActionId: actionId,
      occurrenceIndex,
      sourceAction: action,
      ...actionSourceFingerprint(action),
      ...classifyDuplicateAction(firstAction, action),
    });
  }

  return duplicates;
}
