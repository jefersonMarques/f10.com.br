import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("open chat lookup is bound to the authenticated context and not token expiry", () => {
  const source = readFileSync("src/lib/server/support/customerChatSessionRepository.ts", "utf8");
  assert.match(source, /eq\(webChatSessions\.legacyUserId, context\.legacyUserId\)/);
  assert.match(source, /eq\(webChatSessions\.groupId, context\.groupId\)/);
  assert.match(source, /eq\(webChatSessions\.unitId, context\.unitId\)/);
  assert.match(source, /isNull\(webChatSessions\.closedAt\)/);
  assert.doesNotMatch(source, /gt\(webChatSessions\.expiresAt/);
  assert.doesNotMatch(source, /closedAt:\s*now/);
  assert.match(source, /\.for\("update"\)/);
});

test("resume renews the credential without recreating a chat or changing its assignment", () => {
  const source = readFileSync("src/lib/server/support/customerChatSessionRepository.ts", "utf8");
  assert.match(source, /createCustomerChatToken\(session\.id\)/);
  assert.match(source, /session\.expiresAt\.getTime\(\)\s*<=\s*now\.getTime\(\)\s*\+\s*CHAT_TOKEN_RENEWAL_WINDOW_MS/);
  assert.match(source, /sessionId:\s*session\.id/);
  assert.doesNotMatch(source, /\.insert\(webChatSessions\)/);
  assert.doesNotMatch(source, /assignedUserId:\s*/);
  assert.match(source, /input\.requestHuman === true && session\.aiState === "active"/);
});

test("resume API requires an authenticated customer and an authorized unit", () => {
  const source = readFileSync("src/routes/api/support/chat/resume/+server.ts", "utf8");
  assert.match(source, /getOptionalCustomerF10PortalSession\(cookies\)/);
  assert.match(source, /isAuthorizedF10Context\(customer, selectedGroupId, selectedUnitId\)/);
  assert.match(source, /request\.headers\.get\("origin"\)\s*!==\s*url\.origin/);
  assert.match(source, /session:\s*null/);
  assert.doesNotMatch(source, /request\.json\(/);
  assert.match(source, /touchActivity:\s*false/);
});

test("the browser restores a chat from the server and does not automatically create another chat", () => {
  const source = readFileSync("src/lib/components/onboarding/SupportChatDialog.svelte", "utf8");
  assert.match(source, /fetch\("\/api\/support\/chat\/resume",\s*\{/);
  assert.doesNotMatch(source, /session\s*=\s*stored\s*;/);
  assert.match(source, /if \(result !== "none"\) return;/);
  assert.match(source, /if \(resumeOnly\) \{/);
  assert.match(source, /Retomar atendimento/);
  assert.match(source, /if \(response\.status === 401\)/);
});

test("new chat requests reuse an existing session and suppress duplicate notifications", () => {
  const source = readFileSync("src/routes/api/support/chat/start/+server.ts", "utf8");
  assert.match(source, /resumeActiveCustomerChatSession\(/);
  assert.match(source, /web_chat_sessions_active_customer_context_unique/);
  assert.match(source, /if \(!reused \|\| existingSession\?\.escalated\)/);
  assert.doesNotMatch(source, /await addPublicChatMessage\(/);
});

test("waiting status is no longer limited by token expiration for identified customers", () => {
  const source = readFileSync("src/lib/server/support/chatWaitingQuery.ts", "utf8");
  assert.match(source, /"web_chat_sessions"\."expires_at"\s*<=\s*now\(\)\s*and\s*\(/);
  assert.match(source, /"web_chat_sessions"\."legacy_user_id" is null/);
  assert.match(source, /"web_chat_sessions"\."closed_at" is not null/);
});

test("the reminder worker does not filter out open chats solely by token expiry", () => {
  const source = readFileSync("src/lib/server/support/chatWaitingService.ts", "utf8");
  assert.doesNotMatch(source, /gt\(webChatSessions\.expiresAt,/);
  assert.match(source, /isNull\(webChatSessions\.closedAt\)/);
});

test("the access credential still has a finite validity and is required for chat access", () => {
  const source = readFileSync("src/lib/server/support/publicChatRepository.ts", "utf8");
  assert.match(source, /gt\(webChatSessions\.expiresAt, now\)/);
  assert.match(source, /eq\(webChatSessions\.tokenHash, hashSessionToken\(token\)\)/);
  assert.match(source, /isNull\(webChatSessions\.closedAt\)/);
});
