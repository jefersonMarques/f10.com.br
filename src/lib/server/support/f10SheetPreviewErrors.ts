type PublicPreviewError = { code: string; message: string };

export function getF10SheetPreviewError(cause: unknown): PublicPreviewError {
  let current: unknown = cause;
  for (let depth = 0; depth < 5; depth++) {
    if (!current || typeof current !== "object") break;
    const item = current as { code?: unknown; message?: unknown; cause?: unknown };
    const dbCode = typeof item.code === "string" ? item.code : "";
    if (dbCode === "42703" || dbCode === "42P01") {
      return {
        code: "F10_IMPORT_SCHEMA_OUTDATED",
        message: "Banco desatualizado. Aplique as migrations mais recentes antes de gerar a prévia.",
      };
    }
    if (dbCode === "23505") {
      return {
        code: "F10_IMPORT_DUPLICATE",
        message: "Há um conflito de registros no banco. Gere uma nova prévia.",
      };
    }
    if (/^[0-9A-Z]{5}$/.test(dbCode)) {
      return {
        code: "F10_IMPORT_DB_" + dbCode,
        message: "A prévia encontrou um erro de gravação no banco. Código: " + dbCode + ".",
      };
    }
    if (item.message === "F10_SHEET_DUPLICATE_IDS") {
      return {
        code: "F10_SHEET_DUPLICATE_IDS",
        message: "Há IDs repetidos na planilha. Corrija os números duplicados e gere outra prévia.",
      };
    }
    current = item.cause;
  }
  return {
    code: "F10_IMPORT_PREVIEW_FAILED",
    message: "Não foi possível gerar a prévia. Confira o código do erro nos logs do servidor.",
  };
}
