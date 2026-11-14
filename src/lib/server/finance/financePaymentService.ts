import { sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { getConfiguredF10UnitId } from "$lib/server/integrations/f10/f10CustomerApi";
import {
  isExistingPixPayable,
  normalizePaymentInstallments,
  normalizePayerDocument,
  positivePaymentId,
  requirePaymentRecord,
  type FinanceInstallment,
} from "$lib/server/finance/financePaymentParsing";
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

type DatabaseRow = {
  contractId: string;
  contractNumber: string | null;
  personId: string | null;
};

function parseContracts(rows: DatabaseRow[]): FinanceContract[] {
  return rows.flatMap((row) => {
    const id = positivePaymentId(row.contractId);
    const personId = positivePaymentId(row.personId);
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

async function authorizePaymentContract(
  selected: FinanceContract,
  document: string,
  birth: string,
): Promise<string> {
  const cleanedDocument = normalizePayerDocument(document, birth);
  const token = await validateF10PaymentPayer({
    unitId: getConfiguredF10UnitId(),
    personId: selected.personId,
    document: cleanedDocument,
    birth,
  });

  const rawContracts = await listF10PaymentContracts(token);
  if (!Array.isArray(rawContracts)) throw new Error("FINANCE_RESPONSE_INVALID");
  const authorized = rawContracts.some((item) => {
    const contract = requirePaymentRecord(item);
    return positivePaymentId(contract.contrato_id) === selected.id
      && positivePaymentId(contract.pessoa_id) === selected.personId;
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
  const data = requirePaymentRecord(await listF10PaymentInstallments(token, selected.id));
  const open = normalizePaymentInstallments(data.abertas, false);
  const paid = normalizePaymentInstallments(data.pagas, true);
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
  const installments = requirePaymentRecord(await listF10PaymentInstallments(token, selected.id));
  const open = normalizePaymentInstallments(installments.abertas, false);
  const installment = open.find((item) => item.receivableId === receivableId && item.payable);
  if (!installment) throw new Error("FINANCE_PIX_UNAVAILABLE");

  const detail = requirePaymentRecord(await getF10PaymentInstallment(token, receivableId));
  const code = typeof detail.qrcode_text === "string" ? detail.qrcode_text.trim() : "";
  if (!isExistingPixPayable(detail, selected.id, receivableId)) {
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
