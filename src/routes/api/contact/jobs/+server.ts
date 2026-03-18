// src/routes/api/contact/jobs/+server.ts
import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import fs from "node:fs/promises";
import path from "node:path";
import { Buffer } from "node:buffer";
import {
  BREVO_API_KEY,
  BREVO_FROM_EMAIL,
  BREVO_FROM_NAME,
  JOBS_MAIL_TO,
  JOBS_RESUME_MAX_MB,
  SITE_URL,
} from "$env/static/private";

// =========================
// Tipos
// =========================
type JobsPayload = {
  name?: string;
  phone?: string;
  email?: string;

  // Campos do “Trabalhe conosco” (você pode mudar no frontend à vontade)
  role?: string;
  linkedin?: string;
  portfolio?: string;
  message?: string;

  // Extras (opcionais)
  source?: string;
  page?: string;
  product?: string;
  subSource?: string;
  description?: string;
  createdAt?: string;

  // Se no futuro quiser mandar campos dinâmicos sem mexer no backend:
  extra?: Record<string, unknown>;
};

type JobsLead = {
  name: string;
  phone: string;
  email: string;
  message: string;

  role?: string;
  linkedin?: string;
  portfolio?: string;

  source: string;
  page?: string;
  product?: string;
  subSource?: string;
  description?: string;
  createdAt: string;

  // Campos dinâmicos (opcional)
  extra?: Record<string, unknown>;

  resumeFileName?: string;
  resumeFileSize?: number;
};

// =========================
// Config
// =========================
const DATA_FILE_PATH = path.resolve("data", "contact-jobs.json");

