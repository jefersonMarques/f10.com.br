import { dev } from "$app/environment";
import { json, type RequestHandler } from "@sveltejs/kit";
import { recordCustomerActivity } from "$lib/server/customerPortal/customerActivityRepository";
import { bindTicketF10Context } from "$lib/server/customerPortal/customerF10TicketRepository";
import { getOptionalCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import { markHelpSearchOutcome } from "$lib/server/help/helpSearchRepository";
import {
  isSupportAiChatEnabled,
  processSupportAiChatMessage,
} from "$lib/server/support/supportAiChat";
import { persistSupportChatHandoffContext } from "$lib/server/support/supportChatHandoffContext";
import {
  listPublicSupportChatEntryOptions,
} from "$lib/server/support/supportChatEntryRepository";
import { handlePureSupportGreeting } from "$lib/server/support/supportChatLocalIntent";
import {
  addPublicChatSystemMessage,
  startPublicChat,
} from "$lib/server/support/publicChatRepository";
import { getSupportAvailabilityStatus } from "$lib/server/support/publicSupportStatus";
import { autoAssignTicketIfConfigured } from "$lib/server/support/supportRoutingRepository";
import { notifySupportTicketNeedsAttention } from "$lib/server/support/supportTeamNotifications";

const MAX_BODY_BYTES = 32 * 1024;
const MAX_HANDOFF_TRANSCRIPT_CHARS = 8_000;
const LAST_HELP_SEARCH_COOKIE = "f10_support_last_help_search";

type ChatStartDiagnosticCode =
  | "RATE_LIMIT_NOT_CONFIGURED"
  | "SUPPORT_QUEUE_UNAVAILABLE"
  | "DATABASE_UNAVAILABLE"
  | "CUSTOMER_CONTEXT_BIND_FAILED"
  | "CHAT_START_FAILED";

function isBodyTooLarge(request: Request): boolean {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  return Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function sanitizeContextUrl(value: string): string {
  if (!value || value.length > 1000) return "";

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

async function resolveEffectiveEntryOptionId(
  entryOptionId: string | null,
  forceHuman: boolean,
): Promise<string | null> {
  if (entryOptionId || !forceHuman) return entryOptionId;

  const options = await listPublicSupportChatEntryOptions();
  const preferred = options.find((option) => option.initialHandling === "human") ?? options[0];
  return preferred?.id ?? null;
}

function buildOutOfHoursMessage(nextOpenLabel: string | null): string {
  const nextOpen = nextOpenLabel
    ? ` Nossa equipe retorna ${nextOpenLabel.toLowerCase()}.`
    : " Nossa equipe responderá no próximo período de atendimento.";
  return `Recebemos seu atendimento e ele ficou registrado na fila.${nextOpen}`;
}

function diagnoseChatStartFailure(cause: unknown): ChatStartDiagnosticCode {
  if (!(cause instanceof Error)) return "CHAT_START_FAILED";
  if (cause.message.includes("SUPPORT_RATE_LIMIT_SECRET")) {
    return "RATE_LIMIT_NOT_CONFIGURED";
  }
  if (cause.message === "CHAT_QUEUE_NOT_FOUND") {
    return "SUPPORT_QUEUE_UNAVAILABLE";
  }
  if (cause.message === "F10_CUSTOMER_UNIT_REQUIRED") {
    return "CUSTOMER_CONTEXT_BIND_FAILED";
  }
  if (
    cause.message.includes("DATABASE_URL") ||
    cause.name === "PostgresError" ||
    cause.name === "PostgresConnectionError"
  ) {
    return "DATABASE_UNAVAILABLE";
  }
  return "CHAT_START_FAILED";
}

export const POST: RequestHandler = async ({ request, getClientAddress, cookies, url }) => {
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) return json({ error: "INVALID_ORIGIN" }, { status: 403 });

  const customer = await getOptionalCustomerF10PortalSession(cookies);
  if (!customer || customer.selectedGroupId === null || customer.selectedUnitId === null) {
    return json(
      {
        error: "CUSTOMER_AUTH_REQUIRED",
        loginUrl: "/cliente?returnTo=%2Fajuda-f10%3Fchat%3D1",
      },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (isBodyTooLarge(request)) {
    return json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
  }

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const name = customer.name.trim() || customer.email;
  const email = customer.email.trim().toLowerCase();
  const phone = readString(body.phone);
  const message = readString(body.message);
  const entryOptionId = readString(body.entryOptionId) || null;
  const contextUrl = sanitizeContextUrl(readString(body.contextUrl));
  const pageTitle = readString(body.pageTitle).slice(0, 200);
  const helpContext = readString(body.helpContext).slice(0, 200);
  const forceHuman = body.forceHuman === true;
  const handoffTranscript = readString(body.handoffTranscript).slice(0, MAX_HANDOFF_TRANSCRIPT_CHARS);
  const storedSearchEventId = cookies.get(LAST_HELP_SEARCH_COOKIE) ?? "";
  const correlatedSearchEventId = isUuid(storedSearchEventId) ? storedSearchEventId : null;

  if (name.length < 1 || name.length > 120 || email.length > 254) {
    return json({ error: "INVALID_CONTACT" }, { status: 400 });
  }

  if (phone.length > 40) {
    return json({ error: "INVALID_CONTACT" }, { status: 400 });
  }

  if (message.length < 1 || message.length > 4000) {
    return json({ error: "INVALID_MESSAGE" }, { status: 400 });
  }

  if (entryOptionId && !isUuid(entryOptionId)) {
    return json({ error: "INVALID_ENTRY_OPTION" }, { status: 400 });
  }

  let clientAddress = "unknown";
  try {
    clientAddress = getClientAddress();
  } catch {
    clientAddress = "unknown";
  }

  try {
    const [effectiveEntryOptionId, availability] = await Promise.all([
      resolveEffectiveEntryOptionId(entryOptionId, forceHuman),
      getSupportAvailabilityStatus(),
    ]);
    const session = await startPublicChat(clientAddress, {
      name,
      email,
      phone,
      message,
      entryOptionId: effectiveEntryOptionId,
      contextUrl,
      contextData: {
        pageTitle: pageTitle || null,
        helpContext: helpContext || null,
        authenticatedCustomer: true,
        legacyUserId: customer.legacyUserId,
        groupId: customer.selectedGroupId,
        groupName: customer.selectedGroupName,
        unitId: customer.selectedUnitId,
        unitName: customer.selectedUnitName,
        assistantHandoff: forceHuman,
        handoffTranscript: handoffTranscript || null,
      },
      enableAi: !forceHuman && isSupportAiChatEnabled(),
    });

    await bindTicketF10Context(session.ticketId, customer);

    if (forceHuman && correlatedSearchEventId) {
      await markHelpSearchOutcome(correlatedSearchEventId, {
        escalated: true,
        ticketId: session.ticketId,
      }).catch((cause) => {
        console.error("[support.chat.help_handoff]", {
          ticketId: session.ticketId,
          causeType: cause instanceof Error ? cause.name : typeof cause,
        });
      });
      cookies.delete(LAST_HELP_SEARCH_COOKIE, { path: "/" });
    }

    if (handoffTranscript) {
      await persistSupportChatHandoffContext(session.ticketId, handoffTranscript).catch((cause) => {
        console.error("[support.chat.handoff_context]", {
          ticketId: session.ticketId,
          causeType: cause instanceof Error ? cause.name : typeof cause,
        });
      });
    }

    await recordCustomerActivity(customer, {
      eventType: "support.chat.started",
      source: "help_center",
      path: contextUrl || "/ajuda-f10",
      metadata: {
        ticketId: session.ticketId,
        ticketNumber: session.ticketNumber,
        entryOptionId: effectiveEntryOptionId,
        entryOptionLabel: session.entryOptionLabel,
        assistantHandoff: forceHuman,
        helpSearchEventId: forceHuman ? correlatedSearchEventId : null,
        outsideSupportHours: availability.isOpen === false,
      },
    }).catch(() => undefined);

    let ai: { state: "active" | "escalated" | "human" | "disabled"; processed: boolean } | null = null;
    if (session.aiState === "active") {
      const handledLocally = await handlePureSupportGreeting(session.sessionId, message);
      ai = handledLocally
        ? { state: "active", processed: true }
        : await processSupportAiChatMessage(session.sessionId, message);
    }

    const effectiveAiState = ai?.state ?? session.aiState;
    if (effectiveAiState !== "active") {
      if (availability.isOpen === false) {
        await addPublicChatSystemMessage(
          session.ticketId,
          buildOutOfHoursMessage(availability.nextOpenLabel),
        ).catch((cause) => {
          console.error("[support.chat.out_of_hours_message]", {
            ticketId: session.ticketId,
            causeType: cause instanceof Error ? cause.name : typeof cause,
          });
        });
      } else {
        const assignedUserId = await autoAssignTicketIfConfigured(session.ticketId).catch(() => null);
        if (!assignedUserId) {
          await notifySupportTicketNeedsAttention(
            session.ticketId,
            "Novo atendimento direcionado para atendimento humano.",
          ).catch(() => undefined);
        }
      }
    }

    return json(
      {
        sessionId: session.sessionId,
        token: session.token,
        ticketNumber: session.ticketNumber,
        entryOptionLabel: session.entryOptionLabel,
        expiresAt: session.expiresAt.toISOString(),
        aiState: effectiveAiState,
        aiProcessed: ai?.processed ?? false,
        outsideSupportHours: availability.isOpen === false,
        nextOpenLabel: availability.nextOpenLabel,
      },
      {
        status: 201,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (cause) {
    if (cause instanceof Error && cause.message === "CHAT_RATE_LIMITED") {
      return json({ error: "RATE_LIMITED" }, { status: 429 });
    }
    if (cause instanceof Error && cause.message === "CHAT_ENTRY_OPTION_NOT_FOUND") {
      return json({ error: "INVALID_ENTRY_OPTION" }, { status: 400 });
    }

    const diagnosticCode = diagnoseChatStartFailure(cause);
    console.error("[support.chat.start]", {
      diagnosticCode,
      causeCode: cause instanceof Error ? cause.message : null,
      causeType: cause instanceof Error ? cause.name : typeof cause,
    });

    return json(
      {
        error: "CHAT_UNAVAILABLE",
        ...(dev ? { diagnosticCode } : {}),
      },
      { status: 503 },
    );
  }
};
