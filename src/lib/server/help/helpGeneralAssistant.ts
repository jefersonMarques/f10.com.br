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

export async function runGeneralHelpAssistant(input: {
  question: string;
  conversationContext?: string;
  pageContext?: string;
}): Promise<GeneralHelpAssistantResult> {
  const result = await runF10Assistant({
    surface: "helpdesk",
    question: input.question,
  });

  return {
    answer: result.answer,
    action: result.action,
    searchEventId: result.searchEventId,
    selectedContentId: result.target?.contentId ?? null,
  };
}
