import { env } from "$env/dynamic/private";
import { getGeneralOperationsSettings } from "$lib/server/settings/operationsSettingsRepository";

type TransactionalEmailRecipient = {
  email: string;
  name?: string;
};

type TransactionalEmailAttachment = {
  name: string;
  content: string;
};

let brevoAccountCheck: Promise<void> | null = null;

async function verifyBrevoAccount(apiKey: string): Promise<void> {
  const expectedUserId = env.BREVO_EXPECTED_ACCOUNT_USER_ID?.trim() ?? "";
  const expectedOrganizationId = env.BREVO_EXPECTED_ORGANIZATION_ID?.trim() ?? "";
  if (!expectedUserId && !expectedOrganizationId) return;

  brevoAccountCheck ??= (async () => {
    const response = await fetch("https://api.brevo.com/v3/account", {
      headers: {
        accept: "application/json",
        "api-key": apiKey,
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`BREVO_ACCOUNT_CHECK_FAILED:${response.status}`);
    }

    const account = await response.json() as Record<string, unknown>;
    const userId = String(account.user_id ?? "");
    const organizationId = String(account.organization_id ?? "");

    if (expectedUserId && userId !== expectedUserId) {
      throw new Error("BREVO_ACCOUNT_MISMATCH");
    }
    if (expectedOrganizationId && organizationId !== expectedOrganizationId) {
      throw new Error("BREVO_ORGANIZATION_MISMATCH");
    }
  })().catch((cause) => {
    brevoAccountCheck = null;
    throw cause;
  });

  await brevoAccountCheck;
}

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
  attachments?: TransactionalEmailAttachment[];
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

  await verifyBrevoAccount(apiKey);

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
      ...(input.attachments?.length ? { attachment: input.attachments } : {}),
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`BREVO_TRANSACTIONAL_EMAIL_FAILED:${response.status}`);
  }
}
