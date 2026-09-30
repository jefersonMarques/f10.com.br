export type HelpContentKind = "support_article" | "update";

export function isHelpContentKind(value: string): value is HelpContentKind {
  return value === "support_article" || value === "update";
}

export function normalizeHelpContentKind(value: string | null | undefined): HelpContentKind {
  return value === "update" ? "update" : "support_article";
}
