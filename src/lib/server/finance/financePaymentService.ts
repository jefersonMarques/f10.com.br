import { getConfiguredF10UnitId } from "$lib/server/integrations/f10/f10CustomerApi";
import {
  isExistingPixPayable,
  normalizePaymentInstallments,
  normalizePayerDocument,
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

export async function authorizeFinancePayer(
  document: string,
  birth: string,
): Promise<AuthorizedFinancePayer> {
  const normalizedDocument = normalizePayerDocument(document, birth);
  const token = await validateF10PaymentPayer({
    unitId: getConfiguredF10UnitId(),
    document: normalizedDocument,
    birth,
  });

  const contracts = parseF10FinanceContracts(await listF10PaymentContracts(token));
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
