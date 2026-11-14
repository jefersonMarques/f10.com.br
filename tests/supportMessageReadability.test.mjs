import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("shared renderer uses readable typography and spacing", () => {
  const source = readFileSync("src/lib/components/support/SupportChatMarkdown.svelte", "utf8");
  assert.match(source, /space-y-2 break-words/);
  assert.match(source, /text-\[14px\] leading-\[1\.75\]/);
});

test("chat and ticket views distinguish dates and render attachments safely", () => {
  const chat = readFileSync("src/routes/app/chat/[sessionId]/+page.svelte", "utf8");
  const ticket = readFileSync("src/routes/cliente/chamados/[ticketId]/+page.svelte", "utf8");
  assert.match(chat, /calendarDay/);
  assert.match(chat, /SupportChatMarkdown text=\{message\.body\} size="md"/);
  assert.match(ticket, /SupportChatMarkdown text=\{entry\.message\.body\}/);
  assert.match(ticket, /attachment\.mimeType\?\.startsWith\("image\/"\)/);
});
