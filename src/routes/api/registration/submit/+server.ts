import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { env } from "$env/dynamic/private";

/**
 * Endpoint para receber o cadastro (multipart/form-data),
 * montar um e-mail HTML completo (bonito) e enviar via Brevo.
 *
 * IMPORTANTE:
 * - O frontend envia:
 *   - payload (string JSON)
 *   - doc_rg_cnh, doc_cnpj, doc_contrato, doc_selfie (File)
 */

type RegistrationPayload = {
  // Etapa 1 — Unidade
  cnpj: string;
  unitLegalName: string;
  unitFantasyName: string;
  cnaeMain: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  unitPhone: string;

  // Etapa 2 — Responsável
  managerName: string;
  managerCpf: string;
  managerRg: string;
  managerWhatsapp: string;
  managerEmail: string;

  // Etapa 2 — Divulgação (opcional)
  marketingSite: string;
  marketingInstagram: string;
  marketingFacebook: string;

  // Metadata
  submittedAt?: string;
};

type DocKey = "doc_rg_cnh" | "doc_cnpj" | "doc_contrato" | "doc_selfie";

const DOCS: Array<{ key: DocKey; label: string; required: boolean }> = [
  { key: "doc_rg_cnh", label: "RG ou CNH", required: true },
  { key: "doc_cnpj", label: "Documento do CNPJ", required: true },
  { key: "doc_contrato", label: "Contrato Social", required: true },
  { key: "doc_selfie", label: "Selfie com documento", required: true },
];

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2MB (igual ao front)
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

