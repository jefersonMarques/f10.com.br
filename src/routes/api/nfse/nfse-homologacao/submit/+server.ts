// src/routes/api/nfse/nfse-homologacao/submit/+server.ts
import "$lib/server/load-env";
import { json } from "@sveltejs/kit";
import { appendFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { PassThrough } from "node:stream";
import archiver from "archiver";
import type { RequestHandler } from "./$types";

type EmailField = {
  key: string;
  label: string;
  value: string;
};

type SubmissionPayload = Record<string, unknown> & {
  submissionKind?: string;
  submittedAt?: string;
  emailFields?: EmailField[];
  cityCheckStatus?: string;
  cityCheckMessage?: string;
  cityCheckCity?: string;
  cityCheckState?: string;
  cityCheckIbgeCode?: string;
  cityCheckProvider?: string;
  cityCheckCheckedAt?: string;
  noteKind?: string;
  cnpj?: string;
  municipalRegistration?: string;
  stateRegistration?: string;
  legalName?: string;
  fantasyName?: string;
  cnaeMain?: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  website?: string;
  certificatePassword?: string;
  isSimples?: unknown;
  supportsCulturalProjects?: unknown;
  usesNationalNfseEnvironment?: unknown;
  cityHallLogin?: string;
  cityHallPassword?: string;
  securityPhrase?: string;
  serviceRpsBatchNumber?: string;
  serviceListItem?: string;
  taxationCode?: string;
  taxationPlace?: string;
  specialRegime?: string;
  issRequirement?: string;
  issWithholding?: unknown;
  roundIss?: unknown;
  aliquotPis?: string;
  aliquotCofins?: string;
  aliquotInss?: string;
  aliquotIr?: string;
  aliquotCsll?: string;
  aliquotIss?: string;
  ibptPercent?: string;
  serviceDescription?: string;
  commerceLastInvoiceNumber?: string;
  commerceBatchNumber?: string;
  commerceNumbering?: string;
  commerceSeries?: string;
  commerceNcmCode?: string;
  commerceCfopCode?: string;
  commerceReturnCfop?: string;
  commerceOperationNature?: string;
  commerceIcmsAliquot?: string;
  commerceCstIcms?: string;
  commerceCsosn?: string;
  commerceIpiAliquot?: string;
  commerceCstIpi?: string;
  commercePisAliquot?: string;
  commerceCstPis?: string;
  commerceCofinsAliquot?: string;
  commerceCstCofins?: string;
  commerceItemDescription?: string;
  commerceGtin?: string;
  commerceFiscalBenefitCode?: string;
  name?: string;
  whatsapp?: string;
  schoolName?: string;
};

type DocKey = "certificate_file";

type DocConfig = {
  key: DocKey;
  label: string;
  required: boolean;
  multiple: boolean;
  allowedMime: ReadonlySet<string>;
  maxFiles: number;
};

type DocInfo = {
  key: DocKey;
  label: string;
  fileName: string;
  fileType: string;
  fileSize: number;
};

type EmailMeta = {
  submittedAt: string;
  clientIp: string;
  userAgent: string;
  origin: string;
  messageToken: string;
};

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const ALLOWED_DOC_MIME = new Set([
  "application/x-pkcs12",
  "application/pkcs12",
  "application/x-pem-file",
  "application/pem-certificate-chain",
  "application/octet-stream",
  "application/x-x509-ca-cert",
  "application/pkix-cert",
  "application/x-x509-user-cert",
]);

const DOCS: DocConfig[] = [
  {
    key: "certificate_file",
    label: "Certificado digital",
    required: true,
    multiple: false,
    allowedMime: ALLOWED_DOC_MIME,
    maxFiles: 1,
  },
];

const taxationPlaceLabels: Record<string, string> = {
  in_city: "Tributação no município",
  out_city: "Tributação fora do município",
  exempt: "Isenção",
  immune: "Imune",
  suspended_judicial: "Exigibilidade suspensa por decisão judicial",
  suspended_admin: "Exigibilidade suspensa por processo administrativo",
};

const specialRegimeLabels: Record<string, string> = {
  none: "Nenhum",
  municipal_micro: "Microempresa municipal",
  estimate: "Estimativa",
  professionals_society: "Sociedade de profissionais",
  cooperative: "Cooperativa",
  mei: "Microempreendedor Individual (MEI)",
  me_epp: "Microempresa e Empresa de Pequeno Porte (ME/EPP)",
};

const issRequirementLabels: Record<string, string> = {
  none: "Nenhum",
  payable: "Exigível",
  non_incidence: "Não incidência",
  exempt: "Isenção",
  export: "Exportação",
  immunity: "Imunidade",
  suspended_judicial: "Suspenso por decisão judicial",
  suspended_admin: "Suspenso por processo administrativo",
};

function escapeHtml(value: unknown): string {
  const str = typeof value === "string" ? value : value == null ? "" : String(value);
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function onlyDigits(value: unknown): string {
  return (typeof value === "string" ? value : value == null ? "" : String(value)).replace(/\D+/g, "");
}

function safeValue(value: unknown): string {
  const str = typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
  return str ? str : "-";
}

function formatBytes(bytes: number): string {
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatYesNo(value: unknown): string {
  if (value === true || value === "yes" || value === "sim") return "Sim";
  if (value === false || value === "no" || value === "não" || value === "nao") return "Não";
  return safeValue(value);
}

function formatMappedValue(value: unknown, labels: Record<string, string>): string {
  const key = safeValue(value);
  if (key === "-") return key;
  return labels[key] ?? key;
}

function formatCityCheckStatus(value: unknown): string {
  if (value === "available") return "Disponível";
  if (value === "unavailable") return "Não elegível / ainda não disponível";
  if (value === "error") return "Erro na verificação";
  if (value === "checking") return "Verificando";
  if (value === "not_checked") return "Não realizada";
  return safeValue(value);
}

function formatNoteKind(value: unknown): string {
  if (value === "service") return "Serviço (NFS-e)";
  if (value === "commerce") return "Produto (NF-e)";
  if (value === "service_and_commerce") return "Serviço e produto";
  return safeValue(value);
}

function isAvailabilityNotification(payload: SubmissionPayload): boolean {
  return payload.submissionKind === "nfse_city_availability_notification";
}

function hasServiceNote(payload: SubmissionPayload): boolean {
  return payload.noteKind === "service" || payload.noteKind === "service_and_commerce";
}

function hasCommerceNote(payload: SubmissionPayload): boolean {
  return payload.noteKind === "commerce" || payload.noteKind === "service_and_commerce";
}

function getCityStatusTheme(status: unknown): {
  title: string;
  subtitle: string;
  bg: string;
  border: string;
  titleColor: string;
  textColor: string;
} {
  if (status === "available") {
    return {
      title: "Cidade disponível para emissão de notas fiscais",
      subtitle: "A cidade informada está na cobertura atual de NFS-e e pode seguir para análise/homologação.",
      bg: "#ECFDF3",
      border: "#ABEFC6",
      titleColor: "#067647",
      textColor: "#075E45",
    };
  }

  return {
    title: "Cidade não elegível para emissão de notas fiscais",
    subtitle: "A cidade informada não está elegível na cobertura atual, mas o cadastro foi enviado para análise da equipe F10.",
    bg: "#FEF3F2",
    border: "#FECDCA",
    titleColor: "#B42318",
    textColor: "#912018",
  };
}

function getFileExtLower(name: string): string {
  const base = (name || "").split(/[/\\]/).pop() || "";
  const idx = base.lastIndexOf(".");
  return idx === -1 ? "" : base.slice(idx + 1).toLowerCase();
}

function sanitizeFilename(name: string): string {
  const base = (name || "arquivo").split(/[/\\]/).pop() || "arquivo";
  return base.replace(/[^\w.\-()+\s]/g, "_");
}

function isFileLike(value: unknown): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as File).name === "string" &&
    typeof (value as File).size === "number" &&
    typeof (value as File).type === "string" &&
    typeof (value as File).arrayBuffer === "function"
  );
}

