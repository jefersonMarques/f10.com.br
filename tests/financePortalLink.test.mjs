import assert from "node:assert/strict";
import test from "node:test";
import { resolveF10CustomerPortalLink } from "../src/lib/server/finance/financePortalLink.ts";

const portalLink = "https://r.f10.com.br/RFJHBM";

test("uses one payer portal link across paid and open installments", () => {
  const installments = [
    { contrato_id: 588, parcela: 1, quitacao: "2026-10-26", link_pagamento_aluno: portalLink },
    { contrato_id: 588, parcela: 2, quitacao: null, link_pagamento_aluno: portalLink },
    { contrato_id: 588, parcela: 3, link_pagamento_aluno: null },
  ];

  assert.equal(resolveF10CustomerPortalLink(installments, 588), portalLink);
});

test("uses the student payment link instead of the holder link", () => {
  assert.equal(resolveF10CustomerPortalLink([{
    contrato_id: 588,
    link_pagamento_aluno: portalLink,
    link_pagamento_titular: "https://r.f10.com.br/XAT9AN",
  }], 588), portalLink);
});

test("does not fall back to the holder link when the student link is absent", () => {
  assert.throws(
    () => resolveF10CustomerPortalLink([{
      contrato_id: 588,
      link_pagamento_aluno: null,
      link_pagamento_titular: "https://r.f10.com.br/XAT9AN",
    }], 588),
    /FINANCE_PORTAL_UNAVAILABLE/,
  );
});

test("rejects links to another contract or different payer portals", () => {
  assert.throws(
    () => resolveF10CustomerPortalLink([{ contrato_id: 118, link_pagamento_aluno: portalLink }], 588),
    /FINANCE_PORTAL_LINK_INVALID/,
  );
  assert.throws(
    () => resolveF10CustomerPortalLink([
      { contrato_id: 588, link_pagamento_aluno: portalLink },
      { contrato_id: 588, link_pagamento_aluno: "https://r.f10.com.br/ANOTHER" },
    ], 588),
    /FINANCE_PORTAL_LINK_AMBIGUOUS/,
  );
});

test("rejects untrusted or manipulated portal URLs", () => {
  const blockedLinks = [
    "http://r.f10.com.br/XAT9AN",
    "https://r.f10.com.br.evil.test/XAT9AN",
    "https://r.f10.com.br@evil.test/XAT9AN",
    "https://r.f10.com.br:444/XAT9AN",
    "https://r.f10.com.br/XAT9AN?redirect=evil",
    "https://r.f10.com.br/XAT9AN#test",
    "https://r.f10.com.br/",
    "javascript:alert(1)",
  ];

  for (const link of blockedLinks) {
    assert.throws(
      () => resolveF10CustomerPortalLink([
        { contrato_id: 588, link_pagamento_aluno: link },
      ], 588),
      /FINANCE_PORTAL_LINK_INVALID/,
      link,
    );
  }
});

test("fails closed for missing links or malformed API responses", () => {
  assert.throws(
    () => resolveF10CustomerPortalLink([{ contrato_id: 588, link_pagamento_aluno: null }], 588),
    /FINANCE_PORTAL_UNAVAILABLE/,
  );
  assert.throws(() => resolveF10CustomerPortalLink([], 588), /FINANCE_PORTAL_UNAVAILABLE/);
  assert.throws(() => resolveF10CustomerPortalLink({}, 588), /FINANCE_PORTAL_LINK_INVALID/);
  assert.throws(() => resolveF10CustomerPortalLink([null], 588), /FINANCE_RESPONSE_INVALID/);
});
