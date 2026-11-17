import postgres from "postgres";

function readDatabaseUrl() {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) throw new Error("DATABASE_URL_MISSING");
  return value;
}

function safeNumber(value) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new Error("UNSAFE_TICKET_NUMBER");
  return number;
}

async function auditTicketNumbers(tx) {
  const [totals] = await tx.unsafe(
    "SELECT count(*)::int AS tickets, " +
    "count(*) FILTER (WHERE imported.ticket_id IS NOT NULL)::int AS imported, " +
    "count(*) FILTER (WHERE imported.ticket_id IS NULL)::int AS native_tickets, " +
    "min(t.ticket_number)::text AS minimum_number, " +
    "max(t.ticket_number)::text AS maximum_number " +
    "FROM tickets t LEFT JOIN movidesk_ticket_imports imported ON imported.ticket_id = t.id",
  );

  const [source] = await tx.unsafe(
    "SELECT count(*)::int AS imported, " +
    "count(*) FILTER (WHERE source_ticket_id !~ '^[0-9]{1,18}$')::int AS invalid_ids, " +
    "max(CASE WHEN source_ticket_id ~ '^[0-9]{1,18}
    "FROM movidesk_ticket_imports",
  );

  const [changes] = await tx.unsafe(
    "SELECT count(*) FILTER (WHERE current_ticket.ticket_number <> imported.source_ticket_id::bigint)::int " +
    "AS historical_number_changes, " +
    "count(*) FILTER (WHERE current_ticket.ticket_number = imported.source_ticket_id::bigint)::int " +
    "AS historical_numbers_already_matching " +
    "FROM movidesk_ticket_imports imported " +
    "JOIN tickets current_ticket ON current_ticket.id = imported.ticket_id " +
    "WHERE imported.source_ticket_id ~ '^[0-9]{1,18}$'",
  );

  const [conflicts] = await tx.unsafe(
    "SELECT count(*)::int AS current_number_conflicts, " +
    "count(*) FILTER (WHERE other_import.ticket_id IS NULL)::int AS with_native_tickets " +
    "FROM movidesk_ticket_imports imported " +
    "JOIN tickets other_ticket ON other_ticket.ticket_number = " +
    "(CASE WHEN imported.source_ticket_id ~ '^[0-9]{1,18}
    "AND other_ticket.id <> imported.ticket_id " +
    "LEFT JOIN movidesk_ticket_imports other_import ON other_import.ticket_id = other_ticket.id " +
    "WHERE imported.source_ticket_id ~ '^[0-9]{1,18}$'",
  );

  const maximumSourceNumber = safeNumber(source.maximum_number);
  if (maximumSourceNumber === null) throw new Error("NO_NUMERIC_MOVIDESK_IDS");

  const [native] = await tx.unsafe(
    "SELECT count(*)::int AS native_tickets_within_movidesk_range " +
    "FROM tickets ticket " +
    "LEFT JOIN movidesk_ticket_imports imported ON imported.ticket_id = ticket.id " +
    "WHERE imported.ticket_id IS NULL AND ticket.ticket_number <= $1::bigint",
    [maximumSourceNumber],
  );

  const collisionSamples = await tx.unsafe(
    "SELECT imported.source_ticket_id AS movidesk_number, " +
    "original.ticket_number::text AS imported_current_number, " +
    "other_ticket.ticket_number::text AS conflicting_current_number, " +
    "CASE WHEN other_import.ticket_id IS NULL THEN 'native' ELSE 'movidesk' END " +
    "AS conflicting_origin " +
    "FROM movidesk_ticket_imports imported " +
    "JOIN tickets original ON original.id = imported.ticket_id " +
    "JOIN tickets other_ticket ON other_ticket.ticket_number = imported.source_ticket_id::bigint " +
    "AND other_ticket.id <> imported.ticket_id " +
    "LEFT JOIN movidesk_ticket_imports other_import ON other_import.ticket_id = other_ticket.id " +
    "WHERE imported.source_ticket_id ~ '^[0-9]{1,18}$' " +
    "ORDER BY imported.source_ticket_id::bigint LIMIT 12",
  );

  const currentMaximumNumber = safeNumber(totals.maximum_number);
  const nextAvailableNumber = Math.max(currentMaximumNumber ?? 0, maximumSourceNumber) + 1;

  return {
    state: "ticket_number_audit",
    readOnly: true,
    tickets: totals.tickets,
    importedTickets: totals.imported,
    nativeTickets: totals.native_tickets,
    currentMinimumNumber: safeNumber(totals.minimum_number),
    currentMaximumNumber,
    importedSourceCount: source.imported,
    invalidSourceIds: source.invalid_ids,
    maximumMovideskNumber: maximumSourceNumber,
    historicalNumberChangesRequired: changes.historical_number_changes,
    historicalNumbersAlreadyMatching: changes.historical_numbers_already_matching,
    currentNumberConflicts: conflicts.current_number_conflicts,
    conflictsWithNativeTickets: conflicts.with_native_tickets,
    nativeTicketsWithinMovideskRange: native.native_tickets_within_movidesk_range,
    proposedNativeStartingNumber: nextAvailableNumber,
    collisionSamples,
    emailNumberAliasesRequired: true,
  };
}

