import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canAssignTaskUser } from "../src/lib/tasks/taskAssignmentPolicy.ts";

function source(path) {
  return readFileSync(path, "utf8");
}

test("task assignment respects own, team, and all permissions", () => {
  const colleagues = new Set(["team-member"]);
  assert.equal(canAssignTaskUser(undefined, "owner", "owner", colleagues), true);
  assert.equal(canAssignTaskUser(undefined, "owner", "team-member", colleagues), false);
  assert.equal(canAssignTaskUser("own", "owner", "team-member", colleagues), false);
  assert.equal(canAssignTaskUser("team", "owner", "team-member", colleagues), true);
  assert.equal(canAssignTaskUser("team", "owner", "outsider", colleagues), false);
  assert.equal(canAssignTaskUser("all", "owner", "outsider", colleagues), true);
});

test("assignment is checked on the server and filtered by active project membership", () => {
  const service = source("src/lib/server/tasks/taskAssigneeAccess.ts");
  const create = source("src/lib/server/tasks/taskWorkRepository.ts");
  const route = source("src/routes/api/app/messages/tasks/+server.ts");

  assert.ok(service.includes('member.status === "active"'));
  assert.ok(service.includes("teamMembers"));
  assert.ok(service.includes("teams.active"));
  assert.ok(create.includes("TASK_ASSIGNEE_NOT_ALLOWED"));
  assert.ok(create.includes("listAssignableTaskMembers"));
  assert.ok(route.includes("listAssignableTaskMembers"));
  assert.ok(route.includes('"tasks.create"'));
});

test("performance permission independently protects route and APIs", () => {
  const migration = source("migrations/0118_performance_permission.sql");
  const permissionCodes = source("src/lib/server/auth/permissions.ts");
  const performancePage = source("src/routes/app/performance/+page.server.ts");
  const presenceApi = source("src/routes/api/app/performance/presence/+server.ts");
  const avatarApi = source("src/routes/api/app/performance/avatar/[userId]/+server.ts");
  const sidebar = source("src/lib/components/application/ApplicationSidebar.svelte");

  assert.ok(migration.includes("INSERT INTO role_permissions"));
  assert.ok(migration.includes("INSERT INTO user_permissions"));
  assert.ok(permissionCodes.includes('"performance.view"'));
  for (const file of [performancePage, presenceApi, avatarApi, sidebar]) {
    assert.ok(file.includes("performance.view"));
  }
});

test("avatars are private and shared across team, performance, and tickets", () => {
  const avatarEndpoint = source("src/routes/api/app/users/[userId]/avatar/+server.ts");
  const avatarComponent = source("src/lib/components/application/UserAvatar.svelte");
  const team = source("src/routes/app/team/+page.svelte");
  const performance = source("src/routes/app/performance/+page.svelte");
  const tickets = source("src/lib/components/operations/tickets/TicketDetails.svelte");

  assert.ok(avatarEndpoint.includes("requireAppAnyPermission"));
  assert.ok(avatarEndpoint.includes("getUserAvatarResponse"));
  assert.ok(avatarComponent.includes("on:error"));
  for (const file of [team, performance, tickets]) {
    assert.ok(file.includes("<UserAvatar"));
  }
});

test("message toolbar floats outside its message bubble", () => {
  const menu = source("src/lib/components/support/MessageActionMenu.svelte");
  assert.ok(menu.includes("absolute -top-3 right-1.5"));
  assert.ok(menu.includes("h-7 w-7"));
  assert.ok(menu.includes("canCreateTask"));
  assert.ok(menu.includes("Tarefa gerada"));
});
