export type PublicChatDepartment = "support" | "finance";
export type FinanceEntryAction = "human" | "pix";

type ChatEntryRoute = {
  label: string;
  queueCode?: string;
  teamName?: string | null;
  initialHandling?: "ai" | "human";
};

function normalizeRouteText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function isFinancialChatOption(option: ChatEntryRoute): boolean {
  const teamName = normalizeRouteText(option.teamName ?? "");
  return /(?:^|[^a-z])financeir\w*(?:[^a-z]|$)/.test(teamName);
}

export function filterChatOptionsByDepartment<T extends ChatEntryRoute>(
  options: readonly T[],
  department: PublicChatDepartment,
): T[] {
  return options.filter((option) =>
    isFinancialChatOption(option) === (department === "finance")
  );
}

export function getFinanceEntryAction(
  option: ChatEntryRoute,
): FinanceEntryAction | null {
  if (!isFinancialChatOption(option)) return null;
  if (option.initialHandling === "human") return "human";
  if (
    option.initialHandling === "ai" &&
    /(?:^|[^a-z])pix(?:[^a-z]|$)/.test(normalizeRouteText(option.label))
  ) {
    return "pix";
  }
  return null;
}
