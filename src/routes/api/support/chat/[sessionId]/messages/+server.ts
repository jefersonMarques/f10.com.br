import { json, type RequestHandler } from "@sveltejs/kit";
import {
  handoffSupportAiChatForAttachment,
  processSupportAiChatMessage,
} from "$lib/server/support/supportAiChat";
import {
  addPublicChatMessage,
  authorizePublicChatSession,
  listPublicChatMessages,
} from "$lib/server/support/publicChatRepository";
import { SUPPORT_IMAGE_MAX_FILES } from "$lib/server/support/supportMessageAttachmentRepository";

const MAX_BODY_BYTES = 36 * 1024 * 1024;

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function getBearerToken(request: Request): string {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return "";

  const token = authorization.slice(7).trim();
  return /^[A-Za-z0-9_-]{40,120}$/.test(token) ? token : "";
}

function isBodyTooLarge(request: Request): boolean {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  return Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES;
}

async function readMessagePayload(request: Request): Promise<{ body: string; files: File[] }> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const bodyValue = formData.get("body");
    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File && value.size > 0);
    return {
      body: typeof bodyValue === "string" ? bodyValue.trim() : "",
      files,
    };
  }

  const payload = (await request.json()) as Record<string, unknown>;
  return {
    body: typeof payload.body === "string" ? payload.body.trim() : "",
    files: [],
  };
}

export const GET: RequestHandler = async ({ params, request }) => {
  const sessionId = params.sessionId ?? "";
  const token = getBearerToken(request);

  if (!isUuid(sessionId) || !token) {
    return json({ error: "INVALID_SESSION" }, { status: 401 });
  }

  try {
    const [session, messages] = await Promise.all([
      authorizePublicChatSession(sessionId, token),
      listPublicChatMessages(sessionId, token),
    ]);
    return json(
      { messages, aiState: session.aiState },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return json({ error: "INVALID_SESSION" }, { status: 401 });
  }
};

export const POST: RequestHandler = async ({
  params,
  request,
  getClientAddress,
}) => {
  const sessionId = params.sessionId ?? "";
  const token = getBearerToken(request);

  if (!isUuid(sessionId) || !token) {
    return json({ error: "INVALID_SESSION" }, { status: 401 });
  }

  if (isBodyTooLarge(request)) {
    return json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
  }

  let body = "";
  let files: File[] = [];
  try {
    ({ body, files } = await readMessagePayload(request));
  } catch {
    return json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  if (body.length > 4000 || (body.length < 1 && files.length === 0)) {
    return json({ error: "INVALID_MESSAGE" }, { status: 400 });
  }
  if (files.length > SUPPORT_IMAGE_MAX_FILES) {
    return json({ error: "TOO_MANY_ATTACHMENTS" }, { status: 400 });
  }

  let clientAddress = "unknown";
  try {
    clientAddress = getClientAddress();
  } catch {
    clientAddress = "unknown";
  }

  try {
    const messageResult = await addPublicChatMessage(
      clientAddress,
      sessionId,
      token,
      body,
      files,
    );
    const ai =
      messageResult.aiState === "active"
        ? files.length > 0
          ? await handoffSupportAiChatForAttachment(sessionId)
          : await processSupportAiChatMessage(sessionId, body)
        : null;

    return json(
      {
        ok: true,
        messageId: messageResult.messageId,
        aiState: ai?.state ?? messageResult.aiState,
        aiProcessed: ai?.processed ?? false,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (cause) {
    if (cause instanceof Error && cause.message === "CHAT_RATE_LIMITED") {
      return json({ error: "RATE_LIMITED" }, { status: 429 });
    }
    if (cause instanceof Error && cause.message === "CHAT_TICKET_CLOSED") {
      return json({ error: "CHAT_CLOSED" }, { status: 409 });
    }
    if (cause instanceof Error && cause.message.startsWith("SUPPORT_IMAGE_")) {
      return json({ error: cause.message }, { status: 400 });
    }
    if (cause instanceof Error && cause.message.startsWith("ASSET_STORAGE_")) {
      return json({ error: "ATTACHMENT_STORAGE_UNAVAILABLE" }, { status: 503 });
    }

    return json({ error: "INVALID_SESSION" }, { status: 401 });
  }
};
