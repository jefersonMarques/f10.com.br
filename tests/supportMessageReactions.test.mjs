import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("reactions have four codes and a single per-actor record", () => {
  const migration = read("migrations/0116_support_message_reactions.sql");
  const repository = read("src/lib/server/support/supportMessageReactionRepository.ts");
  const component = read("src/lib/components/support/MessageActionMenu.svelte");

  assert.match(migration, /PRIMARY KEY \(source_kind, message_id, actor_kind, actor_key\)/);
  assert.match(migration, /'like','heart','check','eyes'/);
  assert.match(repository, /toggleMessageReaction/);
  assert.match(repository, /\.for\("update"\)/);
  assert.match(repository, /updated_at = now\(\)/);
  for (const emoji of ["👍", "❤️", "✅", "👀"]) {
    assert.ok(component.includes(emoji));
  }
});

test("reacting requires access and customer notes remain private", () => {
  const app = read("src/routes/api/app/messages/reactions/+server.ts");
  const publicChat = read("src/routes/api/support/chat/[sessionId]/reactions/+server.ts");
  const portal = read("src/routes/cliente/chamados/[ticketId]/+page.server.ts");

  assert.match(app, /requireAppAnyPermission/);
  assert.match(app, /getInternalChat/);
  assert.match(app, /getSupportTicket/);
  assert.match(publicChat, /getAuthenticatedPublicChatCustomer/);
  assert.match(publicChat, /visibility, "public"/);
  assert.match(portal, /getCustomerF10Ticket/);
  assert.match(portal, /details\.messages\.some/);
});

test("chat conversion transfers reactions without losing their message origin", () => {
  const bridge = read("src/lib/server/support/chatTicketBridge.ts");
  assert.match(bridge, /INSERT INTO support_message_reactions/);
  assert.match(bridge, /ON CONFLICT DO NOTHING/);
  assert.match(bridge, /DELETE FROM support_message_reactions/);
});
