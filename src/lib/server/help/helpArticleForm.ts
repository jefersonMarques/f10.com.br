import {
  normalizeHelpSlug,
  type HelpArticleInput,
} from "$lib/server/help/helpArticleRepository";

export type HelpArticleFormValues = HelpArticleInput;

export type HelpArticleFormResult =
  | { success: true; input: HelpArticleInput }
  | {
      success: false;
      message: string;
      values: HelpArticleFormValues;
    };

function readFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function parseHelpArticleFormData(
  formData: FormData,
): HelpArticleFormResult {
  const title = readFormValue(formData, "title");
  const requestedSlug = readFormValue(formData, "slug");
  const summary = readFormValue(formData, "summary");
  const bodyText = readFormValue(formData, "bodyText");
  const slug = normalizeHelpSlug(requestedSlug || title);
  const values = { title, slug, summary, bodyText };

  if (title.length < 4 || title.length > 160) {
    return {
      success: false,
      message: "Informe um título entre 4 e 160 caracteres.",
      values,
    };
  }

  if (!slug || slug.length > 120) {
    return {
      success: false,
      message: "O endereço do conteúdo é inválido.",
      values,
    };
  }

  if (summary.length > 320) {
    return {
      success: false,
      message: "O resumo deve ter no máximo 320 caracteres.",
      values,
    };
  }

  if (bodyText.length < 10 || bodyText.length > 50_000) {
    return {
      success: false,
      message: "O conteúdo deve ter entre 10 e 50.000 caracteres.",
      values,
    };
  }

  return {
    success: true,
    input: values,
  };
}
