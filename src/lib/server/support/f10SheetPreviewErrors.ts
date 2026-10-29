export type PublicPreviewError = { code: string; message: string; phase: string };

type TechnicalPreviewDiagnostic = {
  phase: string;
  errorType: string;
  dbCode: string | null;
  constraint: string | null;
  column: string | null;
};

const PHASES: Record<string, string> = {
  schema_check: "verificação do banco",
  cleanup: "preparação do lote",
  api_match: "consulta complementar à API",
  batch_insert: "criação da prévia",
  validate_sheet_ids: "validação dos IDs",
  rows_insert: "gravação temporária das linhas",
  cache_match: "conferência dos contratos",
  lock: "proteção contra importações simultâneas",
  batch_lock: "verificação do lote",
  contracts_upsert: "gravação dos contratos",
  contracts_validate: "validação dos vínculos",
  groups_upsert: "gravação das franquias",
  organizations_insert: "gravação das organizações",
  units_upsert: "gravação das unidades",
  contacts_upsert: "gravação dos clientes",
  identities_upsert: "vínculo com pessoas da API",
  unit_contacts_upsert: "gravação dos contatos das unidades",
  holder_contacts_upsert: "gravação dos titulares",
  profiles_upsert: "gravação dos perfis comerciais",
  finish: "finalização da importação",
};

export function getF10SheetPreviewDiagnostic(cause: unknown): TechnicalPreviewDiagnostic {
  let current: unknown = cause;
  let phase = "unknown";
  let errorType = "Unknown";
  let dbCode: string | null = null;
  let constraint: string | null = null;
  let column: string | null = null;
  for (let depth = 0; depth < 12; depth++) {
    if (!current || typeof current !== "object") break;
    const entry = current as {
      previewPhase?: unknown; code?: unknown; name?: unknown;
      constraint_name?: unknown; constraint?: unknown; column_name?: unknown;
      column?: unknown; cause?: unknown;
    };
    if (typeof entry.previewPhase === "string" && Object.hasOwn(PHASES, entry.previewPhase)) {
      phase = entry.previewPhase;
    }
    if (typeof entry.name === "string" && entry.name !== "Error") errorType = entry.name.slice(0, 80);
    if (typeof entry.code === "string" && /^[0-9A-Z]{5}$/.test(entry.code)) dbCode = entry.code;
    const constraintName = entry.constraint_name ?? entry.constraint;
    if (typeof constraintName === "string" && /^[a-zA-Z0-9_]{1,120}$/.test(constraintName)) {
      constraint = constraintName;
    }
    const columnName = entry.column_name ?? entry.column;
    if (typeof columnName === "string" && /^[a-zA-Z0-9_]{1,120}$/.test(columnName)) {
      column = columnName;
    }
    current = entry.cause;
  }
  return { phase, errorType, dbCode, constraint, column };
}

export function getF10SheetPreviewError(cause: unknown): PublicPreviewError {
  const diagnostic = getF10SheetPreviewDiagnostic(cause);
  let current: unknown = cause;
  for (let depth = 0; depth < 12; depth++) {
    if (!current || typeof current !== "object") break;
    const entry = current as { code?: unknown; message?: unknown; cause?: unknown };
    if (entry.message === "F10_IMPORT_SCHEMA_OUTDATED"
        || entry.code === "42703" || entry.code === "42P01") {
      return {
        code: "F10_IMPORT_SCHEMA_OUTDATED",
        message: "Migrações pendentes no banco. Verifique e aplique as migrations 0098 a 0100.",
        phase: diagnostic.phase,
      };
    }
    if (entry.message === "F10_SHEET_DUPLICATE_IDS") {
      return {
        code: "F10_SHEET_DUPLICATE_IDS",
        message: "Há IDs repetidos na planilha. Corrija os números duplicados e gere outra prévia.",
        phase: diagnostic.phase,
      };
    }
    current = entry.cause;
  }
  if (diagnostic.dbCode) {
    return {
      code: "F10_IMPORT_DB_" + diagnostic.dbCode,
      message: "O banco recusou a prévia na etapa de " + (PHASES[diagnostic.phase] ?? "importação") + ".",
      phase: diagnostic.phase,
    };
  }
  return {
    code: "F10_IMPORT_PREVIEW_FAILED",
    message: "Falha na etapa de " + (PHASES[diagnostic.phase] ?? "importação") + ".",
    phase: diagnostic.phase,
  };
}

export function getF10SheetApplyError(cause: unknown): PublicPreviewError {
  const diagnostic = getF10SheetPreviewDiagnostic(cause);
  let current: unknown = cause;
  for (let depth = 0; depth < 12; depth += 1) {
    if (!current || typeof current !== "object") break;
    const entry = current as { message?: unknown; code?: unknown; cause?: unknown };
    if (entry.message === "F10_IMPORT_SCHEMA_OUTDATED"
      || entry.code === "42703" || entry.code === "42P01") {
      return {
        code: "F10_IMPORT_SCHEMA_OUTDATED",
        message: "Banco desatualizado. Confirme a aplicação das migrations 0094 a 0100.",
        phase: diagnostic.phase,
      };
    }
    if (entry.message === "F10_SHEET_REVIEW_REQUIRED") {
      return {
        code: "F10_SHEET_REVIEW_REQUIRED",
        message: "Os vínculos com a API mudaram. Gere uma nova prévia antes de importar.",
        phase: diagnostic.phase,
      };
    }
    current = entry.cause;
  }
  const description = PHASES[diagnostic.phase] ?? "gravação dos dados";
  return {
    code: diagnostic.dbCode ? "F10_IMPORT_DB_" + diagnostic.dbCode : "F10_IMPORT_APPLY_FAILED",
    message: "Falha na etapa de " + description + ". A importação foi cancelada sem gravações parciais.",
    phase: diagnostic.phase,
  };
}
