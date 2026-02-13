// src/lib/legal/f10Terms/index.ts

import {
  F10_TERMS_VERSION as V2025_10_06,
  f10TermsHtmlTemplate as T2025_10_06,
} from "./v2026_02_12";

export type F10TermsVersion = typeof V2025_10_06;

export const LATEST_F10_TERMS_VERSION: F10TermsVersion = V2025_10_06;

/**
 * Parâmetros opcionais para preencher placeholders do texto.
 * Se não vier, o placeholder fica como fallback (bom pra não quebrar fluxo).
 */
export type F10TermsParams = {
  clientLegalName?: string;
  clientCnpj?: string;
  clientAddress?: string;
  clientNeighborhood?: string;
  clientCity?: string;
  clientState?: string;
};

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeAndEscape(value: string): string {
  return escapeHtml(normalizeSpaces(value));
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  // Substitui {{PLACEHOLDER}} por valores.
  return template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_match, key: string) => {
    return vars[key] ?? `{{${key}}}`;
  });
}

export function getF10TermsText(
  params: F10TermsParams = {},
  version: F10TermsVersion = LATEST_F10_TERMS_VERSION
): { version: F10TermsVersion; text: string } {
  const template = version === V2025_10_06 ? T2025_10_06 : T2025_10_06;

  const vars: Record<string, string> = {
    CLIENT_LEGAL_NAME: params.clientLegalName
      ? normalizeAndEscape(params.clientLegalName)
      : "-",
    CLIENT_CNPJ: params.clientCnpj ? normalizeAndEscape(params.clientCnpj) : "-",
    CLIENT_ADDRESS: params.clientAddress ? normalizeAndEscape(params.clientAddress) : "-",
    CLIENT_NEIGHBORHOOD: params.clientNeighborhood ? normalizeAndEscape(params.clientNeighborhood) : "-",
    CLIENT_CITY: params.clientCity ? normalizeAndEscape(params.clientCity) : "-",
    CLIENT_STATE: params.clientState ? normalizeAndEscape(params.clientState) : "-",
  };

  return {
    version,
    text: renderTemplate(template, vars),
  };
}