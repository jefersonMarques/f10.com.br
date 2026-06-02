// src/routes/api/nfse/nfse-interest/submit/+server.ts
import "$lib/server/load-env";
import { json } from "@sveltejs/kit";
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
  const value = process.env[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
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
    return json({ success: false, message: "Conteúdo inválido. Envie como application/json." }, { status: 415 });
  }

  const apiKey = getEnv("BREVO_API_KEY");
  const toEmail = getEnv("BREVO_MAIL_TO");
  const copyEmail = getEnv("BREVO_COPY_TO");
  const fromEmail = getEnv("BREVO_FROM_EMAIL");
  const siteUrl = getEnv("SITE_URL") || url.origin;

  if (!apiKey || !toEmail || !fromEmail) {
    return json({ success: false, message: "E-mail não configurado no servidor." }, { status: 500 });
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

  const subject = `Lead Nota Fiscal F10 • ${safeValue(payload.schoolName)} • ${safeValue(payload.city)}/${safeValue(payload.state)}`;

  try {
    const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: fromEmail, name: "F10 Software" },
        to: [{ email: toEmail, name: "Equipe F10" }],
        ...(copyEmail ? { cc: [{ email: copyEmail, name: "Equipe F10" }] } : {}),
        subject,
        htmlContent: buildHtml(payload, siteUrl),
        textContent: buildText(payload),
        tags: ["nota-fiscal", "lead", "f10"],
      }),
    });

    if (!brevoRes.ok) {
      const errorText = await brevoRes.text().catch(() => "");
      return json({ success: false, message: "Falha ao enviar e-mail via Brevo.", details: errorText.slice(0, 2000) }, { status: 502 });
    }

    const data = (await brevoRes.json().catch(() => null)) as { messageId?: string } | null;
    return json({ success: true, message: "Lead enviado com sucesso.", messageId: data?.messageId ?? null });
  } catch {
    return json({ success: false, message: "Erro inesperado ao enviar e-mail." }, { status: 500 });
  }
};