async function main() {
  const db = postgres(readDatabaseUrl(), { max: 1, prepare: false, connect_timeout: 10 });
  try {
    const result = await db.begin(async (tx) => {
      await tx.unsafe("SET TRANSACTION READ ONLY");
      return auditTicketNumbers(tx);
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await db.end({ timeout: 5 });
  }
}

main().catch((cause) => {
  console.error(JSON.stringify({
    state: "error",
    reason: cause instanceof Error ? cause.message : "UNKNOWN_ERROR",
  }));
  process.exitCode = 1;
});
 " +
    "THEN source_ticket_id::bigint END)::text AS maximum_number " +
    "FROM movidesk_ticket_imports",
  );

  const [changes] = await tx.unsafe(
    "SELECT count(*) FILTER (WHERE current_ticket.ticket_number <> imported.source_ticket_id::bigint)::int " +
    "AS historical_number_changes, " +
    "count(*) FILTER (WHERE current_ticket.ticket_number = imported.source_ticket_id::bigint)::int " +
    "AS historical_numbers_already_matching " +
    "FROM movidesk_ticket_imports imported " +
    "JOIN tickets current_ticket ON current_ticket.id = imported.ticket_id " +
    "WHERE imported.source_ticket_id ~ '^[0-9]{1,18}$'",
  );

  const [conflicts] = await tx.unsafe(
    "SELECT count(*)::int AS current_number_conflicts, " +
    "count(*) FILTER (WHERE other_import.ticket_id IS NULL)::int AS with_native_tickets " +
    "FROM movidesk_ticket_imports imported " +
    "JOIN tickets other_ticket ON other_ticket.ticket_number = imported.source_ticket_id::bigint " +
    "AND other_ticket.id <> imported.ticket_id " +
    "LEFT JOIN movidesk_ticket_imports other_import ON other_import.ticket_id = other_ticket.id " +
    "WHERE imported.source_ticket_id ~ '^[0-9]{1,18}$'",
  );

  const maximumSourceNumber = safeNumber(source.maximum_number);
  if (maximumSourceNumber === null) throw new Error("NO_NUMERIC_MOVIDESK_IDS");

  const [native] = await tx.unsafe(
    "SELECT count(*)::int AS native_tickets_within_movidesk_range " +
    "FROM tickets ticket " +
    "LEFT JOIN movidesk_ticket_imports imported ON imported.ticket_id = ticket.id " +
    "WHERE imported.ticket_id IS NULL AND ticket.ticket_number <= $1::bigint",
    [maximumSourceNumber],
  );

  const collisionSamples = await tx.unsafe(
    "SELECT imported.source_ticket_id AS movidesk_number, " +
    "original.ticket_number::text AS imported_current_number, " +
    "other_ticket.ticket_number::text AS conflicting_current_number, " +
    "CASE WHEN other_import.ticket_id IS NULL THEN 'native' ELSE 'movidesk' END " +
    "AS conflicting_origin " +
    "FROM movidesk_ticket_imports imported " +
    "JOIN tickets original ON original.id = imported.ticket_id " +
    "JOIN tickets other_ticket ON other_ticket.ticket_number = imported.source_ticket_id::bigint " +
    "AND other_ticket.id <> imported.ticket_id " +
    "LEFT JOIN movidesk_ticket_imports other_import ON other_import.ticket_id = other_ticket.id " +
    "WHERE imported.source_ticket_id ~ '^[0-9]{1,18}$' " +
    "ORDER BY imported.source_ticket_id::bigint LIMIT 12",
  );

  const currentMaximumNumber = safeNumber(totals.maximum_number);
  const nextAvailableNumber = Math.max(currentMaximumNumber ?? 0, maximumSourceNumber) + 1;

  return {
    state: "ticket_number_audit",
    readOnly: true,
    tickets: totals.tickets,
    importedTickets: totals.imported,
    nativeTickets: totals.native_tickets,
    currentMinimumNumber: safeNumber(totals.minimum_number),
    currentMaximumNumber,
    importedSourceCount: source.imported,
    invalidSourceIds: source.invalid_ids,
    maximumMovideskNumber: maximumSourceNumber,
    historicalNumberChangesRequired: changes.historical_number_changes,
    historicalNumbersAlreadyMatching: changes.historical_numbers_already_matching,
    currentNumberConflicts: conflicts.current_number_conflicts,
    conflictsWithNativeTickets: conflicts.with_native_tickets,
    nativeTicketsWithinMovideskRange: native.native_tickets_within_movidesk_range,
    proposedNativeStartingNumber: nextAvailableNumber,
    collisionSamples,
    emailNumberAliasesRequired: true,
  };
}