// =========================
// Utilitários
// =========================
function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePhone(rawPhone: string): string {
  return String(rawPhone ?? "").replace(/\D/g, "");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(text: string): string {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildAbsoluteSource(rawSource: string): string {
  const siteUrl = safeString(SITE_URL) || "https://f10.com.br";
  const s = safeString(rawSource) || "/contato";
  if (s.startsWith("/")) return `${siteUrl}${s}`;
  return s;
}

function getMaxResumeMB(): number {
  const raw = safeString(JOBS_RESUME_MAX_MB);
  const parsed = Number.parseInt(raw || "8", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 8;
  return parsed;
}

function sanitizeFileName(name: string): string {
  const n = safeString(name) || "curriculo";
  // remove path traversal e caracteres estranhos
  return n.replace(/[\\\/]+/g, "_").replace(/[^\w.\-()+\s]/g, "_").slice(0, 120);
}

async function appendToJsonFile<T>(filePath: string, item: T): Promise<void> {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    let list: T[] = [];
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) list = parsed as T[];
    } catch {
      list = [];
    }

    list.push(item);
    await fs.writeFile(filePath, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    console.error("[contact/jobs] Falha ao salvar backup local:", err);
  }
}

function isFileLike(value: unknown): value is File {
  return (
    !!value &&
    typeof value === "object" &&
    "arrayBuffer" in value &&
    "name" in value &&
    typeof (value as any).name === "string"
  );
}

function getResumeFromFormData(formData: FormData): File | null {
  // Aceita vários nomes (pra você “mudar os campos” no frontend sem dor)
  const candidates = ["resume", "curriculo", "cv", "file", "arquivo"];
  for (const key of candidates) {
    const v = formData.get(key);
    if (isFileLike(v)) return v as File;
  }
  return null;
}

// =========================
// Brevo (envio de e-mail)
// =========================
async function sendEmailBrevo(params: {
  toEmail: string;
  subject: string;
  htmlContent: string;
  replyToEmail?: string;
  replyToName?: string;
  attachments?: Array<{ name: string; contentBase64: string }>;
}) {
  const apiKey = safeString(BREVO_API_KEY);
  if (!apiKey) {
    console.warn("[contact/jobs] BREVO_API_KEY não definido. Pulando e-mail.");
    return { ok: false, skipped: true };
  }

  const fromEmail = safeString(BREVO_FROM_EMAIL) || "no-reply@f10.com.br";
  const fromName = "TRABALHE CONOSCO";

  const body: any = {
    sender: { email: fromEmail, name: fromName },
    to: [{ email: params.toEmail, name: "Pessoas & Cultura" }],
    subject: params.subject,
    htmlContent: params.htmlContent,
  };

  if (params.replyToEmail) {
    body.replyTo = { email: params.replyToEmail, name: params.replyToName || "" };
  }

  if (params.attachments?.length) {
    body.attachment = params.attachments.map((a) => ({
      name: a.name,
      content: a.contentBase64,
    }));
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text().catch(() => "");

  if (!response.ok) {
    console.error("[contact/jobs] Brevo falhou:", response.status, text);
    return { ok: false, status: response.status, body: text };
  }

  return { ok: true, status: response.status, body: text };
}

function buildJobsEmailHtml(lead: JobsLead): string {
  const rows: Array<[string, string]> = [
    ["Nome", lead.name],
    ["E-mail", lead.email],
    ["WhatsApp", lead.phone],
    ["Área/Interesse", lead.role || ""],
    ["LinkedIn", lead.linkedin || ""],
    ["Portfólio/GitHub", lead.portfolio || ""],
    ["Página", lead.page || ""],
    ["Source", lead.source || ""],
    ["Produto", lead.product || ""],
    ["SubSource", lead.subSource || ""],
    ["Criado em", lead.createdAt],
    ["Arquivo", lead.resumeFileName || ""],
    ["Tamanho", lead.resumeFileSize ? `${lead.resumeFileSize} bytes` : ""],
  ];

  // Renderiza extras (se você mandar no payload.extra)
  if (lead.extra && typeof lead.extra === "object") {
    for (const [k, v] of Object.entries(lead.extra)) {
      const key = safeString(k);
      const val =
        typeof v === "string" ? v : v == null ? "" : JSON.stringify(v);
      if (key && safeString(val)) rows.push([`Extra: ${key}`, val]);
    }
  }

  const rowsHtml = rows
    .filter(([, v]) => safeString(v).length > 0)
    .map(
      ([k, v]) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #eef1ff;color:#010D28;font-weight:700;width:180px;">${escapeHtml(k)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eef1ff;color:#334155;">${escapeHtml(safeString(v))}</td>
      </tr>
    `
    )
    .join("");

  const message = escapeHtml(lead.message || "");
  const description = escapeHtml(lead.description || "");

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f6f8ff;padding:24px;">
    <div style="max-width:720px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #eef1ff;">
      <div style="padding:18px 20px;background:#000A57;color:#fff;">
        <div style="font-size:16px;font-weight:800;letter-spacing:-0.2px;">Nova candidatura — Trabalhe Conosco</div>
        <div style="font-size:12px;opacity:0.9;margin-top:4px;">Endpoint /api/contact/jobs</div>
      </div>

      <div style="padding:18px 20px;">
        <table style="width:100%;border-collapse:collapse;">
          ${rowsHtml}
        </table>

        <div style="margin-top:16px;padding:14px;border-radius:12px;background:#fff7ed;border:1px solid #fde7c7;">
          <div style="font-weight:800;color:#EA6D0B;margin-bottom:6px;">Mensagem</div>
          <div style="color:#334155;white-space:pre-wrap;line-height:1.55;">${message || "—"}</div>
        </div>

        ${
          description
            ? `
        <div style="margin-top:12px;padding:14px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;">
          <div style="font-weight:800;color:#0f172a;margin-bottom:6px;">Contexto/Descrição</div>
          <div style="color:#334155;white-space:pre-wrap;line-height:1.55;">${description}</div>
        </div>`
            : ""
        }
      </div>
    </div>
  </div>
  `;
}

// =========================
// Handler
// =========================
export const POST: RequestHandler = async ({ request }) => {
  const contentType = request.headers.get("content-type") || "";

  let payload: JobsPayload = {};
  let resumeFile: File | null = null;

  // multipart: payload (string JSON) + resume (File)
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();

    const rawPayload = formData.get("payload");
    const payloadStr = typeof rawPayload === "string" ? rawPayload : "{}";

    try {
      payload = JSON.parse(payloadStr);
    } catch {
      payload = {};
    }

    resumeFile = getResumeFromFormData(formData);
  } else {
    // fallback: JSON
    payload = await request.json().catch(() => ({}));
  }

  const name = safeString(payload.name);
  const phone = normalizePhone(safeString(payload.phone));
  const email = safeString(payload.email);
  const message = safeString(payload.message);

  const role = safeString(payload.role) || undefined;
  const linkedin = safeString(payload.linkedin) || undefined;
  const portfolio = safeString(payload.portfolio) || undefined;

  const rawSource = safeString(payload.source) || "/contato";
  const source = buildAbsoluteSource(rawSource);

  const page = safeString(payload.page) || undefined;
  const product = safeString(payload.product) || "Trabalhe Conosco";
  const subSource = safeString(payload.subSource) || "Trabalhe Conosco (site)";
  const description = safeString(payload.description) || undefined;

  const createdAt = safeString(payload.createdAt) || new Date().toISOString();

  // Validações
  if (!name) return json({ ok: false, error: "Nome é obrigatório." }, { status: 400 });
  if (phone.length < 10) return json({ ok: false, error: "WhatsApp com DDD é obrigatório." }, { status: 400 });
  if (!email || !isValidEmail(email)) return json({ ok: false, error: "E-mail válido é obrigatório." }, { status: 400 });
  if (!message) return json({ ok: false, error: "Mensagem é obrigatória." }, { status: 400 });

  // Currículo obrigatório
  if (!resumeFile) {
    return json({ ok: false, error: "Anexe o currículo para continuar." }, { status: 400 });
  }

  // Valida currículo
  const fileName = sanitizeFileName(resumeFile.name);
  const lowerName = fileName.toLowerCase();
  const allowedExtensions = [".pdf", ".doc", ".docx"];
  const hasAllowedExt = allowedExtensions.some((ext) => lowerName.endsWith(ext));
  if (!hasAllowedExt) {
    return json({ ok: false, error: "Formato do currículo inválido. Envie PDF, DOC ou DOCX." }, { status: 400 });
  }

  const maxSizeMB = getMaxResumeMB();
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (resumeFile.size > maxBytes) {
    return json({ ok: false, error: `Arquivo muito grande. Máximo: ${maxSizeMB}MB.` }, { status: 400 });
  }

  const lead: JobsLead = {
    name,
    phone,
    email,
    message,
    role,
    linkedin,
    portfolio,
    source,
    page,
    product,
    subSource,
    description,
    createdAt,
    extra: payload.extra && typeof payload.extra === "object" ? payload.extra : undefined,
    resumeFileName: fileName,
    resumeFileSize: resumeFile.size,
  };

  // Backup local (não derruba se falhar)
  await appendToJsonFile<JobsLead>(DATA_FILE_PATH, lead);

  // Converte currículo em base64 (anexo Brevo)
  const arrayBuffer = await resumeFile.arrayBuffer();
  const resumeBase64 = Buffer.from(arrayBuffer).toString("base64");

  // E-mail (Brevo)
  const toEmail = safeString(JOBS_MAIL_TO);
  if (!toEmail) {
    console.warn("[contact/jobs] JOBS_MAIL_TO não definido. Pulando e-mail.");
  }

  const emailHtml = buildJobsEmailHtml(lead);
  const emailResult = toEmail
    ? await sendEmailBrevo({
        toEmail,
        subject: `Candidatura — ${lead.name}${lead.role ? ` (${lead.role})` : ""}`,
        htmlContent: emailHtml,
        replyToEmail: lead.email,
        replyToName: lead.name,
        attachments: [{ name: fileName, contentBase64: resumeBase64 }],
      })
    : { ok: false, skipped: true };

  return json({
    ok: true,
    email: emailResult?.ok ?? false,
  });
};
