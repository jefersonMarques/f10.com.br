import {
  isHelpArticleSummaryRequest,
  summarizeHelpArticle,
} from "$lib/server/help/helpArticleSummary";
import {
  answerHelpQuestion,
  type AnswerHelpQuestionInput,
  type HelpKnowledgeResult,
} from "$lib/server/help/helpKnowledgeEngine";

type ArticleQuestionInput = AnswerHelpQuestionInput & {
  scope: Extract<AnswerHelpQuestionInput["scope"], { type: "article" }>;
};

type GlobalQuestionInput = AnswerHelpQuestionInput & {
  scope: Extract<AnswerHelpQuestionInput["scope"], { type: "global" }>;
};

function isAnswered(result: HelpKnowledgeResult): boolean {
  return result.resolution === "answered" && result.resolved && Boolean(result.answer.trim());
}

async function answerTargetArticle(
  input: AnswerHelpQuestionInput,
  slug: string,
): Promise<HelpKnowledgeResult> {
  return answerHelpQuestion({
    ...input,
    scope: { type: "article", slug },
  });
}

export async function answerHelpGlobalWithArticleResolution(
  input: GlobalQuestionInput,
): Promise<HelpKnowledgeResult> {
  const globalResult = await answerHelpQuestion(input);
  if (!globalResult.target) return globalResult;
  if (globalResult.resolution !== "answered" && globalResult.resolution !== "navigate") {
    return globalResult;
  }

  const articleResult = await answerTargetArticle(input, globalResult.target.slug);
  if (!isAnswered(articleResult)) return globalResult;

  return {
    ...articleResult,
    searchEventId: globalResult.searchEventId,
    retrievalQuery: globalResult.retrievalQuery,
    sources: globalResult.sources.length > 0 ? globalResult.sources : articleResult.sources,
  };
}

export async function answerHelpArticleWithGlobalFallback(
  input: ArticleQuestionInput,
): Promise<HelpKnowledgeResult> {
  if (isHelpArticleSummaryRequest(input.question)) {
    return summarizeHelpArticle({
      question: input.question,
      slug: input.scope.slug,
      source: input.source,
    });
  }

  const articleResult = await answerHelpQuestion(input);
  if (isAnswered(articleResult)) return articleResult;

  if (articleResult.resolution === "found_elsewhere" && articleResult.target) {
    const targetResult = await answerTargetArticle(input, articleResult.target.slug);
    if (isAnswered(targetResult)) return targetResult;
  }

  const globalResult = await answerHelpQuestion({
    ...input,
    scope: { type: "global" },
  });

  if (globalResult.resolution !== "navigate" || !globalResult.target) {
    return globalResult;
  }

  const targetResult = await answerTargetArticle(input, globalResult.target.slug);
  return isAnswered(targetResult) ? targetResult : globalResult;
}
