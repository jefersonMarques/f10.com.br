// src/routes/api/contact/lead/+server.ts
import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import fs from "node:fs/promises";
import path from "node:path";
import {
  EXACT_TOKEN,
  EXACT_FUNNEL_ID,
  BREVO_API_KEY,
  BREVO_MAIL_TO,
  BREVO_SALES_MAIL_TO,
  BREVO_FROM_EMAIL,
  BREVO_FROM_NAME,
} from "$env/static/private";
import { PUBLIC_SITE_URL } from "$env/static/public";

// =========================
// Tipos
// =========================
type ContactLeadPayload = {
  name?: string;
  phone?: string;
  email?: string;
  message?: string;

  // Extras (opcionais)
  schoolName?: string;
  source?: string;     // "/" ou URL completa
  page?: string;       // "/precos"
  product?: string;    // "Software F10"
  subSource?: string;  // "Contato - Página"
  description?: string;
  createdAt?: string;
};

type ContactLead = {
  name: string;
  phone: string;
  email: string;
  message: string;

  source: string;
  page?: string;
  product?: string;
  subSource?: string;
  description?: string;
  schoolName?: string;
  createdAt: string;
};

// =========================
// Config
// =========================
const DATA_FILE_PATH = path.resolve("data", "contact-leads.json");

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
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseFunnelId(raw: unknown): number | undefined {
  const value = String(raw ?? "").trim();
  if (!value) return undefined;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;

  return parsed;
}

function buildAbsoluteSource(rawSource: string): string {
  const siteUrl = safeString(PUBLIC_SITE_URL) || "https://f10.com.br";
  const s = safeString(rawSource) || "/";
  if (s.startsWith("/")) return `${siteUrl}${s}`;
  return s;
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
      // Se não existe ou parse falhou, recomeça vazio
      list = [];
    }

    list.push(item);
    await fs.writeFile(filePath, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    console.error("[contact/lead] Falha ao salvar backup local:", err);
  }
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
}) {
  const apiKey = safeString(BREVO_API_KEY);
  if (!apiKey) {
    console.warn("[contact/lead] BREVO_API_KEY não definido. Pulando e-mail.");
    return { ok: false, skipped: true };
  }

  const fromEmail = safeString(BREVO_FROM_EMAIL) || "no-reply@f10.com.br";
  const fromName = "NOVO LEAD - CONTATO";

  const body: any = {
    sender: { email: fromEmail, name: fromName },
    to: [{ email: params.toEmail, name: "Contato" }],
    subject: params.subject,
    htmlContent: params.htmlContent,
  };

  if (params.replyToEmail) {
    body.replyTo = { email: params.replyToEmail, name: params.replyToName || "" };
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
    console.error("[contact/lead] Brevo falhou:", response.status, text);
    return { ok: false, status: response.status, body: text };
  }

  return { ok: true, status: response.status, body: text };
}

