import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path) {
  return readFileSync(path, "utf8");
}

test("ticket customers are managed inline without requiring another page", () => {
  const details = source("src/lib/components/operations/tickets/TicketDetails.svelte");
  const inline = source("src/lib/components/operations/tickets/TicketRelationshipsInline.svelte");
  assert.ok(details.includes("<TicketRelationshipsInline"));
  assert.ok(!details.includes("Gerenciar empresas e pessoas"));
  assert.ok(inline.includes("Empresas vinculadas"));
  assert.ok(inline.includes("Pessoas acompanhantes"));
  assert.ok(inline.includes("Autorizar e vincular"));
  assert.ok(inline.includes("onRefresh"));
});

test("ticket history is visible before collaboration, with a compact expansion control", () => {
  const details = source("src/lib/components/operations/tickets/TicketDetails.svelte");
  const history = details.indexOf("Histórico do ticket");
  const collaboration = details.indexOf("Colaboração e etiquetas");
  assert.ok(history > 0);
  assert.ok(collaboration > history);
  assert.ok(details.includes("historyExpanded"));
  assert.ok(details.includes("ticketData.details.events.slice(0, 6)"));
  assert.ok(!details.includes('<summary class="flex cursor-pointer list-none items-center justify-between gap-3">'));
});

test("quick ticket menu supports multiple labels and inline creation", () => {
  const list = source("src/lib/components/operations/tickets/TicketList.svelte");
  const page = source("src/routes/app/tickets/+page.svelte");
  assert.ok(list.includes("onCreateLabel"));
  assert.ok(list.includes("createQuickLabel"));
  assert.ok(list.includes("justAddedLabels"));
  assert.ok(list.includes("Nova"));
  assert.ok(page.includes("createQuickTicketLabel"));
  assert.ok(page.includes("onCreateLabel={data.canReply ? createQuickTicketLabel : null}"));
  assert.ok(page.includes('deserialize(await response.text())'));
});

test("filter and header menus close outside and stay inside screen bounds", () => {
  const toolbar = source("src/lib/components/operations/tickets/TicketToolbar.svelte");
  const header = source("src/routes/app/+layout.svelte");
  const list = source("src/lib/components/operations/tickets/TicketList.svelte");
  assert.ok(toolbar.includes("closeFilterOnOutside"));
  assert.ok(toolbar.includes("bind:open={filterOpen}"));
  assert.ok(toolbar.includes("filterLeft = Math.max"));
  assert.ok(toolbar.includes("max-h-[calc(100dvh-24px)]"));
  assert.ok(header.includes("closeMenusOnOutside"));
  assert.ok(header.includes("closeMenusOnEscape"));
  assert.ok(header.includes("closeMenusOnPageScroll"));
  assert.ok(list.includes("repositionMenu()"));
});

test("contract and participant modifications are scoped to ticket and validated server-side", () => {
  const route = source("src/routes/api/app/tickets/[ticketId]/relationships/+server.ts");
  const repository = source("src/lib/server/support/customerContractAccessRepository.ts");
  assert.ok(route.includes("requireTicketAccess"));
  assert.ok(route.includes('hasPermission(permissions, "customers.manage", "all")'));
  assert.ok(route.includes("addTicketContract"));
  assert.ok(route.includes("removeTicketCustomerParticipant"));
  assert.ok(repository.includes("SUPPORT_TICKET_CONTRACT_FORBIDDEN"));
  assert.ok(repository.includes("saveTicketContracts("));
  assert.ok(repository.includes("grantToRequester"));
});
