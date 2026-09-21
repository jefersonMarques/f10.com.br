import { dev } from "$app/environment";
import { env } from "$env/dynamic/private";
import { buildEmailHtml } from "$lib/server/email/emailTemplate";
import { sendTransactionalEmail } from "$lib/server/email/transactionalEmail";

export function getTrainingBaseUrl(requestOrigin: string): string {
  const configured = env.TRAINING_BASE_URL?.trim() || env.CUSTOMER_PORTAL_BASE_URL?.trim();
  const value = configured || (dev ? requestOrigin : "");
  if (!value) throw new Error("TRAINING_BASE_URL_NOT_CONFIGURED");

  const url = new URL(value);
  if (url.protocol !== "https:" && !(dev && url.protocol === "http:")) {
    throw new Error("TRAINING_BASE_URL_INVALID");
  }

  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export async function sendHelpTrainingInvite(input: {
  email: string;
  name: string;
  trainingTitle: string;
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
      subject: `Seu treinamento F10: ${input.trainingTitle}`,
      textContent: [
        `Olá, ${input.name || "tudo bem"}.`,
        "",
        `Seu treinamento “${input.trainingTitle}” está pronto.`,
        "Comece pelo link individual abaixo:",
        input.magicUrl,
        "",
        `O convite expira em ${expiresAt}.`,
      ].join("\n"),
      htmlContent: buildEmailHtml({
        eyebrow: "Aprender fazendo",
        title: input.trainingTitle,
        greeting: `Olá, ${input.name || "tudo bem"}.`,
        body: [
          "Preparamos uma sequência curta para você aprender o F10 usando o próprio sistema.",
          "Você verá somente uma ação de cada vez.",
        ],
        action: { label: "Começar treinamento", href: input.magicUrl },
        footer: `Este convite é individual e expira em ${expiresAt}.`,
      }),
    });
  } catch {
    throw new Error("TRAINING_EMAIL_FAILED");
  }
}