function getEnv(key: string): string | undefined {
  const value = process.env[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "-";
  return headers.get("x-real-ip") || "-";
}

function formatDateTimeBR(iso: string | undefined): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
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

function getMultipartParseErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("body size") || lowerMessage.includes("request body size")) {
    return `Arquivo muito grande para o limite atual do servidor. Detalhe: ${message}`;
  }

  if (lowerMessage.includes("multipart") || lowerMessage.includes("boundary")) {
    return `Não foi possível ler o formulário enviado. Detalhe: ${message}`;
  }

  return `Conteúdo inválido. Detalhe: ${message}`;
}

async function fileToBase64(file: File): Promise<string> {
  const ab = await file.arrayBuffer();
  return Buffer.from(ab).toString("base64");
}

async function zipFile(file: File): Promise<{ name: string; content: string }> {
  const ab = await file.arrayBuffer();
  const fileBuffer = Buffer.from(ab);

  return new Promise((resolvePromise, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const out = new PassThrough();
    const chunks: Buffer[] = [];

    out.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    out.on("end", () => {
      const zipBuffer = Buffer.concat(chunks);
      const baseName = sanitizeFilename(file.name || "certificado");
      resolvePromise({
        name: baseName.toLowerCase().endsWith(".zip") ? baseName : `${baseName}.zip`,
        content: zipBuffer.toString("base64"),
      });
    });
    out.on("error", reject);
    archive.on("error", reject);
    archive.pipe(out);
    archive.append(fileBuffer, { name: sanitizeFilename(file.name || "certificado.cert") });
    archive.finalize();
  });
}

