import fs from "fs/promises";
import path from "path";
import {
  DEBUG,
  EXACT_TOKEN,
  EXACT_FUNNEL_ID,
  F10_FONTE,
  F10_GROUP,
  F10_MIDIA,
  F10_TOKEN,
  F10_URL,
  BREVO_API_KEY,
  BREVO_SALES_MAIL_TO,
  BREVO_FROM_EMAIL,
} from "$env/static/private";

export type LeadChannel = "contact" | "contact-modal" | "whatsapp";

export type BaseLead = {
  name: string;
  phone: string;
  source: string;
  createdAt: string;

  email?: string;
  message?: string;
  page?: string;
  product?: string;
  subSource?: string;
  description?: string;
  schoolName?: string;
};

export type IntegrationResult = {
  ok: boolean;
  skipped?: boolean;
  status?: number;
  body?: unknown;
  error?: string;
};

export type ProcessLeadResult = {
  ok: boolean;
  f10: boolean;
  exact: boolean;
  f10Result: IntegrationResult;
  exactResult: IntegrationResult;
  leadEmailResult?: IntegrationResult;
  alertEmailResult?: IntegrationResult;
};

type JwtPayload = {
  exp?: number;
  iat?: number;
  [key: string]: unknown;
};

type JwtStatus = {
  present: boolean;
  decodable: boolean;
  expired: boolean;
  exp?: number;
  expIso?: string;
  iat?: number;
  iatIso?: string;
  payload?: JwtPayload | null;
  reason?: string;
};

const DEFAULT_SITE_URL = "https://f10.com.br";

const DATA_FILE_BY_CHANNEL: Record<LeadChannel, string> = {
  contact: path.resolve("data", "contact-leads.json"),
  "contact-modal": path.resolve("data", "contact-modal-leads.json"),
  whatsapp: path.resolve("data", "whatsapp-leads.json"),
};

// =========================
// Debug
// =========================

function isDebugEnabled(): boolean {
  const value = String(DEBUG ?? "").trim().toLowerCase();
  return value === "true" || value === "1" || value === "yes" || value === "on";
}

function debugLog(label: string, data?: unknown): void {
  if (!isDebugEnabled()) return;

  if (typeof data === "undefined") {
    console.log(`[lead-service][debug] ${label}`);
    return;
  }

  try {
    console.log(
      `[lead-service][debug] ${label}:`,
      typeof data === "string" ? data : JSON.stringify(data, null, 2),
    );
  } catch {
    console.log(`[lead-service][debug] ${label}:`, data);
  }
}

function debugError(label: string, error: unknown): void {
  if (!isDebugEnabled()) return;
  console.error(`[lead-service][debug] ${label}:`, error);
}

