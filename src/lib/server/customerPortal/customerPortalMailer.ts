import { dev } from "$app/environment";
import { env } from "$env/dynamic/private";
import { getGeneralOperationsSettings } from "$lib/server/settings/operationsSettingsRepository";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function getCustomerPortalBaseUrl(requestOrigin: string): string {
  const configured = env.CUSTOMER_PORTAL_BASE_URL?.trim();
  const value = configured || (dev ? requestOrigin : "");
  if (!value) throw new Error("CUSTOMER_PORTAL_BASE_URL_NOT_CONFIGURED");

  const url = new URL(value);
  if (url.protocol !== "https:" && !(dev && url.protocol === "http:")) {
    throw new Error("CUSTOMER_PORTAL_BASE_URL_INVALID");
  }

  if (!dev && url.protocol !== "https:") {
    throw new Error("CUSTOMER_PORTAL_BASE_URL_REQUIRES_HTTPS");
  }

  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export async function sendCustomerPortalMagicLink(input: {
  email: string;
  name: string;
  magicUrl: string;
  expiresAt: Date;
}): Promise<void> {
  const general = await getGeneralOperationsSettings();
  const apiKey = env.BREVO_API_KEY?.trim();
  const senderEmail = general.supportSenderEmail || env.BREVO_SENDER_EMAIL?.trim() || "";
  const senderName = general.supportSenderName || env.BREVO_SENDER_NAME?.trim() || "F10 Software";

  if (!apiKey || !senderEmail) {
    throw new Error("CUSTOMER_PORTAL_EMAIL_NOT_CONFIGURED");
  }

  const safeName = escapeHtml(input.name || "cliente");
  const safeUrl = escapeHtml(input.magicUrl);
  const expiresAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(input.expiresAt);

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: input.email, name: input.name }],
      subject: "Acesso à área do cliente F10",
      htmlContent: `
        <div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6">
          <h2 style="color:#010D28">Acesso à área do cliente F10</h2>
          <p>Olá, ${safeName}.</p>
          <p>Use o botão abaixo para consultar seus chamados e responder ao suporte F10.</p>
          <p style="margin:28px 0"><a href="${safeUrl}" style="background:#000A57;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;display:inline-block">Acessar meus chamados</a></p>
          <p>Este link é de uso único e expira em 15 minutos, até ${escapeHtml(expiresAt)}.</p>
          <p>Se você não solicitou este acesso, ignore esta mensagem.</p>
        </div>
      `,
      textContent: `Olá, ${input.name || "cliente"}. Acesse seus chamados F10 por este link de uso único: ${input.magicUrl}. O link expira em 15 minutos.`,
    }),
  });

  if (!response.ok) {
    throw new Error(`CUSTOMER_PORTAL_EMAIL_FAILED_${response.status}`);
  }
}
