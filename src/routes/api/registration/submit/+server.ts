import "$lib/server/load-env";
import { json } from "@sveltejs/kit";
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import type { RequestHandler } from "./$types";

type ContractClientMeta = {
  userAgent?: string;
  platform?: string;
  language?: string;
  timeZone?: string;
  screen?: string;
  viewport?: string;
  referrer?: string;
};

type ContractPayload = {
  title?: string;
  contractVersion?: string;
  termsVersion?: string;
  accepted?: boolean;
  acceptedAt?: string;
  snapshotText?: string;
  snapshotHtml?: string;
  snapshotFileName?: string;
  signedAtClient?: string;
  signedClientMeta?: ContractClientMeta;
};

type RegistrationPayload = {
  // Etapa 1 â€” Unidade
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

  // Etapa 2 â€” ResponsÃ¡vel
  managerName: string;
  managerCpf: string;
  managerRg: string;
  managerWhatsapp: string;
  managerEmail: string;

  // Etapa 2 â€” Divulga\u00e7\u00e3o (opcional)
  marketingSite: string;
  marketingInstagram: string;
  marketingFacebook: string;

  // Metadata
  submittedAt?: string;

  // Contrato
  contract?: ContractPayload;
};

type DocKey = "doc_rg_cnh" | "doc_cnpj" | "doc_contrato" | "doc_selfie";

type DocConfig = {
  key: DocKey;
  label: string;
  required: boolean;
  multiple: boolean;
  allowedMime: ReadonlySet<string>;
  maxFiles: number;
};

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2MB (igual ao front)
const MAX_FILES_PER_DOC_TYPE = 6; // igual ao front (passo 3)

// Docs do passo 3: PDF/JPG/PNG
const ALLOWED_DOC_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

// Selfie: sÃ³ imagem (igual ao front)
const ALLOWED_SELFIE_MIME = new Set(["image/jpeg", "image/jpg", "image/png"]);

const DOCS: DocConfig[] = [
  {
    key: "doc_rg_cnh",
    label: "RG ou CNH",
    required: true,
    multiple: true,
    allowedMime: ALLOWED_DOC_MIME,
    maxFiles: MAX_FILES_PER_DOC_TYPE,
  },
  {
    key: "doc_cnpj",
    label: "Documento do CNPJ",
    required: true,
    multiple: true,
    allowedMime: ALLOWED_DOC_MIME,
    maxFiles: MAX_FILES_PER_DOC_TYPE,
  },
  {
    key: "doc_contrato",
    label: "Contrato Social",
    required: true,
    multiple: true,
    allowedMime: ALLOWED_DOC_MIME,
    maxFiles: MAX_FILES_PER_DOC_TYPE,
  },
  {
    key: "doc_selfie",
    label: "Selfie com documento",
    required: true,
    multiple: false,
    allowedMime: ALLOWED_SELFIE_MIME,
    maxFiles: 1,
  },
];

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
  return v ? v : "-";
}

function formatYesNo(value: unknown): string {
  if (value === true) return "sim";
  if (value === false) return "nao";
  return "-";
}

function hashSha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sanitizeFilename(name: string): string {
  // Remove caminhos e caracteres problemÃ¡ticos
  const base = (name || "arquivo").split(/[/\\]/).pop() || "arquivo";
  return base.replace(/[^\w.\-()+\s]/g, "_");
}

function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "â€”";
  return headers.get("x-real-ip") || "â€”";
}

