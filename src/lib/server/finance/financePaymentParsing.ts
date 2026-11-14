export type FinanceContract = {
  id: number;
  number: string;
};

export type FinanceInstallment = {
  receivableId: number;
  installment: number;
  amount: string;
  dueDate: string;
  paid: boolean;
  payable: boolean;
};

export function positivePaymentId(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

export function requirePaymentRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("FINANCE_RESPONSE_INVALID");
  }
  return value as Record<string, unknown>;
}

export function normalizePaymentInstallments(
  value: unknown,
  paid: boolean,
): FinanceInstallment[] {
  if (!Array.isArray(value) || value.length > 1000) {
    throw new Error("FINANCE_RESPONSE_INVALID");
  }

  return value.flatMap((item) => {
    const installment = requirePaymentRecord(item);
    const receivableId = positivePaymentId(installment.receber_id);
    const installmentNumber = positivePaymentId(installment.parcela);
    if (!receivableId || !installmentNumber) return [];

    return [{
      receivableId,
      installment: installmentNumber,
      amount: typeof installment.calculo === "string"
        ? installment.calculo : String(installment.valor ?? ""),
      dueDate: typeof installment.vencimento === "string" ? installment.vencimento : "",
      paid,
      payable: !paid && installment.pago === false && installment.pagavel === true,
    }];
  });
}

export function normalizePayerDocument(document: string, birth: string): string {
  const digits = document.replace(/\D/g, "");
  if (digits.length !== 11 && digits.length !== 14) {
    throw new Error("FINANCE_DOCUMENT_INVALID");
  }
  if ((digits.length === 11 && !birth) || (birth && !/^\d{2}\/\d{2}\/\d{4}$/.test(birth))) {
    throw new Error("FINANCE_BIRTH_INVALID");
  }
  return digits;
}

export function isExistingPixPayable(
  detail: Record<string, unknown>,
  contractId: number,
  receivableId: number,
): boolean {
  const code = typeof detail.qrcode_text === "string" ? detail.qrcode_text.trim() : "";
  return positivePaymentId(detail.receber_id) === receivableId
    && positivePaymentId(detail.contrato_id) === contractId
    && detail.pago === false
    && detail.pix === true
    && detail.expirado === false
    && code.length >= 20
    && code.length <= 2500;
}

export function parseF10FinanceContracts(value: unknown): FinanceContract[] {
  if (!Array.isArray(value) || value.length > 1000) {
    throw new Error("FINANCE_RESPONSE_INVALID");
  }

  const contracts = new Map<number, FinanceContract>();

  for (const item of value) {
    const source = requirePaymentRecord(item);
    const id = positivePaymentId(source.contrato_id);
    if (!id) throw new Error("FINANCE_RESPONSE_INVALID");

    const number = typeof source.numero_contrato === "string"
      || typeof source.numero_contrato === "number"
      ? String(source.numero_contrato).trim().slice(0, 100)
      : "";
    const parsedContract = { id, number: number || String(id) };
    const existing = contracts.get(id);
    if (existing && existing.number !== parsedContract.number) {
      throw new Error("FINANCE_RESPONSE_INVALID");
    }

    contracts.set(id, parsedContract);
  }

  return [...contracts.values()];
}

export function parseF10CompanyCandidates(rows: Array<{
  contractId: string | number;
  holderId: string | number | null;
  personId: string | number | null;
}>): { holderId: number; contractIds: Set<number> } {
  if (!rows.length) throw new Error("FINANCE_COMPANY_NOT_LINKED");
  if (rows.length > 50) throw new Error("FINANCE_COMPANY_AMBIGUOUS");

  const contractIds = new Set<number>();
  const holderIds = new Set<number>();
  for (const row of rows) {
    const contractId = positivePaymentId(row.contractId);
    const holderId = positivePaymentId(row.holderId)
      ?? positivePaymentId(row.personId);
    if (!contractId || !holderId) {
      throw new Error("FINANCE_COMPANY_UNRESOLVED");
    }
    contractIds.add(contractId);
    holderIds.add(holderId);
  }

  if (holderIds.size !== 1) throw new Error("FINANCE_COMPANY_AMBIGUOUS");
  return { holderId: [...holderIds][0], contractIds };
}
