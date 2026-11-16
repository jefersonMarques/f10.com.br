import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path) {
  return readFileSync(path, "utf8");
}

test("chat performance endpoint enforces permission scope", () => {
  const endpoint = source("src/routes/api/app/performance/chats/+server.ts");
  const repository = source("src/lib/server/reports/supportChatPerformanceRepository.ts");

  assert.match(endpoint, /requireAppPermission\(cookies, "performance.view"/);
  assert.match(endpoint, /getPermissionScope/);
  assert.match(endpoint, /getUserSupportQueueIds/);
  assert.match(repository, /visibility.scope === "all"/);
  assert.match(repository, /visibility.scope === "team"/);
  assert.match(repository, /visibility.actorUserId/);
});

test("chat metrics deduplicate converted messages and separate operator wait", () => {
  const repository = source("src/lib/server/reports/supportChatPerformanceRepository.ts");

  assert.match(repository, /UNION\s+SELECT chat.id AS session_id/);
  assert.match(repository, /msg.channel = 'web_chat'/);
  assert.match(repository, /latest_assignment AS/);
  assert.match(repository, /response_assignment AS/);
  assert.match(repository, /agentWaitingMinutes/);
  assert.match(repository, /agentFirstResponseMinutes/);
  assert.match(repository, /firstHumanUserId/);
});

test("service lifecycle persists auditable close and routing milestones", () => {
  const migration = source("migrations/0119_chat_service_metrics.sql");
  const customerClose = source("src/lib/server/support/customerChatLifecycleRepository.ts");
  const agentClose = source("src/lib/server/support/chatLifecycleRepository.ts");
  const messages = source("src/lib/server/support/internalChatRepository.ts");
  const routing = source("src/lib/server/support/supportChatRoutingRepository.ts");

  assert.match(migration, /support_chat_events_milestone_unique_idx/);
  assert.match(migration, /close_reason/);
  assert.match(customerClose, /closeReason: "customer"/);
  assert.match(agentClose, /closeReason: "agent"/);
  assert.match(messages, /eventType: "first_response"/);
  assert.match(messages, /eventType: chat.assignedUserId \? "transferred" : "assigned"/);
  assert.match(routing, /eventType: "assigned"/);
});

test("chat report is lazy-loaded in a dedicated Performance tab", () => {
  const view = source("src/routes/app/performance/+page.svelte");
  const panel = source("src/lib/components/operations/SupportChatPerformancePanel.svelte");

  assert.match(view, /activeTab === "chats"/);
  assert.match(view, /<SupportChatPerformancePanel/);
  assert.match(panel, /30_000/);
  assert.match(panel, /Aguardando/);
});

test("chat performance respects application light and dark theme tokens", () => {
  const panel = source("src/lib/components/operations/SupportChatPerformancePanel.svelte");

  assert.doesNotMatch(panel, /#(?:[0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})(?![0-9A-Za-z])/);
  assert.doesNotMatch(panel, /\b(?:bg|border|text|divide)-white\b/);
  assert.match(panel, /bg-app-surface/);
  assert.match(panel, /text-app-text/);
  assert.match(panel, /border-app-border/);
  assert.match(panel, /text-app-warning-text/);
  assert.match(panel, /bg-app-info-bg/);
  assert.match(panel, /hover:bg-app-muted/);
});