async function main() {
  const db = postgres(readDatabaseUrl(), { max: 1, prepare: false, connect_timeout: 10 });
  try {
    const result = await db.begin(async (tx) => {
      await tx.unsafe("SET TRANSACTION READ ONLY");
      return auditTicketNumbers(tx);
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await db.end({ timeout: 5 });
  }
}

main().catch((cause) => {
  console.error(JSON.stringify({
    state: "error",
    reason: cause instanceof Error ? cause.message : "UNKNOWN_ERROR",
  }));
  process.exitCode = 1;
});
 " +
    "THEN imported.source_ticket_id::bigint END) " +
    "AND other_ticket.id <> imported.ticket_id " +
    "LEFT JOIN movidesk_ticket_imports other_import ON other_import.ticket_id = other_ticket.id " +
    "WHERE imported.source_ticket_id ~ '^[0-9]{1,18}$'",
  );

  const maximumSourceNumber = safeNumber(source.maximum_number);
  if (maximumSourceNumber === null) throw new Error("NO_NUMERIC_MOVIDESK_IDS");

  const [native] = await tx.unsafe(
    "SELECT count(*)::int AS native_tickets_within_movidesk_range " +
    "FROM tickets ticket " +
    "LEFT JOIN movidesk_ticket_imports imported ON imported.ticket_id = ticket.id " +
    "WHERE imported.ticket_id IS NULL AND ticket.ticket_number <= $1::bigint",
    [maximumSourceNumber],
  );

  const collisionSamples = await tx.unsafe(
    "SELECT imported.source_ticket_id AS movidesk_number, " +
    "original.ticket_number::text AS imported_current_number, " +
    "other_ticket.ticket_number::text AS conflicting_current_number, " +
    "CASE WHEN other_import.ticket_id IS NULL THEN 'native' ELSE 'movidesk' END " +
    "AS conflicting_origin " +
    "FROM movidesk_ticket_imports imported " +
    "JOIN tickets original ON original.id = imported.ticket_id " +
    "JOIN tickets other_ticket ON other_ticket.ticket_number = imported.source_ticket_id::bigint " +
    "AND other_ticket.id <> imported.ticket_id " +
    "LEFT JOIN movidesk_ticket_imports other_import ON other_import.ticket_id = other_ticket.id " +
    "WHERE imported.source_ticket_id ~ '^[0-9]{1,18}$' " +
    "ORDER BY imported.source_ticket_id::bigint LIMIT 12",
  );

  const currentMaximumNumber = safeNumber(totals.maximum_number);
  const nextAvailableNumber = Math.max(currentMaximumNumber ?? 0, maximumSourceNumber) + 1;

  return {
    state: "ticket_number_audit",
    readOnly: true,
    tickets: totals.tickets,
    importedTickets: totals.imported,
    nativeTickets: totals.native_tickets,
    currentMinimumNumber: safeNumber(totals.minimum_number),
    currentMaximumNumber,
    importedSourceCount: source.imported,
    invalidSourceIds: source.invalid_ids,
    maximumMovideskNumber: maximumSourceNumber,
    historicalNumberChangesRequired: changes.historical_number_changes,
    historicalNumbersAlreadyMatching: changes.historical_numbers_already_matching,
    currentNumberConflicts: conflicts.current_number_conflicts,
    conflictsWithNativeTickets: conflicts.with_native_tickets,
    nativeTicketsWithinMovideskRange: native.native_tickets_within_movidesk_range,
    proposedNativeStartingNumber: nextAvailableNumber,
    collisionSamples,
    emailNumberAliasesRequired: true,
  };
}

