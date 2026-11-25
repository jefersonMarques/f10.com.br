export type PublicChatDepartment = "support" | "finance";
export type FinanceEntryAction = "human" | "pix";

type ChatEntryRoute = {
  label: string;
  queueCode?: string;
  teamName?: string | null;
  initialHandling?: "ai" | "human";
  showOutsideHours?: boolean;
  active?: boolean;
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

export type ChatEntryAvailability = {
  isOpen: boolean | null;
  hoursConfigured: boolean;
};

export function isChatEntryVisible(
  option: ChatEntryRoute,
  availability: ChatEntryAvailability | null,
): boolean {
  if (option.active === false || !availability) return false;
  if (availability.isOpen === true || availability.hoursConfigured === false) return true;
  return availability.isOpen === false && option.showOutsideHours === true;
}

export function canStartHumanChat(
  option: ChatEntryRoute,
  availability: ChatEntryAvailability | null,
): boolean {
  if (!isChatEntryVisible(option, availability)) return false;
  if (getFinanceEntryAction(option) === "pix") return false;
  // Fora do expediente, somente uma opção humana explicitamente liberada abre fila.
  return availability?.isOpen === true || availability?.hoursConfigured === false
    || option.initialHandling === "human";
}
