import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path) {
  return readFileSync(path, "utf8");
}

test("team chat accepts validated multipart attachments linked to their source messages", () => {
  const route = source("src/routes/api/app/chat/[sessionId]/messages/+server.ts");
  const storage = source("src/lib/server/support/supportMessageAttachmentRepository.ts");
  const service = source("src/lib/server/support/internalChatRepository.ts");

  assert.match(route, /request\.formData\(\)/);
  assert.match(route, /request\.headers\.get\("origin"\)/);
  assert.match(route, /files\.reduce/);
  assert.match(storage, /uploadSupportAgentChatMessageAttachments/);
  assert.match(storage, /detectedPortalType/);
  assert.match(service, /ticketMessageAttachments/);
  assert.match(service, /webChatMessageAttachments/);
  assert.match(service, /deleteStoredSupportImages\(attachments\)/);
});

test("public chat preserves session auth and allows PDF and pasted images", () => {
  const route = source("src/routes/api/support/chat/[sessionId]/messages/+server.ts");
  const service = source("src/lib/server/support/publicChatRepository.ts");
  const dialog = source("src/lib/components/onboarding/SupportChatDialog.svelte");
  const assistant = source("src/lib/components/onboarding/SupportAssistantDialog.svelte");

  assert.match(route, /authorizeF10CustomerForChat/);
  assert.match(route, /SUPPORT_ATTACHMENT_MAX_FILES/);
  assert.match(service, /uploadSupportChatMessageAttachments/);
  assert.match(dialog, /handleReplyPaste/);
  assert.match(dialog, /application\/pdf/);
  assert.match(assistant, /handleReplyPaste/);
});
