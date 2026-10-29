import type { CustomerImportRecord } from "./customerImportFile";

// Datas numéricas na planilha são serializadas pelo Excel (base 1899-12-30).
export function normalizeCustomerSheetDate(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  if (/^\d{1,5}$/.test(text)) {
    const days = Number(text);
    if (!Number.isInteger(days) || days < 1 || days > 73050) return null;
    return new Date(Date.UTC(1899, 11, 30) + days * 86400000)
      .toISOString().slice(0, 10);
  }
  return null;
}

export function toF10CommercialRecord(record: CustomerImportRecord) {
  return {
    ...record,
    // Aluno é o cliente/conta; Titular identifica a unidade quando preenchido.
    apelido: (record.holderName || record.unitName).trim(),
    cancellationDate: normalizeCustomerSheetDate(record.cancellationDate),
    billingUrl: /^https:\/\//i.test(record.billingUrl) ? record.billingUrl : "",
  };
}