async function main() {
  const db = postgres(readDatabaseUrl(), { max: 1, prepare: false, connect_timeout: 10 });
  try {
    const result = await db.begin(async (tx) => {
      await tx.unsafe("SET TRANSACTION READ ONLY");
      return auditTicketNumbers(tx);
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await db.end({ timeout: 5 });
  }
}

main().catch((cause) => {
  console.error(JSON.stringify({
    state: "error",
    reason: cause instanceof Error ? cause.message : "UNKNOWN_ERROR",
  }));
  process.exitCode = 1;
});
 " +
    "THEN source_ticket_id::bigint END)::text AS maximum_number " +
    "FROM movidesk_ticket_imports",
  );

  const [changes] = await tx.unsafe(
    "SELECT count(*) FILTER (WHERE current_ticket.ticket_number <> imported.source_ticket_id::bigint)::int " +
    "AS historical_number_changes, " +
    "count(*) FILTER (WHERE current_ticket.ticket_number = imported.source_ticket_id::bigint)::int " +
    "AS historical_numbers_already_matching " +
    "FROM movidesk_ticket_imports imported " +
    "JOIN tickets current_ticket ON current_ticket.id = imported.ticket_id " +
    "WHERE imported.source_ticket_id ~ '^[0-9]{1,18}$'",
  );

  const [conflicts] = await tx.unsafe(
    "SELECT count(*)::int AS current_number_conflicts, " +
    "count(*) FILTER (WHERE other_import.ticket_id IS NULL)::int AS with_native_tickets " +
    "FROM movidesk_ticket_imports imported " +
    "JOIN tickets other_ticket ON other_ticket.ticket_number = imported.source_ticket_id::bigint " +
    "AND other_ticket.id <> imported.ticket_id " +
    "LEFT JOIN movidesk_ticket_imports other_import ON other_import.ticket_id = other_ticket.id " +
    "WHERE imported.source_ticket_id ~ '^[0-9]{1,18}$'",
  );

  const maximumSourceNumber = safeNumber(source.maximum_number);
  if (maximumSourceNumber === null) throw new Error("NO_NUMERIC_MOVIDESK_IDS");

  const [native] = await tx.unsafe(
    "SELECT count(*)::int AS native_tickets_within_movidesk_range " +
    "FROM tickets ticket " +
    "LEFT JOIN movidesk_ticket_imports imported ON imported.ticket_id = ticket.id " +
    "WHERE imported.ticket_id IS NULL AND ticket.ticket_number <= $1::bigint",
    [maximumSourceNumber],
  );

  const collisionSamples = await tx.unsafe(
    "SELECT imported.source_ticket_id AS movidesk_number, " +
    "original.ticket_number::text AS imported_current_number, " +
    "other_ticket.ticket_number::text AS conflicting_current_number, " +
    "CASE WHEN other_import.ticket_id IS NULL THEN 'native' ELSE 'movidesk' END " +
    "AS conflicting_origin " +
    "FROM movidesk_ticket_imports imported " +
    "JOIN tickets original ON original.id = imported.ticket_id " +
    "JOIN tickets other_ticket ON other_ticket.ticket_number = imported.source_ticket_id::bigint " +
    "AND other_ticket.id <> imported.ticket_id " +
    "LEFT JOIN movidesk_ticket_imports other_import ON other_import.ticket_id = other_ticket.id " +
    "WHERE imported.source_ticket_id ~ '^[0-9]{1,18}$' " +
    "ORDER BY imported.source_ticket_id::bigint LIMIT 12",
  );

  const currentMaximumNumber = safeNumber(totals.maximum_number);
  const nextAvailableNumber = Math.max(currentMaximumNumber ?? 0, maximumSourceNumber) + 1;

  return {
    state: "ticket_number_audit",
    readOnly: true,
    tickets: totals.tickets,
    importedTickets: totals.imported,
    nativeTickets: totals.native_tickets,
    currentMinimumNumber: safeNumber(totals.minimum_number),
    currentMaximumNumber,
    importedSourceCount: source.imported,
    invalidSourceIds: source.invalid_ids,
    maximumMovideskNumber: maximumSourceNumber,
    historicalNumberChangesRequired: changes.historical_number_changes,
    historicalNumbersAlreadyMatching: changes.historical_numbers_already_matching,
    currentNumberConflicts: conflicts.current_number_conflicts,
    conflictsWithNativeTickets: conflicts.with_native_tickets,
    nativeTicketsWithinMovideskRange: native.native_tickets_within_movidesk_range,
    proposedNativeStartingNumber: nextAvailableNumber,
    collisionSamples,
    emailNumberAliasesRequired: true,
  };
}

async function main() {
  const db = postgres(readDatabaseUrl(), { max: 1, prepare: false, connect_timeout: 10 });
  try {
    const result = await db.begin(async (tx) => {
      await tx.unsafe("SET TRANSACTION READ ONLY");
      return auditTicketNumbers(tx);
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await db.end({ timeout: 5 });
  }
}

main().catch((cause) => {
  console.error(JSON.stringify({
    state: "error",
    reason: cause instanceof Error ? cause.message : "UNKNOWN_ERROR",
  }));
  process.exitCode = 1;
});
