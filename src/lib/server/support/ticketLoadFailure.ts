export type TicketLoadFailure = {
  status: 403 | 404 | 500;
  message: string;
  errorType: string;
  databaseCode: string | null;
};

function getDatabaseErrorCode(cause: unknown): string | null {
  let current = cause;

  for (let depth = 0; depth < 4; depth += 1) {
    if (!current || typeof current !== "object") return null;

    const details = current as { code?: unknown; cause?: unknown };
    if (typeof details.code === "string" && /^[0-9A-Z]{5}$/.test(details.code)) {
      return details.code;
    }

    current = details.cause;
  }

  return null;
}

export function classifyTicketLoadFailure(cause: unknown): TicketLoadFailure {
  const errorCode = cause instanceof Error ? cause.message : "";
  const errorType = cause instanceof Error ? cause.name : typeof cause;
  const databaseCode = getDatabaseErrorCode(cause);

  if (errorCode === "TICKET_NOT_FOUND") {
    return {
      status: 404,
      message: "Ticket não encontrado.",
      errorType,
      databaseCode,
    };
  }

  if (errorCode === "TICKET_NOT_ACCESSIBLE" || errorCode === "TICKET_PERMISSION_NOT_ALLOWED") {
    return {
      status: 403,
      message: "Você não tem permissão para visualizar este ticket.",
      errorType,
      databaseCode,
    };
  }

  return {
    status: 500,
    message: "Não foi possível carregar este ticket.",
    errorType,
    databaseCode,
  };
}
