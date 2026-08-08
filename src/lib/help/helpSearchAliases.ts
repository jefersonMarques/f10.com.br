import {
  helpDestinations,
  type HelpDestination,
} from "$lib/help/helpDecisionTree";

const destinationAliases: Record<string, string[]> = {
  "install-f10": ["baixar", "download", "instalar", "instalador", "windows"],
  "first-access": ["primeiro acesso", "entrar", "login", "senha provisoria", "email"],
  "create-password": ["alterar senha", "criar senha", "nova senha", "senha provisoria"],
  "installation-help": ["erro instalacao", "nao instala", "download bloqueado", "arquivo exe"],
  "login-help": ["nao entra", "login errado", "senha errada", "esqueci senha"],
  "team-setup": ["configurar funcionario", "novo usuario", "permissao funcionario"],
  "user-registration": ["cadastrar usuario", "cadastrar funcionario", "nova pessoa"],
  "user-permissions": ["direitos", "permissao", "acesso usuario", "bloquear menu"],
  "class-creation": ["criar turma", "nova turma", "abrir turma"],
  "opportunity-conversion": ["oportunidade", "interessado", "converter oportunidade"],
  "enrollment-flow": ["novo aluno", "matricular aluno", "fazer matricula"],
  "enrollment-contract": ["matricula", "contrato", "criar contrato", "efetivar matricula"],
  "enrollment-classes": ["turma na matricula", "incluir turma", "vincular turma"],
  "monthly-payment": ["mensalidade", "receber aluno", "pagamento mensalidade", "baixar mensalidade"],
  "pix-payment": ["pix", "receber pix", "cobrar pix", "pagamento pix"],
  "student-class-attendance": ["aluno na turma", "incluir aluno", "abrir pauta", "lancar pauta"],
  "attendance-grades": ["nota", "media", "presenca", "falta", "pauta", "avaliacao"],
  "student-progress": ["andamento curso", "progresso aluno", "gerenciar aluno"],
  "columns-grouping": ["coluna", "agrupar", "lista", "campo", "relatorio"],
  "product-movement": ["produto", "compra", "venda", "estoque", "movimentar produto"],
  "accounts-payable": ["conta a pagar", "pagar conta", "despesa"],
  "bank-movement": ["caixa", "saldo", "banco", "movimentacao bancaria"],
  "crm-sales-funnel": ["crm", "lead", "funil", "vendas", "captacao"],
  support: ["erro", "travou", "nao funciona", "suporte", "ajuda"],
};

const ignoredSearchTokens = new Set([
  "a",
  "cadastrar",
  "colocar",
  "criar",
  "da",
  "de",
  "do",
  "fazer",
  "o",
  "preciso",
  "quero",
  "registrar",
  "um",
  "uma",
  "ver",
]);

export type HelpSearchResult = {
  destination: HelpDestination;
  score: number;
};

export function searchHelpDestinations(
  query: string,
  limit = 3,
): HelpSearchResult[] {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length < 2) return [];

  const queryTokens = normalizedQuery
    .split(/\s+/)
    .filter(
      (token) => token.length > 1 && !ignoredSearchTokens.has(token),
    );

  const rankedResults = helpDestinations
    .map((destination) => ({
      destination,
      score: calculateDestinationScore(
        destination,
        normalizedQuery,
        queryTokens,
      ),
    }))
    .filter((result) => result.score > 0)
    .sort((firstResult, secondResult) =>
      secondResult.score === firstResult.score
        ? firstResult.destination.title.localeCompare(
            secondResult.destination.title,
            "pt-BR",
          )
        : secondResult.score - firstResult.score,
    );

  const strongResults = rankedResults.filter((result) => result.score >= 12);
  return (strongResults.length > 0 ? strongResults : rankedResults).slice(
    0,
    limit,
  );
}

function calculateDestinationScore(
  destination: HelpDestination,
  normalizedQuery: string,
  queryTokens: string[],
): number {
  const aliases = destinationAliases[destination.id] ?? [];
  const normalizedAliases = aliases.map(normalizeSearchText);
  const searchableContent = normalizeSearchText(
    `${destination.title} ${destination.description} ${aliases.join(" ")}`,
  );

  const hasPhraseMatch = searchableContent.includes(normalizedQuery);
  const matchedTokenCount = queryTokens.filter((token) =>
    searchableContent.includes(token),
  ).length;

  if (
    queryTokens.length > 1 &&
    !hasPhraseMatch &&
    matchedTokenCount < queryTokens.length
  ) {
    return 0;
  }

  let score = hasPhraseMatch ? 8 : 0;

  for (const token of queryTokens) {
    if (searchableContent.includes(token)) score += 2;
  }

  for (const alias of normalizedAliases) {
    if (alias === normalizedQuery) score += 10;
    if (alias.includes(normalizedQuery) || normalizedQuery.includes(alias)) {
      score += 4;
    }
  }

  return score;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
