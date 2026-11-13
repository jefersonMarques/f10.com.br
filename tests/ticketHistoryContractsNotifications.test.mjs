import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path) {
  return readFileSync(path, "utf8");
}

test("tickets default to newest creation date", () => {
  const workspace = source("src/lib/server/support/ticketWorkspaceRepository.ts");
  const loader = source("src/routes/app/tickets/+page.server.ts");
  const page = source("src/routes/app/tickets/+page.svelte");
  assert.match(loader, /return "created_desc"/);
  assert.match(workspace, /desc\(tickets\.createdAt\)/);
  assert.match(page, /sort !== "created_desc"/);
});

test("contract search supports API-sourced contract numbers", () => {
  const search = source("src/routes/api/app/customers/contracts/search/+server.ts");
  const repository = source("src/lib/server/support/f10TicketContractRepository.ts");
  const card = source("src/lib/components/operations/tickets/TicketCustomerCard.svelte");
  const inline = source("src/lib/components/operations/tickets/TicketRelationshipsInline.svelte");

  assert.match(search, /\^\[0-9\]\$/);
  assert.match(repository, /c\.numero_contrato = \$\{query\}/);
  assert.match(card, /Buscar contrato F10/);
  assert.match(card, /onManageContracts/);
  assert.match(inline, /focusContracts/);
  assert.match(inline, /Pesquisar empresas para vincular/);
});

test("Helpdesk F10 identity is used on the internal login", () => {
  const login = source("src/routes/login/+page.svelte");
  assert.match(login, /Helpdesk F10/);
  assert.match(login, /\/branding\/f10-helpdesk\.webp/);
  assert.doesNotMatch(login, /Acessar F10 Operations/);
});

test("participant email notifications are opt-in and require every contract", () => {
  const repository = source("src/lib/server/support/customerContractAccessRepository.ts");
  const route = source("src/routes/api/app/tickets/[ticketId]/relationships/+server.ts");
  const email = source("src/lib/server/support/ticketEmailService.ts");
  const ui = source("src/lib/components/operations/tickets/TicketRelationshipsInline.svelte");
  assert.match(repository, /updateTicketParticipantNotifications/);
  assert.match(repository, /SUPPORT_PARTICIPANT_CONTRACT_FORBIDDEN/);
  assert.match(route, /setParticipantNotifications/);
  assert.match(email, /participant\.notifications_enabled = true/);
  assert.match(email, /participant\.portal_access_enabled = true/);
  assert.match(email, /NOT EXISTS \(\s*SELECT 1 FROM ticket_contract_links/);
  assert.match(email, /sendTicketParticipantUpdateEmails/);
  assert.match(ui, /notificationsEnabled:\s*event\.currentTarget\.checked/);
});
