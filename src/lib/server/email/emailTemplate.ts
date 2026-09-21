export function escapeEmailHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function buildEmailHtml(input: {
  eyebrow?: string;
  title: string;
  greeting?: string;
  body: string[];
  action?: { label: string; href: string };
  footer?: string;
}): string {
  const eyebrow = input.eyebrow
    ? `<div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#EA6D0B;margin-bottom:10px">${escapeEmailHtml(input.eyebrow)}</div>`
    : "";
  const greeting = input.greeting
    ? `<p style="margin:0 0 16px">${escapeEmailHtml(input.greeting)}</p>`
    : "";
  const body = input.body
    .map((paragraph) => `<p style="margin:0 0 14px">${escapeEmailHtml(paragraph)}</p>`)
    .join("");
  const action = input.action
    ? `<div style="margin:26px 0"><a href="${escapeEmailHtml(input.action.href)}" style="display:inline-block;background:#000A57;color:#fff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:12px">${escapeEmailHtml(input.action.label)}</a></div>`
    : "";
  const footer = input.footer
    ? `<p style="margin:24px 0 0;color:#8A91A1;font-size:12px;line-height:1.6">${escapeEmailHtml(input.footer)}</p>`
    : "";

  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#F5F6FA;font-family:Arial,sans-serif;color:#252C3D">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F5F6FA;padding:28px 12px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#FFFFFF;border:1px solid #E2E5ED;border-radius:20px;overflow:hidden">
            <tr>
              <td style="background:#010D28;padding:22px 28px">
                <div style="font-size:20px;font-weight:700;color:#FFFFFF">F10</div>
                <div style="font-size:12px;color:#B8C0CF;margin-top:4px">Software e atendimento</div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 28px;line-height:1.65;font-size:14px">
                ${eyebrow}
                <h1 style="margin:0 0 18px;font-size:24px;line-height:1.25;color:#11182C">${escapeEmailHtml(input.title)}</h1>
                ${greeting}
                ${body}
                ${action}
                ${footer}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