function renderRows(rows: Array<[string, string]>, outline: string, muted: string): string {
  return rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:10px 12px; border-top:1px solid ${outline}; border-right:1px solid ${outline}; color:${muted}; font-size:12px; width:220px;">
            ${escapeHtml(label)}
          </td>
          <td style="padding:10px 12px; border-top:1px solid ${outline}; color:#111; font-size:13px;">
            ${escapeHtml(value)}
          </td>
        </tr>
      `,
    )
    .join("");
}

function renderSection(title: string, rows: Array<[string, string]>, colors: { bg: string; surface: string; outline: string; muted: string; primary: string }): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${colors.outline}; border-radius:16px; overflow:hidden; background:${colors.surface}; margin-top:14px;">
      <tr>
        <td style="padding:14px 16px; background:${colors.bg};">
          <div style="font-size:14px; font-weight:700; color:${colors.primary};">${escapeHtml(title)}</div>
        </td>
      </tr>
      ${renderRows(rows, colors.outline, colors.muted)}
    </table>
  `;
}

function getCityRows(payload: SubmissionPayload): Array<[string, string]> {
  return [
    ["Status", formatCityCheckStatus(payload.cityCheckStatus)],
    ["Cidade informada", safeValue(payload.cityCheckCity || payload.city)],
    ["UF", safeValue(payload.cityCheckState || payload.state)]
  ];
}

function getGeneralRows(payload: SubmissionPayload): Array<[string, string]> {
  return [
    ["CNPJ", safeValue(payload.cnpj)],
    ["Inscrição Municipal", safeValue(payload.municipalRegistration)],
    ["Inscrição Estadual", safeValue(payload.stateRegistration)],
    ["Razão Social", safeValue(payload.legalName)],
    ["Nome Fantasia", safeValue(payload.fantasyName)],
    ["CNAE principal", safeValue(payload.cnaeMain)],
    ["CEP", safeValue(payload.cep)],
    ["Rua", safeValue(payload.street)],
    ["Número", safeValue(payload.number)],
    ["Complemento", safeValue(payload.complement)],
    ["Bairro", safeValue(payload.neighborhood)],
    ["Cidade", safeValue(payload.city)],
    ["Estado", safeValue(payload.state)],
    ["Telefone com DDD", safeValue(payload.phone)],
    ["E-mail", safeValue(payload.email)],
    ["Site", safeValue(payload.website)],
    ["Senha do certificado digital", safeValue(payload.certificatePassword)],
    ["Optante pelo Simples Nacional", formatYesNo(payload.isSimples)],
    ["Incentiva projetos culturais", formatYesNo(payload.supportsCulturalProjects)],
    ["Emite NFS-e pelo ambiente nacional", formatYesNo(payload.usesNationalNfseEnvironment)],
    ["Tipo de nota", formatNoteKind(payload.noteKind)],
  ];
}

function getServiceRows(payload: SubmissionPayload): Array<[string, string]> {
  return [
    ["Login Prefeitura", safeValue(payload.cityHallLogin)],
    ["Senha", safeValue(payload.cityHallPassword)],
    ["Frase secreta de segurança", safeValue(payload.securityPhrase)],
    ["Lote de RPS", safeValue(payload.serviceRpsBatchNumber)],
    ["Item Lista de Serviço", safeValue(payload.serviceListItem)],
    ["Código de Tributação", safeValue(payload.taxationCode)],
    ["Natureza da operação", formatMappedValue(payload.taxationPlace, taxationPlaceLabels)],
    ["Regime especial", formatMappedValue(payload.specialRegime, specialRegimeLabels)],
    ["Exigibilidade do ISS", formatMappedValue(payload.issRequirement, issRequirementLabels)],
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
  ];
}

