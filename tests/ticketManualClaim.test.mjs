import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path) {
  return readFileSync(path, "utf8");
}

test("new manual tickets do not assign the creator", () => {
  const repository = source("src/lib/server/support/supportRepository.ts");
  assert.match(repository, /assignedUserId: null,\s*subject: input\.subject/);
  assert.doesNotMatch(repository, /assignedUserId: start \? null : actorUserId/);
});

test("ticket claims require reply and view permissions and compare-and-set assignment", () => {
  const repository = source("src/lib/server/support/supportRepository.ts");
  const claim = repository.split("export async function claimTicket(")[1]?.split("export async function assignTicket(")[0];
  assert.ok(claim);
  assert.match(claim, /requireSupportScope\(permissions, "tickets\.reply"\)/);
  assert.match(claim, /requireSupportScope\(permissions, "tickets\.view"\)/);
  assert.match(claim, /isNull\(tickets\.assignedUserId\)/);
  assert.match(claim, /notInArray\(tickets\.status, \["resolved", "closed"\]\)/);
  assert.match(claim, /TICKET_ALREADY_ASSIGNED/);
  assert.match(claim, /source: "self_claim"/);
});

test("ticket claim action and button only apply to unassigned active tickets", () => {
  const route = source("src/routes/app/tickets/[ticketId]/+page.server.ts");
  const component = source("src/lib/components/operations/tickets/TicketDetails.svelte");
  assert.match(route, /claimTicket: async/);
  assert.match(route, /requireAppPermission\(\s*cookies,\s*"tickets\.reply"/);
  assert.match(route, /TICKET_ALREADY_ASSIGNED/);
  assert.match(component, /!ticketData\.details\.ticket\.assignedUserId/);
  assert.match(component, /"claimTicket", new FormData\(\)/);
  assert.match(component, /Pegar ticket/);
  assert.match(component, /Sem responsável/);
});

test("unassigned ticket notifications reach authorized responders across channels", () => {
  const notifications = source("src/lib/server/support/supportTeamNotifications.ts");
  assert.match(notifications, /\(await listEligibleTicketResponders\(\)\)\.map/);
  assert.match(notifications, /getPermissionScope\(permissions, "tickets\.view"\)/);
  assert.match(notifications, /getPermissionScope\(permissions, "tickets\.reply"\)/);
  assert.doesNotMatch(notifications, /else if \(ticket\.channel === "email"\)/);
});
