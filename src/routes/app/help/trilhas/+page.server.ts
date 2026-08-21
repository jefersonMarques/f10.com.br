import { error, fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import { importHelpTrainingPackage } from "$lib/server/help/helpTrainingPackageImport";
import {
  createHelpTrainingPath,
  listHelpTrainingPaths,
} from "$lib/server/help/helpTrainingRepository";

const MAX_PACKAGE_BYTES = 120 * 1024 * 1024;

type DatabaseDiagnostic = {
  code: string;
  constraint: string;
  type: string;
};

function read(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function databaseDiagnostic(cause: unknown): DatabaseDiagnostic {
  let current: unknown = cause;
  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth += 1) {
    const record = current as Record<string, unknown>;
    const code = typeof record.code === "string" ? record.code : "";
    const constraint = typeof record.constraint === "string" ? record.constraint : "";
    if (code || constraint) {
      return {
        code,
        constraint,
        type: current instanceof Error ? current.name : "Error",
      };
    }
    current = record.cause;
  }
  return {
    code: "",
    constraint: "",
    type: cause instanceof Error ? cause.name : typeof cause,
  };
}

function packageErrorMessage(cause: unknown): string {
  const code = cause instanceof Error ? cause.message : "TRAINING_PACKAGE_IMPORT_FAILED";
  const diagnostic = databaseDiagnostic(cause);
  if (code.startsWith("TRAINING_PACKAGE_FILE_MISSING:")) return `O pacote referencia um arquivo que não existe: ${code.split(":").slice(1).join(":")}`;
  if (code.startsWith("TRAINING_PACKAGE_FILE_TYPE_CONFLICT:")) return `O mesmo arquivo foi usado com tipos diferentes no JSON: ${code.split(":").slice(1).join(":")}`;
  if (code === "TRAINING_PACKAGE_MANIFEST_MISSING") return "Inclua training.json ou manifest.json na raiz do arquivo .zip.";
  if (code === "TRAINING_PACKAGE_MANIFEST_JSON") return "O JSON do pacote não é válido.";
  if (code === "TRAINING_PACKAGE_MANIFEST_SIZE") return "O training.json deve ter no máximo 1 MB.";
  if (code === "TRAINING_PACKAGE_VERSION_UNSUPPORTED") return "A versão do formato do pacote não é suportada. Use formatVersion 1.";
  if (code === "TRAINING_PACKAGE_STEPS_INVALID") return "O pacote deve conter entre 1 e 100 microações.";
  if (code === "TRAINING_PACKAGE_RESULT_REQUIRED") return "Todo passo do tipo ação precisa informar expectedResult.";
  if (code === "TRAINING_PACKAGE_REASON_REQUIRED") return "Todo passo do tipo ação precisa ter ao menos um motivo de dificuldade.";
  if (code === "TRAINING_PACKAGE_IMAGE_FORMAT") return "Use imagens PNG, JPG/JPEG, WEBP ou GIF no pacote.";
  if (code === "TRAINING_PACKAGE_VIDEO_FORMAT") return "Use vídeos MP4 no pacote.";
  if (code === "TRAINING_PACKAGE_CAPTION_FORMAT") return "Use legendas WebVTT com extensão .vtt.";
  if (code === "TRAINING_PACKAGE_CAPTION_WITHOUT_VIDEO") return "Uma legenda .vtt só pode ser associada a um vídeo MP4 local.";
  if (code === "TRAINING_PACKAGE_VIDEO_URL_INVALID") return "A URL de vídeo externo deve usar http ou https.";
  if (code === "TRAINING_CAPTION_INVALID" || code === "TRAINING_CAPTION_SIZE_INVALID") return "Uma das legendas .vtt é inválida. O arquivo deve iniciar com WEBVTT e ter até 1 MB.";
  if (code === "TRAINING_VIDEO_TOO_LONG") return "Os vídeos do pacote devem ter no máximo 60 segundos.";
  if (code === "TRAINING_VIDEO_INVALID") return "Um dos arquivos MP4 não pôde ser validado.";
  if (code.startsWith("TRAINING_ZIP_")) return "O arquivo .zip é inválido, excede os limites permitidos ou contém uma estrutura não segura.";
  if (code === "ASSET_STORAGE_NOT_CONFIGURED") return "O armazenamento de arquivos não está configurado.";
  if (diagnostic.code === "23505" && diagnostic.constraint.includes("help_training_paths") && diagnostic.constraint.includes("slug")) {
    return "Já existe uma trilha com este endereço. Altere o campo slug no training.json e importe novamente.";
  }
  if (diagnostic.code === "23514" && diagnostic.constraint.includes("help_training_step_media")) {
    return "O banco de dados ainda precisa da migration de suporte a legendas das Trilhas. Atualize o projeto e execute as migrations pendentes no ambiente local.";
  }
  return "Não foi possível importar a trilha. O pacote foi validado, mas ocorreu uma falha ao gravar os dados.";
}

export const load: PageServerLoad = async ({ parent }) => {
  const layout = await parent();
  const permissions = new Map(layout.permissions.map((permission) => [permission.code, permission.scope]));
  if (!hasPermission(permissions, "help.view")) throw error(403, "Acesso não autorizado.");

  return {
    paths: await listHelpTrainingPaths(),
    canEdit: hasPermission(permissions, "help.edit"),
    canPublish: hasPermission(permissions, "help.publish"),
  };
};

export const actions: Actions = {
  create: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(cookies, "help.edit", "/app/help/trilhas");
    const formData = await request.formData();
    const title = read(formData, "title");
    const slug = read(formData, "slug");
    const audience = read(formData, "audience");
    const description = read(formData, "description");
    const values = { title, slug, audience, description };

    if (title.length < 4 || title.length > 160 || audience.length > 160 || description.length > 1200) {
      return fail(400, { success: false, message: "Revise os dados da trilha.", values });
    }

    try {
      const path = await createHelpTrainingPath(session.user.id, values);
      throw redirect(303, `/app/help/trilhas/${path.id}`);
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      return fail(409, {
        success: false,
        message: "Não foi possível criar a trilha. Verifique se o endereço já está em uso.",
        values,
      });
    }
  },

  importPackage: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(cookies, "help.edit", "/app/help/trilhas");
    const formData = await request.formData();
    const file = formData.get("package");
    if (!(file instanceof File) || file.size < 1) {
      return fail(400, { success: false, message: "Selecione um arquivo .zip para importar." });
    }
    if (!file.name.toLowerCase().endsWith(".zip") || file.size > MAX_PACKAGE_BYTES) {
      return fail(400, { success: false, message: "Use um arquivo .zip de até 120 MB." });
    }

    try {
      const path = await importHelpTrainingPackage(session.user.id, new Uint8Array(await file.arrayBuffer()));
      throw redirect(303, `/app/help/trilhas/${path.id}`);
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      const diagnostic = databaseDiagnostic(cause);
      console.error("[help.training.import]", {
        diagnosticCode: cause instanceof Error && cause.message.startsWith("TRAINING_")
          ? cause.message.split(":", 1)[0]
          : "TRAINING_PACKAGE_IMPORT_FAILED",
        databaseCode: diagnostic.code || undefined,
        constraint: diagnostic.constraint || undefined,
        causeType: diagnostic.type,
      });
      return fail(400, { success: false, message: packageErrorMessage(cause) });
    }
  },
};
