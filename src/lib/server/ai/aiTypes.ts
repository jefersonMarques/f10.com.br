export type AiProviderCode = "openai" | "deepseek";

export type AiTaskCode =
  | "support_answer"
  | "help_public_answer"
  | "content_edit"
  | "ticket_summary"
  | "ticket_classification";

export type AiCapability =
  | "knowledge.search"
  | "knowledge.read"
  | "customer.reply"
  | "public.reply"
  | "content.draft"
  | "ticket.read"
  | "ticket.summarize"
  | "ticket.classify";

export type AiTaskProfile = {
  task: AiTaskCode;
  enabled: boolean;
  provider: AiProviderCode;
  model: string;
  fallbackProvider: AiProviderCode | null;
  fallbackModel: string;
  capabilities: AiCapability[];
};

export type AiRuntimePolicy = {
  maxRunsPerConversation: number;
  dailyTokenBudget: number;
  maxOutputTokens: number;
};

export const AI_PROVIDER_DEFINITIONS: Record<
  AiProviderCode,
  { code: AiProviderCode; label: string; defaultModel: string; endpoint: string }
> = {
  openai: {
    code: "openai",
    label: "OpenAI",
    defaultModel: "gpt-5-mini",
    endpoint: "https://api.openai.com/v1/responses",
  },
  deepseek: {
    code: "deepseek",
    label: "DeepSeek",
    defaultModel: "deepseek-v4-flash",
    endpoint: "https://api.deepseek.com/responses",
  },
};

export const AI_CAPABILITY_LABELS: Record<AiCapability, string> = {
  "knowledge.search": "Pesquisar Base de Conhecimento",
  "knowledge.read": "Ler conhecimento recuperado",
  "customer.reply": "Responder cliente no atendimento",
  "public.reply": "Responder visitante da Central",
  "content.draft": "Gerar ou editar rascunho de conteúdo",
  "ticket.read": "Ler dados do ticket",
  "ticket.summarize": "Resumir ticket",
  "ticket.classify": "Classificar ticket",
};

export const AI_TASK_DEFINITIONS: Record<
  AiTaskCode,
  {
    code: AiTaskCode;
    label: string;
    description: string;
    wired: boolean;
    defaultEnabled: boolean;
    defaultProvider: AiProviderCode;
    allowedCapabilities: AiCapability[];
    defaultCapabilities: AiCapability[];
  }
> = {
  support_answer: {
    code: "support_answer",
    label: "Atendimento automático",
    description: "Responde no chat usando somente a Base de Conhecimento publicada e faz handoff quando necessário.",
    wired: true,
    defaultEnabled: false,
    defaultProvider: "openai",
    allowedCapabilities: ["knowledge.search", "knowledge.read", "customer.reply"],
    defaultCapabilities: ["knowledge.search", "knowledge.read", "customer.reply"],
  },
  help_public_answer: {
    code: "help_public_answer",
    label: "IA da Central de Ajuda",
    description: "Responde visitantes na Central pública usando o conhecimento publicado.",
    wired: true,
    defaultEnabled: true,
    defaultProvider: "openai",
    allowedCapabilities: ["knowledge.search", "knowledge.read", "public.reply"],
    defaultCapabilities: ["knowledge.search", "knowledge.read", "public.reply"],
  },
  content_edit: {
    code: "content_edit",
    label: "Edição de conteúdo",
    description: "Perfil preparado para rascunhos e revisão assistida da Base de Conhecimento.",
    wired: false,
    defaultEnabled: false,
    defaultProvider: "openai",
    allowedCapabilities: ["knowledge.read", "content.draft"],
    defaultCapabilities: ["knowledge.read", "content.draft"],
  },
  ticket_summary: {
    code: "ticket_summary",
    label: "Resumo de tickets",
    description: "Perfil preparado para resumir históricos extensos de atendimento.",
    wired: false,
    defaultEnabled: false,
    defaultProvider: "deepseek",
    allowedCapabilities: ["ticket.read", "ticket.summarize"],
    defaultCapabilities: ["ticket.read", "ticket.summarize"],
  },
  ticket_classification: {
    code: "ticket_classification",
    label: "Classificação de tickets",
    description: "Perfil preparado para triagem e classificação textual de alto volume.",
    wired: false,
    defaultEnabled: false,
    defaultProvider: "deepseek",
    allowedCapabilities: ["ticket.read", "ticket.classify"],
    defaultCapabilities: ["ticket.read", "ticket.classify"],
  },
};

export function isAiProviderCode(value: string): value is AiProviderCode {
  return value === "openai" || value === "deepseek";
}

export function isAiTaskCode(value: string): value is AiTaskCode {
  return Object.prototype.hasOwnProperty.call(AI_TASK_DEFINITIONS, value);
}
