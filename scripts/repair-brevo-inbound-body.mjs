import postgres from "postgres";
import { selectInboundEmailBody } from "../src/lib/server/support/emailInboundBody.ts";

// Dry-run by default. Never creates tickets, sends email, or triggers notifications.
// Example:
// node --experimental-strip-types --env-file-if-exists=.env.production scripts/repair-brevo-inbound-body.mjs --ticket=40
// node --experimental-strip-types --env-file-if-exists=.env.production scripts/repair-brevo-inbound-body.mjs --ticket=40 --apply
const ticketNumber = Number(process.argv.find(x => x.startsWith("--ticket="))?.split("=")[1]);
const apply = process.argv.includes("--apply");
const requestedId = process.argv.find(x => x.startsWith("--message="))?.split("=")[1] || "";
if (!Number.isInteger(ticketNumber) || ticketNumber < 1) {
  throw new Error("Selecione um ticket com --ticket=40.");
}
if (requestedId && !/^[a-f0-9-]{36}$/i.test(requestedId)) {
  throw new Error("Identificador de mensagem invalido.");
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL nao configurada");

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
function words(value) {
  return new Set(String(value ?? "")
    .replace(/!?\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/[^\s]+/gi, " ")
    .normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
    .match(/[\p{L}\p{N}]{2,}/gu) ?? []);
}

try {
  const records = await sql`
    SELECT m.id, m.external_message_id, m.body
    FROM tickets t
    INNER JOIN ticket_messages m ON m.ticket_id = t.id
    WHERE t.ticket_number = ${ticketNumber}
      AND m.channel = 'email'
      AND m.author_type = 'customer'
      AND m.external_message_id IS NOT NULL
    ORDER BY m.created_at DESC
    LIMIT 30
  `;
  const candidates = [];
  for (const message of records) {
    const [event] = await sql`
      SELECT raw_payload
      FROM support_email_inbound_events
      WHERE provider = 'brevo'
        AND event_type = 'inboundEmailProcessed'
        AND raw_payload -> 'items' @> ${JSON.stringify([{ MessageId: message.external_message_id }])}::jsonb
      ORDER BY received_at DESC LIMIT 1
    `;
    const item = event?.raw_payload?.items?.find(v => v?.MessageId === message.external_message_id);
    if (!item) continue;
    const next = selectInboundEmailBody({
      markdown: item.ExtractedMarkdownMessage,
      plain: item.RawTextBody,
      html: item.RawHtmlBody,
    });
    const oldWords = words(message.body);
    const newWords = words(next.text);
    const added = [...newWords].filter(word => !oldWords.has(word));
    const missing = [...oldWords].filter(word => !newWords.has(word));
    if (!added.length || missing.length || next.text.length <= message.body.length) continue;
    candidates.push({
      id: message.id,
      before: message.body,
      after: next.text,
      source: next.source,
      addedWords: added.length,
    });
  }
  console.table(candidates.map(x => ({
    mensagem: x.id,
    caracteresAntes: x.before.length,
    caracteresDepois: x.after.length,
    palavrasRecuperadas: x.addedWords,
    fonte: x.source,
  })));
  console.log({ ticket: ticketNumber, modo: apply ? "APLICAR" : "SIMULACAO", candidatos: candidates.length });

  if (apply) {
    const target = requestedId
      ? candidates.find(row => row.id === requestedId)
      : candidates.length === 1 ? candidates[0] : null;
    if (!target) {
      throw new Error("Sem candidato unico. Use --message=<UUID> para escolher a mensagem explicitamente.");
    }
    const updated = await sql`
      UPDATE ticket_messages
      SET body = ${target.after},
          external_metadata = jsonb_set(
            COALESCE(external_metadata, '{}'::jsonb),
            '{inboundBodySource}',
            to_jsonb(${target.source}::text),
            true
          ),
          updated_at = NOW()
      WHERE id = ${target.id}::uuid
        AND channel = 'email'
        AND author_type = 'customer'
        AND body = ${target.before}
      RETURNING id
    `;
    console.log({ mensagensCorrigidas: updated.length });
  } else {
    console.log("Nenhum registro alterado. Use --apply somente depois de conferir a simulacao.");
  }
} finally {
  await sql.end();
}