function getCommerceRows(payload: SubmissionPayload): Array<[string, string]> {
  return [
    ["Número da última nota", safeValue(payload.commerceLastInvoiceNumber)],
    ["Número do lote", safeValue(payload.commerceBatchNumber)],
    ["Numeração", safeValue(payload.commerceNumbering)],
    ["Série", safeValue(payload.commerceSeries)],
    ["Código NCM", safeValue(payload.commerceNcmCode)],
    ["Código CFOP", safeValue(payload.commerceCfopCode)],
    ["CFOP devolução", safeValue(payload.commerceReturnCfop)],
    ["Natureza da operação", safeValue(payload.commerceOperationNature)],
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
  ];
}

function buildEmailText(params: { payload: SubmissionPayload; docs: DocInfo[]; meta: EmailMeta }): string {
  const { payload, docs, meta } = params;
  const lines: string[] = [];
  const cityTheme = getCityStatusTheme(payload.cityCheckStatus);

  lines.push("Nova homologação NFS-e/NF-e — F10");
  lines.push(`Recebida em: ${meta.submittedAt}`);
  lines.push(`Token: ${meta.messageToken}`);
  lines.push("");
  lines.push("=== Validação da cidade ===");
  lines.push(cityTheme.title);
  lines.push(cityTheme.subtitle);
  for (const [label, value] of getCityRows(payload)) lines.push(`${label}: ${value}`);
  lines.push("");
  lines.push("=== Dados da unidade ===");
  for (const [label, value] of getGeneralRows(payload)) lines.push(`${label}: ${value}`);

  if (hasServiceNote(payload)) {
    lines.push("");
    lines.push("=== Dados fiscais (serviço) ===");
    for (const [label, value] of getServiceRows(payload)) lines.push(`${label}: ${value}`);
  }

  if (hasCommerceNote(payload)) {
    lines.push("");
    lines.push("=== Dados fiscais (comércio) ===");
    for (const [label, value] of getCommerceRows(payload)) lines.push(`${label}: ${value}`);
  }

  lines.push("");
  lines.push("=== Documentos enviados ===");
  if (!docs.length) lines.push("Nenhum documento anexado.");
  for (const doc of docs) lines.push(`${doc.label}: ${doc.fileName} (${doc.fileType}, ${formatBytes(doc.fileSize)})`);
  lines.push("");
  lines.push("=== Metadados técnicos ===");
  lines.push(`IP (proxy): ${safeValue(meta.clientIp)}`);
  lines.push(`User-Agent: ${safeValue(meta.userAgent)}`);
  lines.push(`Origem: ${safeValue(meta.origin)}`);
  lines.push(`submittedAt (payload): ${safeValue(payload.submittedAt)}`);
  lines.push(`messageToken: ${safeValue(meta.messageToken)}`);
  return lines.join("\n");
}

