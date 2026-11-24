import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (path) => readFileSync(path, "utf8");
const dialog = source("src/lib/components/onboarding/SupportChatDialog.svelte");
const waiting = source("src/lib/server/support/chatWaitingService.ts");
const offer = source("src/lib/components/support/ChatWaitingOffer.svelte");
const portal = source("src/routes/cliente/chamados/novo/+page.server.ts");

test("resume choice requires a positive authenticated server lookup", () => {
  assert.match(dialog, /hasConfirmedActiveChat = payload\?\.active === true/);
  assert.match(dialog, /\{#if authState\.authenticated && !authState\.requiresUnitSelection && hasConfirmedActiveChat\}[\s\S]*?Retomar atendimento<\/button>/);
  assert.match(dialog, /if \(!recovered\) \{\s*hasConfirmedActiveChat = false/);
  assert.match(dialog, /session = null;\s*hasConfirmedActiveChat = false/);
});

test("after-hours customers can open tickets without creating a chat", () => {
  assert.match(dialog, /\{#if status\?\.isOpen === false\}[\s\S]*?href="\/cliente\/chamados\/novo"/);
  assert.match(portal, /requireCustomerF10PortalSession/);
  assert.match(portal, /createCustomerF10Ticket\(session,/);
});

test("eligible chats can convert outside hours independently of waiting rules", () => {
  assert.match(waiting, /if \(!canConvert\) return \{ waitingSinceMs, offerTicket: false \}/);
  assert.match(waiting, /const delayedOffer = settings\.enabled && settings\.offerTicket/);
  assert.match(waiting, /offerTicket: availability\?\.isOpen === false/);
  assert.match(offer, /outsideSupportHours \? "Fora do horário de atendimento"/);
  assert.match(offer, /outsideSupportHours \? `f10:chat-wait:/);
});
