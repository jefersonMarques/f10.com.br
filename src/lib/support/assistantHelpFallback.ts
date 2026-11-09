export type AssistantHelpSuggestion = {
  slug: string;
  title: string;
};

export function buildAssistantHelpSuggestions(suggestions: AssistantHelpSuggestion[]): string {
  const links = suggestions.slice(0, 3).map((suggestion) => {
    const title = suggestion.title.replace(/[\[\]\n\r]/g, "").trim();
    const slug = encodeURIComponent(suggestion.slug);
    return `- [${title}](/ajuda-f10/${slug})`;
  });

  if (links.length === 0) {
    return "Não encontrei um procedimento publicado para essa dúvida. Você pode pesquisar na [Central de Ajuda F10](/ajuda-f10) ou pedir atendimento humano.";
  }

  return `Encontrei artigos que podem ajudar. Confira o passo a passo na documentação:\n\n${links.join("\n")}\n\nSe não resolver, peça para falar com um atendente.`;
}

export function buildRelatedHelpSuggestions(suggestions: AssistantHelpSuggestion[]): string {
  if (suggestions.length === 0) return buildAssistantHelpSuggestions([]);

  const links = suggestions.slice(0, 3).map((suggestion) => {
    const title = suggestion.title.replace(/[\[\]\n\r]/g, "").trim();
    const slug = encodeURIComponent(suggestion.slug);
    return `- [${title}](/ajuda-f10/${slug})`;
  });

  return [
    "Encontrei documentação relacionada, mas não consegui confirmar o procedimento completo.",
    "",
    ...links,
    "",
    "Se precisar de mais detalhes, posso encaminhar você ao atendimento humano.",
  ].join("\n");
}
