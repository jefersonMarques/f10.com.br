export type PublicChatDepartment = "support" | "finance";

type ChatEntryRoute = {
  label: string;
  queueCode?: string;
};

export function isFinancialChatOption(option: ChatEntryRoute): boolean {
  const searchableText = `${option.label} ${option.queueCode ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return /(?:^|[^a-z])(?:financeir\w*|financ\w*|cobranc\w*)(?:[^a-z]|$)/.test(searchableText);
}
