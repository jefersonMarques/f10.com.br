export type HelpEvidenceFragment = {
  text: string;
};

export type HelpEvidenceArticle<TFragment extends HelpEvidenceFragment> = {
  title: string;
  fragments: TFragment[];
};

export function composeHelpEvidence<TFragment extends HelpEvidenceFragment>(
  articles: HelpEvidenceArticle<TFragment>[],
  maxArticles: number,
  maxCharacters: number,
): { title: string; fragments: TFragment[] } {
  const selected = articles.slice(0, Math.max(0, maxArticles));
  if (selected.length === 0) return { title: "", fragments: [] };

  const budgetPerArticle = Math.floor(maxCharacters / selected.length);
  const fragments = selected.flatMap((article) => {
    let remaining = budgetPerArticle;
    return article.fragments.flatMap((fragment) => {
      if (remaining < 120) return [];

      const text = fragment.text.slice(0, remaining);
      remaining -= text.length;
      return text ? [{ ...fragment, text }] : [];
    });
  });

  return {
    title: selected.map((article) => article.title).join(" | "),
    fragments,
  };
}