function formatDateTimeBR(iso: string | undefined): string {
  if (!iso) return "â€”";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "â€”";
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

function isFileLike(value: unknown): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as any).name === "string" &&
    typeof (value as any).size === "number" &&
    typeof (value as any).type === "string" &&
    typeof (value as any).arrayBuffer === "function"
  );
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
  lines.push(`Novo cadastro â€” CELCOIN F10`);
  lines.push(`Recebido em: ${meta.submittedAt}`);
  lines.push(`Token: ${meta.messageToken}`);
  lines.push("");
  lines.push("=== Dados da unidade ===");
  lines.push(`CNPJ: ${safeValue(payload.cnpj)}`);
  lines.push(`RazÃ£o Social: ${safeValue(payload.unitLegalName)}`);
  lines.push(`Nome Fantasia: ${safeValue(payload.unitFantasyName)}`);
  lines.push(`CNAE principal: ${safeValue(payload.cnaeMain)}`);
  lines.push(`Telefone Comercial: ${safeValue(payload.unitPhone)}`);
  lines.push("");
  lines.push("=== EndereÃ§o da unidade ===");
  lines.push(`CEP: ${safeValue(payload.cep)}`);
  lines.push(`Logradouro: ${safeValue(payload.street)}`);
  lines.push(`NÃºmero: ${safeValue(payload.number)}`);
  lines.push(`Complemento: ${safeValue(payload.complement)}`);
  lines.push(`Bairro: ${safeValue(payload.neighborhood)}`);
  lines.push(`Cidade: ${safeValue(payload.city)}`);
  lines.push(`UF: ${safeValue(payload.state)}`);
  lines.push("");
  lines.push("=== Dados do responsável ===");
  lines.push(`ResponsÃ¡vel: ${safeValue(payload.managerName)}`);
  lines.push(`CPF: ${safeValue(payload.managerCpf)}`);
  lines.push(`RG: ${safeValue(payload.managerRg)}`);
  lines.push(`WhatsApp: ${safeValue(payload.managerWhatsapp)}`);
  lines.push(`E-mail: ${safeValue(payload.managerEmail)}`);
  lines.push("");
  lines.push("=== Divulga\u00e7\u00e3o (opcional) ===");
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
  const contract = payload.contract;
  const contractSnapshotHtml =
    typeof contract?.snapshotHtml === "string" ? contract.snapshotHtml : "";
  const contractSnapshotText =
    typeof contract?.snapshotText === "string" ? contract.snapshotText : "";
  const contractHtmlHash = contractSnapshotHtml
    ? hashSha256(contractSnapshotHtml)
    : "";
  const contractTextHash = contractSnapshotText
    ? hashSha256(contractSnapshotText)
    : "";
  const signedMeta = contract?.signedClientMeta;

  lines.push("=== Contrato e aceite ===");
  lines.push(`Titulo: ${safeValue(contract?.title)}`);
  lines.push(`Contrato versao: ${safeValue(contract?.contractVersion)}`);
  lines.push(`Termos versao: ${safeValue(contract?.termsVersion)}`);
  lines.push(`Aceite (checkbox): ${formatYesNo(contract?.accepted)}`);
  lines.push(
    `Aceito em (cliente): ${formatDateTimeBR(
      contract?.signedAtClient || contract?.acceptedAt,
    )}`,
  );
  lines.push(`Snapshot arquivo: ${safeValue(contract?.snapshotFileName)}`);
  lines.push(
    `Snapshot HTML hash (sha256): ${safeValue(contractHtmlHash)}`,
  );
  lines.push(`Snapshot HTML tamanho: ${contractSnapshotHtml.length}`);
  lines.push(
    `Snapshot texto hash (sha256): ${safeValue(contractTextHash)}`,
  );
  lines.push(`Snapshot texto tamanho: ${contractSnapshotText.length}`);
  lines.push("");
  lines.push("=== Dados do dispositivo (cliente) ===");
  lines.push(`User-Agent: ${safeValue(signedMeta?.userAgent)}`);
  lines.push(`Plataforma: ${safeValue(signedMeta?.platform)}`);
  lines.push(`Idioma: ${safeValue(signedMeta?.language)}`);
  lines.push(`Fuso horario: ${safeValue(signedMeta?.timeZone)}`);
  lines.push(`Tela: ${safeValue(signedMeta?.screen)}`);
  lines.push(`Viewport: ${safeValue(signedMeta?.viewport)}`);
  lines.push(`Referrer: ${safeValue(signedMeta?.referrer)}`);
  lines.push("");
  lines.push("=== Metadados tÃ©cnicos ===");
  lines.push(`IP (proxy): ${safeValue(meta.clientIp)}`);
  lines.push(`User-Agent: ${safeValue(meta.userAgent)}`);
  lines.push(`Origem: ${safeValue(meta.origin)}`);
  lines.push(`submittedAt (payload): ${safeValue(payload.submittedAt)}`);
  lines.push("");
  lines.push("Aviso: este e-mail contÃ©m informaÃ§Ãµes sensÃ­veis. Evite encaminhar.");

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
  selfieInlineDataUrl?: string | null;
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

  const { payload, docs, meta, selfieInlineDataUrl } = params;

  const logoUrl = `${meta.origin}/logo_f10.png`;
  const contract = payload.contract;
  const contractSnapshotHtml =
    typeof contract?.snapshotHtml === "string" ? contract.snapshotHtml : "";
  const contractSnapshotText =
    typeof contract?.snapshotText === "string" ? contract.snapshotText : "";
  const contractHtmlHash = contractSnapshotHtml
    ? hashSha256(contractSnapshotHtml)
    : "";
  const contractTextHash = contractSnapshotText
    ? hashSha256(contractSnapshotText)
    : "";
  const signedMeta = contract?.signedClientMeta;

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
                  ${escapeHtml(d.fileType)} â€¢ ${escapeHtml(formatBytes(d.fileSize))}
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

  const contractSection = section("Contrato e aceite", [
    ["Titulo", safeValue(contract?.title)],
    ["Contrato versao", safeValue(contract?.contractVersion)],
    ["Termos versao", safeValue(contract?.termsVersion)],
    ["Aceite (checkbox)", formatYesNo(contract?.accepted)],
    [
      "Aceito em (cliente)",
      formatDateTimeBR(contract?.signedAtClient || contract?.acceptedAt),
    ],
    ["Snapshot arquivo", safeValue(contract?.snapshotFileName)],
    ["Snapshot HTML hash (sha256)", safeValue(contractHtmlHash)],
    ["Snapshot HTML tamanho", String(contractSnapshotHtml.length)],
    ["Snapshot texto hash (sha256)", safeValue(contractTextHash)],
    ["Snapshot texto tamanho", String(contractSnapshotText.length)],
  ]);

  const deviceSection = section("Dispositivo do cliente", [
    ["User-Agent", safeValue(signedMeta?.userAgent)],
    ["Plataforma", safeValue(signedMeta?.platform)],
    ["Idioma", safeValue(signedMeta?.language)],
    ["Fuso horario", safeValue(signedMeta?.timeZone)],
    ["Tela", safeValue(signedMeta?.screen)],
    ["Viewport", safeValue(signedMeta?.viewport)],
    ["Referrer", safeValue(signedMeta?.referrer)],
  ]);

  const selfiePreviewHtml = selfieInlineDataUrl
    ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${outline}; border-radius:16px; overflow:hidden; background:${surface}; margin-top:14px;">
        <tr>
          <td style="padding:14px 16px; background:${bg};">
            <div style="font-size:14px; font-weight:700; color:${primary};">
              Selfie (visualizacao)
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 16px;">
            <img src="${selfieInlineDataUrl}" alt="Selfie" style="display:block; width:100%; height:auto; border-radius:12px; border:1px solid ${outline};" />
          </td>
        </tr>
      </table>
    `
    : "";

  const preheaderText =
    "Cadastro completo recebido (unidade, endereço, responsável, divulga\u00e7\u00e3o, documentos e metadados).";

  return `
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>Novo cadastro - F10</title>
  </head>
  <body style="margin:0; padding:0; background:${bg}; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif;">
    <span style="display:none !important; font-size:0; line-height:0; max-height:0; max-width:0; opacity:0; overflow:hidden; mso-hide:all; color:transparent;">
      ${escapeHtml(preheaderText)} â€¢ ${escapeHtml(meta.messageToken)}
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
                  Novo cadastro â€” CELCOIN F10
                </div>
                <div style="margin-top:6px; color:${muted}; font-size:13px;">
                  Abaixo estÃ£o <strong>todos os dados</strong> enviados no formulÃ¡rio (incluindo campos opcionais).
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:0 18px 18px 18px;">
                <div style="background:${surface}; border:1px solid ${outline}; border-radius:22px; padding:18px;">
                  ${section("Dados da unidade", [
    ["CNPJ", safeValue(payload.cnpj)],
    ["RazÃ£o Social", safeValue(payload.unitLegalName)],
    ["Nome Fantasia", safeValue(payload.unitFantasyName)],
    ["CNAE principal", safeValue(payload.cnaeMain)],
    ["Telefone Comercial", safeValue(payload.unitPhone)],
  ])}

                  ${section("EndereÃ§o da unidade", [
    ["CEP", safeValue(payload.cep)],
    ["Logradouro", safeValue(payload.street)],
    ["NÃºmero", safeValue(payload.number)],
    ["Complemento", safeValue(payload.complement)],
    ["Bairro", safeValue(payload.neighborhood)],
    ["Cidade", safeValue(payload.city)],
    ["UF", safeValue(payload.state)],
  ])}

                  ${section("Dados do responsável", [
    ["ResponsÃ¡vel", safeValue(payload.managerName)],
    ["CPF", safeValue(payload.managerCpf)],
    ["RG", safeValue(payload.managerRg)],
    ["WhatsApp", safeValue(payload.managerWhatsapp)],
    ["E-mail", safeValue(payload.managerEmail)],
  ])}

                  ${section("Dados de divulga\u00e7\u00e3o (opcional)", [
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
                  ${contractSection}

                  ${deviceSection}

                  ${selfiePreviewHtml}

                  ${section("Metadados tÃ©cnicos", [
    ["IP (proxy)", safeValue(meta.clientIp)],
    ["User-Agent", safeValue(meta.userAgent)],
    ["Origem", safeValue(meta.origin)],
    ["submittedAt (payload)", safeValue(payload.submittedAt)],
    ["messageToken", safeValue(meta.messageToken)],
  ])}

                  <div style="margin-top:14px; font-size:12px; color:${muted}; line-height:1.5;">
                    Aviso: este e-mail contÃ©m informaÃ§Ãµes sensÃ­veis. Evite encaminhar e mantenha em local seguro.
                  </div>

                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:0 18px 8px 18px; color:${muted}; font-size:11px; text-align:center;">
                F10 â€¢ Cadastro automÃ¡tico
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

function getEnv(key: string): string | undefined {
  const value = process.env[key];
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return undefined;
}

function logMultipartError(error: unknown): void {
  try {
    const dir = resolve(process.cwd(), "data");
    mkdirSync(dir, { recursive: true });
    const entry = [
      `[${new Date().toISOString()}] multipart/form-data parse failure`,
      error instanceof Error ? error.stack || error.message : String(error),
      "",
    ].join("\n");
    appendFileSync(resolve(dir, "registration-errors.log"), entry, "utf8");
  } catch (logError) {
    console.error("[registration] Falha ao registrar erro:", logError);
  }
}

export const GET: RequestHandler = async () => {
  // Healthcheck simples
  const isConfigured = Boolean(
    getEnv("BREVO_API_KEY") &&
      getEnv("BREVO_MAIL_TO") &&
      getEnv("BREVO_FROM_EMAIL"),
  );
  return json({ ok: true, emailConfigured: isConfigured });
};

export const POST: RequestHandler = async ({ request, url }) => {
    const contentType = request.headers.get("content-type") ?? "â€”";
  const contentLength = request.headers.get("content-length") ?? "â€”";

  console.log("[registration] incoming", { contentType, contentLength });

  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return json(
      {
        success: false,
        message: "ConteÃºdo invÃ¡lido. Envie como multipart/form-data.",
        details: `content-type=${contentType} content-length=${contentLength}`,
      },
      { status: 415 },
    );
  }
  
  // ====== Config ======
  const apiKey = getEnv("BREVO_API_KEY");
  const toEmail = getEnv("BREVO_MAIL_TO"); // ex: cadastro@f10.com.br
  const fromEmail = getEnv("BREVO_FROM_EMAIL"); // ex: no-reply@f10.com.br
  const fromName = getEnv("BREVO_FROM_NAME") || "F10";
  const siteUrl = getEnv("PUBLIC_SITE_URL") || url.origin;

  if (!apiKey || !toEmail || !fromEmail) {
    return json(
      {
        success: false,
        message:
          "E-mail nÃ£o configurado no servidor (BREVO_API_KEY / BREVO_MAIL_TO / BREVO_FROM_EMAIL).",
      },
      { status: 500 },
    );
  }

  // ====== Parse multipart ======
  let form: FormData;
  try {
    form = await request.formData();
  } catch (error) {
    console.error("[registration] Falha ao ler multipart:", error);
    logMultipartError(error);
    return json(
      {
        success: false,
        message: "ConteÃºdo invÃ¡lido. Envie como multipart/form-data.",
        details:
          error instanceof Error ? error.message.slice(0, 500) : String(error),
      },
      { status: 400 },
    );
  }

  const payloadRaw = form.get("payload");
  if (typeof payloadRaw !== "string" || !payloadRaw.trim()) {
    return json(
      {
        success: false,
        message: "Payload ausente. Campo 'payload' Ã© obrigatÃ³rio.",
      },
      { status: 400 },
    );
  }

  let payload: RegistrationPayload;
  try {
    payload = JSON.parse(payloadRaw) as RegistrationPayload;
  } catch {
    return json(
      { success: false, message: "Payload invÃ¡lido (JSON malformado)." },
      { status: 400 },
    );
  }

  // ====== Valida docs (agora com mÃºltiplos) ======
  const docFiles: Array<{
    key: DocKey;
    label: string;
    file: File;
    index: number; // 1-based por tipo
  }> = [];

  for (const d of DOCS) {
    const entries = d.multiple ? form.getAll(d.key) : [form.get(d.key)];
    const files = entries.filter(isFileLike) as File[];

    if (d.required && files.length === 0) {
      return json(
        { success: false, message: `Documento obrigatÃ³rio ausente: ${d.label}.` },
        { status: 400 },
      );
    }

    if (files.length > d.maxFiles) {
      return json(
        {
          success: false,
          message: `Muitos arquivos em: ${d.label}. Limite: ${d.maxFiles}.`,
        },
        { status: 400 },
      );
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      const fileName = file.name || "";
      const fileType = file.type || "";
      const fileSize = file.size || 0;

      if (!fileName || !fileSize) {
        return json(
          { success: false, message: `Arquivo invÃ¡lido em: ${d.label}.` },
          { status: 400 },
        );
      }

      if (fileSize > MAX_FILE_BYTES) {
        return json(
          { success: false, message: `Arquivo acima de 2MB em: ${d.label}.` },
          { status: 400 },
        );
      }

      if (!d.allowedMime.has(fileType)) {
        const allowedText =
          d.key === "doc_selfie" ? "JPG/PNG" : "PDF/JPG/PNG";
        return json(
          {
            success: false,
            message: `Formato invÃ¡lido em: ${d.label} (use ${allowedText}).`,
          },
          { status: 400 },
        );
      }

      docFiles.push({ key: d.key, label: d.label, file, index: i + 1 });
    }
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
  let selfieInlineDataUrl: string | null = null;

  for (const d of docFiles) {
    const baseName = sanitizeFilename(d.file.name);
    const numberedName =
      d.key === "doc_selfie"
        ? `doc_selfie_${baseName}`
        : `${d.key}_${String(d.index).padStart(2, "0")}_${baseName}`;

    const content = await fileToBase64(d.file);

    attachments.push({ name: numberedName, content });
    if (d.key === "doc_selfie") {
      const mime = d.file.type || "image/jpeg";
      selfieInlineDataUrl = `data:${mime};base64,${content}`;
    }

    docsInfoForHtml.push({
      key: d.key,
      label: d.label,
      fileName: numberedName,
      fileType: d.file.type || "application/octet-stream",
      fileSize: d.file.size,
    });
  }

  const contractSnapshotHtml =
    typeof payload.contract?.snapshotHtml === "string"
      ? payload.contract.snapshotHtml
      : "";
  const contractSnapshotFileName = sanitizeFilename(
    payload.contract?.snapshotFileName || "contrato_f10.html",
  );
  if (contractSnapshotHtml) {
    attachments.push({
      name: contractSnapshotFileName,
      content: Buffer.from(contractSnapshotHtml, "utf8").toString("base64"),
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
    userAgent: request.headers.get("user-agent") || "â€”",
    origin: siteUrl,
    messageToken,
  };

  // ====== HTML + TEXTO ======
  const htmlContent = buildEmailHtml({
    payload,
    docs: docsInfoForHtml,
    selfieInlineDataUrl,
    meta,
  });

  const textContent = buildEmailText({
    payload,
    docs: docsInfoForHtml,
    meta,
  });

  // ====== Assunto ÃšNICO (evita â€œconversaâ€ e trimming) ======
  const stampForSubject = nowIso.replace("T", " ").slice(0, 19);
  const subject = `Novo cadastro F10 â€¢ ${safeValue(
    payload.unitFantasyName,
  )} â€¢ ${cnpjDigits || "CNPJ"} â€¢ ${stampForSubject}`;

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
        tags: ["cadastro", "f10", "celcoin"],
        attachment: attachments,
      }),
    });

    if (!brevoRes.ok) {
      const errorText = await brevoRes.text().catch(() => "");
      return json(
        {
          success: false,
          message:
            "Falha ao enviar e-mail via Brevo. Verifique API Key e liberaÃ§Ã£o de IP/servidor.",
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
