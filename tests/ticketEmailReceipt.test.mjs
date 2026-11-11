import assert from "node:assert/strict";
import test from "node:test";
import {
  createTicketEmailReceiptContent,
  excerptTicketEmail,
  isEligibleTicketReceiptSender,
} from "../src/lib/support/ticketEmailReceipt.ts";

test("confirmation goes to the original inbound sender, not a linked customer", () => {
  const content = createTicketEmailReceiptContent({
    sender: { email: "  Rafael@School.example  ", name: "Rafael" },
    ticketNumber: 43217,
    subject: "Testes 11.11",
    messageBody: "Gostaria de ajuda com o sistema.",
  });

  assert.equal(content?.recipientEmail, "rafael@school.example");
  assert.equal(content?.recipientName, "Rafael");
  assert.equal(content?.greeting, "Olá, Rafael.");
  assert.equal(content?.subject, "[#43217] Recebemos sua solicitação — Testes 11.11");
  assert.equal(content?.originalExcerpt, "Gostaria de ajuda com o sistema.");
});

test("receipt excludes automated senders and configured reply mailbox", () => {
  for (const email of [
    "no-reply@example.com",
    "noreply@example.com",
    "mailer-daemon@example.com",
    "postmaster@example.com",
    "bounce@example.com",
    "ticket+abcd@reply.f10.com.br",
    "invalid@example",
  ]) {
    assert.equal(isEligibleTicketReceiptSender(email), false, email);
  }

  assert.equal(isEligibleTicketReceiptSender("customer@example.com"), true);
  assert.equal(isEligibleTicketReceiptSender("sender@mail.inbound.example", "mail.inbound.example"), false);
});

test("receipt avoids empty or excessively long original messages", () => {
  assert.equal(excerptTicketEmail("  \r\n\r\n  "), null);
  assert.equal(excerptTicketEmail(" First \r\n second "), "First second");
  assert.ok((excerptTicketEmail("A".repeat(300)) ?? "").length <= 240);
});

test("empty sender names use a neutral greeting", () => {
  const content = createTicketEmailReceiptContent({
    sender: { email: "customer@example.com", name: null },
    ticketNumber: 18,
    subject: "Dúvida",
    messageBody: "",
  });
  assert.equal(content?.greeting, "Olá!");
  assert.equal(content?.originalExcerpt, null);
});

test("automated inbound mail never generates an acknowledgment", () => {
  const content = createTicketEmailReceiptContent({
    sender: { email: "noreply@example.com", name: "Automatic" },
    ticketNumber: 18,
    subject: "Automatic",
    messageBody: "Notified",
  });
  assert.equal(content, null);
});
