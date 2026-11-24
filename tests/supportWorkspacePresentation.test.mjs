import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { supportTabClass } from "../src/lib/support/supportWorkspacePresentation.ts";

const chat = readFileSync("src/routes/app/chat/[sessionId]/+page.svelte", "utf8");
const inbox = readFileSync("src/lib/components/support/ChatInbox.svelte", "utf8");
const ticket = readFileSync("src/lib/components/operations/tickets/TicketDetails.svelte", "utf8");
const ticketWorkspace = readFileSync("src/routes/app/tickets/+page.svelte", "utf8");

test("chat and ticket use the same split workspace dimensions and navigation styling", () => {
  const columns = "lg:grid-cols-[minmax(330px,390px)_minmax(0,1fr)]";
  assert.ok(inbox.includes(columns));
  assert.ok(ticketWorkspace.includes(columns));
  assert.ok(inbox.includes("divide-y divide-[var(--app-border-soft)]"));
  assert.ok(chat.includes("supportTabClass"));
  assert.ok(ticket.includes("supportTabClass as tabClass"));
  assert.match(supportTabClass("customer", "customer"), /border-\[var\(--app-primary\)\]/);
  assert.match(supportTabClass("customer", null), /border-transparent/);
});

test("context navigation keeps the conversation mounted and restores its scroll", () => {
  assert.ok(chat.includes('activeContextPanel === null ? "flex min-h-0 flex-1 flex-col" : "hidden"'));
  assert.ok(chat.includes("savedScrollTop"));
  assert.ok(chat.includes("savedNearBottom"));
  assert.ok(chat.includes("data-chat-panel-navigation"));
  assert.ok(chat.includes("<TicketRichTextEditor"));
  assert.ok(chat.includes("<MentionTextarea"));
  assert.ok(chat.includes("<MessageActionMenu"));
  assert.ok(chat.includes("rounded-br-md bg-[var(--app-info-bg)]"));
});
