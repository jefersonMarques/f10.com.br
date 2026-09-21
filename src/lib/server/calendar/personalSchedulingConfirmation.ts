import { env } from "$env/dynamic/private";
import { getGeneralOperationsSettings } from "$lib/server/settings/operationsSettingsRepository";

export type PersonalSchedulingCalendarEvent = {
  id: string;
  title: string;
  hostName: string;
  customerName: string;
  customerEmail: string;
  startAt: Date;
  endAt: Date;
  timeZone: string;
  googleIcalUid: string | null;
  googleMeetUrl: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeIcs(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

function utcIcsDate(value: Date): string {
  return value
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

export function buildPersonalSchedulingIcs(
  event: PersonalSchedulingCalendarEvent,
): string {
  const description = event.googleMeetUrl
    ? `Google Meet: ${event.googleMeetUrl}`
    : "Agendamento F10 confirmado.";

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//F10 Software//Agendamento//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcs(event.googleIcalUid || `${event.id}@f10.com.br`)}`,
    `DTSTAMP:${utcIcsDate(new Date())}`,
    `DTSTART:${utcIcsDate(event.startAt)}`,
    `DTEND:${utcIcsDate(event.endAt)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    event.googleMeetUrl ? `LOCATION:${escapeIcs("Google Meet")}` : "",
    event.googleMeetUrl ? `URL:${escapeIcs(event.googleMeetUrl)}` : "",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].filter(Boolean).join("\r\n");
}

export async function sendPersonalSchedulingConfirmation(
  event: PersonalSchedulingCalendarEvent,
): Promise<void> {
  const general = await getGeneralOperationsSettings();
  const apiKey = env.BREVO_API_KEY?.trim();
  const senderEmail =
    general.supportSenderEmail || env.BREVO_SENDER_EMAIL?.trim() || "";
  const senderName =
    general.supportSenderName || env.BREVO_SENDER_NAME?.trim() || "F10 Software";

  if (!apiKey || !senderEmail) {
    throw new Error("SCHEDULING_EMAIL_NOT_CONFIGURED");
  }

  const dateTime = new Intl.DateTimeFormat("pt-BR", {
    timeZone: event.timeZone,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(event.startAt);

  const safeCustomer = escapeHtml(event.customerName || "cliente");
  const safeTitle = escapeHtml(event.title);
  const safeHost = escapeHtml(event.hostName);
  const safeDateTime = escapeHtml(dateTime);
  const safeMeetUrl = event.googleMeetUrl ? escapeHtml(event.googleMeetUrl) : "";
  const meetButton = safeMeetUrl
    ? `<p style="margin:26px 0"><a href="${safeMeetUrl}" style="background:#000A57;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;display:inline-block;font-weight:700">Acessar reunião</a></p>`
    : "";
  const textMeet = event.googleMeetUrl
    ? ` Link da reunião: ${event.googleMeetUrl}.`
    : "";

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: event.customerEmail, name: event.customerName }],
      subject: `Agendamento confirmado: ${event.title}`,
      htmlContent: `
        <div style="font-family:Arial,sans-serif;color:#202637;line-height:1.65;max-width:620px;margin:auto">
          <div style="padding:28px;border:1px solid #e5e7eb;border-radius:18px">
            <div style="font-size:12px;font-weight:700;letter-spacing:.08em;color:#ea6d0b;text-transform:uppercase">Agendamento confirmado</div>
            <h2 style="color:#010d28;margin:10px 0 8px">${safeTitle}</h2>
            <p>Olá, ${safeCustomer}.</p>
            <p><strong>${safeDateTime}</strong><br>Com ${safeHost}</p>
            ${meetButton}
            <p style="font-size:12px;color:#737989">O arquivo <strong>agendamento-f10.ics</strong> está anexado para adicionar este compromisso à sua agenda.</p>
          </div>
        </div>
      `,
      textContent: `Olá, ${event.customerName}. Seu agendamento "${event.title}" com ${event.hostName} está confirmado para ${dateTime}.${textMeet} O arquivo agendamento-f10.ics está anexado para adicionar o compromisso à sua agenda.`,
      attachment: [
        {
          content: Buffer.from(buildPersonalSchedulingIcs(event), "utf8").toString("base64"),
          name: "agendamento-f10.ics",
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`SCHEDULING_EMAIL_FAILED_${response.status}`);
  }
}
