type HelpCandidate = {
  title: string;
  summary: string;
  categoryText: string;
  rank: number;
  score: number;
};

const SHORT_PRODUCT_TERMS = new Set(["api", "cpf", "crm", "nfe", "pix", "sla"]);

const SEARCH_FILLER_TERMS = new Set([
  "acessar",
  "agora",
  "ainda",
  "antes",
  "ajuda",
  "ajudar",
  "alguem",
  "aqui",
  "botao",
  "cadastrar",
  "como",
  "consigo",
  "criar",
  "depois",
  "dentro",
  "dessa",
  "desse",
  "dizer",
  "dessa",
  "desse",
  "editar",
  "entender",
  "essa",
  "esse",
  "faco",
  "fazer",
  "f10",
  "gostaria",
  "informacao",
  "isso",
  "disto",
  "mesmo",
  "nova",
  "novo",
  "nesse",
  "neste",
  "anterior",
  "mais",
  "passo",
  "passos",
  "mostrar",
  "onde",
  "outro",
  "outra",
  "para",
  "poderia",
  "posso",
  "preciso",
  "qual",
  "porque",
  "quais",
  "quero",
  "realizar",
  "saber",
  "sistema",
  "sobre",
  "tambem",
  "tenho",
  "tela",
  "tutorial",
  "usar",
  "voce",
]);

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function extractTopicTerms(value: string): string[] {
  return Array.from(new Set(
    normalizeSearchText(value)
      .split(" ")
      .filter((term) =>
        (term.length >= 4 || SHORT_PRODUCT_TERMS.has(term))
        && !SEARCH_FILLER_TERMS.has(term)),
  )).slice(0, 8);
}

function getTopicTerms(question: string, searchQuery: string): string[] {
  const questionTerms = extractTopicTerms(question);
  return questionTerms.length > 0 ? questionTerms : extractTopicTerms(searchQuery);
}

function hasMatchingTerm(text: string, term: string): boolean {
  const stemLength = term.length <= 4
    ? term.length
    : Math.min(7, term.length - 1);
  const stem = term.slice(0, stemLength);

  return normalizeSearchText(text)
    .split(" ")
    .some((word) => word.length >= stemLength && word.startsWith(stem));
}

export function hasRelevantHelpTitle(
  question: string,
  searchQuery: string,
  candidates: HelpCandidate[],
): boolean {
  const terms = getTopicTerms(question, searchQuery);
  return terms.length > 0 && candidates.some((candidate) =>
    terms.some((term) => hasMatchingTerm(candidate.title, term)));
}

export function rankRelevantHelpCandidates<T extends HelpCandidate>(
  question: string,
  searchQuery: string,
  candidates: T[],
): T[] {
  const terms = getTopicTerms(question, searchQuery);
  if (terms.length === 0) return [];

  const ranked = candidates.map((candidate) => {
    const titleMatches = terms.filter((term) => hasMatchingTerm(candidate.title, term)).length;
    const summaryMatches = terms.filter((term) => hasMatchingTerm(candidate.summary, term)).length;
    const categoryMatches = terms.filter((term) => hasMatchingTerm(candidate.categoryText, term)).length;

    return {
      candidate,
      titleMatches,
      summaryMatches,
      relevanceScore: titleMatches * 8 + summaryMatches * 3 + categoryMatches,
    };
  });

  const titleMatches = ranked.filter((item) => item.titleMatches > 0);
  const eligible = titleMatches.length > 0
    ? titleMatches
    : ranked.filter((item) => item.summaryMatches > 0);

  return eligible
    .sort((left, right) =>
      right.relevanceScore - left.relevanceScore
      || right.candidate.score - left.candidate.score)
    .map((item, index) => ({ ...item.candidate, rank: index + 1 }));
}
