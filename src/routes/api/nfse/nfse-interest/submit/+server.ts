// src/routes/api/nfse/nfse-interest/submit/+server.ts
import { env } from "$env/dynamic/private";
import { json } from "@sveltejs/kit";
import { sendTransactionalEmail } from "$lib/server/email/transactionalEmail";
import { createNfseInterestTicket } from "$lib/server/leads/nfseInterestLeadService";
import type { RequestHandler } from "./$types";

type CityCheckStatus = "available" | "unavailable" | "error";

type NfseInterestPayload = {
  submissionKind?: string;
  submittedAt?: string;
  name?: string;
  email?: string;
  whatsapp?: string;
  schoolName?: string;
  city?: string;
  state?: string;
  ibgeCode?: string;
  cityCheckStatus?: CityCheckStatus;
  cityCheckMessage?: string;
  cityCheckCheckedAt?: string;
};

type EmailTheme = {
  title: string;
  subtitle: string;
  bg: string;
  border: string;
  titleColor: string;
  textColor: string;
};

function getEnv(key: string): string | undefined {
  const value = env[key]?.trim();
  return value || undefined;
}

function textValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function isCityCheckStatus(value: unknown): value is CityCheckStatus {
  return value === "available" || value === "unavailable" || value === "error";
}

function escapeHtml(value: unknown): string {
  const str = value == null ? "" : String(value);
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeValue(value: unknown): string {
  const str = typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
  return str || "-";
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

function formatCityStatus(status: unknown): string {
  if (status === "available") return "Disponível";
  if (status === "unavailable") return "Não elegível / ainda não disponível";
  if (status === "error") return "Erro na verificação";
  return safeValue(status);
}

function getTheme(status: unknown): EmailTheme {
  if (status === "available") {
    return {
      title: "Cidade elegível para emissão de notas fiscais",
      subtitle: "O lead informou uma cidade que está na cobertura atual do recurso de Nota Fiscal.",
      bg: "#ECFDF3",
      border: "#ABEFC6",
      titleColor: "#067647",
      textColor: "#075E45",
    };
  }

  if (status === "unavailable") {
    return {
      title: "Cidade ainda não elegível para emissão de notas fiscais",
      subtitle: "O lead demonstrou interesse no recurso, mas a cidade informada ainda não aparece na cobertura atual.",
      bg: "#FEF3F2",
      border: "#FECDCA",
      titleColor: "#B42318",
      textColor: "#912018",
    };
  }

  return {
    title: "Lead interessado em Nota Fiscal — verificação com erro",
    subtitle: "O lead demonstrou interesse, mas a verificação automática da cidade falhou. A equipe deve avaliar manualmente.",
    bg: "#FEF3F2",
    border: "#FECDCA",
    titleColor: "#B42318",
    textColor: "#912018",
  };
}

function renderRows(rows: Array<[string, string]>): string {
  return rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:10px 12px; border-top:1px solid rgba(0,0,0,0.10); border-right:1px solid rgba(0,0,0,0.10); color:rgba(0,0,0,0.62); font-size:12px; width:210px;">
            ${escapeHtml(label)}
          </td>
          <td style="padding:10px 12px; border-top:1px solid rgba(0,0,0,0.10); color:#111; font-size:13px;">
            ${escapeHtml(value)}
          </td>
        </tr>
      `,
    )
    .join("");
}

function buildText(payload: NfseInterestPayload): string {
  return [
    "Lead interessado em Nota Fiscal — F10",
    `Recebido em: ${formatDateTimeBR(payload.submittedAt)}`,
    "",
    "=== Validação da cidade ===",
    `Status: ${formatCityStatus(payload.cityCheckStatus)}`,
    `Mensagem: ${safeValue(payload.cityCheckMessage)}`,
    `Cidade: ${safeValue(payload.city)}`,
    `UF: ${safeValue(payload.state)}`,
    "",
    "=== Dados do lead ===",
    `Nome: ${safeValue(payload.name)}`,
    `E-mail: ${safeValue(payload.email)}`,
    `WhatsApp: ${safeValue(payload.whatsapp)}`,
    `Escola: ${safeValue(payload.schoolName)}`,
  ].join("\n");
}

function buildHtml(payload: NfseInterestPayload, siteUrl: string): string {
  const theme = getTheme(payload.cityCheckStatus);
  const rows: Array<[string, string]> = [
    ["Nome", safeValue(payload.name)],
    ["E-mail", safeValue(payload.email)],
    ["WhatsApp", safeValue(payload.whatsapp)],
    ["Nome da escola", safeValue(payload.schoolName)],
    ["Cidade", safeValue(payload.city)],
    ["UF", safeValue(payload.state)],
    ["Status da cidade", formatCityStatus(payload.cityCheckStatus)],
    ["Mensagem", safeValue(payload.cityCheckMessage)],
    ["Recebido em", formatDateTimeBR(payload.submittedAt)],
  ];

  return `
<!doctype html>
<html lang="pt-BR">
  <body style="margin:0; padding:0; background:#FFF7EF; font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF7EF; padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="680" cellpadding="0" cellspacing="0" style="max-width:680px; width:100%;">
            <tr>
              <td style="padding:18px;">
                <img src="${escapeHtml(`${siteUrl}/logo_f10.png`)}" alt="F10" height="34" style="display:block; height:34px; width:auto;" />
                <div style="margin-top:14px; font-size:22px; font-weight:800; color:#ea6d0b;">Lead interessado em Nota Fiscal</div>
                <div style="margin-top:6px; color:rgba(0,0,0,0.62); font-size:13px;">Alguém solicitou mais informações sobre o recurso de Nota Fiscal no F10.</div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 18px 18px 18px;">
                <div style="background:#fff; border:1px solid rgba(0,0,0,0.10); border-radius:22px; padding:18px;">
                  <div style="background:${theme.bg}; border:1px solid ${theme.border}; border-radius:16px; padding:16px; margin-bottom:14px;">
                    <div style="font-size:16px; line-height:1.35; font-weight:800; color:${theme.titleColor};">${escapeHtml(theme.title)}</div>
                    <div style="margin-top:6px; font-size:13px; line-height:1.55; color:${theme.textColor};">${escapeHtml(theme.subtitle)}</div>
                  </div>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(0,0,0,0.10); border-radius:16px; overflow:hidden; background:#fff;">
                    <tr><td colspan="2" style="padding:14px 16px; background:#FFF7EF;"><div style="font-size:14px; font-weight:700; color:#ea6d0b;">Dados enviados</div></td></tr>
                    ${renderRows(rows)}
                  </table>
                </div>
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

export const POST: RequestHandler = async ({ request, url }) => {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    return json(
      { success: false, message: "Conteúdo inválido. Envie como application/json." },
      { status: 415 },
    );
  }

  let payload: NfseInterestPayload;
  try {
    payload = (await request.json()) as NfseInterestPayload;
  } catch {
    return json({ success: false, message: "JSON inválido." }, { status: 400 });
  }

  if (payload.submissionKind !== "nfse_interest_lead") {
    return json({ success: false, message: "Tipo de solicitação inválido." }, { status: 400 });
  }

  const submittedAt = textValue(payload.submittedAt);
  const name = textValue(payload.name);
  const email = textValue(payload.email).toLowerCase();
  const whatsapp = textValue(payload.whatsapp);
  const schoolName = textValue(payload.schoolName);
  const city = textValue(payload.city);
  const state = textValue(payload.state).toUpperCase();
  const ibgeCode = textValue(payload.ibgeCode);
  const cityCheckMessage = textValue(payload.cityCheckMessage);

  if (
    !submittedAt
    || Number.isNaN(new Date(submittedAt).getTime())
    || !name
    || !isValidEmail(email)
    || !whatsapp
    || !schoolName
    || !city
    || state.length !== 2
    || !isCityCheckStatus(payload.cityCheckStatus)
  ) {
    return json({ success: false, message: "Revise os dados informados." }, { status: 400 });
  }

  const normalizedPayload = {
    submittedAt,
    name,
    email,
    whatsapp,
    schoolName,
    city,
    state,
    ibgeCode,
    cityCheckStatus: payload.cityCheckStatus,
    cityCheckMessage,
  };

  let ticket;
  try {
    ticket = await createNfseInterestTicket(normalizedPayload);
  } catch (cause) {
    console.error("[nfse-interest.ticket]", {
      causeType: cause instanceof Error ? cause.name : typeof cause,
      errorCode: cause instanceof Error ? cause.message : "NFSE_INTEREST_TICKET_FAILED",
    });
    return json(
      { success: false, message: "Não foi possível registrar seu interesse agora." },
      { status: 500 },
    );
  }

  const toEmail = getEnv("BREVO_MAIL_TO");
  const copyEmail = getEnv("BREVO_COPY_TO");
  const siteUrl = getEnv("SITE_URL") || url.origin;
  const subject =
    `[Ticket #${ticket.ticketNumber}] Lead Nota Fiscal F10 • ${schoolName} • ${city}/${state}`;

  let emailSent = false;
  if (toEmail && !ticket.deduplicated) {
    try {
      await sendTransactionalEmail({
        to: { email: toEmail, name: "Equipe F10" },
        ...(copyEmail
          ? { cc: [{ email: copyEmail, name: "Equipe F10" }] }
          : {}),
        replyTo: { email, name },
        subject,
        htmlContent: buildHtml(normalizedPayload, siteUrl),
        textContent: buildText(normalizedPayload),
        tags: ["nota-fiscal", "lead", "f10"],
      });
      emailSent = true;
    } catch (cause) {
      console.error("[nfse-interest.email]", {
        ticketId: ticket.ticketId,
        errorCode: cause instanceof Error ? cause.message : "NFSE_INTEREST_EMAIL_FAILED",
      });
    }
  }

  return json({
    success: true,
    message: "Interesse registrado com sucesso.",
    ticketId: ticket.ticketId,
    ticketNumber: ticket.ticketNumber,
    deduplicated: ticket.deduplicated,
    emailSent,
  });
};

