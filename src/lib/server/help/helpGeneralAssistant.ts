import {
  runF10Assistant,
  type F10AssistantAction,
} from "$lib/server/assistant/f10AssistantEngine";

export type GeneralHelpAssistantResult = {
  answer: string;
  action: F10AssistantAction;
  searchEventId: string | null;
  selectedContentId: string | null;
};

const HELP_ORIGIN = "https://f10.com.br";

function contextualizeQuestion(question: string, reinforced = false): string {
  return [
    "Contexto obrigatório: você é o Assistente F10. Toda pergunta deve ser interpretada exclusivamente dentro do produto F10 e respondida usando a Base de Conhecimento do F10.",
    "Termos que também existem fora do F10 devem ser entendidos somente como recursos, integrações ou conceitos relacionados ao uso do F10.",
    "Nunca ofereça comparação, alternativa, explicação ou esclarecimento sobre serviços, produtos ou conceitos fora do F10.",
    "Quando usar um artigo como fonte, inclua na resposta a URL pública completa do artigo ou trecho, sempre iniciando por https://f10.com.br/ajuda-f10/. Nunca devolva apenas um caminho relativo como /ajuda-f10/.",
    reinforced
      ? "Pesquise a Base de Conhecimento, escolha o artigo F10 mais relacionado e leia o conteúdo antes de concluir que precisa de esclarecimento."
      : "",
    `Pergunta original do usuário: ${question.trim()}`,
  ].filter(Boolean).join("\n");
}

function leavesF10Context(answer: string): boolean {
  const normalized = answer
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  const externalMeaning =
    /(?:whatsapp|instagram|facebook|google|meta).{0,35}(?:em geral|em si|fora do f10)/;
  const externalFork =
    /(?:quer|deseja|voce).{0,80}(?:whatsapp|instagram|facebook|google|meta|servico|plataforma).{0,100}\bou\b.{0,100}(?:f10|dentro do f10)|(?:quer|deseja|voce).{0,80}(?:f10|dentro do f10).{0,100}\bou\b.{0,100}(?:whatsapp|instagram|facebook|google|meta|servico|plataforma)/;

  return externalMeaning.test(normalized) || externalFork.test(normalized);
}

function withAbsoluteHelpUrls(answer: string): string {
  return answer.replace(
    /(^|[\s(])(\/ajuda-f10(?:\/[^\s)\],;!?]*)?(?:#[^\s)\],;!?]*)?)/g,
    (_match, prefix: string, path: string) => `${prefix}${HELP_ORIGIN}${path}`,
  );
}

export async function runGeneralHelpAssistant(input: {
  question: string;
  conversationContext?: string;
  pageContext?: string;
}): Promise<GeneralHelpAssistantResult> {
  let result = await runF10Assistant({
    surface: "helpdesk",
    question: contextualizeQuestion(input.question),
  });

  if (leavesF10Context(result.answer)) {
    result = await runF10Assistant({
      surface: "helpdesk",
      question: contextualizeQuestion(input.question, true),
    });
  }

  return {
    answer: withAbsoluteHelpUrls(result.answer),
    action: result.action,
    searchEventId: result.searchEventId,
    selectedContentId: result.target?.contentId ?? null,
  };
}
