import {
  normalizeHelpFlowId,
  type HelpFlowOptionInput,
  type HelpQuestionInput,
} from "$lib/server/help/helpFlowRepository";

const HELP_ICON_NAMES = new Set([
  "access",
  "book",
  "classes",
  "download",
  "finance",
  "help",
  "operations",
  "sales",
  "support",
  "team",
]);

export type HelpQuestionFormValues = HelpQuestionInput;

export type HelpQuestionFormResult =
  | { success: true; input: HelpQuestionInput }
  | {
      success: false;
      message: string;
      values: HelpQuestionFormValues;
    };

function readFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readFormValues(formData: FormData, name: string): string[] {
  return formData
    .getAll(name)
    .map((value) => (typeof value === "string" ? value.trim() : ""));
}

function buildOptions(formData: FormData): HelpFlowOptionInput[] {
  const keys = readFormValues(formData, "optionKey");
  const labels = readFormValues(formData, "optionLabel");
  const descriptions = readFormValues(formData, "optionDescription");
  const icons = readFormValues(formData, "optionIcon");
  const targets = readFormValues(formData, "optionTarget");
  const optionCount = Math.max(
    keys.length,
    labels.length,
    descriptions.length,
    icons.length,
    targets.length,
  );
  const usedKeys = new Set<string>();
  const options: HelpFlowOptionInput[] = [];

  for (let index = 0; index < optionCount; index += 1) {
    const label = labels[index] ?? "";
    const description = descriptions[index] ?? "";
    const icon = icons[index] ?? "help";
    const target = targets[index] ?? "";

    if (!label && !description && !target) continue;

    const requestedKey = normalizeHelpFlowId(keys[index] ?? "");
    const baseKey = requestedKey || normalizeHelpFlowId(label) || `option-${index + 1}`;
    let key = baseKey;
    let suffix = 2;

    while (usedKeys.has(key)) {
      key = `${baseKey}-${suffix}`;
      suffix += 1;
    }

    usedKeys.add(key);
    options.push({ key, label, description, icon, target });
  }

  return options;
}

function isValidTarget(target: string): boolean {
  if (target === "search") return true;

  if (target.startsWith("question:")) {
    return normalizeHelpFlowId(target.slice("question:".length)).length > 0;
  }

  if (target.startsWith("destination:")) {
    return normalizeHelpFlowId(target.slice("destination:".length)).length > 0;
  }

  return false;
}

export function parseHelpQuestionFormData(
  formData: FormData,
): HelpQuestionFormResult {
  const values: HelpQuestionFormValues = {
    eyebrow: readFormValue(formData, "eyebrow"),
    title: readFormValue(formData, "title"),
    description: readFormValue(formData, "description"),
    compact: formData.get("compact") === "on",
    searchLabel: readFormValue(formData, "searchLabel"),
    options: buildOptions(formData),
  };

  if (values.eyebrow.length < 2 || values.eyebrow.length > 80) {
    return {
      success: false,
      message: "Informe uma identificação entre 2 e 80 caracteres.",
      values,
    };
  }

  if (values.title.length < 4 || values.title.length > 160) {
    return {
      success: false,
      message: "Informe uma pergunta entre 4 e 160 caracteres.",
      values,
    };
  }

  if (values.description.length > 320) {
    return {
      success: false,
      message: "A descrição deve ter no máximo 320 caracteres.",
      values,
    };
  }

  if (values.searchLabel.length > 120) {
    return {
      success: false,
      message: "O texto da busca deve ter no máximo 120 caracteres.",
      values,
    };
  }

  if (values.options.length < 1 || values.options.length > 12) {
    return {
      success: false,
      message: "A pergunta deve ter entre 1 e 12 opções.",
      values,
    };
  }

  for (const option of values.options) {
    if (option.label.length < 2 || option.label.length > 120) {
      return {
        success: false,
        message: "Cada opção deve ter um título entre 2 e 120 caracteres.",
        values,
      };
    }

    if (option.description.length > 240) {
      return {
        success: false,
        message: "A descrição de cada opção deve ter no máximo 240 caracteres.",
        values,
      };
    }

    if (!HELP_ICON_NAMES.has(option.icon)) {
      return {
        success: false,
        message: "Uma das opções possui um ícone inválido.",
        values,
      };
    }

    if (!isValidTarget(option.target)) {
      return {
        success: false,
        message: "Defina para onde cada opção deve levar o cliente.",
        values,
      };
    }
  }

  return { success: true, input: values };
}
