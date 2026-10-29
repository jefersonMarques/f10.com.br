export type NumberedContract = {
  contractId: number;
  contractNumber: string | null;
};

export function matchSheetContractNumbers(
  sheetIds: readonly string[],
  contracts: readonly NumberedContract[],
): Map<string, { status: "matched" | "not_found" | "ambiguous"; contractId: number | null }> {
  const byNumber = new Map<string, number[]>();
  for (const contract of contracts) {
    const number = contract.contractNumber?.trim();
    if (!number) continue;
    const found = byNumber.get(number) ?? [];
    found.push(contract.contractId);
    byNumber.set(number, found);
  }
  const matches = new Map<string, { status: "matched" | "not_found" | "ambiguous"; contractId: number | null }>();
  for (const rawId of sheetIds) {
    const id = rawId.trim();
    const ids = byNumber.get(id) ?? [];
    matches.set(id, ids.length > 1
      ? { status: "ambiguous", contractId: null }
      : ids.length === 1
        ? { status: "matched", contractId: ids[0] }
        : { status: "not_found", contractId: null });
  }
  return matches;
}
