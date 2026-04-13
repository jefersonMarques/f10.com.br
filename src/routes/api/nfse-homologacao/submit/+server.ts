// src/routes/api/nfse-homologacao/submit/+server.ts
import "$lib/server/load-env";
import { json } from "@sveltejs/kit";
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import type { RequestHandler } from "./$types";

import archiver from "archiver";
import { PassThrough } from "node:stream";


import type { FormData as HomologFormData } from "../../../nota-fiscal/cadastro-de-escolas/formStore";

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

type SubmissionPayload = HomologFormData & {
  // Metadata
  submittedAt?: string;

  // Contrato (opcional, se houver no form)
  contract?: ContractPayload;
};

type DocKey = "certificate_file" | "selfie_file";

type DocConfig = {
  key: DocKey;
  label: string;
  required: boolean;
  multiple: boolean;
  allowedMime: ReadonlySet<string>;
  maxFiles: number;
};

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2MB
const MAX_FILES_PER_DOC_TYPE = 1; // Apenas um certificado

const ALLOWED_DOC_MIME = new Set([
  "application/x-pkcs12",
  "application/pkcs12",
  "application/x-pem-file",
  "application/pem-certificate-chain",
  "application/octet-stream", // .pfx/.p12 podem vir assim
  "application/x-x509-ca-cert",
  "application/pkix-cert",
  "application/x-x509-user-cert",
]);

const ALLOWED_SELFIE_MIME = new Set(["image/jpeg", "image/png"]);

const DOCS: DocConfig[] = [
  {
    key: "certificate_file",
    label: "Certificado digital",
    required: true,
    multiple: false,
    allowedMime: ALLOWED_DOC_MIME,
    maxFiles: 1,
  },
  {
    key: "selfie_file",
    label: "Foto de verificação",
    required: true,
    multiple: false,
    allowedMime: ALLOWED_SELFIE_MIME,
    maxFiles: 1,
  },
];

function getFileExtLower(name: string): string {
  const base = (name || "").split(/[/\\]/).pop() || "";
  const idx = base.lastIndexOf(".");
  if (idx === -1) return "";
  return base.slice(idx + 1).toLowerCase();
}

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
  if (value === "yes") return "sim";
  if (value === "no") return "não";
  return "-";
}

function hashSha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sanitizeFilename(name: string): string {
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

async function zipFile(file: File): Promise<{ name: string; content: string }> {
  const ab = await file.arrayBuffer();
  const fileBuffer = Buffer.from(ab);

  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const out = new PassThrough();
    const chunks: Buffer[] = [];

    out.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    out.on("end", () => {
      const zipBuffer = Buffer.concat(chunks);
      const base64 = zipBuffer.toString("base64");
      const baseName = sanitizeFilename(file.name || "certificado");
      const zipName = baseName.toLowerCase().endsWith(".zip") ? baseName : `${baseName}.zip`;
      resolve({ name: zipName, content: base64 });
    });

    out.on("error", reject);
    archive.on("error", reject);

    archive.pipe(out);

    // adiciona o arquivo original dentro do zip (mantém a extensão .cert)
    archive.append(fileBuffer, { name: sanitizeFilename(file.name || "certificado.cert") });

    archive.finalize();
  });
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

function hasServiceNote(payload: SubmissionPayload): boolean {
  return (
    payload.noteKind === "service" ||
    payload.noteKind === "service_and_commerce"
  );
}

function hasCommerceNote(payload: SubmissionPayload): boolean {
  return (
    payload.noteKind === "commerce" ||
    payload.noteKind === "service_and_commerce"
  );
}

function formatNoteKind(value: SubmissionPayload["noteKind"]): string {
  if (value === "service") return "Serviço (NFS-e)";
  if (value === "commerce") return "Produto (NF-e)";
  if (value === "service_and_commerce") return "Serviço e produto";
  return safeValue(value);
}

