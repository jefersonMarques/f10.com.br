import {
  runF10Assistant,
  type F10AssistantAction,
  type F10AssistantTarget,
} from "$lib/server/assistant/f10AssistantEngine";

export type GeneralHelpAssistantResult = {
  answer: string;
  action: F10AssistantAction;
  articleUrl: string | null;
  searchEventId: string | null;
  selectedContentId: string | null;
};

const HELP_ORIGIN = "https://f10.com.br";

function articleUrl(target: F10AssistantTarget | null): string | null {
  if (!target) return null;
  const base = `${HELP_ORIGIN}/ajuda-f10/${encodeURIComponent(target.slug)}`;
  return target.anchor ? `${base}#${encodeURIComponent(target.anchor)}` : base;
}

function withoutArticleReference(answer: string): string {
  return answer
    .replace(/\[[^\]]*\]\((?:https?:\/\/(?:www\.)?f10\.com\.br)?\/ajuda-f10\/[^)]+\)/gi, "")
    .replace(/https?:\/\/(?:www\.)?f10\.com\.br\/ajuda-f10\/[^\s)\],;!?]+(?:#[^\s)\],;!?]+)?/gi, "")
    .replace(/\/ajuda-f10\/[^\s)\],;!?]+(?:#[^\s)\],;!?]+)?/gi, "")
    .split("\n")
    .filter((line) => {
      const value = line.trim();
      if (!value) return true;
      return !/^(?:refer[êe]ncia|fonte|mais detalhes.*artigo|veja.*artigo|artigo(?: do f10)?)\s*:?\s*$/i.test(value);
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function runGeneralHelpAssistant(input: {
  question: string;
}): Promise<GeneralHelpAssistantResult> {
  const result = await runF10Assistant({
    surface: "helpdesk",
    question: input.question,
  });

  return {
    answer: withoutArticleReference(result.answer),
    action: result.action,
    articleUrl: articleUrl(result.target),
    searchEventId: result.searchEventId,
    selectedContentId: result.target?.contentId ?? null,
  };
}
