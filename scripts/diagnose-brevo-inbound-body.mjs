import postgres from "postgres";

// Read-only, never prints bodies, addresses or credentials.
const ticketNumber = Number(process.argv.find(x => x.startsWith("--ticket="))?.split("=")[1] ?? 40);
if (!Number.isInteger(ticketNumber) || ticketNumber < 1) throw new Error("Numero de ticket invalido");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL nao configurada");
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const terms = ["mensagem com anexo", "negrito", "italico", "colorido"];
const normalize = value => String(value ?? "").normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
const fields = ["ExtractedMarkdownMessage", "RawTextBody", "RawHtmlBody"];

try {
  const records = await sql`
    SELECT t.ticket_number, m.external_message_id, m.body
    FROM tickets t
    JOIN ticket_messages m ON m.ticket_id = t.id
    WHERE t.ticket_number = ${ticketNumber}
      AND m.channel = 'email'
      AND m.author_type = 'customer'
      AND m.external_message_id IS NOT NULL
    ORDER BY m.created_at DESC
    LIMIT 10
  `;
  for (const record of records) {
    const [event] = await sql`
      SELECT raw_payload, received_at
      FROM support_email_inbound_events
      WHERE provider = 'brevo'
        AND event_type = 'inboundEmailProcessed'
        AND raw_payload -> 'items' @> ${JSON.stringify([{ MessageId: record.external_message_id }])}::jsonb
      ORDER BY received_at DESC LIMIT 1
    `;
    const item = event?.raw_payload?.items?.find(v => v?.MessageId === record.external_message_id);
    console.log({ ticket: ticketNumber, eventoOriginalEncontrado: Boolean(item) });
    if (!item) continue;
    console.table([...fields, "salvoNoTicket"].map(field => {
      const content = field === "salvoNoTicket" ? record.body : item[field];
      const normalized = normalize(content);
      return {
        origem: field,
        caracteres: String(content ?? "").length,
        negrito: normalized.includes("negrito"),
        italico: normalized.includes("italico"),
        colorido: normalized.includes("colorido"),
      };
    }));
  }
  if (!records.length) console.log("Ticket sem mensagem inbound identificada.");
} finally {
  await sql.end();
}
