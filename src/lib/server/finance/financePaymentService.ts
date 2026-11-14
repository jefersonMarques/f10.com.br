import { sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { getConfiguredF10UnitId } from "$lib/server/integrations/f10/f10CustomerApi";
import {
  getF10PaymentInstallment,
  listF10PaymentContracts,
  listF10PaymentInstallments,
  validateF10PaymentPayer,
} from "$lib/server/integrations/f10/f10PaymentClient";

export type FinanceContract = {
  id: number;
  number: string;
  personId: number;
};

export type FinanceInstallment = {
  receivableId: number;
  installment: number;
  amount: string;
  dueDate: string;
  paid: boolean;
  payable: boolean;
};

type DatabaseRow = {
  contractId: string;
  contractNumber: string | null;
  personId: string | null;
};

function positiveId(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseContracts(rows: DatabaseRow[]): FinanceContract[] {
  return rows.flatMap((row) => {
    const id = positiveId(row.contractId);
    const personId = positiveId(row.personId);
    if (!id || !personId) return [];
    return [{
      id,
      number: row.contractNumber?.trim() || String(id),
      personId,
    }];
  });
}

export async function listCustomerFinanceContracts(contactId: string): Promise<FinanceContract[]> {
  const unitId = getConfiguredF10UnitId();
  const result = await getDatabase().execute(sql`
    SELECT contract.contract_id::text AS "contractId",
      contract.numero_contrato AS "contractNumber",
      contract.pessoa_id::text AS "personId"
    FROM customer_contract_access access
    JOIN f10_customer_contracts contract
      ON contract.unit_id = access.unit_id
      AND contract.contract_id = access.contract_id
    WHERE access.customer_contact_id = ${contactId}::uuid
      AND access.unit_id = ${unitId}
    ORDER BY contract.numero_contrato, contract.contract_id
    LIMIT 100
  `);
  return parseContracts(result as unknown as DatabaseRow[]);
}

export async function listTicketFinanceContracts(ticketId: string): Promise<FinanceContract[]> {
  const unitId = getConfiguredF10UnitId();
  const result = await getDatabase().execute(sql`
    SELECT contract.contract_id::text AS "contractId",
      contract.numero_contrato AS "contractNumber",
      contract.pessoa_id::text AS "personId"
    FROM ticket_contract_links link
    JOIN f10_customer_contracts contract
      ON contract.unit_id = link.unit_id
      AND contract.contract_id = link.contract_id
    JOIN tickets ticket ON ticket.id = link.ticket_id
    WHERE link.ticket_id = ${ticketId}::uuid
      AND ticket.customer_contact_id IS NOT NULL
      AND link.unit_id = ${unitId}
    ORDER BY link.is_primary DESC, contract.numero_contrato
    LIMIT 100
  `);
  return parseContracts(result as unknown as DatabaseRow[]);
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("FINANCE_RESPONSE_INVALID");
  }
  return value as Record<string, unknown>;
}

function normalizeInstallments(value: unknown, paid: boolean): FinanceInstallment[] {
  if (!Array.isArray(value) || value.length > 1000) throw new Error("FINANCE_RESPONSE_INVALID");
  return value.flatMap((item) => {
    const row = record(item);
    const receivableId = positiveId(row.receber_id);
    const installment = positiveId(row.parcela);
    if (!receivableId || !installment) return [];
    return [{
      receivableId,
      installment,
      amount: typeof row.calculo === "string" ? row.calculo : String(row.valor ?? ""),
      dueDate: typeof row.vencimento === "string" ? row.vencimento : "",
      paid,
      payable: !paid && row.pago === false && row.pagavel === true,
    }];
  });
}

function validateDocument(document: string, birth: string): string {
  const digits = document.replace(/\D/g, "");
  if (digits.length !== 11 && digits.length !== 14) {
    throw new Error("FINANCE_DOCUMENT_INVALID");
  }
  if (birth && !/^\d{2}\/\d{2}\/\d{4}$/.test(birth)) {
    throw new Error("FINANCE_BIRTH_INVALID");
  }
  return digits;
}

async function authorizePaymentContract(
  selected: FinanceContract,
  document: string,
  birth: string,
): Promise<string> {
  const cleanedDocument = validateDocument(document, birth);
  const token = await validateF10PaymentPayer({
    unitId: getConfiguredF10UnitId(),
    personId: selected.personId,
    document: cleanedDocument,
    birth,
  });

  const rawContracts = await listF10PaymentContracts(token);
  if (!Array.isArray(rawContracts)) throw new Error("FINANCE_RESPONSE_INVALID");
  const authorized = rawContracts.some((item) => {
    const contract = record(item);
    return positiveId(contract.contrato_id) === selected.id
      && positiveId(contract.pessoa_id) === selected.personId;
  });
  if (!authorized) throw new Error("FINANCE_CONTRACT_NOT_AUTHORIZED");
  return token;
}

export async function consultFinanceInstallments(
  selected: FinanceContract,
  document: string,
  birth: string,
): Promise<{ open: FinanceInstallment[]; paid: FinanceInstallment[] }> {
  const token = await authorizePaymentContract(selected, document, birth);
  const data = record(await listF10PaymentInstallments(token, selected.id));
  const open = normalizeInstallments(data.abertas, false);
  const paid = normalizeInstallments(data.pagas, true);
  return { open, paid };
}

export async function consultFinancePix(
  selected: FinanceContract,
  receivableId: number,
  document: string,
  birth: string,
): Promise<{
  receivableId: number;
  installment: number;
  amount: string;
  dueDate: string;
  expiresAt: string | null;
  copyPaste: string;
}> {
  const token = await authorizePaymentContract(selected, document, birth);
  const installments = record(await listF10PaymentInstallments(token, selected.id));
  const open = normalizeInstallments(installments.abertas, false);
  const installment = open.find((item) => item.receivableId === receivableId && item.payable);
  if (!installment) throw new Error("FINANCE_PIX_UNAVAILABLE");

  const detail = record(await getF10PaymentInstallment(token, receivableId));
  const code = typeof detail.qrcode_text === "string" ? detail.qrcode_text.trim() : "";
  if (
    positiveId(detail.receber_id) !== receivableId ||
    positiveId(detail.contrato_id) !== selected.id ||
    detail.pago !== false ||
    detail.pix !== true ||
    detail.expirado !== false ||
    code.length < 20 ||
    code.length > 2500
  ) {
    throw new Error("FINANCE_PIX_UNAVAILABLE");
  }

  return {
    receivableId,
    installment: installment.installment,
    amount: typeof detail.calculo === "string" ? detail.calculo
      : typeof detail.valor === "string" ? detail.valor : installment.amount,
    dueDate: typeof detail.vencimento === "string" ? detail.vencimento : installment.dueDate,
    expiresAt: typeof detail.validade === "string" ? detail.validade : null,
    copyPaste: code,
  };
}
