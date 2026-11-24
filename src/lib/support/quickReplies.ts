export type QuickReply = {
  id: string;
  command: string;
  title: string;
  body: string;
};

export type QuickReplyScope = {
  id: string;
  label: string;
  canEdit: boolean;
  replies: QuickReply[];
};

export type QuickReplyContext = {
  customerName?: string | null;
  unitName?: string | null;
  ticketNumber?: number | null;
  agentName?: string | null;
};

export const DEFAULT_QUICK_REPLIES: QuickReply[] = [
  { id: "access", command: "acesso", title: "Solicitar acesso remoto", body: "Podemos realizar um acesso remoto para verificar a situação?" },
  { id: "screenshot", command: "print", title: "Solicitar captura de tela", body: "Por favor, envie uma captura de tela mostrando a situação." },
  { id: "checking", command: "verificando", title: "Em análise", body: "Estou verificando a situação e retorno com mais informações em breve." },
  { id: "update", command: "atualizar", title: "Atualizar sistema", body: "Por favor, verifique se o sistema está atualizado e tente novamente." },
  { id: "finish", command: "finalizar", title: "Encerrar atendimento", body: "Posso ajudar com mais alguma coisa?" },
];

const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z][a-zA-Z0-9]*)\s*\}\}/g;
const ALLOWED_VARIABLES = new Set(["customerName", "unitName", "ticketNumber", "agentName"]);

export function normalizeQuickReply(input: unknown): Omit<QuickReply, "id"> | null {
  if (!input || typeof input !== "object") return null;
  const data = input as Record<string, unknown>;
  if (typeof data.command !== "string" || typeof data.title !== "string" || typeof data.body !== "string") return null;
  const command = data.command.trim().replace(/^\//, "").toLowerCase();
  const title = data.title.trim();
  const body = data.body.trim();
  if (!/^[a-z0-9_-]{1,32}$/.test(command) || title.length < 2 || title.length > 80 || !body || body.length > 4000) return null;
  for (const match of body.matchAll(VARIABLE_PATTERN)) {
    if (!ALLOWED_VARIABLES.has(match[1])) return null;
  }
  return { command, title, body };
}

export function renderQuickReply(body: string, context: QuickReplyContext): string | null {
  let missing = false;
  const rendered = body.replace(VARIABLE_PATTERN, (_match, key: string) => {
    const value = context[key as keyof QuickReplyContext];
    if (value === undefined || value === null || String(value).trim() === "") {
      missing = true;
      return "";
    }
    return String(value);
  });
  return missing ? null : rendered;
}

export function readStoredQuickReplies(value: unknown): QuickReply[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 50).flatMap((entry): QuickReply[] => {
    const normalized = normalizeQuickReply(entry);
    if (!normalized || typeof entry.id !== "string") return [];
    return [{ id: entry.id, ...normalized }];
  });
}
