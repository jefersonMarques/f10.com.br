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

function contextualizeQuestion(question: string, reinforced = false): string {
  return [
    "Contexto obrigatório: você é o Assistente F10. Toda pergunta deve ser interpretada exclusivamente dentro do produto F10 e respondida usando a Base de Conhecimento do F10.",
    "Termos que também existem fora do F10 devem ser entendidos somente como recursos, integrações ou conceitos relacionados ao uso do F10.",
    "Nunca ofereça comparação, alternativa, explicação ou esclarecimento sobre serviços, produtos ou conceitos fora do F10.",
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

  const externalTerms =
    /(?:em geral|em si|fora do f10|fora da plataforma|servico externo|produto externo|outro sistema|outra plataforma|broadcast)/;
  const externalFork =
    /(?:whatsapp|instagram|facebook|google|meta|servico|plataforma).{0,100}\bou\b.{0,100}(?:f10|dentro do f10)|(?:f10|dentro do f10).{0,100}\bou\b.{0,100}(?:whatsapp|instagram|facebook|google|meta|servico|plataforma)/;

  return externalTerms.test(normalized) || externalFork.test(normalized);
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
    answer: result.answer,
    action: result.action,
    searchEventId: result.searchEventId,
    selectedContentId: result.target?.contentId ?? null,
  };
}
