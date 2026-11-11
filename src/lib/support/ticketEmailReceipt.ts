type Sender = {
  email: string;
  name: string | null;
};

export type TicketEmailReceiptContent = {
  recipientEmail: string;
  recipientName: string | null;
  subject: string;
  greeting: string;
  description: string[];
  originalExcerpt: string | null;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AUTOMATED_MAILBOX_PATTERN = /^(?:no[._-]?reply|do[._-]?not[._-]?reply|mailer[._-]?daemon|postmaster|bounce(?:s)?|auto[._-]?reply)(?:[+._-].*)?$/i;
const F10_INBOUND_DOMAIN = "reply.f10.com.br";
const MAX_QUOTE_LENGTH = 240;

export function isEligibleTicketReceiptSender(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(normalized)) return false;

  const [localPart, domain] = normalized.split("@");
  if (AUTOMATED_MAILBOX_PATTERN.test(localPart)) return false;

  return domain !== F10_INBOUND_DOMAIN;
}

export function excerptTicketEmail(text: string): string | null {
  const sanitized = text
    .replace(/\r\n?/g, "\n")
    .replace(/\s+/g, " ")
    .trim();

  if (!sanitized) return null;
  if (sanitized.length <= MAX_QUOTE_LENGTH) return sanitized;

  return `${sanitized.slice(0, MAX_QUOTE_LENGTH - 1).trimEnd()}…`;
}

export function createTicketEmailReceiptContent(input: {
  sender: Sender;
  ticketNumber: number;
  subject: string;
  messageBody: string;
}): TicketEmailReceiptContent | null {
  if (!isEligibleTicketReceiptSender(input.sender.email)) return null;

  const recipientName = input.sender.name?.trim() || null;
  const greeting = recipientName ? `Olá, ${recipientName}.` : "Olá!";

  return {
    recipientEmail: input.sender.email.trim().toLowerCase(),
    recipientName,
    subject: `[#${input.ticketNumber}] Recebemos sua solicitação — ${input.subject}`,
    greeting,
    description: [
      "Sua mensagem chegou à F10 e foi registrada em nossa central de atendimento.",
      "Nossa equipe irá analisar sua solicitação. Para acrescentar informações, basta responder a este e-mail.",
    ],
    originalExcerpt: excerptTicketEmail(input.messageBody),
  };
}
