export type SchoolContractSelection = {
  contractId: string;
  isActive: boolean;
};

export function selectAuthorizedSchoolContracts<T extends SchoolContractSelection>(
  available: T[],
  selectedIds: readonly string[],
): T[] {
  const active = available.filter((contract) => contract.isActive);
  const selected = new Set(selectedIds);
  const retained = active.filter((contract) => selected.has(contract.contractId));

  if (retained.length > 0) return retained;
  return active.length === 1 ? active : [];
}
