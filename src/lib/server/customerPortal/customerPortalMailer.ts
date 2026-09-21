import { dev } from "$app/environment";
import { env } from "$env/dynamic/private";
import { buildEmailHtml } from "$lib/server/email/emailTemplate";
import { sendTransactionalEmail } from "$lib/server/email/transactionalEmail";

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
  const expiresAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(input.expiresAt);

  try {
    await sendTransactionalEmail({
      to: { email: input.email, name: input.name },
      subject: "Acesso à área do cliente F10",
      textContent: [
        `Olá, ${input.name || "cliente"}.`,
        "",
        "Use o link abaixo para consultar seus chamados e responder ao suporte F10.",
        input.magicUrl,
        "",
        `O link é de uso único e expira em 15 minutos, até ${expiresAt}.`,
      ].join("\n"),
      htmlContent: buildEmailHtml({
        eyebrow: "Área do Cliente",
        title: "Acesse seus chamados F10",
        greeting: `Olá, ${input.name || "cliente"}.`,
        body: [
          "Use o botão abaixo para consultar seus chamados e responder ao suporte F10.",
          `Este link é de uso único e expira em 15 minutos, até ${expiresAt}.`,
        ],
        action: { label: "Acessar meus chamados", href: input.magicUrl },
        footer: "Se você não solicitou este acesso, ignore esta mensagem.",
      }),
    });
  } catch {
    throw new Error("CUSTOMER_PORTAL_EMAIL_FAILED");
  }
}