function maskToken(token: string): string {
  const value = safeString(token);
  if (!value) return "";
  if (value.length <= 10) return "***";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

// =========================
// Utilitários
// =========================

export function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizePhone(rawPhone: string): string {
  return String(rawPhone ?? "").replace(/\D/g, "");
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function parseFunnelId(raw: unknown): number | undefined {
  const value = String(raw ?? "").trim();
  if (!value) return undefined;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;

  return parsed;
}

export function joinUrl(baseUrl: string, relativePath: string): string {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const normalizedRelativePath = relativePath.startsWith("/")
    ? relativePath
    : `/${relativePath}`;

  return `${normalizedBaseUrl}${normalizedRelativePath}`;
}

export function buildAbsoluteSource(rawSource: string, baseUrl: string): string {
  const sourceValue = safeString(rawSource) || "/";
  const normalizedBaseUrl = safeString(baseUrl) || DEFAULT_SITE_URL;

  if (/^https?:\/\//i.test(sourceValue)) {
    return sourceValue;
  }

  return joinUrl(normalizedBaseUrl, sourceValue);
}

export function getLeadWebsite(lead: BaseLead): string {
  try {
    return new URL(lead.source).origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDateIso(value?: string): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

// =========================
// JWT helpers
// =========================

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const payloadPart = parts[1];
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const json = Buffer.from(padded, "base64").toString("utf-8");

    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

function inspectJwt(token: string): JwtStatus {
  const normalizedToken = safeString(token);

  if (!normalizedToken) {
    return {
      present: false,
      decodable: false,
      expired: false,
      reason: "missing_token",
      payload: null,
    };
  }

  const payload = decodeJwtPayload(normalizedToken);

  if (!payload) {
    return {
      present: true,
      decodable: false,
      expired: false,
      reason: "invalid_jwt_payload",
      payload: null,
    };
  }

  const exp =
    typeof payload.exp === "number" && Number.isFinite(payload.exp)
      ? payload.exp
      : undefined;

  const iat =
    typeof payload.iat === "number" && Number.isFinite(payload.iat)
      ? payload.iat
      : undefined;

  const nowSeconds = Math.floor(Date.now() / 1000);
  const expired = typeof exp === "number" ? exp <= nowSeconds : false;

  return {
    present: true,
    decodable: true,
    expired,
    exp,
    expIso: typeof exp === "number" ? new Date(exp * 1000).toISOString() : undefined,
    iat,
    iatIso: typeof iat === "number" ? new Date(iat * 1000).toISOString() : undefined,
    payload,
    reason: expired ? "jwt_expired" : undefined,
  };
}

// =========================
// Persistência local
// =========================

async function appendLeadToFile(filePath: string, lead: BaseLead): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  let list: BaseLead[] = [];

  try {
    const content = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      list = parsed as BaseLead[];
    }
  } catch {
    list = [];
  }

  list.push(lead);
  await fs.writeFile(filePath, JSON.stringify(list, null, 2), "utf-8");
}

export async function saveLeadBackup(
  channel: LeadChannel,
  lead: BaseLead,
): Promise<void> {
  const filePath = DATA_FILE_BY_CHANNEL[channel];

  debugLog("Salvando backup local", {
    channel,
    filePath,
    lead,
  });

  await appendLeadToFile(filePath, lead);

  debugLog("Backup local salvo com sucesso", {
    channel,
    filePath,
  });
}

// =========================
// Regras por canal
// =========================

function getChannelMeta(channel: LeadChannel): {
  label: string;
  defaultSource: string;
  defaultSubSource: string;
  defaultDescription: string;
  defaultF10Media: string;
} {
  switch (channel) {
    case "contact":
      return {
        label: "Formulário de contato",
        defaultSource: "Formulário de contato (site)",
        defaultSubSource: "Contato (página)",
        defaultDescription: "Lead capturado pelo formulário de contato do site.",
        defaultF10Media: "Formulário de contato",
      };

    case "contact-modal":
      return {
        label: "Modal de contato",
        defaultSource: "Formulário de contato (modal)",
        defaultSubSource: "Modal de contato",
        defaultDescription:
          "Lead capturado pelo formulário de contato (modal) com WhatsApp no site.",
        defaultF10Media: "Modal de contato",
      };

    case "whatsapp":
      return {
        label: "Botão WhatsApp",
        defaultSource: "Botão WhatsApp Site F10",
        defaultSubSource: "Botão flutuante site",
        defaultDescription:
          "Lead capturado pelo botão de WhatsApp flutuante do site.",
        defaultF10Media: "Botão WhatsApp flutuante",
      };
  }
}

function buildLeadDescription(channel: LeadChannel, lead: BaseLead): string {
  const meta = getChannelMeta(channel);

  const lines: string[] = [meta.defaultDescription];

  if (lead.message) lines.push(`Mensagem: ${lead.message}`);
  if (lead.schoolName) lines.push(`Escola: ${lead.schoolName}`);
  if (lead.email) lines.push(`E-mail: ${lead.email}`);
  if (lead.page) lines.push(`Página: ${lead.page}`);
  if (lead.product) lines.push(`Produto: ${lead.product}`);
  if (lead.subSource) lines.push(`SubSource: ${lead.subSource}`);
  if (lead.source) lines.push(`Source: ${lead.source}`);
  if (lead.description) lines.push(`Contexto: ${lead.description}`);
  lines.push(`Criado em: ${lead.createdAt}`);

  return lines.join("\n");
}

// =========================
// HTTP helpers
// =========================

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => "");

  if (!text) {
    return "";
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// =========================
// Brevo
// =========================

async function sendEmailBrevo(params: {
  subject: string;
  htmlContent: string;
  replyToEmail?: string;
  replyToName?: string;
}): Promise<IntegrationResult> {
  const apiKey = safeString(BREVO_API_KEY);
  const toEmail = safeString(BREVO_SALES_MAIL_TO);
  const fromEmail = safeString(BREVO_FROM_EMAIL) || "no-reply@f10.com.br";

  if (!apiKey) {
    console.warn("[lead-service] BREVO_API_KEY não definido. Pulando e-mail.");
    return { ok: false, skipped: true, error: "missing_brevo_api_key" };
  }

  if (!toEmail) {
    console.warn("[lead-service] BREVO_SALES_MAIL_TO não definido. Pulando e-mail.");
    return { ok: false, skipped: true, error: "missing_brevo_sales_mail_to" };
  }

  const body: Record<string, unknown> = {
    sender: {
      email: fromEmail,
      name: "Leads F10",
    },
    to: [{ email: toEmail, name: "Comercial" }],
    subject: params.subject,
    htmlContent: params.htmlContent,
  };

  if (params.replyToEmail) {
    body.replyTo = {
      email: params.replyToEmail,
      name: params.replyToName || "",
    };
  }

  debugLog("Brevo request", {
    toEmail,
    subject: params.subject,
    hasReplyTo: !!params.replyToEmail,
  });

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  const parsedBody = await parseResponseBody(response);

  debugLog("Brevo response", {
    status: response.status,
    ok: response.ok,
    body: parsedBody,
  });

  if (!response.ok) {
    console.error("[lead-service] Falha ao enviar e-mail via Brevo:", response.status, parsedBody);
    return { ok: false, status: response.status, body: parsedBody };
  }

  return { ok: true, status: response.status, body: parsedBody };
}

function buildLeadRows(lead: BaseLead): Array<[string, string]> {
  return [
    ["Nome", lead.name],
    ["WhatsApp", lead.phone],
    ["E-mail", lead.email || ""],
    ["Escola", lead.schoolName || ""],
    ["Produto", lead.product || ""],
    ["SubSource", lead.subSource || ""],
    ["Página", lead.page || ""],
    ["Source", lead.source || ""],
    ["Criado em", formatDateIso(lead.createdAt)],
  ].filter(([, value]) => safeString(value).length > 0) as Array<[string, string]>;
}

function buildJwtStatusHtml(jwtStatus: JwtStatus): string {
  const statusLabel = !jwtStatus.present
    ? "Token ausente"
    : !jwtStatus.decodable
      ? "Token inválido"
      : jwtStatus.expired
        ? "Token vencido"
        : "Token válido";

  const rows = [
    ["Status JWT", statusLabel],
    ["Expira em", jwtStatus.expIso ? formatDateIso(jwtStatus.expIso) : "—"],
    ["Emitido em", jwtStatus.iatIso ? formatDateIso(jwtStatus.iatIso) : "—"],
  ];

  const rowsHtml = rows
    .map(
      ([key, value]) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#0f172a;width:140px;">${escapeHtml(
          key,
        )}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;color:#334155;">${escapeHtml(
          value,
        )}</td>
      </tr>
    `,
    )
    .join("");

  return `
    <div style="margin-top:16px;padding:14px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;">
      <div style="font-weight:800;color:#0f172a;margin-bottom:8px;">Status do token F10</div>
      <table style="width:100%;border-collapse:collapse;">
        ${rowsHtml}
      </table>
    </div>
  `;
}

function buildLeadReceivedEmailHtml(
  channel: LeadChannel,
  lead: BaseLead,
  jwtStatus: JwtStatus,
): string {
  const meta = getChannelMeta(channel);
  const rowsHtml = buildLeadRows(lead)
    .map(
      ([key, value]) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#0f172a;width:140px;">${escapeHtml(
          key,
        )}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;color:#334155;">${escapeHtml(
          value,
        )}</td>
      </tr>
    `,
    )
    .join("");

  const messageBlock = lead.message
    ? `
      <div style="margin-top:16px;padding:14px;border-radius:12px;background:#fff7ed;border:1px solid #fed7aa;">
        <div style="font-weight:800;color:#9a3412;margin-bottom:6px;">Mensagem</div>
        <div style="color:#334155;white-space:pre-wrap;line-height:1.55;">${escapeHtml(
          lead.message,
        )}</div>
      </div>
    `
    : "";

  const descriptionBlock = lead.description
    ? `
      <div style="margin-top:16px;padding:14px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;">
        <div style="font-weight:800;color:#0f172a;margin-bottom:6px;">Contexto</div>
        <div style="color:#334155;white-space:pre-wrap;line-height:1.55;">${escapeHtml(
          lead.description,
        )}</div>
      </div>
    `
    : "";

  const jwtBlock = buildJwtStatusHtml(jwtStatus);

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f6f8ff;padding:24px;">
      <div style="max-width:760px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
        <div style="padding:18px 20px;background:#000A57;color:#ffffff;">
          <div style="font-size:18px;font-weight:800;">Novo lead recebido</div>
          <div style="font-size:13px;opacity:0.92;margin-top:4px;">Canal: ${escapeHtml(
            meta.label,
          )}</div>
        </div>

        <div style="padding:20px;">
          <table style="width:100%;border-collapse:collapse;">
            ${rowsHtml}
          </table>

          ${messageBlock}
          ${descriptionBlock}
          ${jwtBlock}
        </div>
      </div>
    </div>
  `;
}

function stringifyErrorBody(body: unknown): string {
  if (typeof body === "string") {
    return body;
  }

  try {
    return JSON.stringify(body, null, 2);
  } catch {
    return String(body);
  }
}

function buildLeadFailureEmailHtml(params: {
  channel: LeadChannel;
  lead: BaseLead;
  jwtStatus: JwtStatus;
  f10Result: IntegrationResult;
  exactResult: IntegrationResult;
}): string {
  const meta = getChannelMeta(params.channel);

  const rowsHtml = buildLeadRows(params.lead)
    .map(
      ([key, value]) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#0f172a;width:140px;">${escapeHtml(
          key,
        )}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;color:#334155;">${escapeHtml(
          value,
        )}</td>
      </tr>
    `,
    )
    .join("");

  const f10Body = stringifyErrorBody(params.f10Result.body);
  const exactBody = stringifyErrorBody(params.exactResult.body);

  const failureRows = [
    ["F10 ok", params.f10Result.ok ? "Sim" : "Não"],
    ["F10 status", params.f10Result.status ? String(params.f10Result.status) : "—"],
    ["F10 erro", params.f10Result.error || "—"],
    ["Exact ok", params.exactResult.ok ? "Sim" : "Não"],
    ["Exact status", params.exactResult.status ? String(params.exactResult.status) : "—"],
    ["Exact erro", params.exactResult.error || "—"],
  ]
    .map(
      ([key, value]) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#0f172a;width:140px;">${escapeHtml(
          key,
        )}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;color:#334155;">${escapeHtml(
          value,
        )}</td>
      </tr>
    `,
    )
    .join("");

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#fff7ed;padding:24px;">
      <div style="max-width:760px;margin:0 auto;background:#ffffff;border:1px solid #fed7aa;border-radius:16px;overflow:hidden;">
        <div style="padding:18px 20px;background:#9a3412;color:#ffffff;">
          <div style="font-size:18px;font-weight:800;">Alerta: lead não entrou no sistema</div>
          <div style="font-size:13px;opacity:0.92;margin-top:4px;">Canal: ${escapeHtml(
            meta.label,
          )}</div>
        </div>

        <div style="padding:20px;">
          <div style="font-weight:800;color:#9a3412;margin-bottom:10px;">
            O lead foi recebido, mas houve falha no envio para o sistema.
          </div>

          <table style="width:100%;border-collapse:collapse;">
            ${rowsHtml}
          </table>

          ${buildJwtStatusHtml(params.jwtStatus)}

          <div style="margin-top:16px;padding:14px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;">
            <div style="font-weight:800;color:#0f172a;margin-bottom:8px;">Resumo da falha</div>
            <table style="width:100%;border-collapse:collapse;">
              ${failureRows}
            </table>
          </div>

          <div style="margin-top:16px;padding:14px;border-radius:12px;background:#fff1f2;border:1px solid #fecdd3;">
            <div style="font-weight:800;color:#9f1239;margin-bottom:6px;">Resposta F10</div>
            <pre style="margin:0;white-space:pre-wrap;word-break:break-word;color:#334155;">${escapeHtml(
              f10Body || "—",
            )}</pre>
          </div>

          ${
            params.exactResult.ok || params.exactResult.skipped
              ? ""
              : `
          <div style="margin-top:16px;padding:14px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe;">
            <div style="font-weight:800;color:#1d4ed8;margin-bottom:6px;">Resposta Exact</div>
            <pre style="margin:0;white-space:pre-wrap;word-break:break-word;color:#334155;">${escapeHtml(
              exactBody || "—",
            )}</pre>
          </div>
          `
          }
        </div>
      </div>
    </div>
  `;
}