function buildEmailHtml(params: { payload: SubmissionPayload; docs: DocInfo[]; meta: EmailMeta }): string {
  const { payload, docs, meta } = params;
  const colors = {
    primary: "#ea6d0b",
    bg: "#FFF7EF",
    surface: "#FFFFFF",
    outline: "rgba(0,0,0,0.10)",
    muted: "rgba(0,0,0,0.62)",
  };
  const logoUrl = `${meta.origin}/logo_f10.png`;
  const cityTheme = getCityStatusTheme(payload.cityCheckStatus);
  const docsRows = docs.length
    ? docs
        .map(
          (doc) => `
            <tr>
              <td style="padding:10px 12px; border-top:1px solid ${colors.outline}; border-right:1px solid ${colors.outline}; color:${colors.muted}; font-size:12px; width:220px;">${escapeHtml(doc.label)}</td>
              <td style="padding:10px 12px; border-top:1px solid ${colors.outline}; color:#111; font-size:13px;">
                <div style="font-weight:600;">${escapeHtml(doc.fileName)}</div>
                <div style="font-size:12px; color:${colors.muted};">${escapeHtml(doc.fileType)} • ${escapeHtml(formatBytes(doc.fileSize))}</div>
              </td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td style="padding:12px; border-top:1px solid ${colors.outline}; color:${colors.muted}; font-size:13px;">Nenhum documento anexado.</td></tr>`;

  const specificSections: string[] = [];
  if (hasServiceNote(payload)) {
    specificSections.push(renderSection("Dados fiscais (serviço)", getServiceRows(payload), colors));
  }
  if (hasCommerceNote(payload)) {
    specificSections.push(renderSection("Dados fiscais (comércio)", getCommerceRows(payload), colors));
  }

  const metaSection = renderSection("Metadados técnicos", [
    ["IP (proxy)", safeValue(meta.clientIp)],
    ["User-Agent", safeValue(meta.userAgent)],
    ["Origem", safeValue(meta.origin)],
    ["submittedAt (payload)", safeValue(payload.submittedAt)],
    ["messageToken", safeValue(meta.messageToken)],
  ], colors);

  return `
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>Nova homologação - F10</title>
  </head>
  <body style="margin:0; padding:0; background:${colors.bg}; font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${colors.bg}; padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="680" cellpadding="0" cellspacing="0" style="max-width:680px; width:100%;">
            <tr>
              <td style="padding:18px 18px 10px 18px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td valign="middle"><img src="${escapeHtml(logoUrl)}" alt="F10" height="34" style="display:block; height:34px; width:auto;" /></td>
                    <td align="right" valign="middle" style="color:${colors.muted}; font-size:12px;">Recebida em: <strong style="color:#111;">${escapeHtml(meta.submittedAt)}</strong></td>
                  </tr>
                </table>
                <div style="margin-top:14px; font-size:22px; font-weight:800; color:${colors.primary}; line-height:1.2;">Nova homologação NFS-e/NF-e</div>
                <div style="margin-top:6px; color:${colors.muted}; font-size:13px;">Dados enviados pelo formulário de homologação.</div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 18px 18px 18px;">
                <div style="background:${colors.surface}; border:1px solid ${colors.outline}; border-radius:22px; padding:18px;">
                  <div style="background:${cityTheme.bg}; border:1px solid ${cityTheme.border}; border-radius:16px; padding:16px; margin-bottom:14px;">
                    <div style="font-size:16px; line-height:1.35; font-weight:800; color:${cityTheme.titleColor};">${escapeHtml(cityTheme.title)}</div>
                    <div style="margin-top:6px; font-size:13px; line-height:1.55; color:${cityTheme.textColor};">${escapeHtml(cityTheme.subtitle)}</div>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px; border:1px solid ${cityTheme.border}; border-radius:12px; overflow:hidden; background:#fff;">
                      ${renderRows(getCityRows(payload), cityTheme.border, cityTheme.textColor)}
                    </table>
                  </div>
                  ${renderSection("Dados da unidade", getGeneralRows(payload), colors)}
                  ${specificSections.join("")}
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${colors.outline}; border-radius:16px; overflow:hidden; background:${colors.surface}; margin-top:14px;">
                    <tr><td style="padding:14px 16px; background:${colors.bg};"><div style="font-size:14px; font-weight:700; color:${colors.primary};">Documentos enviados - anexos</div></td></tr>
                    ${docsRows}
                  </table>
                  ${metaSection}
                  <div style="margin-top:14px; font-size:12px; color:${colors.muted}; line-height:1.5;">Aviso: este e-mail contém informações sensíveis. Evite encaminhar e mantenha em local seguro.</div>
                </div>
              </td>
            </tr>
            <tr><td style="padding:0 18px 8px 18px; color:${colors.muted}; font-size:11px; text-align:center;">F10 • Homologação automática</td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}

function buildAvailabilityNotificationText(params: { payload: SubmissionPayload; meta: EmailMeta }): string {
  const { payload, meta } = params;
  return [
    "Solicitação de aviso de cidade disponível — F10",
    `Recebida em: ${meta.submittedAt}`,
    `Nome: ${safeValue(payload.name)}`,
    `E-mail: ${safeValue(payload.email)}`,
    `WhatsApp: ${safeValue(payload.whatsapp)}`,
    `Nome da escola: ${safeValue(payload.schoolName)}`,
    `Cidade: ${safeValue(payload.city)}`,
    `Estado: ${safeValue(payload.state)}`,
    `Status: ${formatCityCheckStatus(payload.cityCheckStatus)}`,
    `Mensagem: ${safeValue(payload.cityCheckMessage)}`,
  ].join("\n");
}

function buildAvailabilityNotificationHtml(params: { payload: SubmissionPayload; meta: EmailMeta }): string {
  const { payload, meta } = params;
  const colors = { primary: "#ea6d0b", bg: "#FFF7EF", surface: "#FFFFFF", outline: "rgba(0,0,0,0.10)", muted: "rgba(0,0,0,0.62)" };
  const rows = [
    ["Nome", safeValue(payload.name)],
    ["E-mail", safeValue(payload.email)],
    ["WhatsApp", safeValue(payload.whatsapp)],
    ["Nome da escola", safeValue(payload.schoolName)],
    ["Cidade", safeValue(payload.city)],
    ["Estado", safeValue(payload.state)],
    ["Status da cidade", formatCityCheckStatus(payload.cityCheckStatus)],
    ["Mensagem da verificação", safeValue(payload.cityCheckMessage)],
  ] as Array<[string, string]>;

  return `
<!doctype html>
<html lang="pt-BR">
  <body style="margin:0; padding:0; background:${colors.bg}; font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${colors.bg}; padding:24px 12px;">
      <tr><td align="center"><table role="presentation" width="680" style="max-width:680px; width:100%;">
        <tr><td style="padding:18px;"><img src="${escapeHtml(`${meta.origin}/logo_f10.png`)}" alt="F10" height="34" /><div style="margin-top:14px; font-size:22px; font-weight:800; color:${colors.primary};">Solicitação de aviso de cidade disponível</div></td></tr>
        <tr><td style="padding:0 18px 18px 18px;">${renderSection("Dados enviados", rows, colors)}</td></tr>
      </table></td></tr>
    </table>
  </body>
</html>
  `.trim();
}

export const POST: RequestHandler = async ({ request, url }) => {
  const contentType = request.headers.get("content-type") ?? "-";
  const contentLength = request.headers.get("content-length") ?? "-";

  console.log("[homologacao] incoming", { contentType, contentLength });

  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return json({ success: false, message: "Conteúdo inválido. Envie como multipart/form-data." }, { status: 415 });
  }

  const apiKey = getEnv("BREVO_API_KEY");
  const toEmail = getEnv("BREVO_MAIL_TO");
  const copyEmail = getEnv("BREVO_COPY_TO");
  const fromEmail = getEnv("BREVO_FROM_EMAIL");
  const siteUrl = getEnv("SITE_URL") || url.origin;

  if (!apiKey || !toEmail || !fromEmail) {
    return json({ success: false, message: "E-mail não configurado no servidor." }, { status: 500 });
  }

  let form: globalThis.FormData;
  try {
    form = await request.formData();
  } catch (error) {
    logMultipartError(error);
    console.error("[homologacao] multipart/form-data parse failure", {
      contentType,
      contentLength,
      error: error instanceof Error ? error.message : String(error),
    });
    return json({ success: false, message: getMultipartParseErrorMessage(error) }, { status: 400 });
  }

  const payloadRaw = form.get("payload");
  if (typeof payloadRaw !== "string" || !payloadRaw.trim()) {
    return json({ success: false, message: "Payload ausente. Campo 'payload' é obrigatório." }, { status: 400 });
  }

  let payload: SubmissionPayload;
  try {
    payload = JSON.parse(payloadRaw) as SubmissionPayload;
  } catch {
    return json({ success: false, message: "Payload inválido (JSON malformado)." }, { status: 400 });
  }

  const isNotifyOnly = isAvailabilityNotification(payload);
  const activeDocs = isNotifyOnly ? [] : DOCS;
  const docFiles: Array<{ key: DocKey; label: string; file: File; index: number }> = [];

  for (const doc of activeDocs) {
    const entries = doc.multiple ? form.getAll(doc.key) : [form.get(doc.key)];
    const files = entries.filter(isFileLike) as File[];

    if (doc.required && files.length === 0) {
      return json({ success: false, message: `Documento obrigatório ausente: ${doc.label}.` }, { status: 400 });
    }

    if (files.length > doc.maxFiles) {
      return json({ success: false, message: `Muitos arquivos em: ${doc.label}. Limite: ${doc.maxFiles}.` }, { status: 400 });
    }

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const fileName = file.name || "";
      const fileType = file.type || "";
      const fileSize = file.size || 0;
      const ext = getFileExtLower(fileName);
      const isCertByExt = ext === "cert";
      const isAllowedByMime = doc.allowedMime.has(fileType);

      if (!fileName || !fileSize) {
        return json({ success: false, message: `Arquivo inválido em: ${doc.label}.` }, { status: 400 });
      }

      if (fileSize > MAX_FILE_BYTES) {
        return json({ success: false, message: `Arquivo acima de 2MB em: ${doc.label}.` }, { status: 400 });
      }

      if (!isAllowedByMime && !isCertByExt) {
        return json({ success: false, message: `Formato inválido em: ${doc.label}. Envie .cert ou PFX/P12.` }, { status: 400 });
      }

      docFiles.push({ key: doc.key, label: doc.label, file, index: i + 1 });
    }
  }

  const attachments: Array<{ name: string; content: string }> = [];
  const docsInfoForHtml: DocInfo[] = [];

  for (const doc of docFiles) {
    let attachmentContent: string;
    let attachmentName: string;
    let attachmentType = doc.file.type || "application/octet-stream";
    let attachmentSize = doc.file.size;

    if (doc.key === "certificate_file") {
      const zipped = await zipFile(doc.file);
      attachmentContent = zipped.content;
      attachmentName = zipped.name;
      attachmentType = "application/zip";
      attachmentSize = Buffer.from(attachmentContent, "base64").length;
    } else {
      attachmentContent = await fileToBase64(doc.file);
      attachmentName = `${doc.key}_${String(doc.index).padStart(2, "0")}_${sanitizeFilename(doc.file.name)}`;
    }

    attachments.push({ name: attachmentName, content: attachmentContent });
    docsInfoForHtml.push({ key: doc.key, label: doc.label, fileName: attachmentName, fileType: attachmentType, fileSize: attachmentSize });
  }

  const nowIso = new Date().toISOString();
  const submittedAtIso = payload.submittedAt || nowIso;
  const cnpjDigits = onlyDigits(payload.cnpj);
  const messageToken = `${cnpjDigits || "CNPJ"}-${Date.now()}`;

  const meta: EmailMeta = {
    submittedAt: formatDateTimeBR(submittedAtIso),
    clientIp: getClientIp(request.headers),
    userAgent: request.headers.get("user-agent") || "-",
    origin: siteUrl,
    messageToken,
  };

  const htmlContent = isNotifyOnly
    ? buildAvailabilityNotificationHtml({ payload, meta })
    : buildEmailHtml({ payload, docs: docsInfoForHtml, meta });
  const textContent = isNotifyOnly
    ? buildAvailabilityNotificationText({ payload, meta })
    : buildEmailText({ payload, docs: docsInfoForHtml, meta });

  const stampForSubject = nowIso.replace("T", " ").slice(0, 19);
  const subject = isNotifyOnly
    ? `Aviso cidade NFS-e F10 • ${safeValue(payload.schoolName || payload.fantasyName)} • ${safeValue(payload.city)}/${safeValue(payload.state)} • ${stampForSubject}`
    : `Nova homologação F10 • ${safeValue(payload.fantasyName)} • ${cnpjDigits || "CNPJ"} • ${stampForSubject}`;

  try {
    const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: fromEmail, name: "HOMOLOGAÇÃO NF - F10" },
        to: [{ email: toEmail, name: "Homologação F10" }],
        ...(copyEmail ? { cc: [{ email: copyEmail, name: "Homologação F10" }] } : {}),
        subject,
        htmlContent,
        textContent,
        tags: isNotifyOnly ? ["cidade-nfse", "f10", "aviso"] : ["homologacao", "f10", "NF"],
        ...(attachments.length ? { attachment: attachments } : {}),
      }),
    });

    if (!brevoRes.ok) {
      const errorText = await brevoRes.text().catch(() => "");
      return json({ success: false, message: "Falha ao enviar e-mail via Brevo.", details: errorText.slice(0, 2000) }, { status: 502 });
    }

    const data = (await brevoRes.json().catch(() => null)) as { messageId?: string } | null;
    return json({ success: true, message: isNotifyOnly ? "Solicitação recebida e e-mail enviado com sucesso." : "Homologação recebida e e-mail enviado com sucesso.", messageId: data?.messageId ?? null });
  } catch {
    return json({ success: false, message: "Erro inesperado ao enviar e-mail. Tente novamente." }, { status: 500 });
  }
};
