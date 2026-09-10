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
    "Contexto obrigatório: esta pergunta é sobre o produto F10 e deve ser respondida usando a Base de Conhecimento do F10.",
    "Não considere significados externos do mesmo termo, como WhatsApp em geral, salvo se o usuário pedir isso explicitamente.",
    reinforced
      ? "Se houver artigo do F10 relacionado ao assunto, selecione e leia esse artigo antes de pedir qualquer esclarecimento."
      : "",
    `Pergunta original do usuário: ${question.trim()}`,
  ].filter(Boolean).join("\n");
}

function containsExternalFork(answer: string): boolean {
  const normalized = answer
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  return (
    /whatsapp.{0,40}(?:em geral|em si|fora do f10)/.test(normalized) ||
    /(?:f10|produto f10).{0,50}\bou\b.{0,60}(?:whatsapp|servico externo|outro sistema)/.test(normalized)
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

  if (result.action === "clarify" && containsExternalFork(result.answer)) {
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
