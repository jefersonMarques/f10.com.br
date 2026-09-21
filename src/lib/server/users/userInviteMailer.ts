import { buildEmailHtml } from "$lib/server/email/emailTemplate";
import { sendTransactionalEmail } from "$lib/server/email/transactionalEmail";

export async function sendManagedUserInviteEmail(input: {
  email: string;
  name: string;
  inviteUrl: string;
  expiresAt: Date;
}): Promise<void> {
  const expiresAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(input.expiresAt);

  await sendTransactionalEmail({
    to: { email: input.email, name: input.name },
    subject: "Ative seu acesso ao F10 Operations",
    textContent: [
      `Olá, ${input.name}.`,
      "",
      "Seu acesso ao F10 Operations foi criado.",
      `Ative sua conta: ${input.inviteUrl}`,
      "",
      `O convite expira em ${expiresAt}.`,
    ].join("\n"),
    htmlContent: buildEmailHtml({
      eyebrow: "F10 Operations",
      title: "Seu acesso está pronto",
      greeting: `Olá, ${input.name}.`,
      body: [
        "Seu usuário foi criado no F10 Operations.",
        "Use o botão abaixo para definir sua senha e concluir a ativação.",
      ],
      action: { label: "Ativar minha conta", href: input.inviteUrl },
      footer: `Este convite é individual e expira em ${expiresAt}.`,
    }),
  });
}
