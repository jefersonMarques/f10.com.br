import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("message tasks have an atomic origin link and idempotent request key", () => {
  const migration = read("migrations/0117_support_message_task_links.sql");
  const taskRepository = read("src/lib/server/tasks/taskWorkRepository.ts");

  assert.match(migration, /source_kind text NOT NULL/);
  assert.match(migration, /request_key uuid NOT NULL UNIQUE/);
  assert.match(taskRepository, /pg_advisory_xact_lock/);
  assert.match(taskRepository, /supportMessageTaskLinks/);
  assert.match(taskRepository, /ticketTaskLinks/);
  assert.match(taskRepository, /internalNotifications/);
});

test("new tasks validate message access and project assignees on the server", () => {
  const endpoint = read("src/routes/api/app/messages/tasks/+server.ts");
  assert.match(endpoint, /requireAppPermission/);
  assert.match(endpoint, /"tasks.create"/);
  assert.match(endpoint, /getInternalChat/);
  assert.match(endpoint, /getSupportTicket/);
  assert.match(endpoint, /ensureTaskProjectAccess/);
  assert.match(endpoint, /listProjectMembers/);
  assert.match(endpoint, /eq\(users.status, "active"\)/);
  assert.match(endpoint, /createTask\(session.user.id, permissions/);
});

test("chat conversion preserves message task origins and ticket links", () => {
  const bridge = read("src/lib/server/support/chatTicketBridge.ts");
  assert.match(bridge, /UPDATE support_message_task_links/);
  assert.match(bridge, /INSERT INTO ticket_task_links/);
});

test("popover creates a task and message menu links to it", () => {
  const popover = read("src/lib/components/support/MessageTaskPopover.svelte");
  const menu = read("src/lib/components/support/MessageActionMenu.svelte");
  assert.match(popover, /requestKey/);
  assert.match(popover, //api/app/messages/tasks/);
  assert.match(popover, /Responsável/);
  assert.match(menu, /Tarefa gerada/);
  assert.match(menu, //app/tasks//);
});
