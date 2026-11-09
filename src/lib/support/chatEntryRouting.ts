export type PublicChatDepartment = "support" | "finance";

type ChatEntryRoute = {
  label: string;
  queueCode?: string;
  teamName?: string | null;
};

export function isFinancialChatOption(option: ChatEntryRoute): boolean {
  const teamName = option.teamName
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  if (!teamName) return false;
  return /(?:^|[^a-z])financeir\w*(?:[^a-z]|$)/.test(teamName);
}
