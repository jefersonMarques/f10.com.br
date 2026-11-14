import { sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  getConfiguredF10UnitId,
  getF10ContractHolder,
} from "$lib/server/integrations/f10/f10CustomerApi";
import {
  isExistingPixPayable,
  normalizePaymentInstallments,
  parseF10CompanyCandidates,
  parseF10FinanceContracts,
  requirePaymentRecord,
  type FinanceContract,
  type FinanceInstallment,
} from "$lib/server/finance/financePaymentParsing";
import {
  getF10PaymentInstallment,
  listF10PaymentContracts,
  listF10PaymentInstallments,
  validateF10PaymentPayer,
} from "$lib/server/integrations/f10/f10PaymentClient";

export type AuthorizedFinancePayer = {
  token: string;
  contracts: FinanceContract[];
};


type FinanceCandidate = {
  contractId: string;
  holderId: string | null;
};

export type FinanceScope =
  | { kind: "customer"; groupId: number; unitId: number }
  | { kind: "operator"; ticketId: string };

async function getCustomerFinanceCandidates(groupId: number): Promise<FinanceCandidate[]> {
  const unitId = getConfiguredF10UnitId();
  const source = unitId === 1 ? "f10_sheet" : `f10_sheet_unit_${unitId}`;
  const rows = await getDatabase().execute(sql`
    SELECT DISTINCT contract.contract_id::text AS "contractId",
      contract.titular_id::text AS "holderId"
    FROM f10_customer_contracts contract
    WHERE contract.unit_id = ${unitId}
      AND (
        EXISTS (
          SELECT 1
          FROM customer_units customer_unit
          JOIN customer_groups customer_group ON customer_group.id = customer_unit.group_id
          WHERE customer_unit.f10_unit_id = contract.unit_id
            AND customer_unit.f10_contract_id = contract.contract_id
            AND customer_unit.source_system = ${source}
            AND customer_group.source_system = ${source}
            AND customer_group.source_group_id = ${String(groupId)}
        )
        OR EXISTS (
          SELECT 1
          FROM f10_customer_contract_profiles profile
          JOIN customer_groups customer_group ON customer_group.id = profile.group_id
          WHERE profile.unit_id = contract.unit_id
            AND profile.contract_id = contract.contract_id
            AND customer_group.source_system = ${source}
            AND customer_group.source_group_id = ${String(groupId)}
        )
      )
    ORDER BY "contractId"
    LIMIT 51
  `);
  return rows as unknown as FinanceCandidate[];
}

async function getOperatorFinanceCandidates(ticketId: string): Promise<FinanceCandidate[]> {
  const unitId = getConfiguredF10UnitId();
  const rows = await getDatabase().execute(sql`
    SELECT DISTINCT contract.contract_id::text AS "contractId",
      contract.titular_id::text AS "holderId"
    FROM ticket_contract_links link
    JOIN f10_customer_contracts contract
      ON contract.unit_id = link.unit_id AND contract.contract_id = link.contract_id
    JOIN tickets ticket ON ticket.id = link.ticket_id
    WHERE link.ticket_id = ${ticketId}::uuid
      AND ticket.customer_contact_id IS NOT NULL
      AND link.unit_id = ${unitId}
    ORDER BY "contractId"
    LIMIT 51
  `);
  return rows as unknown as FinanceCandidate[];
}


export async function authorizeFinancePayerForScope(
  scope: FinanceScope,
): Promise<AuthorizedFinancePayer> {
  const candidates = scope.kind === "customer"
    ? await getCustomerFinanceCandidates(scope.groupId)
    : await getOperatorFinanceCandidates(scope.ticketId);
  const { holderId, contractIds } = parseF10CompanyCandidates(candidates);
  const unitId = getConfiguredF10UnitId();

  const company = await getF10ContractHolder(unitId, holderId);
  const document = company.document?.replace(/\D/g, "") ?? "";
  if (document.length !== 14) {
    throw new Error("FINANCE_COMPANY_UNRESOLVED");
  }

  const token = await validateF10PaymentPayer({
    unitId,
    personId: company.personId,
    document,
    birth: "",
  });
  const contracts = parseF10FinanceContracts(await listF10PaymentContracts(token))
    .filter((contract) => contractIds.has(contract.id));
  if (!contracts.length) throw new Error("FINANCE_COMPANY_NOT_LINKED");
  return { token, contracts };
}

function requireAuthorizedContract(
  payer: AuthorizedFinancePayer,
  contractId: number,
): FinanceContract {
  const contract = payer.contracts.find((item) => item.id === contractId);
  if (!contract) throw new Error("FINANCE_CONTRACT_NOT_AUTHORIZED");
  return contract;
}

export async function consultFinanceInstallments(
  payer: AuthorizedFinancePayer,
  contractId: number,
): Promise<{ open: FinanceInstallment[]; paid: FinanceInstallment[] }> {
  requireAuthorizedContract(payer, contractId);

  const data = requirePaymentRecord(
    await listF10PaymentInstallments(payer.token, contractId),
  );

  return {
    open: normalizePaymentInstallments(data.abertas, false),
    paid: normalizePaymentInstallments(data.pagas, true),
  };
}

export async function consultFinancePix(
  payer: AuthorizedFinancePayer,
  contractId: number,
  receivableId: number,
): Promise<{
  receivableId: number;
  installment: number;
  amount: string;
  dueDate: string;
  expiresAt: string | null;
  copyPaste: string;
}> {
  requireAuthorizedContract(payer, contractId);

  const installments = requirePaymentRecord(
    await listF10PaymentInstallments(payer.token, contractId),
  );
  const open = normalizePaymentInstallments(installments.abertas, false);
  const installment = open.find((item) =>
    item.receivableId === receivableId && item.payable,
  );
  if (!installment) throw new Error("FINANCE_PIX_UNAVAILABLE");

  const detail = requirePaymentRecord(
    await getF10PaymentInstallment(payer.token, receivableId),
  );
  if (!isExistingPixPayable(detail, contractId, receivableId)) {
    throw new Error("FINANCE_PIX_UNAVAILABLE");
  }

  const code = String(detail.qrcode_text).trim();
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
