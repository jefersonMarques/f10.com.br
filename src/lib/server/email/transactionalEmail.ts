import { env } from "$env/dynamic/private";
import { getGeneralOperationsSettings } from "$lib/server/settings/operationsSettingsRepository";

type TransactionalEmailRecipient = {
  email: string;
  name?: string;
};

function transactionalSenderEmail(): string {
  const domain = (env.BREVO_INBOUND_DOMAIN?.trim().toLowerCase() || "reply.f10.com.br")
    .replace(/^@+/, "");
  return `no-reply@${domain}`;
}

export async function sendTransactionalEmail(input: {
  to: TransactionalEmailRecipient;
  subject: string;
  textContent: string;
  htmlContent?: string;
  replyTo?: TransactionalEmailRecipient;
  sender?: TransactionalEmailRecipient;
  cc?: TransactionalEmailRecipient[];
  tags?: string[];
}): Promise<void> {
  const apiKey = env.BREVO_API_KEY?.trim() ?? "";
  const general = await getGeneralOperationsSettings();
  const senderEmail =
    input.sender?.email?.trim()
    || transactionalSenderEmail();
  const senderName =
    input.sender?.name?.trim()
    || general.supportSenderName
    || env.BREVO_SENDER_NAME?.trim()
    || "F10 Software";

  if (!apiKey || !senderEmail) {
    throw new Error("BREVO_TRANSACTIONAL_EMAIL_NOT_CONFIGURED");
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [
        {
          email: input.to.email,
          ...(input.to.name ? { name: input.to.name } : {}),
        },
      ],
      ...(input.cc?.length
        ? {
            cc: input.cc.map((recipient) => ({
              email: recipient.email,
              ...(recipient.name ? { name: recipient.name } : {}),
            })),
          }
        : {}),
      subject: input.subject,
      textContent: input.textContent,
      ...(input.htmlContent ? { htmlContent: input.htmlContent } : {}),
      ...(input.replyTo
        ? {
            replyTo: {
              email: input.replyTo.email,
              ...(input.replyTo.name ? { name: input.replyTo.name } : {}),
            },
          }
        : {}),
      ...(input.tags?.length ? { tags: input.tags } : {}),
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`BREVO_TRANSACTIONAL_EMAIL_FAILED:${response.status}`);
  }
}
