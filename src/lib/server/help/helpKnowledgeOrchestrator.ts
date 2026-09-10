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

function isAnswered(result: HelpKnowledgeResult): boolean {
  return result.resolution === "answered" && result.resolved && Boolean(result.answer.trim());
}

async function answerTargetArticle(
  input: ArticleQuestionInput,
  slug: string,
): Promise<HelpKnowledgeResult> {
  return answerHelpQuestion({
    ...input,
    scope: { type: "article", slug },
  });
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
