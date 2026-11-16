import { positivePaymentId, requirePaymentRecord } from "./financePaymentParsing.ts";

const TRUSTED_PORTAL_ORIGIN = "https://r.f10.com.br";
const PORTAL_PATH_PATTERN = /^\/[a-zA-Z0-9_-]{4,128}$/;

function validatePortalUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("FINANCE_PORTAL_LINK_INVALID");
  }
  if (
    url.origin !== TRUSTED_PORTAL_ORIGIN ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash ||
    !PORTAL_PATH_PATTERN.test(url.pathname)
  ) {
    throw new Error("FINANCE_PORTAL_LINK_INVALID");
  }
  return url.href;
}

export function resolveF10CustomerPortalLink(
  value: unknown,
  contractId: number,
): string {
  if (!Number.isSafeInteger(contractId) || contractId <= 0) {
    throw new Error("FINANCE_PORTAL_LINK_INVALID");
  }
  if (!Array.isArray(value) || value.length > 1000) {
    throw new Error("FINANCE_PORTAL_LINK_INVALID");
  }

  let portalLink: string | null = null;
  for (const item of value) {
    const installment = requirePaymentRecord(item);
    if (positivePaymentId(installment.contrato_id) !== contractId) {
      throw new Error("FINANCE_PORTAL_LINK_INVALID");
    }
    const candidate = installment.link_pagamento_aluno;
    if (candidate === null || candidate === undefined || candidate === "") {
      continue;
    }
    if (typeof candidate !== "string") {
      throw new Error("FINANCE_PORTAL_LINK_INVALID");
    }
    const validatedLink = validatePortalUrl(candidate);
    if (portalLink !== null && portalLink !== validatedLink) {
      throw new Error("FINANCE_PORTAL_LINK_AMBIGUOUS");
    }
    portalLink = validatedLink;
  }
  if (portalLink === null) {
    throw new Error("FINANCE_PORTAL_UNAVAILABLE");
  }
  return portalLink;
}