function escapeHtml(value: unknown): string {
  const str =
    typeof value === "string" ? value : value == null ? "" : String(value);
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function onlyDigits(value: string): string {
  return (value || "").replace(/\D+/g, "");
}

function formatBytes(bytes: number): string {
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function safeValue(value: unknown): string {
  const v = typeof value === "string" ? value.trim() : "";
  return v ? v : "—";
}

function sanitizeFilename(name: string): string {
  // Remove caminhos e caracteres problemáticos
  const base = (name || "arquivo").split(/[/\\]/).pop() || "arquivo";
  return base.replace(/[^\w.\-()+\s]/g, "_");
}

function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "—";
  return headers.get("x-real-ip") || "—";
}

function formatDateTimeBR(iso: string | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

async function fileToBase64(file: File): Promise<string> {
  const ab = await file.arrayBuffer();
  return Buffer.from(ab).toString("base64");
}

function buildEmailText(params: {
  payload: RegistrationPayload;
  docs: Array<{
    key: DocKey;
    label: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }>;
  meta: {
    submittedAt: string;
    clientIp: string;
    userAgent: string;
    origin: string;
    messageToken: string;
  };
}): string {
  const { payload, docs, meta } = params;

  const lines: string[] = [];
  lines.push(`Novo cadastro — CEL CASH F10`);
  lines.push(`Recebido em: ${meta.submittedAt}`);
  lines.push(`Token: ${meta.messageToken}`);
  lines.push("");
  lines.push("=== Dados da unidade ===");
  lines.push(`CNPJ: ${safeValue(payload.cnpj)}`);
  lines.push(`Razão Social: ${safeValue(payload.unitLegalName)}`);
  lines.push(`Nome Fantasia: ${safeValue(payload.unitFantasyName)}`);
  lines.push(`CNAE principal: ${safeValue(payload.cnaeMain)}`);
  lines.push(`Telefone Comercial: ${safeValue(payload.unitPhone)}`);
  lines.push("");
  lines.push("=== Endereço da unidade ===");
  lines.push(`CEP: ${safeValue(payload.cep)}`);
  lines.push(`Logradouro: ${safeValue(payload.street)}`);
  lines.push(`Número: ${safeValue(payload.number)}`);
  lines.push(`Complemento: ${safeValue(payload.complement)}`);
  lines.push(`Bairro: ${safeValue(payload.neighborhood)}`);
  lines.push(`Cidade: ${safeValue(payload.city)}`);
  lines.push(`UF: ${safeValue(payload.state)}`);
  lines.push("");
  lines.push("=== Dados do responsável ===");
  lines.push(`Responsável: ${safeValue(payload.managerName)}`);
  lines.push(`CPF: ${safeValue(payload.managerCpf)}`);
  lines.push(`RG: ${safeValue(payload.managerRg)}`);
  lines.push(`WhatsApp: ${safeValue(payload.managerWhatsapp)}`);
  lines.push(`E-mail: ${safeValue(payload.managerEmail)}`);
  lines.push("");
  lines.push("=== Divulgação (opcional) ===");
  lines.push(`Site: ${safeValue(payload.marketingSite)}`);
  lines.push(`Instagram: ${safeValue(payload.marketingInstagram)}`);
  lines.push(`Facebook: ${safeValue(payload.marketingFacebook)}`);
  lines.push("");
  lines.push("=== Documentos enviados ===");
  if (!docs.length) {
    lines.push("Nenhum documento anexado.");
  } else {
    for (const d of docs) {
      lines.push(
        `- ${d.label}: ${d.fileName} (${d.fileType}, ${formatBytes(d.fileSize)})`,
      );
    }
  }
  lines.push("");
  lines.push("=== Metadados técnicos ===");
  lines.push(`IP (proxy): ${safeValue(meta.clientIp)}`);
  lines.push(`User-Agent: ${safeValue(meta.userAgent)}`);
  lines.push(`Origem: ${safeValue(meta.origin)}`);
  lines.push(`submittedAt (payload): ${safeValue(payload.submittedAt)}`);
  lines.push("");
  lines.push("Aviso: este e-mail contém informações sensíveis. Evite encaminhar.");

  return lines.join("\n");
}

function buildEmailHtml(params: {
  payload: RegistrationPayload;
  docs: Array<{
    key: DocKey;
    label: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }>;
  meta: {
    submittedAt: string;
    clientIp: string;
    userAgent: string;
    origin: string;
    messageToken: string;
  };
}): string {
  const primary = "#ea6d0b";
  const bg = "#FFF7EF";
  const surface = "#FFFFFF";
  const outline = "rgba(0,0,0,0.10)";
  const muted = "rgba(0,0,0,0.62)";

  const { payload, docs, meta } = params;

  const logoUrl = `${meta.origin}/logo_f10.png`;

  const section = (title: string, rows: Array<[string, string]>) => {
    const rowsHtml = rows
      .map(
        ([k, v]) => `
          <tr>
            <td style="padding:10px 12px; border-top:1px solid ${outline}; color:${muted}; font-size:12px; width:220px;">
              ${escapeHtml(k)}
            </td>
            <td style="padding:10px 12px; border-top:1px solid ${outline}; color:#111; font-size:13px;">
              ${escapeHtml(v)}
            </td>
          </tr>
        `,
      )
      .join("");

    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${outline}; border-radius:16px; overflow:hidden; background:${surface}; margin-top:14px;">
        <tr>
          <td style="padding:14px 16px; background:${bg};">
            <div style="font-size:14px; font-weight:700; color:${primary};">
              ${escapeHtml(title)}
            </div>
          </td>
        </tr>
        ${rowsHtml}
      </table>
    `;
  };

  const docsRows = docs.length
    ? docs
        .map(
          (d) => `
            <tr>
              <td style="padding:10px 12px; border-top:1px solid ${outline}; color:${muted}; font-size:12px; width:220px;">
                ${escapeHtml(d.label)}
              </td>
              <td style="padding:10px 12px; border-top:1px solid ${outline}; color:#111; font-size:13px;">
                <div style="font-weight:600;">${escapeHtml(d.fileName)}</div>
                <div style="font-size:12px; color:${muted};">
                  ${escapeHtml(d.fileType)} • ${escapeHtml(formatBytes(d.fileSize))}
                </div>
              </td>
            </tr>
          `,
        )
        .join("")
    : `
      <tr>
        <td style="padding:12px; border-top:1px solid ${outline}; color:${muted}; font-size:13px;">
          Nenhum documento anexado.
        </td>
      </tr>
    `;

  // Preheader curto e limpo (sem zwnj infinito)
  const preheaderText =
    "Cadastro completo recebido (unidade, endereço, responsável, divulgação, documentos e metadados).";

  return `
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>Novo cadastro - F10</title>
  </head>
  <body style="margin:0; padding:0; background:${bg}; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif;">
    <!-- token anti-“parece repetido” (não aparece pro usuário) -->
    <span style="display:none !important; font-size:0; line-height:0; max-height:0; max-width:0; opacity:0; overflow:hidden; mso-hide:all; color:transparent;">
      ${escapeHtml(preheaderText)} • ${escapeHtml(meta.messageToken)}
    </span>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${bg}; padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="680" cellpadding="0" cellspacing="0" style="max-width:680px; width:100%;">
            <tr>
              <td style="padding:18px 18px 10px 18px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td valign="middle">
                      <img src="${escapeHtml(logoUrl)}" alt="F10" height="34" style="display:block; height:34px; width:auto;" />
                    </td>
                    <td align="right" valign="middle" style="color:${muted}; font-size:12px;">
                      Cadastro recebido em: <strong style="color:#111;">${escapeHtml(meta.submittedAt)}</strong>
                    </td>
                  </tr>
                </table>

                <div style="margin-top:14px; font-size:22px; font-weight:800; color:${primary}; line-height:1.2;">
                  Novo cadastro — CEL CASH F10
                </div>
                <div style="margin-top:6px; color:${muted}; font-size:13px;">
                  Abaixo estão <strong>todos os dados</strong> enviados no formulário (incluindo campos opcionais).
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:0 18px 18px 18px;">
                <div style="background:${surface}; border:1px solid ${outline}; border-radius:22px; padding:18px;">
                  ${section("Dados da unidade", [
                    ["CNPJ", safeValue(payload.cnpj)],
                    ["Razão Social", safeValue(payload.unitLegalName)],
                    ["Nome Fantasia", safeValue(payload.unitFantasyName)],
                    ["CNAE principal", safeValue(payload.cnaeMain)],
                    ["Telefone Comercial", safeValue(payload.unitPhone)],
                  ])}

                  ${section("Endereço da unidade", [
                    ["CEP", safeValue(payload.cep)],
                    ["Logradouro", safeValue(payload.street)],
                    ["Número", safeValue(payload.number)],
                    ["Complemento", safeValue(payload.complement)],
                    ["Bairro", safeValue(payload.neighborhood)],
                    ["Cidade", safeValue(payload.city)],
                    ["UF", safeValue(payload.state)],
                  ])}

                  ${section("Dados do responsável", [
                    ["Responsável", safeValue(payload.managerName)],
                    ["CPF", safeValue(payload.managerCpf)],
                    ["RG", safeValue(payload.managerRg)],
                    ["WhatsApp", safeValue(payload.managerWhatsapp)],
                    ["E-mail", safeValue(payload.managerEmail)],
                  ])}

                  ${section("Dados de divulgação (opcional)", [
                    ["Site", safeValue(payload.marketingSite)],
                    ["Instagram", safeValue(payload.marketingInstagram)],
                    ["Facebook", safeValue(payload.marketingFacebook)],
                  ])}

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${outline}; border-radius:16px; overflow:hidden; background:${surface}; margin-top:14px;">
                    <tr>
                      <td style="padding:14px 16px; background:${bg};">
                        <div style="font-size:14px; font-weight:700; color:${primary};">
                          Documentos enviados - anexos
                        </div>
                      </td>
                    </tr>
                    ${docsRows}
                  </table>

                  ${section("Metadados técnicos", [
                    ["IP (proxy)", safeValue(meta.clientIp)],
                    ["User-Agent", safeValue(meta.userAgent)],
                    ["Origem", safeValue(meta.origin)],
                    ["submittedAt (payload)", safeValue(payload.submittedAt)],
                    ["messageToken", safeValue(meta.messageToken)],
                  ])}

                  <div style="margin-top:14px; font-size:12px; color:${muted}; line-height:1.5;">
                    Aviso: este e-mail contém informações sensíveis. Evite encaminhar e mantenha em local seguro.
                  </div>

                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:0 18px 8px 18px; color:${muted}; font-size:11px; text-align:center;">
                F10 • Cadastro automático
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}

export const GET: RequestHandler = async () => {
  // Healthcheck simples
  const isConfigured = Boolean(
    env.BREVO_API_KEY && env.BREVO_MAIL_TO && env.BREVO_FROM_EMAIL,
  );
  return json({ ok: true, emailConfigured: isConfigured });
};

export const POST: RequestHandler = async ({ request, url }) => {
  // ====== Config ======
  const apiKey = env.BREVO_API_KEY;
  const toEmail = env.BREVO_MAIL_TO; // ex: cadastro@f10.com.br
  const fromEmail = env.BREVO_FROM_EMAIL; // ex: no-reply@f10.com.br
  const fromName = env.BREVO_FROM_NAME || "F10";
  const siteUrl = env.PUBLIC_SITE_URL || url.origin;

  if (!apiKey || !toEmail || !fromEmail) {
    return json(
      {
        success: false,
        message:
          "E-mail não configurado no servidor (BREVO_API_KEY / BREVO_MAIL_TO / BREVO_FROM_EMAIL).",
      },
      { status: 500 },
    );
  }

  // ====== Parse multipart ======
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json(
      { success: false, message: "Conteúdo inválido. Envie como multipart/form-data." },
      { status: 400 },
    );
  }

  const payloadRaw = form.get("payload");
  if (typeof payloadRaw !== "string" || !payloadRaw.trim()) {
    return json(
      { success: false, message: "Payload ausente. Campo 'payload' é obrigatório." },
      { status: 400 },
    );
  }

  let payload: RegistrationPayload;
  try {
    payload = JSON.parse(payloadRaw) as RegistrationPayload;
  } catch {
    return json(
      { success: false, message: "Payload inválido (JSON malformado)." },
      { status: 400 },
    );
  }

  // ====== Valida docs ======
  const docFiles: Array<{
    key: DocKey;
    label: string;
    file: File;
  }> = [];

  for (const d of DOCS) {
    const entry = form.get(d.key);

    if (!entry) {
      if (d.required) {
        return json(
          { success: false, message: `Documento obrigatório ausente: ${d.label}.` },
          { status: 400 },
        );
      }
      continue;
    }

    const file = entry as unknown as File;
    const fileName = typeof (file as any)?.name === "string" ? (file as any).name : "";
    const fileType = typeof (file as any)?.type === "string" ? (file as any).type : "";
    const fileSize = typeof (file as any)?.size === "number" ? (file as any).size : 0;

    if (!fileName || !fileSize) {
      return json(
        { success: false, message: `Arquivo inválido em: ${d.label}.` },
        { status: 400 },
      );
    }

    if (fileSize > MAX_FILE_BYTES) {
      return json(
        { success: false, message: `Arquivo acima de 2MB em: ${d.label}.` },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIME.has(fileType)) {
      return json(
        { success: false, message: `Formato inválido em: ${d.label} (use PDF/JPG/PNG).` },
        { status: 400 },
      );
    }

    docFiles.push({ key: d.key, label: d.label, file });
  }

  // ====== Monta anexos (Brevo: content base64 + name) ======
  const attachments: Array<{ name: string; content: string }> = [];
  const docsInfoForHtml: Array<{
    key: DocKey;
    label: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }> = [];

  for (const d of docFiles) {
    const name = sanitizeFilename(d.file.name);
    const content = await fileToBase64(d.file);

    attachments.push({ name, content });

    docsInfoForHtml.push({
      key: d.key,
      label: d.label,
      fileName: name,
      fileType: d.file.type || "application/octet-stream",
      fileSize: d.file.size,
    });
  }

  // ====== Meta / tokens ======
  const nowIso = new Date().toISOString();
  const submittedAtIso = payload.submittedAt || nowIso;

  const cnpjDigits = onlyDigits(payload.cnpj);
  const messageToken = `${cnpjDigits || "CNPJ"}-${Date.now()}`;

  const meta = {
    submittedAt: formatDateTimeBR(submittedAtIso),
    clientIp: getClientIp(request.headers),
    userAgent: request.headers.get("user-agent") || "—",
    origin: siteUrl,
    messageToken,
  };

  // ====== HTML + TEXTO ======
  const htmlContent = buildEmailHtml({
    payload,
    docs: docsInfoForHtml,
    meta,
  });

  const textContent = buildEmailText({
    payload,
    docs: docsInfoForHtml,
    meta,
  });

  // ====== Assunto ÚNICO (evita “conversa” e trimming) ======
  const stampForSubject = nowIso.replace("T", " ").slice(0, 19);
  const subject = `Novo cadastro F10 • ${safeValue(payload.unitFantasyName)} • ${cnpjDigits || "CNPJ"} • ${stampForSubject}`;

  // ====== Envia via Brevo ======
  try {
    const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: fromEmail, name: fromName },
        to: [{ email: toEmail, name: "Cadastro F10" }],
        subject,
        htmlContent,
        textContent,
        tags: ["cadastro", "f10", "celcash"],
        attachment: attachments,
      }),
    });

    if (!brevoRes.ok) {
      const errorText = await brevoRes.text().catch(() => "");
      return json(
        {
          success: false,
          message:
            "Falha ao enviar e-mail via Brevo. Verifique API Key e liberação de IP/servidor.",
          details: errorText.slice(0, 2000),
        },
        { status: 502 },
      );
    }

    const data = (await brevoRes.json().catch(() => null)) as
      | { messageId?: string }
      | null;

    return json({
      success: true,
      message: "Cadastro recebido e e-mail enviado com sucesso.",
      messageId: data?.messageId ?? null,
    });
  } catch {
    return json(
      {
        success: false,
        message: "Erro inesperado ao enviar e-mail. Tente novamente.",
      },
      { status: 500 },
    );
  }
};
