export const UNCATEGORIZED_HELP_CATEGORY_SLUG = "uncategorized";
export const UNCATEGORIZED_HELP_CATEGORY_NAME = "Sem categoria";
export const DEFAULT_HELP_CATEGORY_ICON = "FolderKanban";
export const UNCATEGORIZED_HELP_CATEGORY_ICON = "CircleHelp";

export const HELP_CATEGORY_ICON_OPTIONS = [
  { value: "FolderKanban", label: "Pasta / área" },
  { value: "Users", label: "Pessoas" },
  { value: "UserRoundCog", label: "Gestão de pessoas" },
  { value: "Building2", label: "Empresa" },
  { value: "BriefcaseBusiness", label: "Comercial / trabalho" },
  { value: "CircleDollarSign", label: "Financeiro" },
  { value: "GraduationCap", label: "Pedagógico / treinamento" },
  { value: "CalendarDays", label: "Agenda / calendário" },
  { value: "ClipboardList", label: "Processos / tarefas" },
  { value: "FileText", label: "Documentos" },
  { value: "Settings", label: "Configurações" },
  { value: "Headphones", label: "Atendimento" },
  { value: "CircleHelp", label: "Ajuda" },
] as const;

export type HelpCategoryIconName = (typeof HELP_CATEGORY_ICON_OPTIONS)[number]["value"];

const HELP_CATEGORY_ICON_NAMES = new Set<string>(
  HELP_CATEGORY_ICON_OPTIONS.map((option) => option.value),
);

export function isHelpCategoryIconName(value: string): value is HelpCategoryIconName {
  return HELP_CATEGORY_ICON_NAMES.has(value);
}

export function normalizeHelpCategoryIcon(value: string): HelpCategoryIconName {
  return isHelpCategoryIconName(value) ? value : DEFAULT_HELP_CATEGORY_ICON;
}
