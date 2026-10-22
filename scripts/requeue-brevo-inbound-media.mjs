import postgres from "postgres";

// Read-only by default. Pass --apply to schedule existing messages for media-only
// reconciliation through the normal worker. Ticket/message keys remain unchanged.
const apply = process.argv.includes("--apply");
const limitArgument = process.argv.find((arg) => arg.startsWith("--limit="));
const requested = Number(limitArgument?.slice("--limit=".length) ?? 200);
if (!Number.isInteger(requested) || requested < 1 || requested > 1000) {
  throw new Error("Use --limit=1..1000");
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL ausente");

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
try {
  const events = await sql`
    SELECT id, received_at, ticket_id, raw_payload
    FROM support_email_inbound_events
    WHERE provider = 'brevo'
      AND event_type = 'inboundEmailProcessed'
      AND status = 'processed'
      AND ticket_id IS NOT NULL
    ORDER BY received_at DESC
    LIMIT ${requested}
  `;

  const candidates = events.filter((event) =>
    Array.isArray(event.raw_payload?.items) &&
    event.raw_payload.items.some((item) =>
      (Array.isArray(item?.Attachments) && item.Attachments.length > 0) ||
      (typeof item?.RawHtmlBody === "string" && /<img\b/i.test(item.RawHtmlBody))
    )
  );
  const files = candidates.reduce((total, event) => total +
    event.raw_payload.items.reduce((n, item) => n +
      (Array.isArray(item?.Attachments) ? item.Attachments.length : 0), 0), 0);

  console.log({
    modo: apply ? "AGENDANDO" : "SIMULACAO",
    examinados: events.length,
    mensagensComMidia: candidates.length,
    referenciasAnexo: files,
    periodo: candidates.length > 0
      ? {
          maisAntigo: candidates.at(-1).received_at,
          maisRecente: candidates[0].received_at,
        }
      : null,
  });

  if (!apply) {
    console.log("Nenhuma alteração efetuada. Para aplicar, acrescente --apply.");
  } else if (candidates.length > 0) {
    const ids = candidates.map((event) => event.id);
    const updated = await sql`
      UPDATE support_email_inbound_events
      SET status = 'pending',
          attempt_count = 0,
          available_at = NOW(),
          locked_at = NULL,
          lease_expires_at = NULL,
          last_error_code = NULL,
          last_error_message = NULL,
          updated_at = NOW()
      WHERE id = ANY(${ids}::uuid[])
        AND status = 'processed'
      RETURNING id
    `;
    console.log({ eventosAgendados: updated.length });
    console.log("O worker fará a recuperação sem recriar tickets.");
  }
} finally {
  await sql.end();
}
