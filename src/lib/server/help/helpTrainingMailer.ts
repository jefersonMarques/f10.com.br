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
  const general = await getGeneralOperationsSettings();
  const apiKey = env.BREVO_API_KEY?.trim();
  const senderEmail = general.supportSenderEmail || env.BREVO_SENDER_EMAIL?.trim() || "";
  const senderName = general.supportSenderName || env.BREVO_SENDER_NAME?.trim() || "F10 Software";
  if (!apiKey || !senderEmail) throw new Error("TRAINING_EMAIL_NOT_CONFIGURED");

  const safeName = escapeHtml(input.name || "");
  const safeTitle = escapeHtml(input.trainingTitle);
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
      subject: `Seu treinamento F10: ${input.trainingTitle}`,
      htmlContent: `
        <div style="font-family:Arial,sans-serif;color:#202637;line-height:1.65;max-width:620px;margin:auto">
          <div style="padding:28px;border:1px solid #e5e7eb;border-radius:18px">
            <div style="font-size:12px;font-weight:700;letter-spacing:.08em;color:#ea6d0b;text-transform:uppercase">Aprender fazendo</div>
            <h2 style="color:#010d28;margin:10px 0 8px">${safeTitle}</h2>
            <p>Olá, ${safeName || "tudo bem"}.</p>
            <p>Preparamos uma sequência de ações curtas para você aprender o F10 usando o próprio sistema. Você verá somente uma ação de cada vez.</p>
            <p style="margin:28px 0"><a href="${safeUrl}" style="background:#000a57;color:#fff;text-decoration:none;padding:13px 20px;border-radius:12px;display:inline-block;font-weight:700">Pronto para começar?</a></p>
            <p style="font-size:12px;color:#737989">Este convite é individual e expira em ${escapeHtml(expiresAt)}. Depois do primeiro acesso, o link não poderá ser reutilizado.</p>
          </div>
        </div>
      `,
      textContent: `Olá, ${input.name}. Seu treinamento F10 "${input.trainingTitle}" está pronto. Comece por este link individual: ${input.magicUrl}. O convite expira em ${expiresAt}.`,
    }),
  });

  if (!response.ok) throw new Error(`TRAINING_EMAIL_FAILED_${response.status}`);
}