function buildLeadEmailHtml(lead: ContactLead): string {
  const rows = [
    ["Nome", lead.name],
    ["E-mail", lead.email],
    ["WhatsApp", lead.phone],
    ["Escola", lead.schoolName || ""],
    ["Página", lead.page || ""],
    ["Source", lead.source || ""],
    ["Produto", lead.product || ""],
    ["SubSource", lead.subSource || ""],
    ["Criado em", lead.createdAt],
  ];

  const rowsHtml = rows
    .filter(([, v]) => safeString(v).length > 0)
    .map(
      ([k, v]) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #eef1ff;color:#010D28;font-weight:700;width:160px;">${escapeHtml(k)}</td>
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
        <div style="font-size:16px;font-weight:800;letter-spacing:-0.2px;">Novo contato — Lead (site)</div>
        <div style="font-size:12px;opacity:0.9;margin-top:4px;">Formulário /api/contact/lead</div>
      </div>

      <div style="padding:18px 20px;">
        <table style="width:100%;border-collapse:collapse;">
          ${rowsHtml}
        </table>

        <div style="margin-top:16px;padding:14px;border-radius:12px;background:#fff7ed;border:1px solid #fde7c7;">
          <div style="font-weight:800;color:#EA6D0B;margin-bottom:6px;">Mensagem</div>
          <div style="color:#334155;white-space:pre-wrap;line-height:1.55;">${message || "—"}</div>
        </div>

        ${description
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
// Exact (LeadsAdd)
// =========================
async function sendLeadToExactSales(lead: ContactLead) {
  const token = safeString(EXACT_TOKEN);
  if (!token) {
    console.warn("[contact/lead] EXACT_TOKEN não definido. Pulando Exact.");
    return { ok: false, skipped: true };
  }

  const normalizedPhone = normalizePhone(lead.phone);

  function parseFunnelId(raw: unknown): number | undefined {
    const value = String(raw ?? "").trim();
    if (!value) return undefined;
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
    return parsed;
  }

  const funnelId = parseFunnelId(EXACT_FUNNEL_ID);

  const rawSource = safeString(lead.source) || safeString(lead.page) || "/";
  const siteUrl = safeString(SITE_URL) || "https://f10.com.br";

  const sourceForExact =
    rawSource.startsWith("/") ? `${siteUrl}${rawSource}` : rawSource;

  const leadProduct = safeString(lead.product) || "Software F10";
  const subSourceForExact = safeString(lead.subSource) || "Contato (página)";

  // Coloca tudo no description (inclusive e-mail), porque o schema “que funciona” não envia email
  const descriptionLines: string[] = [
    "Lead capturado pelo formulário de contato do site.",
  ];

  if (lead.message?.trim()) descriptionLines.push(`Mensagem: ${lead.message.trim()}`);
  if (lead.schoolName?.trim()) descriptionLines.push(`Escola: ${lead.schoolName.trim()}`);
  if (lead.email?.trim()) descriptionLines.push(`E-mail: ${lead.email.trim()}`);
  if (lead.page?.trim()) descriptionLines.push(`Página: ${lead.page.trim()}`);
  if (lead.description?.trim()) descriptionLines.push(`Contexto: ${lead.description.trim()}`);
  descriptionLines.push(`Criado em: ${lead.createdAt}`);

  // ✅ PAYLOAD NO FORMATO QUE VOCÊ DISSE QUE FUNCIONA
  const exactBody = {
    duplicityValidation: false,
    lead: {
      funnelId: funnelId || undefined,
      name: lead.name,
      industry: "Educação",
      source: sourceForExact,
      subSource: subSourceForExact,
      ddiPhone: "55",
      phone: normalizedPhone,
      website: "https://f10.com.br",
      leadProduct,
      description: descriptionLines.join("\n"),
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

  console.log("[contact/lead] Enviando lead para Exact:", exactBody);

  const response = await fetch("https://api.exactspotter.com/v3/LeadsAdd", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      token_exact: token,
    },
    body: JSON.stringify(exactBody),
  });

  const text = await response.text().catch(() => "");
  let parsed: any = null;
  try {
    parsed = JSON.parse(text);
  } catch { }

  if (!response.ok) {
    const msg = parsed?.error?.message || parsed?.Message || text;
    console.error("[contact/lead] Exact falhou:", response.status, msg);
    return { ok: false, status: response.status, body: msg };
  }

  return { ok: true, status: response.status, body: parsed ?? text };
}


// =========================
// Handler
// =========================
export const POST: RequestHandler = async ({ request }) => {
  const body = (await request.json().catch(() => null)) as ContactLeadPayload | null;

  const name = safeString(body?.name);
  const phone = normalizePhone(safeString(body?.phone));
  const email = safeString(body?.email);
  const message = safeString(body?.message);

  const schoolName = safeString(body?.schoolName) || undefined;

  const rawSource = safeString(body?.source) || "/";
  const source = buildAbsoluteSource(rawSource);

  const page = safeString(body?.page) || undefined;
  const product = safeString(body?.product) || undefined;
  const subSource = safeString(body?.subSource) || undefined;
  const description = safeString(body?.description) || undefined;

  const createdAt = safeString(body?.createdAt) || new Date().toISOString();

  // Validações
  if (!name) {
    return json({ ok: false, error: "Nome é obrigatório." }, { status: 400 });
  }

  if (phone.length < 10) {
    return json({ ok: false, error: "WhatsApp com DDD é obrigatório." }, { status: 400 });
  }

  if (!email || !isValidEmail(email)) {
    return json({ ok: false, error: "E-mail válido é obrigatório." }, { status: 400 });
  }

  if (!message) {
    return json({ ok: false, error: "Mensagem é obrigatória." }, { status: 400 });
  }

  const lead: ContactLead = {
    name,
    phone,
    email,
    message,
    schoolName,
    source,
    page,
    product,
    subSource,
    description,
    createdAt,
  };

  // Backup local (não derruba se falhar)
  await appendToJsonFile<ContactLead>(DATA_FILE_PATH, lead);

  // E-mail (Brevo)
  const toEmail = safeString(BREVO_SALES_MAIL_TO);
  if (!toEmail) {
    console.warn("[contact/lead] BREVO_SALES_MAIL_TO não definido. Pulando e-mail.");
  }

  const emailHtml = buildLeadEmailHtml(lead);
  const emailResult = toEmail
    ? await sendEmailBrevo({
      toEmail,
      subject: `Novo lead (site) — ${lead.name}`,
      htmlContent: emailHtml,
      replyToEmail: lead.email,
      replyToName: lead.name,
    })
    : { ok: false, skipped: true };

  // Exact
  let exactResult: any = null;
  try {
    exactResult = await sendLeadToExactSales(lead);
  } catch (err) {
    console.error("[contact/lead] Erro inesperado ao enviar pro Exact:", err);
    exactResult = { ok: false, error: "unexpected_error" };
  }

  return json({
    ok: true,
    email: emailResult?.ok ?? false,
    exact: exactResult?.ok ?? false,
    exactResult,
  });
};
