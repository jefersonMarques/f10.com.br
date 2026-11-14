import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(file, "utf8");

test("the client can finish the active chat only in the authenticated F10 context", () => {
  const route = read("src/routes/api/support/chat/close-current/+server.ts");
  const repository = read("src/lib/server/support/customerChatLifecycleRepository.ts");

  assert.match(route, /request\.headers\.get\("origin"\) !== url\.origin/);
  assert.match(route, /getOptionalCustomerF10PortalSession\(cookies/);
  assert.match(route, /customer\.selectedUnitId === null/);
  assert.match(repository, /eq\(webChatSessions\.legacyUserId, legacyUserId\)/);
  assert.match(repository, /eq\(webChatSessions\.groupId, selectedGroupId\)/);
  assert.match(repository, /eq\(webChatSessions\.unitId, selectedUnitId\)/);
  assert.match(repository, /isNull\(webChatSessions\.closedAt\)/);
  assert.match(repository, /\.for\("update"\)/);
});

test("closing a chat preserves its ticket and leaves an audit trail", () => {
  const repository = read("src/lib/server/support/customerChatLifecycleRepository.ts");

  assert.match(repository, /closedAt: now/);
  assert.match(repository, /closedBy: "customer"/);
  assert.match(repository, /Conversa finalizada pelo cliente/);
  assert.match(repository, /tx\.insert\(ticketMessages\)/);
  assert.match(repository, /tx\.update\(tickets\)\.set\(\{ updatedAt: now \}\)/);
  assert.doesNotMatch(repository, /status: "closed"/);
});

test("chat menu replaces the X and clicking outside only hides the window", () => {
  const component = read("src/lib/components/onboarding/SupportChatDialog.svelte");

  assert.match(component, /aria-label="Opções da conversa"/);
  assert.match(component, /Finalizar conversa/);
  assert.match(component, /on:pointerdown=\{handleOutsidePointerDown\}/);
  assert.match(component, /chatDialogElement\.contains\(event\.target\)/);
  assert.match(component, /onClose\(\)/);
  assert.match(component, /fetch\("\/api\/support\/chat\/close-current"/);
  assert.match(component, /window\.confirm\("Finalizar esta conversa\?"\)/);
  assert.doesNotMatch(component, /aria-label="Fechar chat"/);
});
