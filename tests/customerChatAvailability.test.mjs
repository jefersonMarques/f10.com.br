import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (path) => readFileSync(path, "utf8");
const dialog = source("src/lib/components/onboarding/SupportChatDialog.svelte");
const waiting = source("src/lib/server/support/chatWaitingService.ts");
const offer = source("src/lib/components/support/ChatWaitingOffer.svelte");
const portal = source("src/routes/api/support/chat/ticket/+server.ts");
const start = source("src/routes/api/support/chat/start/+server.ts");
const repository = source("src/lib/server/customerPortal/customerF10TicketRepository.ts");
const bridge = source("src/lib/server/support/chatTicketBridge.ts");

test("resume choice requires a positive authenticated server lookup", () => {
  assert.match(dialog, /hasConfirmedActiveChat = payload\?\.active === true/);
  assert.match(dialog, /\{#if authState\.authenticated && !authState\.requiresUnitSelection && hasConfirmedActiveChat\}[\s\S]*?Retomar atendimento<\/button>/);
  assert.match(dialog, /if \(!recovered\) \{\s*hasConfirmedActiveChat = false/);
  assert.match(dialog, /session = null;\s*hasConfirmedActiveChat = false/);
});

test("assistant exposes support actions during business hours and offers tickets after unresolved requests outside hours", () => {
  assert.match(dialog, /guestOffer: "none" \| "handoff" \| "ticket" = "none"/);
  assert.match(dialog, /\{#if guestOffer !== "none"\}/);
  assert.match(dialog, /isChatEntryVisible\(option, status\)/);
  assert.match(dialog, /\{#each supportEntryOptions as option/);
  assert.match(dialog, /canStartHumanChat\(option, status\)/);
  assert.match(dialog, /canOpenTicket = status\?\.isOpen === true \|\| status\?\.hoursConfigured === false \|\| guestOffer !== "none"/);
  assert.match(start, /canStartHumanChat\(option, availability\)/);
  assert.match(start, /resumeActiveCustomerChatSession\(\{ customerContext \}\)/);
  assert.doesNotMatch(dialog, /href="\/cliente\/chamados\/novo"/);
  assert.match(dialog, /on:click=\{\(\) => void requestTicket\(\)\}/);
  assert.match(dialog, /bind:opened=\{ticketFormOpen\}/);
  assert.match(offer, /"\/api\/support\/chat\/ticket"/);
  assert.match(portal, /getOptionalCustomerF10PortalSession\(cookies\)/);
  assert.match(portal, /isAuthorizedF10Context\(customer, groupId, unitId\)/);
  assert.match(portal, /createCustomerF10Ticket\(customer,/);
  assert.match(repository, /findActiveCustomerChat/);
  assert.match(portal, /error: code \}, \{ status: 409, headers \}/);
  assert.match(start, /error: "SUPPORT_OUTSIDE_HOURS"/);
});

test("eligible chats can convert outside hours independently of waiting rules", () => {
  assert.match(waiting, /if \(!canConvert\) return \{ waitingSinceMs, offerTicket: false \}/);
  assert.match(waiting, /const delayedOffer = settings\.enabled && settings\.offerTicket/);
  assert.match(waiting, /offerTicket: availability\?\.isOpen === false/);
  assert.match(offer, /outsideSupportHours \? "Fora do horário de atendimento"/);
  assert.match(offer, /outsideSupportHours \? `f10:chat-wait:/);
});

test("one form preserves context and prevents repeated submissions", () => {
  assert.match(dialog, /ticketSourceSessionId && session\?\.sessionId !== ticketSourceSessionId/);
  assert.match(dialog, /assistantTranscript=\{ticketAssistantTranscript\}/);
  assert.match(offer, /requestId \|\|= crypto\.randomUUID\(\)/);
  assert.match(offer, /if \(!ready \|\| submitting/);
  assert.match(offer, /Aguardar na fila/);
  assert.match(repository, /if \(existingTicket\) return existingTicket;/);
  assert.match(repository, /\.onConflictDoNothing\(\{ target: tickets\.id \}\)/);
  assert.match(repository, /Histórico do Assistente F10/);
  assert.match(bridge, /Histórico do Assistente F10/);
});