async function sendLeadReceivedEmail(
  channel: LeadChannel,
  lead: BaseLead,
  jwtStatus: JwtStatus,
): Promise<IntegrationResult> {
  const subject = `[Lead] Novo lead recebido - ${lead.name}`;

  return sendEmailBrevo({
    subject,
    htmlContent: buildLeadReceivedEmailHtml(channel, lead, jwtStatus),
    replyToEmail: lead.email,
    replyToName: lead.name,
  });
}

async function sendLeadFailureAlertEmail(params: {
  channel: LeadChannel;
  lead: BaseLead;
  jwtStatus: JwtStatus;
  f10Result: IntegrationResult;
  exactResult: IntegrationResult;
}): Promise<IntegrationResult> {
  const subject = `[ALERTA] Lead nao entrou no sistema - ${params.lead.name}`;

  return sendEmailBrevo({
    subject,
    htmlContent: buildLeadFailureEmailHtml(params),
    replyToEmail: params.lead.email,
    replyToName: params.lead.name,
  });
}

// =========================
// F10
// =========================

async function sendLeadToF10(
  channel: LeadChannel,
  lead: BaseLead,
  jwtStatus: JwtStatus,
): Promise<IntegrationResult> {
  const token = safeString(F10_TOKEN);
  const url = safeString(F10_URL);
  const unitId = safeString(F10_GROUP);
  const meta = getChannelMeta(channel);

  if (!token) {
    console.warn("[lead-service] F10_TOKEN não definido. Pulando F10.");
    return {
      ok: false,
      skipped: true,
      error: "missing_f10_token",
      body: { msg: "F10_TOKEN não definido." },
    };
  }

  if (!url) {
    console.warn("[lead-service] F10_URL não definido. Pulando F10.");
    return {
      ok: false,
      skipped: true,
      error: "missing_f10_url",
      body: { msg: "F10_URL não definido." },
    };
  }

  if (!unitId) {
    console.warn("[lead-service] F10_GROUP não definido. Pulando F10.");
    return {
      ok: false,
      skipped: true,
      error: "missing_f10_group",
      body: { msg: "F10_GROUP não definido." },
    };
  }

  if (!jwtStatus.present || !jwtStatus.decodable) {
    console.warn("[lead-service] JWT do F10 ausente ou inválido. Pulando F10.");
    return {
      ok: false,
      skipped: true,
      error: jwtStatus.reason || "invalid_f10_jwt",
      body: {
        msg: "JWT do F10 ausente ou inválido.",
        jwtStatus,
      },
    };
  }

  if (jwtStatus.expired) {
    console.warn("[lead-service] JWT do F10 vencido. Pulando F10.");
    return {
      ok: false,
      skipped: true,
      error: "jwt_expired",
      body: {
        msg: "JWT do F10 vencido.",
        jwtStatus,
      },
    };
  }

  const normalizedPhone = normalizePhone(lead.phone);
  const note = buildLeadDescription(channel, lead);

  const f10Body = [
    {
      unidade_id: unitId,
      fontes: [
        {
          fonte: safeString(F10_FONTE) || "Site",
          midia:
            safeString(F10_MIDIA) ||
            safeString(lead.subSource) ||
            meta.defaultF10Media,
          digitacoes: [
            {
              nome: lead.name,
              curso: safeString(lead.product),
              telefone: normalizedPhone,
              celular: normalizedPhone,
              comercial: "",
              email: safeString(lead.email),
              nascimento: "",
              sexo: "",
              endereco: "",
              bairro: "",
              cidade: "",
              estado: "",
              cep: "",
              colegio: safeString(lead.schoolName),
              turma: "",
              serie: "",
              anoletivo: "",
              turno: "",
              pai: "",
              mae: "",
              obs: note,
              extra1: safeString(lead.page),
              extra2: safeString(lead.source),
            },
          ],
        },
      ],
    },
  ];

  debugLog("F10 token payload", jwtStatus.payload);

  debugLog("F10 request", {
    channel,
    url,
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${maskToken(token)}`,
    },
    body: f10Body,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(f10Body),
  });

  const parsedBody = await parseResponseBody(response);

  debugLog("F10 response", {
    channel,
    url,
    status: response.status,
    ok: response.ok,
    body: parsedBody,
  });

  if (!response.ok) {
    console.error("[lead-service] Falha ao enviar para F10:", response.status, parsedBody);
    return { ok: false, status: response.status, body: parsedBody };
  }

  return { ok: true, status: response.status, body: parsedBody };
}

// =========================
// Exact
// =========================

async function sendLeadToExact(
  channel: LeadChannel,
  lead: BaseLead,
): Promise<IntegrationResult> {
  const token = safeString(EXACT_TOKEN);
  const meta = getChannelMeta(channel);

  if (!token) {
    console.warn("[lead-service] EXACT_TOKEN não definido. Pulando Exact.");
    return { ok: false, skipped: true, error: "missing_exact_token" };
  }

  const normalizedPhone = normalizePhone(lead.phone);
  const funnelId = parseFunnelId(EXACT_FUNNEL_ID);

  const exactBody = {
    duplicityValidation: false,
    lead: {
      funnelId: funnelId || undefined,
      name: lead.name,
      industry: "Educação",
      source: safeString(lead.source) || meta.defaultSource,
      subSource: safeString(lead.subSource) || meta.defaultSubSource,
      ddiPhone: "55",
      phone: normalizedPhone,
      website: getLeadWebsite(lead),
      leadProduct: safeString(lead.product) || "Software F10",
      description: buildLeadDescription(channel, lead),
      address: "",
      addressNumber: "",
      addressComplement: "",
      neighborhood: "",
      zipcode: "",
      city: "",
      state: "",
      country: "Brasil",
      cpfcnpj: "",
      customFields: [],
    },
  };

  const exactUrl = "https://api.exactspotter.com/v3/LeadsAdd";

  debugLog("Exact request", {
    channel,
    url: exactUrl,
    headers: {
      "Content-Type": "application/json",
      token_exact: maskToken(token),
    },
    body: exactBody,
  });

  const response = await fetch(exactUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      token_exact: token,
    },
    body: JSON.stringify(exactBody),
  });

  const parsedBody = await parseResponseBody(response);

  debugLog("Exact response", {
    channel,
    url: exactUrl,
    status: response.status,
    ok: response.ok,
    body: parsedBody,
  });

  if (!response.ok) {
    console.error("[lead-service] Falha ao enviar para Exact:", response.status, parsedBody);
    return { ok: false, status: response.status, body: parsedBody };
  }

  return { ok: true, status: response.status, body: parsedBody };
}

// =========================
// Orquestração
// =========================

export async function processLead(
  channel: LeadChannel,
  lead: BaseLead,
): Promise<ProcessLeadResult> {
  debugLog("Início do processamento do lead", {
    channel,
    lead,
    debugEnabled: isDebugEnabled(),
  });

  const jwtStatus = inspectJwt(F10_TOKEN);

  debugLog("F10 JWT status", {
    present: jwtStatus.present,
    decodable: jwtStatus.decodable,
    expired: jwtStatus.expired,
    expIso: jwtStatus.expIso,
    iatIso: jwtStatus.iatIso,
    reason: jwtStatus.reason,
    payload: jwtStatus.payload,
  });

  try {
    await saveLeadBackup(channel, lead);
  } catch (error) {
    debugError("Erro ao salvar backup local", error);
    throw error;
  }

  let leadEmailResult: IntegrationResult = { ok: false, skipped: true };
  try {
    leadEmailResult = await sendLeadReceivedEmail(channel, lead, jwtStatus);
  } catch (error) {
    console.error("[lead-service] Erro inesperado ao enviar e-mail de lead:", error);
    debugError("Erro inesperado no e-mail de lead", error);
    leadEmailResult = { ok: false, error: "unexpected_email_error" };
  }

  let f10Result: IntegrationResult = { ok: false, skipped: true };
  try {
    f10Result = await sendLeadToF10(channel, lead, jwtStatus);
  } catch (error) {
    console.error("[lead-service] Erro inesperado ao enviar para F10:", error);
    debugError("Erro inesperado no envio para F10", error);
    f10Result = { ok: false, error: "unexpected_error" };
  }

  let exactResult: IntegrationResult = { ok: false, skipped: true };
  try {
    exactResult = await sendLeadToExact(channel, lead);
  } catch (error) {
    console.error("[lead-service] Erro inesperado ao enviar para Exact:", error);
    debugError("Erro inesperado no envio para Exact", error);
    exactResult = { ok: false, error: "unexpected_error" };
  }

  let alertEmailResult: IntegrationResult = { ok: false, skipped: true };

  const shouldAlertFailure =
    !f10Result.ok ||
    (!exactResult.ok && !exactResult.skipped);

  if (shouldAlertFailure) {
    try {
      alertEmailResult = await sendLeadFailureAlertEmail({
        channel,
        lead,
        jwtStatus,
        f10Result,
        exactResult,
      });
    } catch (error) {
      console.error("[lead-service] Erro inesperado ao enviar e-mail de alerta:", error);
      debugError("Erro inesperado no e-mail de alerta", error);
      alertEmailResult = { ok: false, error: "unexpected_alert_email_error" };
    }
  }

  const result: ProcessLeadResult = {
    ok: true,
    f10: f10Result.ok ?? false,
    exact: exactResult.ok ?? false,
    f10Result,
    exactResult,
    leadEmailResult,
    alertEmailResult,
  };

  debugLog("Fim do processamento do lead", {
    channel,
    result,
  });

  return result;
}