export type SchoolContractSelection = {
  contractId: string;
  isActive: boolean;
};

export function selectAuthorizedSchoolContracts<T extends SchoolContractSelection>(
  available: T[],
  selectedIds: readonly string[],
): T[] {
  const selected = new Set(selectedIds);
  const retained = available.filter((contract) => selected.has(contract.contractId));

  if (retained.length > 0) return retained;
  return available.length === 1 ? available : [];
}
