// Avisos históricos de importação já conferidos no lote editorial Movidesk.
// Um aviso de HTML não reconhecido só é aceito nos artigos cuja tabela foi
// convertida em texto. Qualquer outro problema permanece bloqueado.
const oldArticleLinks = new Map([
  [119834, { sourceId: 119866, missingSlug: "configurando-os-boletos-no-f10" }],
  [119868, { sourceId: 119847, missingSlug: "gerando-boletos" }],
  [119869, { sourceId: 119850, missingSlug: "boletos-conferencia-das-baixas-do-arquivo-retorno" }],
]);

const preservedTables = new Set([119893, 122088]);

export function isUnavailableLegacyMovideskLink(
  importExternalId: string | null | undefined,
  linkUrl: string | null | undefined,
): boolean {
  if (!importExternalId || !linkUrl) return false;
  const link = oldArticleLinks.get(Number(importExternalId));
  if (!link) return false;
  try {
    const url = new URL(linkUrl);
    return url.protocol === "https:"
      && url.hostname === "f10.com.br"
      && url.pathname === "/ajuda-f10/" + link.missingSlug
      && !url.search;
  } catch {
    return false;
  }
}

export function unresolvedMovideskImportIssue(
  sourceId: number,
  issue: string | null | undefined,
  sourceHtml: string,
  preservedTextLength: number,
): string | null {
  let remaining = (issue ?? "").trim();
  if (!remaining) return null;

  // O reprocessamento preservava o rascunho revisado e registrava um aviso.
  if (remaining.startsWith("Rascunho preservado:")
    || remaining.startsWith("Artigo já existia no F10. Edição preservada;")) return null;

  remaining = remaining
    .replace(/\d+ imagem\(ns\) sem cópia local: conferir os arquivos no F10\./g, "")
    .replace(/Vídeo YouTube no campo principal; adicione MP4 local antes da análise com IA\./g, "");

  const link = oldArticleLinks.get(sourceId);
  if (link && sourceHtml.includes("/article/" + link.sourceId)) {
    remaining = remaining.replace(
      "Link do artigo #" + link.sourceId + " precisa de conferência no F10.",
      "",
    );
  }

  // Esses dois artigos continham tabelas HTML, mas a exportação editorial
  // confirmou que o texto (inclusive linhas da tabela) foi preservado.
  // Não liberar automaticamente quaisquer outros tipos de HTML especial.
  if (preservedTables.has(sourceId)
    && /<table\b/i.test(sourceHtml)
    && !/<(?:object|audio|math|form|script|style)\b/i.test(sourceHtml)
    && !/<iframe\b/i.test(sourceHtml)
    && preservedTextLength >= 200) {
    remaining = remaining.replace("Elementos especiais do HTML exigem conferência.", "");
  }

  return remaining.replace(/^[\s.;]+|[\s.;]+$/g, "").trim() || null;
}
