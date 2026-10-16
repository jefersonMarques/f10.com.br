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
  return { tokenConfigured: isMovideskTokenConfigured(), ...await listMovideskMigrationDashboard() };
};

export const actions: Actions = {
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
          `Aprovação bloqueada: ${saved} de ${total} imagens foram copiadas. Reprocesse o artigo antes de aprovar.` });
      }
      return fail(409, { success: false, message: "Não foi possível aprovar este artigo." });
    }
  },
};
