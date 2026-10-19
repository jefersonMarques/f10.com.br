import { processMovideskEditorialReview } from "$lib/server/help/movideskEditorialReview";
import { readHelpZipTextEntry } from "$lib/server/help/helpImportPackage";
import { movideskImageRecoveryDashboard, setMovideskImageRecoveryRunning, retryFailedMovideskImages } from "$lib/server/help/movideskImageRecovery";
import { error, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import {
  approveMovideskArticle,
  isMovideskMigrationEnabled,
  isMovideskTokenConfigured,
  listMovideskMigrationDashboard,
  retryFailedMovideskArticles,
  reprocessMovideskArticles,
  setMovideskMigrationRunning,
  startMovideskCatalogSync,
} from "$lib/server/help/movideskMigration";

const ROUTE = "/app/help/content/movidesk";

function requireMigrationEnabled(): void {
  if (!isMovideskMigrationEnabled()) throw error(404, "Ferramenta de migração desativada.");
}
function errorText(cause: unknown): string {
  const code = cause instanceof Error ? cause.message : "";
  if (code === "MOVIDESK_TOKEN_MISSING") return "Configure MOVIDESK_KB_API_TOKEN no servidor.";
  if (code === "MOVIDESK_MIGRATION_DISABLED") return "Ferramenta de migração desativada.";
  return "Não foi possível executar esta operação.";
}

export const load: PageServerLoad = async ({ cookies }) => {
  requireMigrationEnabled();
  await requireAppPermission(cookies, "system.settings.manage", ROUTE);
  const [dashboard, imageRecovery] = await Promise.all([
    listMovideskMigrationDashboard(),
    movideskImageRecoveryDashboard(),
  ]);
  return { tokenConfigured: isMovideskTokenConfigured(), ...dashboard, imageRecovery };
};

export const actions: Actions = {
  recoverImages: async ({ cookies }) => {
    requireMigrationEnabled();
    await requireAppPermission(cookies, "system.settings.manage", ROUTE);
    try {
      await setMovideskImageRecoveryRunning(true);
      return { success: true, message: "Cópia das imagens iniciada no servidor. Os artigos não serão reprocessados." };
    } catch (cause) {
      return fail(409, { success: false, message: cause instanceof Error
        && cause.message === "ASSET_STORAGE_NOT_CONFIGURED"
        ? "Configure o bucket do F10 antes de iniciar." : errorText(cause) });
    }
  },
  pauseImages: async ({ cookies }) => {
    requireMigrationEnabled();
    await requireAppPermission(cookies, "system.settings.manage", ROUTE);
    await setMovideskImageRecoveryRunning(false);
    return { success: true, message: "Recuperação de imagens pausada." };
  },
  retryImages: async ({ cookies }) => {
    requireMigrationEnabled();
    await requireAppPermission(cookies, "system.settings.manage", ROUTE);
    try {
      await retryFailedMovideskImages();
      return { success: true, message: "As imagens pendentes foram colocadas novamente na fila." };
    } catch (cause) {
      return fail(409, { success: false, message: cause instanceof Error
        && cause.message === "ASSET_STORAGE_NOT_CONFIGURED"
        ? "Configure o bucket do F10 antes de continuar." : errorText(cause) });
    }
  },
  editorialReview: async ({ cookies, request }) => {
    requireMigrationEnabled();
    const { session } = await requireAppPermission(cookies, "system.settings.manage", ROUTE);
    const data = await request.formData();
    const file = data.get("reviewFile");
    const apply = data.get("mode") === "apply";
    if (!(file instanceof File) || file.size < 1 || file.size > 12 * 1024 * 1024) {
      return fail(400, { success: false, action: "editorialReview",
        message: "Selecione o ZIP editorial (até 12 MB)." });
    }
    try {
      let raw: string;
      if (file.name.toLowerCase().endsWith(".zip")) {
        raw = readHelpZipTextEntry(new Uint8Array(await file.arrayBuffer()), "revisao-f10.json");
      } else if (file.name.toLowerCase().endsWith(".json")) {
        raw = await file.text();
      } else {
        return fail(400, { success: false, action: "editorialReview",
          message: "Envie o pacote ZIP de revisão ou revisao-f10.json." });
      }
      const result = await processMovideskEditorialReview(raw, session.user.id, apply);
      return {
        success: true, action: "editorialReview",
        message: apply
          ? `${result.applied} rascunhos atualizados. ${result.held} preservados. Nada foi publicado. As coleções continuam como sugestões até a publicação dos artigos.`
          : `Pacote validado: ${result.checked} rascunhos aptos, ${result.held} preservados. Nenhuma alteração realizada.`,
      };
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "";
      const known = /^HELP_EDITORIAL_(CONTENT_PROTECTED|VERSION_CHANGED|STEPS_CHANGED|BLOCKS_CHANGED|VIDEO_CHANGED|IMAGES_CHANGED|CATEGORY_INVALID|STEP_OWNERSHIP|BLOCK_OWNERSHIP):([0-9]+)$/.exec(code);
      const invalidField = /^HELP_EDITORIAL_INVALID_FIELD:([a-zA-Z]+)$/.exec(code);
      const labels: Record<string, string> = {
        CONTENT_PROTECTED: "está protegido ou já foi aprovado/publicado",
        VERSION_CHANGED: "foi alterado após a exportação",
        STEPS_CHANGED: "teve suas etapas modificadas",
        BLOCKS_CHANGED: "teve seus blocos modificados",
        VIDEO_CHANGED: "teve o vídeo principal modificado",
        IMAGES_CHANGED: "teve suas imagens modificadas",
        CATEGORY_INVALID: "possui uma categoria inválida ou inativa",
        STEP_OWNERSHIP: "possui etapa pertencente a outro artigo",
        BLOCK_OWNERSHIP: "possui bloco incompatível",
      };
      const message = known
        ? `Artigo #${known[2]} ${labels[known[1]]}. Gere uma exportação atualizada antes de aplicar.`
        : invalidField
          ? `O campo "${invalidField[1]}" tem formato inválido ou excede o limite. Nenhuma alteração realizada.`
          : code === "HELP_EDITORIAL_INVALID_STEPS" || code === "HELP_EDITORIAL_INVALID_BLOCKS"
            ? "O pacote contém etapas ou blocos fora dos limites permitidos. Nenhuma alteração realizada."
            : code.startsWith("HELP_EDITORIAL_")
              ? `O arquivo não passou na verificação (${code}). Nenhuma alteração realizada.`
              : "Erro ao consultar ou aplicar o pacote. Consulte os logs do servidor antes de tentar novamente.";
      // Não registrar o conteúdo do ZIP ou parâmetros SQL, que podem conter dados internos.
      if (!code.startsWith("HELP_EDITORIAL_")) {
        const dbCode = cause && typeof cause === "object" && "code" in cause
          ? String(cause.code).slice(0, 30) : "unknown";
        console.error("[help-editorial] failed", { name: cause instanceof Error ? cause.name : "unknown", dbCode });
      }
      return fail(409, { success: false, action: "editorialReview", message });
    }
  },
  sync: async ({ cookies }) => {
    requireMigrationEnabled();
    const { session } = await requireAppPermission(cookies, "system.settings.manage", ROUTE);
    try {
      await startMovideskCatalogSync(session.user.id);
      return { success: true, message: "Inventário iniciado. A importação continua no servidor." };
    } catch (cause) { return fail(409, { success: false, message: errorText(cause) }); }
  },
  pause: async ({ cookies }) => {
    requireMigrationEnabled();
    await requireAppPermission(cookies, "system.settings.manage", ROUTE);
    await setMovideskMigrationRunning(false);
    return { success: true, message: "Fila pausada. O trabalho concluído foi preservado." };
  },
  resume: async ({ cookies }) => {
    requireMigrationEnabled();
    await requireAppPermission(cookies, "system.settings.manage", ROUTE);
    try {
      await setMovideskMigrationRunning(true);
      return { success: true, message: "Fila retomada." };
    } catch (cause) { return fail(409, { success: false, message: errorText(cause) }); }
  },
  retry: async ({ cookies }) => {
    requireMigrationEnabled();
    const { session } = await requireAppPermission(cookies, "system.settings.manage", ROUTE);
    try {
      if (!isMovideskTokenConfigured()) throw new Error("MOVIDESK_TOKEN_MISSING");
      await retryFailedMovideskArticles(session.user.id);
      return { success: true, message: "Artigos com falha colocados novamente na fila." };
    } catch (cause) { return fail(409, { success: false, message: errorText(cause) }); }
  },
  reprocess: async ({ cookies }) => {
    requireMigrationEnabled();
    const { session } = await requireAppPermission(cookies, "system.settings.manage", ROUTE);
    try {
      const result = await reprocessMovideskArticles(session.user.id);
      return { success: true, message: result.queued
        ? `${result.queued} artigos colocados na fila; ${result.skipped} preservados (editados, aprovados ou publicados).`
        : "Nenhum artigo elegível para reprocessamento." };
    } catch (cause) {
      return fail(409, { success: false, message: cause instanceof Error
        && cause.message === "MOVIDESK_REPROCESS_BUSY"
        ? "Conclua ou pause a importação atual antes de reprocessar."
        : errorText(cause) });
    }
  },
  approve: async ({ cookies, request }) => {
    requireMigrationEnabled();
    await requireAppPermission(cookies, "system.settings.manage", ROUTE);
    const id = Number((await request.formData()).get("sourceId"));
    if (!Number.isSafeInteger(id) || id <= 0) return fail(400, { success: false, message: "Artigo inválido." });
    try {
      await approveMovideskArticle(id);
      return { success: true, message: "Artigo aprovado para publicação no editor." };
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "";
      if (code.startsWith("MOVIDESK_IMAGES_PENDING:")) {
        const [, saved, total] = code.split(":");
        return fail(409, { success: false, message:
          `Aprovação bloqueada: ${saved} de ${total} imagens foram copiadas. Use Recuperar imagens ou Repetir falhas antes de aprovar.` });
      }
      return fail(409, { success: false, message: "Não foi possível aprovar este artigo." });
    }
  },
};
