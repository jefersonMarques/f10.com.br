import assert from "node:assert/strict";
import test from "node:test";
import { buildTicketCustomerOverview } from "../src/lib/support/ticketCustomerOverview.ts";

const defaultSource = {
  channel: "email",
  customerContactId: null,
  customerName: null,
  customerEmail: null,
  organizationName: null,
  commercialUnit: null,
  customerContext: null,
  emailSender: { name: "Original sender", email: "sender@example.test" },
  requesterOverride: null,
  portalLoginEmail: null,
  commercialEmail: null,
  suggestedUnit: null,
};

test("an email ticket shows original sender without a linked contact", () => {
  const overview = buildTicketCustomerOverview(defaultSource);
  assert.equal(overview.requesterName, "Original sender");
  assert.equal(overview.requesterEmail, "sender@example.test");
  assert.equal(overview.requesterSource, "email");
  assert.equal(overview.requesterContactId, null);
});

test("commercial customer and requester remain independent", () => {
  const overview = buildTicketCustomerOverview({
    ...defaultSource,
    customerContactId: "99999999-9999-4999-8999-999999999999",
    customerName: "Registered requester",
    customerEmail: "registered@example.test",
    commercialUnit: {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Commercial unit",
      contractNumber: "528",
    },
    commercialEmail: { email: "client@example.test", kind: "general" },
  });

  assert.equal(overview.clientName, "Commercial unit");
  assert.equal(overview.clientEmail, "client@example.test");
  assert.equal(overview.contractNumber, "528");
  assert.equal(overview.requesterEmail, "sender@example.test");
  assert.equal(overview.requesterName, "Original sender");
});

test("an explicit contact and manual display override take precedence", () => {
  const overview = buildTicketCustomerOverview({
    ...defaultSource,
    requesterOverride: {
      contactId: "22222222-2222-4222-8222-222222222222",
      displayName: "Ticket requester",
      displayEmail: "ticket@example.test",
      contactName: "Contact register",
      contactEmail: "contact@example.test",
    },
  });

  assert.equal(overview.requesterSource, "manual");
  assert.equal(overview.requesterContactId, "22222222-2222-4222-8222-222222222222");
  assert.equal(overview.requesterName, "Ticket requester");
  assert.equal(overview.requesterEmail, "ticket@example.test");
});

test("a portal identity supplies its own requester email and F10 context", () => {
  const overview = buildTicketCustomerOverview({
    ...defaultSource,
    channel: "portal",
    emailSender: null,
    customerContactId: null,
    customerContext: { unitName: "School B", legacyUserId: "309486" },
    portalLoginEmail: "portal@example.test",
  });

  assert.equal(overview.clientName, "School B");
  assert.equal(overview.requesterEmail, "portal@example.test");
  assert.equal(overview.legacyUserId, "309486");
  assert.equal(overview.requesterSource, "portal");
});

test("commercial candidate is only a suggestion and not treated as confirmed", () => {
  const overview = buildTicketCustomerOverview({
    ...defaultSource,
    suggestedUnit: {
      id: "33333333-3333-4333-8333-333333333333",
      name: "Old unit",
      contractNumber: "321",
    },
  });

  assert.equal(overview.contractNumber, null);
  assert.equal(overview.suggestedUnit?.contractNumber, "321");
});

test("the saved commercial unit hides historical suggestions", () => {
  const overview = buildTicketCustomerOverview({
    ...defaultSource,
    commercialUnit: {
      id: "44444444-4444-4444-8444-444444444444",
      name: "Confirmed unit",
      contractNumber: "555",
    },
    suggestedUnit: {
      id: "55555555-5555-4555-8555-555555555555",
      name: "Older unit",
      contractNumber: "123",
    },
  });
  assert.equal(overview.contractNumber, "555");
  assert.equal(overview.suggestedUnit, null);
});
