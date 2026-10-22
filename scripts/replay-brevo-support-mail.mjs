import postgres from "postgres";

// Dry run by default. Requeue only one verified unrouted support message at a time.
// Examples:
// node --env-file-if-exists=.env.production scripts/replay-brevo-support-mail.mjs
// node --env-file-if-exists=.env.production scripts/replay-brevo-support-mail.mjs --id=<UUID> --apply

const targetMailbox = "suporte@reply.f10.com.br";
const apply = process.argv.includes("--apply");
const idArg = process.argv.find((arg) => arg.startsWith("--id="));
const eventId = idArg?.slice("--id=".length) ?? "";
if (apply && !/^[0-9a-f-]{36}$/i.test(eventId)) {
  throw new Error("Informe --id=<UUID> junto com --apply para recuperar somente o evento selecionado.");
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL nao configurada.");
const db = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });

function recipient(value) {
  if (typeof value === "string") return value.trim().toLowerCase();
  if (!value || typeof value !== "object") return "";
  return String(value.Address ?? value.address ?? value.Email ?? value.email ?? "")
    .trim().toLowerCase();
}

function isUnroutedSupportEvent(payload) {
  const messages = Array.isArray(payload?.items) ? payload.items : [];
  return messages.some((item) => {
    if (!item || typeof item !== "object") return false;
    const addresses = [
      ...(Array.isArray(item.Recipients) ? item.Recipients : []),
      ...(Array.isArray(item.To) ? item.To : []),
    ].map(recipient);
    const support = addresses.includes(targetMailbox);
    const conflicting = addresses.some((address) => [
      "financeiro@reply.f10.com.br",
      "sucesso@reply.f10.com.br",
    ].includes(address));
    return support && !conflicting;
  });
}

try {
  const [queue] = await db`
    SELECT code, active FROM support_queues WHERE code = 'support' LIMIT 1
  `;
  if (!queue?.active) {
    throw new Error("A fila support nao existe ou esta inativa. Nao reprocesse eventos.");
  }

  const candidates = await db`
    SELECT id, received_at, raw_payload
    FROM support_email_inbound_events
    WHERE provider = 'brevo'
      AND event_type = 'inboundEmailProcessed'
      AND status = 'ignored'
      AND received_at >= NOW() - INTERVAL '7 days'
    ORDER BY received_at DESC
    LIMIT 250
  `;
  const matched = candidates.filter((row) => isUnroutedSupportEvent(row.raw_payload));
  console.table(matched.slice(0, 20).map((row) => ({
    id: row.id,
    horario: new Date(row.received_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    caixa: "Suporte",
  })));
  console.log("Candidatos elegiveis:", matched.length);

  if (!apply) {
    console.log("SIMULACAO. Nenhum evento foi alterado.");
  } else {
    if (!matched.some((row) => row.id === eventId)) {
      throw new Error("Evento nao encontrado entre os ignorados recentes ou possui outra rota. Nenhuma alteracao feita.");
    }
    const updated = await db`
      UPDATE support_email_inbound_events
      SET status = 'pending', attempt_count = 0,
          available_at = NOW(), locked_at = NULL,
          lease_expires_at = NULL,
          last_error_code = NULL, last_error_message = NULL,
          updated_at = NOW()
      WHERE id = ${eventId}::uuid
        AND provider = 'brevo'
        AND event_type = 'inboundEmailProcessed'
        AND status = 'ignored'
      RETURNING id
    `;
    console.log("Eventos reagendados:", updated.length);
    if (updated.length) console.log("Worker processara o evento. Verifique status e ticket_id apos a execucao.");
  }
} finally {
  await db.end();
}
