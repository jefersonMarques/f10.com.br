import { createHash } from "node:crypto";

function positiveSafeNumber(value) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new Error("INVALID_TICKET_NUMBER");
  }
  return number;
}

export function buildTicketNumberPlan(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("TICKET_NUMBER_PLAN_EMPTY");
  }

  const sourceNumbers = new Map();
  let maximumMovideskNumber = 0;
  let maximumCurrentNumber = 0;

  for (const row of rows) {
    const currentNumber = positiveSafeNumber(row.current_number);
    maximumCurrentNumber = Math.max(maximumCurrentNumber, currentNumber);

    if (row.source_ticket_id === null) continue;
    const sourceId = String(row.source_ticket_id);
    if (!/^\d+$/.test(sourceId)) {
      throw new Error("MOVIDESK_SOURCE_NUMBER_INVALID");
    }
    const sourceNumber = positiveSafeNumber(sourceId);
    if (sourceNumbers.has(sourceNumber)) {
      throw new Error("MOVIDESK_SOURCE_NUMBER_COLLISION");
    }
    sourceNumbers.set(sourceNumber, row.id);
    maximumMovideskNumber = Math.max(maximumMovideskNumber, sourceNumber);
  }

  if (maximumMovideskNumber === 0) {
    throw new Error("MOVIDESK_TICKETS_NOT_FOUND");
  }

  let nextNativeNumber = maximumMovideskNumber + 1;
  const nativeStartingNumber = nextNativeNumber;
  const assigned = [];
  const finalOwners = new Map();

  for (const row of rows) {
    const previousNumber = positiveSafeNumber(row.current_number);
    const nextNumber = row.source_ticket_id === null
      ? nextNativeNumber++
      : positiveSafeNumber(row.source_ticket_id);

    if (!Number.isSafeInteger(nextNumber) || finalOwners.has(nextNumber)) {
      throw new Error("TARGET_TICKET_NUMBER_COLLISION");
    }

    finalOwners.set(nextNumber, row.id);
    assigned.push({
      ticketId: row.id,
      previousNumber,
      nextNumber,
      imported: row.source_ticket_id !== null,
    });
  }

  const maximumTargetNumber = Math.max(maximumMovideskNumber, nextNativeNumber - 1);
  const temporaryStartingNumber = Math.max(maximumCurrentNumber, maximumTargetNumber) + 1;
  const changes = assigned
    .filter((entry) => entry.previousNumber !== entry.nextNumber)
    .map((entry, index) => ({
      ...entry,
      temporaryNumber: temporaryStartingNumber + index,
    }));

  if (!Number.isSafeInteger(temporaryStartingNumber + changes.length)) {
    throw new Error("TEMPORARY_TICKET_NUMBER_OVERFLOW");
  }

  const hash = createHash("sha256");
  for (const entry of assigned) {
    hash.update(
      [entry.ticketId, entry.previousNumber, entry.nextNumber, Number(entry.imported)]
        .join("|") + "\n",
    );
  }

  return {
    planHash: hash.digest("hex"),
    ticketCount: rows.length,
    importedTickets: sourceNumbers.size,
    nativeTickets: rows.length - sourceNumbers.size,
    maximumMovideskNumber,
    nativeStartingNumber,
    maximumTargetNumber,
    maximumCurrentNumber,
    changes,
    aliasesRequired: changes.length,
    collidingPreviousNumbers: changes.filter((entry) => {
      const owner = finalOwners.get(entry.previousNumber);
      return Boolean(owner && owner !== entry.ticketId);
    }).length,
  };
}
