import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { regenerateHelpContentFromVideo } from "$lib/server/help/helpContentRegenerationService";
import { HELP_VIDEO_AUTOMATION_MAX_UPLOAD_BYTES } from "$lib/server/help/helpVideoImportAutomation";
import { getHelpVideoAutomationSettings } from "$lib/server/settings/operationsSettingsRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function errorMessage(code: string): string {
  if (code.startsWith("HELP_VIDEO_ALREADY_USED:")) {
    return "Este vídeo já pertence a outro conteúdo. Use o artigo existente em vez de duplicá-lo.";
  }
  if (code === "HELP_VIDEO_LOCAL_COPY_REQUIRED") return "Este artigo não possui MP4 local para reprocessar.";
  if (code === "HELP_VIDEO_UPLOAD_SIZE_INVALID") return "O vídeo excede o limite permitido.";
  if (code === "HELP_VIDEO_UPLOAD_FORMAT_INVALID") return "Use um arquivo MP4 válido.";
  if (code === "HELP_VIDEO_FFMPEG_NOT_AVAILABLE") return "A geração por vídeo não está disponível no servidor.";
  if (code === "OPENAI_NOT_CONFIGURED") return "A IA de geração não está configurada.";
  if (code === "OPENAI_TIMEOUT") return "A transcrição demorou mais que o esperado. Tente novamente; o processamento foi interrompido com segurança.";
  if (code.startsWith("HELP_VIDEO_TRANSCRIPTION_FAILED:")) return "A OpenAI não conseguiu transcrever o áudio deste vídeo.";
  if (code === "HELP_VIDEO_TRANSCRIPTION_EMPTY" || code === "HELP_VIDEO_TRANSCRIPTION_TIMESTAMPS_EMPTY") return "O áudio foi processado, mas não foi possível obter uma transcrição utilizável.";
  if (code === "HELP_VIDEO_TRANSCRIPTION_CHUNKS_EMPTY") return "Não foi possível preparar o áudio em partes para transcrição.";
  if (code === "CONTENT_ARCHIVED") return "Conteúdo arquivado não pode ser atualizado.";
  if (code === "CONTENT_NOT_FOUND") return "Conteúdo não encontrado.";
  return "Não foi possível atualizar o conteúdo a partir do vídeo.";
}

export const POST: RequestHandler = async ({ cookies, params, request }) => {
  if (!isUuid(params.contentId)) {
    return json({ success: false, message: "Conteúdo não encontrado." }, { status: 404 });
  }

  const { session } = await requireAppPermission(
    cookies,
    "help.edit",
    `/app/help/content/${params.contentId}/images`,
  );
  const settings = await getHelpVideoAutomationSettings();
  if (!settings.enabled) {
    return json(
      { success: false, message: "A geração automática por vídeo está desabilitada." },
      { status: 403 },
    );
  }

  let source:
    | { type: "current" }
    | { type: "upload"; fileName: string; mimeType: string; bytes: Uint8Array };

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("videoFile");
    if (!(file instanceof File) || file.size < 1) {
      return json({ success: false, message: "Selecione um arquivo MP4." }, { status: 400 });
    }
    if (file.size > HELP_VIDEO_AUTOMATION_MAX_UPLOAD_BYTES) {
      return json({ success: false, message: "O vídeo excede o limite permitido." }, { status: 400 });
    }
    source = {
      type: "upload",
      fileName: file.name || "video-atualizado.mp4",
      mimeType: file.type || "video/mp4",
      bytes: new Uint8Array(await file.arrayBuffer()),
    };
  } else {
    source = { type: "current" };
  }

  const encoder = new TextEncoder();
  let closed = false;
  let lastProgress: {
    stage: string;
    status: string;
    label: string;
    detail?: string;
  } | null = null;
  let stageStartedAt = Date.now();

  const elapsedLabel = (startedAt: number) => {
    const totalSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    if (totalSeconds < 60) return `${totalSeconds}s`;
    return `${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s`;
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (payload: Record<string, unknown>) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
        } catch {
          closed = true;
        }
      };

      const heartbeat = setInterval(() => {
        if (closed) return;
        if (lastProgress?.status === "active") {
          write({
            type: "progress",
            ...lastProgress,
            detail: [
              lastProgress.detail,
              `em processamento há ${elapsedLabel(stageStartedAt)}`,
            ].filter(Boolean).join(" · "),
          });
          return;
        }
        try {
          controller.enqueue(encoder.encode("\n"));
        } catch {
          closed = true;
        }
      }, 12_000);

      try {
        const result = await regenerateHelpContentFromVideo({
          actorUserId: session.user.id,
          contentId: params.contentId,
          source,
          onProgress: (progress) => {
            if (!lastProgress || lastProgress.stage !== progress.stage) {
              stageStartedAt = Date.now();
            }
            lastProgress = progress;
            write({ type: "progress", ...progress });
          },
        });
        write({
          type: "result",
          success: true,
          message: "Novo rascunho gerado. A versão publicada continua ativa até uma nova publicação.",
          summary: result.summary,
        });
      } catch (cause) {
        const code = cause instanceof Error ? cause.message : "";
        write({ type: "error", success: false, message: errorMessage(code) });
      } finally {
        clearInterval(heartbeat);
        if (!closed) {
          closed = true;
          controller.close();
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache, no-transform",
    },
  });
};
