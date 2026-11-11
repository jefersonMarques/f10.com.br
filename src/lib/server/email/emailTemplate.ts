const EMAIL_LOGO_URL = "https://f10.com.br/logo_f10.png";
const F10_WEBSITE_URL = "https://f10.com.br";

export function escapeEmailHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function renderSafeEmailMarkdown(value: string): string {
  const escaped = escapeEmailHtml(value);
  return escaped
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
    .replace(/\x60([^\x60\n]+)\x60/g, "<code>$1</code>");
}

type EmailAction = {
  label: string;
  href: string;
};

type EmailTicket = {
  number: number;
  subject: string;
  status?: string;
};

type EmailRatingLink = {
  score: number;
  href: string;
};

type EmailTemplateInput = {
  eyebrow?: string;
  title: string;
  greeting?: string;
  body: string[];
  markdownBody?: boolean;
  action?: EmailAction;
  secondaryAction?: EmailAction;
  ratingLinks?: EmailRatingLink[];
  footer?: string;
  ticket?: EmailTicket;
  quote?: { label: string; text: string };
};

function renderEmailAction(action: EmailAction): string {
  return `<table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin:22px 0 13px">
    <tr><td bgcolor="#071557" style="background:#071557;border-radius:5px">
      <a href="${escapeEmailHtml(action.href)}" style="display:inline-block;padding:12px 20px;border-radius:5px;background:#071557;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none">${escapeEmailHtml(action.label)}</a>
    </td></tr>
  </table>`;
}

function renderEmailTicket(ticket: EmailTicket): string {
  const status = ticket.status
    ? `<p style="margin:12px 0 0;font-size:12px;color:#287453">● ${escapeEmailHtml(ticket.status)}</p>`
    : "";

  return `<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:20px 0;border:1px solid #e6eaf1;border-radius:5px;background:#f6f8fb">
    <tr><td style="padding:17px 19px">
      <div style="font-size:11px;font-weight:700;letter-spacing:.06em;color:#78849a;text-transform:uppercase">Protocolo do atendimento</div>
      <div style="margin:4px 0 1px;font-size:30px;line-height:1.3;font-weight:700;color:#071752">#${ticket.number}</div>
      <div style="font-size:13px;line-height:1.5;color:#39465d">${escapeEmailHtml(ticket.subject)}</div>
      ${status}
    </td></tr>
  </table>`;
}

function renderEmailQuote(quote: NonNullable<EmailTemplateInput["quote"]>): string {
  return `<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:16px 0 22px;border-left:3px solid #ccd3df;background:#fafbfd">
    <tr><td style="padding:10px 15px">
      <div style="font-size:11px;letter-spacing:.04em;font-weight:700;text-transform:uppercase;color:#818c9e">${escapeEmailHtml(quote.label)}</div>
      <p style="margin:5px 0 0;font-size:13px;line-height:1.7;color:#505d70;white-space:pre-wrap;overflow-wrap:break-word">${escapeEmailHtml(quote.text)}</p>
    </td></tr>
  </table>`;
}

function renderRatingLinks(links: EmailRatingLink[]): string {
  const ordered = [...links].sort((left, right) => left.score - right.score);
  if (ordered.length !== 5 || ordered.some((item, index) => item.score !== index + 1)) {
    return "";
  }

  const stars = ordered.map(({ score, href }) =>
    `<a href="${escapeEmailHtml(href)}" aria-label="Avaliar com ${score} ${score === 1 ? "estrela" : "estrelas"}" style="display:inline-block;font-size:38px;line-height:1.3;font-family:Arial,sans-serif;color:#e5a12d;text-decoration:none;padding:0 1px">★</a>`
  ).join("");

  return `<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:19px 0;background:#f8f9fb;border:1px solid #edf0f4;border-radius:5px">
    <tr><td align="center" style="padding:19px 8px 18px">
      <div style="margin-bottom:7px;font-size:13px;font-weight:700;color:#344057">Avalie sua experiência</div>
      <div style="white-space:nowrap;font-size:0">${stars}</div>
      <div style="margin-top:8px;font-size:12px;color:#7c8595">Clique na estrela correspondente à sua nota</div>
    </td></tr>
  </table>`;
}

export function buildEmailHtml(input: EmailTemplateInput): string {
  const eyebrow = input.eyebrow
    ? `<div style="margin:0 0 9px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#d36a0e">${escapeEmailHtml(input.eyebrow)}</div>`
    : "";
  const greeting = input.greeting
    ? `<p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:#3a4558">${escapeEmailHtml(input.greeting)}</p>`
    : "";
  const body = input.body
    .map((paragraph) => `<p style="margin:0 0 14px;font-size:14px;line-height:1.75;color:#3a4558">${input.markdownBody ? renderSafeEmailMarkdown(paragraph) : escapeEmailHtml(paragraph)}</p>`)
    .join("");
  const ticket = input.ticket ? renderEmailTicket(input.ticket) : "";
  const quote = input.quote ? renderEmailQuote(input.quote) : "";
  const rating = input.ratingLinks ? renderRatingLinks(input.ratingLinks) : "";
  const action = input.action ? renderEmailAction(input.action) : "";
  const secondaryAction = input.secondaryAction
    ? `<p style="margin:12px 0 0;font-size:13px"><a href="${escapeEmailHtml(input.secondaryAction.href)}" style="color:#071557;font-weight:700;text-decoration:underline">${escapeEmailHtml(input.secondaryAction.label)}</a></p>`
    : "";
  const note = input.footer
    ? `<p style="margin:17px 0 0;font-size:12px;line-height:1.7;color:#798397">${escapeEmailHtml(input.footer)}</p>`
    : "";

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeEmailHtml(input.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f2f4f7;font-family:Arial,Helvetica,sans-serif;color:#202b3f">
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="width:100%;background:#f2f4f7">
      <tr><td align="center" style="padding:24px 12px">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #dce1e9;border-radius:6px">
          <tr><td bgcolor="#07142e" style="background:#07142e;padding:16px 26px">
            <table role="presentation" border="0" cellspacing="0" cellpadding="0"><tr>
              <td style="vertical-align:middle">
                <img src="${EMAIL_LOGO_URL}" alt="F10" width="108" style="display:block;width:108px;height:auto;max-height:58px;border:0">
              </td>
              <td style="vertical-align:middle;padding-left:15px">
                <span style="display:inline-block;border-left:1px solid #6c7890;padding-left:15px;font-size:13px;line-height:1.5;color:#dee4ee">Software Escolar</span>
              </td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:27px 30px 25px">
            ${eyebrow}
            <h1 style="margin:0 0 21px;font-size:24px;line-height:1.26;letter-spacing:-.3px;font-weight:700;color:#131d32">${escapeEmailHtml(input.title)}</h1>
            ${greeting}
            ${body}
            ${ticket}
            ${quote}
            ${rating}
            ${action}
            ${secondaryAction}
            ${note}
          </td></tr>
          <tr><td style="padding:17px 30px;background:#fbfcfe;border-top:1px solid #e8ebf0">
            <div style="font-size:12px;font-weight:700;color:#29354d">Equipe F10</div>
            <div style="margin-top:4px;font-size:11px;line-height:1.6;color:#808a9b">Central de Atendimento · Software Escolar</div>
          </td></tr>
        </table>
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:620px">
          <tr><td align="center" style="padding:15px 0 0">
            <a href="${F10_WEBSITE_URL}" style="font-size:12px;font-weight:700;color:#69768b;text-decoration:none">f10.com.br</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}