function buildEmailText(params: {
  payload: SubmissionPayload;
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
  lines.push(`Nova homologação NFS-e/NF-e — F10`);
  lines.push(`Recebida em: ${meta.submittedAt}`);
  lines.push(`Token: ${meta.messageToken}`);
  lines.push("");
  lines.push("=== Dados da unidade ===");
  lines.push(`CNPJ: ${safeValue(payload.cnpj)}`);
  lines.push(`Razão Social: ${safeValue(payload.legalName)}`);
  lines.push(`Nome Fantasia: ${safeValue(payload.fantasyName)}`);
  lines.push(`CNAE principal: ${safeValue(payload.cnaeMain)}`);
  lines.push("");
  lines.push("=== Endereço da unidade ===");
  lines.push(`CEP: ${safeValue(payload.cep)}`);
  lines.push("");
  lines.push("=== Confirmações === ");
  lines.push(`Optante pelo Simples Nacional: ${formatYesNo(payload.isSimples)}`);
  lines.push(`Incentiva projetos culturais (renúncia fiscal): ${formatYesNo(payload.supportsCulturalProjects)}`);
  lines.push(`Emite NFS-e pelo ambiente nacional: ${formatYesNo(payload.usesNationalNfseEnvironment)}`);
  lines.push("");
  lines.push("=== Tipo de nota ===");
  lines.push(`Tipo: ${formatNoteKind(payload.noteKind)}`);

  if (hasServiceNote(payload)) {
    lines.push("");
    lines.push("=== Acesso prefeitura ===");
    lines.push(`Login: ${safeValue(payload.cityHallLogin)}`);
    lines.push(`Senha: ${safeValue(payload.cityHallPassword)}`);
    lines.push(`Frase secreta: ${safeValue(payload.securityPhrase)}`);
    lines.push(`Lote de RPS: ${safeValue(payload.serviceRpsBatchNumber)}`);

    lines.push("");
    lines.push("=== Dados fiscais (serviço) ===");
    lines.push(`Item Lista de Serviço: ${safeValue(payload.serviceListItem)}`);
    lines.push(`Código de Tributação: ${safeValue(payload.taxationCode)}`);
    lines.push(`Local de tributação: ${safeValue(payload.taxationPlace)}`);
    lines.push(`Regime especial: ${safeValue(payload.specialRegime)}`);
    lines.push(`Exigibilidade do ISS: ${safeValue(payload.issRequirement)}`);
    lines.push(`Retenção do ISS: ${formatYesNo(payload.issWithholding)}`);
    lines.push(`Arredondar ISS: ${formatYesNo(payload.roundIss)}`);
    lines.push(`Alíquota PIS: ${safeValue(payload.aliquotPis)}`);
    lines.push(`Alíquota COFINS: ${safeValue(payload.aliquotCofins)}`);
    lines.push(`Alíquota INSS: ${safeValue(payload.aliquotInss)}`);
    lines.push(`Alíquota IR: ${safeValue(payload.aliquotIr)}`);
    lines.push(`Alíquota CSLL: ${safeValue(payload.aliquotCsll)}`);
    lines.push(`Alíquota ISS: ${safeValue(payload.aliquotIss)}`);
    lines.push(`Porcentagem IBPT: ${safeValue(payload.ibptPercent)}`);
    lines.push(`Descrição dos serviços: ${safeValue(payload.serviceDescription)}`);
  }

  if (hasCommerceNote(payload)) {
    lines.push("");
    lines.push("=== Dados fiscais (comércio) ===");
    lines.push(`Número da última nota: ${safeValue(payload.commerceLastInvoiceNumber)}`);
    lines.push(`Número do Lote: ${safeValue(payload.commerceBatchNumber)}`);
    lines.push(`Numeração: ${safeValue(payload.commerceNumbering)}`);
    lines.push(`Série: ${safeValue(payload.commerceSeries)}`);
    lines.push(`Código NCM: ${safeValue(payload.commerceNcmCode)}`);
    lines.push(`Código CFOP: ${safeValue(payload.commerceCfopCode)}`);
    lines.push(`CFOP devolução: ${safeValue(payload.commerceReturnCfop)}`);
    lines.push(`Natureza da Operação: ${safeValue(payload.commerceOperationNature)}`);
    lines.push(`Alíquota ICMS: ${safeValue(payload.commerceIcmsAliquot)}`);
    lines.push(`CST ICMS: ${safeValue(payload.commerceCstIcms)}`);
    lines.push(`CSOSN: ${safeValue(payload.commerceCsosn)}`);
    lines.push(`Alíquota IPI: ${safeValue(payload.commerceIpiAliquot)}`);
    lines.push(`CST IPI: ${safeValue(payload.commerceCstIpi)}`);
    lines.push(`Alíquota PIS: ${safeValue(payload.commercePisAliquot)}`);
    lines.push(`CST PIS: ${safeValue(payload.commerceCstPis)}`);
    lines.push(`Alíquota COFINS: ${safeValue(payload.commerceCofinsAliquot)}`);
    lines.push(`CST COFINS: ${safeValue(payload.commerceCstCofins)}`);
    lines.push(`Descrição do item: ${safeValue(payload.commerceItemDescription)}`);
    lines.push(`GTIN/EAN: ${safeValue(payload.commerceGtin)}`);
    lines.push(`Código de benefício fiscal: ${safeValue(payload.commerceFiscalBenefitCode)}`);
  }

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
  payload: SubmissionPayload;
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
            <td style="padding:10px 12px; border-top:1px solid ${outline}; border-right:1px solid ${outline}; color:${muted}; font-size:12px; width:220px;">
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
              <td style="padding:10px 12px; border-top:1px solid ${outline}; border-right:1px solid ${outline}; color:${muted}; font-size:12px; width:220px;">
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

  const generalSection = section("Dados da unidade", [
    ["CNPJ", safeValue(payload.cnpj)],
    ["Razão Social", safeValue(payload.legalName)],
    ["Nome Fantasia", safeValue(payload.fantasyName)],
    ["CNAE principal", safeValue(payload.cnaeMain)],
    ["CEP", safeValue(payload.cep)],
    ["Optante pelo Simples Nacional", formatYesNo(payload.isSimples)],
    ["Incentiva projetos culturais (renúncia fiscal)", formatYesNo(payload.supportsCulturalProjects)],
    ["Emite NFS-e pelo ambiente nacional", formatYesNo(payload.usesNationalNfseEnvironment)],
    ["Tipo de nota", formatNoteKind(payload.noteKind)],
  ]);

  const specificSections: string[] = [];

  if (hasServiceNote(payload)) {
    specificSections.push(
      section("Dados fiscais (serviço)", [
        ["Login Prefeitura", safeValue(payload.cityHallLogin)],
        ["Senha", safeValue(payload.cityHallPassword)],
        ["Frase secreta de segurança", safeValue(payload.securityPhrase)],
        ["Lote de RPS", safeValue(payload.serviceRpsBatchNumber)],
        ["Item Lista de Serviço", safeValue(payload.serviceListItem)],
        ["Código de Tributação", safeValue(payload.taxationCode)],
        ["Local de tributação", safeValue(payload.taxationPlace)],
        ["Regime especial", safeValue(payload.specialRegime)],
        ["Exigibilidade do ISS", safeValue(payload.issRequirement)],
        ["Retenção do ISS", formatYesNo(payload.issWithholding)],
        ["Arredondar ISS", formatYesNo(payload.roundIss)],
        ["Alíquota PIS", safeValue(payload.aliquotPis)],
        ["Alíquota COFINS", safeValue(payload.aliquotCofins)],
        ["Alíquota INSS", safeValue(payload.aliquotInss)],
        ["Alíquota IR", safeValue(payload.aliquotIr)],
        ["Alíquota CSLL", safeValue(payload.aliquotCsll)],
        ["Alíquota ISS", safeValue(payload.aliquotIss)],
        ["Porcentagem IBPT", safeValue(payload.ibptPercent)],
        ["Descrição dos serviços", safeValue(payload.serviceDescription)],
      ]),
    );
  }

  if (hasCommerceNote(payload)) {
    specificSections.push(
      section("Dados fiscais (comércio)", [
        ["Número da última nota", safeValue(payload.commerceLastInvoiceNumber)],
        ["Número do Lote", safeValue(payload.commerceBatchNumber)],
        ["Numeração", safeValue(payload.commerceNumbering)],
        ["Série", safeValue(payload.commerceSeries)],
        ["Código NCM", safeValue(payload.commerceNcmCode)],
        ["Código CFOP", safeValue(payload.commerceCfopCode)],
        ["CFOP devolução", safeValue(payload.commerceReturnCfop)],
        ["Natureza da Operação", safeValue(payload.commerceOperationNature)],
        ["Alíquota ICMS", safeValue(payload.commerceIcmsAliquot)],
        ["CST ICMS", safeValue(payload.commerceCstIcms)],
        ["CSOSN", safeValue(payload.commerceCsosn)],
        ["Alíquota IPI", safeValue(payload.commerceIpiAliquot)],
        ["CST IPI", safeValue(payload.commerceCstIpi)],
        ["Alíquota PIS", safeValue(payload.commercePisAliquot)],
        ["CST PIS", safeValue(payload.commerceCstPis)],
        ["Alíquota COFINS", safeValue(payload.commerceCofinsAliquot)],
        ["CST COFINS", safeValue(payload.commerceCstCofins)],
        ["Descrição do item", safeValue(payload.commerceItemDescription)],
        ["GTIN/EAN", safeValue(payload.commerceGtin)],
        ["Código de benefício fiscal", safeValue(payload.commerceFiscalBenefitCode)],
      ]),
    );
  }

  const metaSection = section("Metadados técnicos", [
    ["IP (proxy)", safeValue(meta.clientIp)],
    ["User-Agent", safeValue(meta.userAgent)],
    ["Origem", safeValue(meta.origin)],
    ["submittedAt (payload)", safeValue(payload.submittedAt)],
    ["messageToken", safeValue(meta.messageToken)],
  ]);

  const preheaderText =
    "Homologação completa recebida (dados da unidade, fiscais, confirmações e metadados).";

  return `
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>Nova homologação - F10</title>
  </head>
  <body style="margin:0; padding:0; background:${bg}; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif;">
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
                      Recebida em: <strong style="color:#111;">${escapeHtml(meta.submittedAt)}</strong>
                    </td>
                  </tr>
                </table>

                <div style="margin-top:14px; font-size:22px; font-weight:800; color:${primary}; line-height:1.2;">
                  Nova homologação NFS-e/NF-e
                </div>
                <div style="margin-top:6px; color:${muted}; font-size:13px;">
                  Abaixo estão <strong>todos os dados</strong> enviados no formulário.
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:0 18px 18px 18px;">
                <div style="background:${surface}; border:1px solid ${outline}; border-radius:22px; padding:18px;">
                  ${generalSection}
                  ${specificSections.join("")}

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

                  ${metaSection}

                  <div style="margin-top:14px; font-size:12px; color:${muted}; line-height:1.5;">
                    Aviso: este e-mail contém informações sensíveis. Evite encaminhar e mantenha em local seguro.
                  </div>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:0 18px 8px 18px; color:${muted}; font-size:11px; text-align:center;">
                F10 • Homologação automática
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
    appendFileSync(resolve(dir, "homologacao-errors.log"), entry, "utf8");
  } catch (logError) {
    console.error("[homologacao] Falha ao registrar erro:", logError);
  }
}

export const POST: RequestHandler = async ({ request, url }) => {
  const contentType = request.headers.get("content-type") ?? "—";
  const contentLength = request.headers.get("content-length") ?? "—";

  console.log("[homologacao] incoming", { contentType, contentLength });

  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return json(
      {
        success: false,
        message: "Conteúdo inválido. Envie como multipart/form-data.",
        details: `content-type=${contentType} content-length=${contentLength}`,
      },
      { status: 415 },
    );
  }

  // ====== Config ======
  const apiKey = getEnv("BREVO_API_KEY");
  const toEmail = getEnv("BREVO_MAIL_TO");
  const copyEmail = getEnv("BREVO_COPY_TO");
  const fromEmail = getEnv("BREVO_FROM_EMAIL");
  const fromName = "HOMOLOGAÇÃO NF - F10";
  const siteUrl = getEnv("SITE_URL") || url.origin;

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
  let form: globalThis.FormData;
  try {
    form = await request.formData();
  } catch (error) {
    console.error("[homologacao] Falha ao ler multipart:", error);
    logMultipartError(error);
    return json(
      {
        success: false,
        message: "Conteúdo inválido. Envie como multipart/form-data.",
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
        message: "Payload ausente. Campo 'payload' é obrigatório.",
      },
      { status: 400 },
    );
  }

  let payload: SubmissionPayload;
  try {
    payload = JSON.parse(payloadRaw) as SubmissionPayload;
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
    index: number; // 1-based
  }> = [];

  for (const d of DOCS) {
    const entries = d.multiple ? form.getAll(d.key) : [form.get(d.key)];
    const files = entries.filter(isFileLike) as File[];

    if (d.required && files.length === 0) {
      return json(
        { success: false, message: `Documento obrigatório ausente: ${d.label}.` },
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

      const ext = getFileExtLower(fileName);

      const isCertByExt = ext === "cert";
      const isAllowedByMime = d.allowedMime.has(fileType);

      // Para certificado: aceite por MIME OU por extensão .cert (muitos browsers enviam MIME inconsistente)
      const isCertificate = d.key === "certificate_file";
      if (isCertificate) {
        if (!isAllowedByMime && !isCertByExt) {
          return json(
            {
              success: false,
              message: `Formato inválido em: ${d.label}. Envie .cert ou PFX/P12.`,
              details: `file.type=${fileType || "—"} file.name=${fileName}`,
            },
            { status: 400 },
          );
        }
      } else {
        if (!isAllowedByMime) {
          return json(
            {
              success: false,
              message: `Formato inválido em: ${d.label}.`,
              details: `file.type=${fileType || "—"} file.name=${fileName}`,
            },
            { status: 400 },
          );
        }
      }

      docFiles.push({ key: d.key, label: d.label, file, index: i + 1 });
    }
  }

  // ====== Monta anexos ======
  const attachments: Array<{ name: string; content: string }> = [];
  const docsInfoForHtml: Array<{
    key: DocKey;
    label: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }> = [];

  for (const d of docFiles) {
    let attachmentContent: string;
    let attachmentName: string;
    let attachmentType: string = d.file.type || "application/octet-stream";
    let attachmentSize: number = d.file.size;

    if (d.key === "certificate_file") {
      // Zipar o arquivo de certificado
      const zipped = await zipFile(d.file);
      attachmentContent = zipped.content;
      attachmentName = zipped.name;
      attachmentType = "application/zip";
      attachmentSize = Buffer.from(attachmentContent, "base64").length;
    } else if (d.key === "selfie_file") {
      attachmentContent = await fileToBase64(d.file);
      attachmentName = sanitizeFilename(d.file.name);
      attachmentName = `${d.key}_${String(d.index).padStart(2, "0")}_${attachmentName}`;
      attachmentType = d.file.type || "image/jpeg";
    } else {
      attachmentContent = await fileToBase64(d.file);
      attachmentName = sanitizeFilename(d.file.name);
      attachmentName = `${d.key}_${String(d.index).padStart(2, "0")}_${attachmentName}`;
    }

    attachments.push({ name: attachmentName, content: attachmentContent });

    docsInfoForHtml.push({
      key: d.key,
      label: d.label,
      fileName: attachmentName,
      fileType: attachmentType,
      fileSize: attachmentSize,
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

  // ====== Assunto ======
  const stampForSubject = nowIso.replace("T", " ").slice(0, 19);
  const subject = `Nova homologação F10 • ${safeValue(
    payload.fantasyName,
  )} • ${cnpjDigits || "CNPJ"} • ${stampForSubject}`;

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
        to: [{ email: toEmail, name: "Homologação F10" }],
        cc: [{ email: copyEmail, name: "Homologação F10" }],
        subject,
        htmlContent,
        textContent,
        tags: ["homologacao", "f10", "NF"],
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
      message: "Homologação recebida e e-mail enviado com sucesso.",
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