import postgres from "postgres";

function databaseUrl() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL_MISSING");
  return url;
}

function safeInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

async function inspectTicketCreation(tx) {
  const [ticket] = await tx.unsafe(
    "SELECT count(*)::int AS total, max(ticket_number)::text AS maximum_number " +
    "FROM tickets",
  );
  const [identity] = await tx.unsafe(
    "SELECT attidentity AS generation FROM pg_attribute " +
    "WHERE attrelid = 'public.tickets'::regclass " +
    "AND attname = 'ticket_number' AND NOT attisdropped",
  );
  const [sequence] = await tx.unsafe(
    "SELECT pg_get_serial_sequence('public.tickets', 'ticket_number') AS name",
  );
  const [sequenceState] = sequence?.name
    ? await tx.unsafe(
        "SELECT last_value::text AS last_value FROM pg_sequences " +
        "WHERE schemaname || '.' || sequencename = $1",
        [sequence.name],
      )
    : [];

  const [queues] = await tx.unsafe(
    "SELECT count(*)::int AS total FROM support_queues WHERE active = true",
  );
  const [schema] = await tx.unsafe(
    "SELECT to_regclass('public.customer_contract_access') IS NOT NULL AS contact_access, " +
    "to_regclass('public.ticket_contract_links') IS NOT NULL AS ticket_contracts, " +
    "to_regclass('public.ticket_participants') IS NOT NULL AS participants, " +
    "to_regclass('public.ticket_f10_contract_links') IS NOT NULL AS f10_links",
  );

  const maximumNumber = safeInteger(ticket.maximum_number);
  const sequenceLastValue = safeInteger(sequenceState?.last_value);
  const sequenceBehind = sequenceLastValue !== null && maximumNumber !== null
    ? sequenceLastValue < maximumNumber
    : null;

  return {
    state: "ticket_creation_diagnostic",
    readOnly: true,
    ticketCount: ticket.total,
    maximumTicketNumber: maximumNumber,
    identityGeneration: identity?.generation ?? null,
    sequenceAvailable: Boolean(sequence?.name),
    sequenceLastValue,
    sequenceBehind,
    activeQueues: queues.total,
    requiredTables: {
      contactAccess: schema.contact_access,
      ticketContracts: schema.ticket_contracts,
      participants: schema.participants,
      f10Links: schema.f10_links,
    },
  };
}

async function main() {
  const db = postgres(databaseUrl(), {
    max: 1,
    prepare: false,
    connect_timeout: 10,
  });
  try {
    const report = await db.begin(async (tx) => {
      await tx.unsafe("SET TRANSACTION READ ONLY");
      return inspectTicketCreation(tx);
    });
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await db.end({ timeout: 5 });
  }
}

main().catch((cause) => {
  console.error(JSON.stringify({
    state: "error",
    code: typeof cause?.code === "string" ? cause.code : "UNKNOWN",
  }));
  process.exitCode = 1;
});
