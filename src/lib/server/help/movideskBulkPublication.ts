import { env } from "$env/dynamic/private";
import { and, eq, inArray } from "drizzle-orm";
import { isHelpHumanReviewComplete } from "$lib/help/helpHumanReview";
import { hasHelpBulkEditorialAcceptance } from "$lib/help/helpBulkEditorialAcceptance";
import { approveCuratedMovideskArticle } from "$lib/server/help/movideskBulkApproval";
import { getDatabase } from "$lib/server/db";
import { helpMovideskPublicationState, type MovideskPublicationResult } from "$lib/server/db/helpMovideskPublicationSchema";
import { helpMovideskArticles, helpMovideskImportState } from "$lib/server/db/helpMovideskSchema";
import { helpContents } from "$lib/server/db/structuredHelpSchema";
import { helpPublications } from "$lib/server/db/helpPublications";
import { getStructuredHelpContent } from "$lib/server/help/structuredHelpRepository";
import { publishHelpKnowledgeContent } from "$lib/server/help/helpKnowledgePublisher";
import { listHelpCollections, saveHelpCollection } from "$lib/server/help/helpCollectionRepository";
import { MOVIDESK_PUBLIC_COLLECTIONS, MOVIDESK_PUBLIC_EXCLUSIONS, MOVIDESK_PUBLIC_SOURCE_IDS } from "$lib/server/help/movideskPublicationPlan";

const INTERVAL_MS = 1_500;
const LEASE_MS = 5 * 60_000;
const PUBLIC_IDS = new Set(MOVIDESK_PUBLIC_SOURCE_IDS);
const ACTIVE_PHASES = new Set(["approving", "approving-and-publishing", "publishing", "collections"]);

function enabled(): boolean {
  return env.F10_MOVIDESK_MIGRATION_ENABLED?.trim() === "true";
}

async function ensureState(): Promise<void> {
  const db = getDatabase();
  await db.insert(helpMovideskPublicationState).values({ id: 1 }).onConflictDoNothing();
  // Versões anteriores concluíam a aprovação sem desativar o trabalho.
  // Corrige a inconsistência persistida sem reiniciar ou alterar os resultados.
  await db.update(helpMovideskPublicationState)
    .set({ enabled: false, updatedAt: new Date() })
    .where(and(
      eq(helpMovideskPublicationState.id, 1),
      eq(helpMovideskPublicationState.phase, "done"),
      eq(helpMovideskPublicationState.enabled, true),
    ));
}

export async function movideskPublicationOverview() {
  await ensureState();
  const db = getDatabase();
  const [states, originals] = await Promise.all([
    db.select().from(helpMovideskPublicationState).where(eq(helpMovideskPublicationState.id, 1)).limit(1),
    db.select({
      sourceId: helpMovideskArticles.sourceId,
      title: helpMovideskArticles.title,
      contentId: helpMovideskArticles.contentId,
      needsReview: helpMovideskArticles.needsReview,
    }).from(helpMovideskArticles).where(inArray(helpMovideskArticles.sourceId, MOVIDESK_PUBLIC_SOURCE_IDS)),
  ]);
  const contentIds = originals.flatMap((row) => row.contentId ? [row.contentId] : []);
  const contents = contentIds.length
    ? await db.select({ id: helpContents.id, status: helpContents.status })
      .from(helpContents).where(inArray(helpContents.id, contentIds)) : [];
  const status = new Map(contents.map((row) => [row.id, row.status]));
  const known = new Map(originals.map((row) => [row.sourceId, row]));
  const candidates: Array<{ sourceId: number; title: string; contentId: string }> = [];
  let pendingReview = 0;
  let readyToCheck = 0;
  let alreadyPublished = 0;
  let missing = 0;
  for (const id of MOVIDESK_PUBLIC_SOURCE_IDS) {
    const row = known.get(id);
    if (!row?.contentId || !status.has(row.contentId)) { missing++; continue; }
    if (status.get(row.contentId) === "published") { alreadyPublished++; continue; }
    if (row.needsReview || status.get(row.contentId) !== "draft") { pendingReview++; continue; }
    readyToCheck++;
    candidates.push({ sourceId: id, title: row.title, contentId: row.contentId });
  }
  const state = states[0];
  const results = state?.results ?? [];
  return {
    planned: MOVIDESK_PUBLIC_SOURCE_IDS.length,
    publicCollections: MOVIDESK_PUBLIC_COLLECTIONS.length,
    pendingReview, readyToCheck, alreadyPublished, missing, candidates,
    job: state ? {
      enabled: state.enabled && ACTIVE_PHASES.has(state.phase), phase: state.phase,
      processed: state.cursor, total: state.sourceIds.length,
      published: results.filter((result) => result.status === "published").length,
      errors: results.filter((result) => result.status === "blocked").map((result) => ({ sourceId: result.sourceId, reason: result.reason ?? "REVISAR_ARTIGO" })),
      approved: results.filter((result) => result.status === "approved").length,
      blocked: results.filter((result) => result.status === "blocked").length,
      lastError: state.lastError,
      recent: results.slice(-12).reverse(),
    } : null,
  };
}

export async function startMovideskBulkPublication(actorUserId: string): Promise<number> {
  if (!enabled()) throw new Error("MOVIDESK_MIGRATION_DISABLED");
  await ensureState();
  const db = getDatabase();
  return db.transaction(async (tx) => {
    const [state] = await tx.select().from(helpMovideskPublicationState)
      .where(eq(helpMovideskPublicationState.id, 1)).for("update").limit(1);
    if ((state?.enabled && state.phase !== "done") || ["approving", "approving-and-publishing", "publishing", "collections"].includes(state?.phase ?? "")) {
      throw new Error("MOVIDESK_PUBLICATION_JOB_EXISTS");
    }
    const [importState] = await tx.select({ enabled: helpMovideskImportState.enabled })
      .from(helpMovideskImportState).where(eq(helpMovideskImportState.id, 1));
    if (importState?.enabled) throw new Error("MOVIDESK_REPROCESS_BUSY");
    const rows = await tx.select({
      sourceId: helpMovideskArticles.sourceId,
      contentId: helpMovideskArticles.contentId,
      needsReview: helpMovideskArticles.needsReview,
    }).from(helpMovideskArticles).where(and(
      inArray(helpMovideskArticles.sourceId, MOVIDESK_PUBLIC_SOURCE_IDS),
      eq(helpMovideskArticles.needsReview, false),
    ));
    const contentIds = rows.flatMap((row) => row.contentId ? [row.contentId] : []);
    const contentRows = contentIds.length
      ? await tx.select({ id: helpContents.id, status: helpContents.status, importSource: helpContents.importSource })
        .from(helpContents).where(inArray(helpContents.id, contentIds)) : [];
    const draftIds = new Set(contentRows.filter((row) => row.status === "draft" && row.importSource === "movidesk")
      .map((row) => row.id));
    const sourceIds = rows.filter((row) => row.contentId && draftIds.has(row.contentId))
      .map((row) => row.sourceId).sort((a, b) => a - b);
    if (!sourceIds.length) throw new Error("MOVIDESK_PUBLICATION_NOT_APPROVED");

    await tx.update(helpMovideskPublicationState).set({
      enabled: true, phase: "publishing", sourceIds, cursor: 0, results: [],
      startedBy: actorUserId, lastError: null, nextRequestAt: new Date(), updatedAt: new Date(),
    }).where(eq(helpMovideskPublicationState.id, 1));
    return sourceIds.length;
  });
}


/**
 * Inicia a aprovação editorial em lote a pedido do administrador.
 * A fase é distinta da publicação, e não escreve declarações de revisão
 * visual individual. Cada artigo é verificado pelo worker antes do aceite.
 */
export async function startMovideskMassApproval(actorUserId: string): Promise<number> {
  if (!enabled()) throw new Error("MOVIDESK_MIGRATION_DISABLED");
  await ensureState();
  const db = getDatabase();
  return db.transaction(async (tx) => {
    const [state] = await tx.select().from(helpMovideskPublicationState)
      .where(eq(helpMovideskPublicationState.id, 1)).for("update").limit(1);
    if (state?.enabled || ["approving", "publishing", "collections"].includes(state?.phase ?? "")) {
      throw new Error("MOVIDESK_PUBLICATION_JOB_EXISTS");
    }
    const [importState] = await tx.select({ enabled: helpMovideskImportState.enabled })
      .from(helpMovideskImportState).where(eq(helpMovideskImportState.id, 1)).limit(1);
    if (importState?.enabled) throw new Error("MOVIDESK_REPROCESS_BUSY");

    const rows = await tx.select({
      sourceId: helpMovideskArticles.sourceId,
      contentId: helpMovideskArticles.contentId,
      needsReview: helpMovideskArticles.needsReview,
      state: helpMovideskArticles.state,
      issue: helpMovideskArticles.issue,
    }).from(helpMovideskArticles).where(inArray(
      helpMovideskArticles.sourceId, MOVIDESK_PUBLIC_SOURCE_IDS,
    ));
    const preliminaries = rows.filter((row) =>
      row.needsReview && row.contentId && !row.issue?.trim()
      && (row.state === "imported" || row.state === "review"),
    );
    const ids = preliminaries.flatMap((row) => row.contentId ? [row.contentId] : []);
    const contents = ids.length
      ? await tx.select({
          id: helpContents.id, status: helpContents.status,
          importSource: helpContents.importSource, contentKind: helpContents.contentKind,
        }).from(helpContents).where(inArray(helpContents.id, ids))
      : [];
    const valid = new Set(contents.filter((row) =>
      row.status === "draft" && row.importSource === "movidesk"
      && row.contentKind === "support_article",
    ).map((row) => row.id));
    const sourceIds = preliminaries
      .filter((row) => row.contentId && valid.has(row.contentId))
      .map((row) => row.sourceId).sort((a, b) => a - b);
    if (!sourceIds.length) throw new Error("MOVIDESK_NO_BULK_APPROVAL_CANDIDATES");

    await tx.update(helpMovideskPublicationState).set({
      phase: "approving", enabled: true, sourceIds, cursor: 0,
      results: [], startedBy: actorUserId, lastError: null,
      nextRequestAt: new Date(), updatedAt: new Date(),
    }).where(eq(helpMovideskPublicationState.id, 1));
    return sourceIds.length;
  });
}


/**
 * Um único pedido confirmado executa aprovação, publicação e coleções.
 * Também retoma uma aprovação antiga em andamento, preservando seu cursor.
 */
export async function startMovideskCompletePublication(actorUserId: string): Promise<number> {
  if (!enabled()) throw new Error("MOVIDESK_MIGRATION_DISABLED");
  await ensureState();
  const db = getDatabase();
  return db.transaction(async (tx) => {
    const [state] = await tx.select().from(helpMovideskPublicationState)
      .where(eq(helpMovideskPublicationState.id, 1)).for("update").limit(1);
    const [importState] = await tx.select({ enabled: helpMovideskImportState.enabled })
      .from(helpMovideskImportState).where(eq(helpMovideskImportState.id, 1)).limit(1);
    if (importState?.enabled) throw new Error("MOVIDESK_REPROCESS_BUSY");

    // Uma publicação anterior não deve ser reiniciada enquanto está no meio.
    if (state && ["publishing", "collections"].includes(state.phase)) {
      await tx.update(helpMovideskPublicationState).set({
        enabled: true, nextRequestAt: new Date(), updatedAt: new Date(),
      }).where(eq(helpMovideskPublicationState.id, 1));
      return state.sourceIds.length;
    }

    const rows = await tx.select({
      sourceId: helpMovideskArticles.sourceId,
      contentId: helpMovideskArticles.contentId,
    }).from(helpMovideskArticles).where(inArray(
      helpMovideskArticles.sourceId, MOVIDESK_PUBLIC_SOURCE_IDS,
    ));
    const contentIds = rows.flatMap((row) => row.contentId ? [row.contentId] : []);
    const contentRows = contentIds.length
      ? await tx.select({
          id: helpContents.id, status: helpContents.status,
          importSource: helpContents.importSource,
          contentKind: helpContents.contentKind,
        }).from(helpContents).where(inArray(helpContents.id, contentIds))
      : [];
    const drafts = new Set(contentRows.filter((row) =>
      row.status === "draft" && row.importSource === "movidesk"
        && row.contentKind === "support_article",
    ).map((row) => row.id));
    const candidates = rows
      .filter((row) => row.contentId && drafts.has(row.contentId))
      .map((row) => row.sourceId).sort((a, b) => a - b);

    // Preserva artigos já processados se o usuário mudar da aprovação antiga
    // para o fluxo completo enquanto ela continua rodando.
    const continuing = state && ["approving", "approving-and-publishing"].includes(state.phase);
    const completed = continuing ? state.sourceIds.slice(0, state.cursor) : [];
    const sourceIds = continuing
      ? [...completed, ...new Set([...state.sourceIds.slice(state.cursor), ...candidates]
        .filter((id) => !completed.includes(id)))]
      : candidates;
    if (!sourceIds.length) {
      // Mesmo sem novos artigos, a coleção pode estar desatualizada.
      await tx.update(helpMovideskPublicationState).set({
        enabled: true, phase: "collections", sourceIds: [], cursor: 0, results: [],
        startedBy: actorUserId, lastError: null,
        nextRequestAt: new Date(), updatedAt: new Date(),
      }).where(eq(helpMovideskPublicationState.id, 1));
      return 0;
    }
    await tx.update(helpMovideskPublicationState).set({
      enabled: true, phase: "approving-and-publishing",
      sourceIds, cursor: completed.length,
      results: continuing ? state.results : [],
      startedBy: actorUserId, lastError: null,
      nextRequestAt: new Date(), updatedAt: new Date(),
    }).where(eq(helpMovideskPublicationState.id, 1));
    return sourceIds.length;
  });
}

export async function setMovideskBulkPublicationRunning(running: boolean): Promise<void> {
  if (!enabled()) throw new Error("MOVIDESK_MIGRATION_DISABLED");
  await ensureState();
  const db = getDatabase();
  const [state] = await db.select().from(helpMovideskPublicationState)
    .where(eq(helpMovideskPublicationState.id, 1)).limit(1);
  if (!state || !["approving", "approving-and-publishing", "publishing", "collections"].includes(state.phase)) {
    throw new Error("MOVIDESK_PUBLICATION_NO_ACTIVE_JOB");
  }
  await db.update(helpMovideskPublicationState)
    .set({ enabled: running, nextRequestAt: new Date(), lastError: null, updatedAt: new Date() })
    .where(eq(helpMovideskPublicationState.id, 1));
}

// Idempotente: mantém itens já existentes e acrescenta apenas artigos realmente publicados.
export async function syncMovideskPublicCollections(actorUserId: string) {
  if (!enabled()) throw new Error("MOVIDESK_MIGRATION_DISABLED");
  const db = getDatabase();
  const [originals, existing, published] = await Promise.all([
    db.select({ sourceId: helpMovideskArticles.sourceId, contentId: helpMovideskArticles.contentId })
      .from(helpMovideskArticles).where(inArray(helpMovideskArticles.sourceId, MOVIDESK_PUBLIC_SOURCE_IDS)),
    listHelpCollections(),
    db.select({ entityId: helpPublications.entityId }).from(helpPublications)
      .where(eq(helpPublications.entityType, "content")),
  ]);
  const publicIds = new Set(published.map((row) => row.entityId));
  const contentBySource = new Map(originals.map((row) => [row.sourceId, row.contentId]));
  const existingBySlug = new Map(existing.map((row) => [row.slug, row]));
  let created = 0;
  let updated = 0;
  for (const plan of MOVIDESK_PUBLIC_COLLECTIONS) {
    const collection = existingBySlug.get(plan.slug);
    const plannedIds = plan.sourceIds
      .filter((sourceId) => !MOVIDESK_PUBLIC_EXCLUSIONS.has(sourceId))
      .flatMap((sourceId) => {
        const contentId = contentBySource.get(sourceId);
        return contentId && publicIds.has(contentId) ? [contentId] : [];
      });
    const keptIds = collection?.items.filter((item) => item.published).map((item) => item.contentId) ?? [];
    const ids = [...new Set([...keptIds, ...plannedIds])].slice(0, 100);
    if (!ids.length || (collection && plannedIds.every((id) => keptIds.includes(id)))) continue;
    await saveHelpCollection(actorUserId, {
      collectionId: collection?.id ?? null,
      title: collection?.title ?? plan.title,
      slug: plan.slug,
      description: collection?.description ?? plan.description,
      active: collection?.active ?? true,
      sortOrder: collection?.sortOrder ?? plan.sortOrder,
      contentIds: ids,
    });
    if (collection) updated++;
    else created++;
  }
  return { created, updated };
}

async function publishOne(sourceId: number, actorUserId: string): Promise<MovideskPublicationResult> {
  const blocked = (reason: string): MovideskPublicationResult => ({ sourceId, status: "blocked", reason });
  if (!PUBLIC_IDS.has(sourceId) || MOVIDESK_PUBLIC_EXCLUSIONS.has(sourceId)) {
    return blocked("FORA_DA_LISTA_PUBLICA");
  }
  const db = getDatabase();
  const [article] = await db.select({
    contentId: helpMovideskArticles.contentId,
    needsReview: helpMovideskArticles.needsReview,
  }).from(helpMovideskArticles).where(eq(helpMovideskArticles.sourceId, sourceId)).limit(1);
  if (!article?.contentId) return blocked("ARTIGO_NAO_ENCONTRADO");
  if (article.needsReview) return blocked("REVISAO_EDITORIAL_PENDENTE");
  const content = await getStructuredHelpContent(article.contentId);
  if (!content || content.importSource !== "movidesk" || content.contentKind !== "support_article") {
    return blocked("CONTEUDO_INCOMPATIVEL");
  }
  if (content.status === "published") return { sourceId, status: "already-published" };
  if (content.status !== "draft") return blocked("ARTIGO_NAO_E_RASCUNHO");
  const [publication] = await db.select({ entityId: helpPublications.entityId })
    .from(helpPublications).where(and(
      eq(helpPublications.entityType, "content"),
      eq(helpPublications.entityId, content.id),
    )).limit(1);
  if (publication) return { sourceId, status: "already-published" };

  const imageBlocks = content.steps.flatMap((step) => step.blocks)
    .filter((block) => block.blockType === "image");
  if (imageBlocks.some((block) => !block.asset?.storageKey)) return blocked("IMAGENS_FORA_DO_BUCKET");
  if (imageBlocks.some((block) =>
    !isHelpHumanReviewComplete(block.metadata, block.asset?.id) &&
    !(Boolean(block.asset?.storageKey) && hasHelpBulkEditorialAcceptance(block.metadata, block.asset?.id, content.updatedAt))
  )) {
    return blocked("REVISAO_HUMANA_DAS_IMAGENS_PENDENTE");
  }
  try {
    await publishHelpKnowledgeContent(actorUserId, content.id);
    return { sourceId, status: "published" };
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "";
    const reason = /^[A-Z][A-Z0-9_]{3,80}$/.test(code) ? code : "FALHA_DE_PUBLICACAO";
    console.warn("[movidesk-publicacao] artigo bloqueado", { sourceId, reason });
    return blocked(reason);
  }
}

export async function tickMovideskBulkPublication(): Promise<void> {
  if (!enabled()) return;
  const db = getDatabase();
  const claimed = await db.transaction(async (tx) => {
    const [state] = await tx.select().from(helpMovideskPublicationState)
      .where(eq(helpMovideskPublicationState.id, 1)).for("update").limit(1);
    if (!state?.enabled || state.nextRequestAt > new Date()) return null;
    if (!["approving", "approving-and-publishing", "publishing", "collections"].includes(state.phase)) return null;
    if (!state.startedBy) {
      await tx.update(helpMovideskPublicationState).set({
        enabled: false, lastError: "RESPONSAVEL_INDISPONIVEL", updatedAt: new Date(),
      }).where(eq(helpMovideskPublicationState.id, 1));
      return null;
    }
    await tx.update(helpMovideskPublicationState).set({
      nextRequestAt: new Date(Date.now() + LEASE_MS), updatedAt: new Date(),
    }).where(eq(helpMovideskPublicationState.id, 1));
    return {
      phase: state.phase, cursor: state.cursor,
      sourceId: state.sourceIds[state.cursor],
      total: state.sourceIds.length, actorId: state.startedBy,
    };
  });
  if (!claimed) return;
  if (claimed.phase === "collections" || claimed.cursor >= claimed.total) {
    try {
      await syncMovideskPublicCollections(claimed.actorId);
      await db.update(helpMovideskPublicationState).set({
        enabled: false, phase: "done", lastError: null, updatedAt: new Date(),
      }).where(eq(helpMovideskPublicationState.id, 1));
    } catch (cause) {
      console.error("[movidesk-publicacao] colecoes", cause instanceof Error ? cause.name : "unknown");
      await db.update(helpMovideskPublicationState).set({
        enabled: false, phase: "collections", lastError: "COLECOES_NAO_CONCLUIDAS",
        updatedAt: new Date(),
      }).where(eq(helpMovideskPublicationState.id, 1));
    }
    return;
  }
  const result: MovideskPublicationResult = claimed.phase === "approving" || claimed.phase === "approving-and-publishing"
    ? await (async (): Promise<MovideskPublicationResult> => {
        const sourceId = claimed.sourceId!;
        try {
          const status = await approveCuratedMovideskArticle(sourceId, claimed.actorId);
          return { sourceId, status };
        } catch (cause) {
          const code = cause instanceof Error ? cause.message : "";
          return {
            sourceId, status: "blocked",
            reason: /^[A-Z][A-Z0-9_]{3,80}$/.test(code) ? code : "REVISAR_ARTIGO",
          };
        }
      })()
    : await publishOne(claimed.sourceId!, claimed.actorId);
  await db.transaction(async (tx) => {
    const [state] = await tx.select().from(helpMovideskPublicationState)
      .where(eq(helpMovideskPublicationState.id, 1)).for("update").limit(1);
    if (!state || state.phase !== claimed.phase || state.cursor !== claimed.cursor) return;
    const nextCursor = state.cursor + 1;
    await tx.update(helpMovideskPublicationState).set({
      cursor: nextCursor >= state.sourceIds.length && claimed.phase === "approving-and-publishing"
        ? 0 : nextCursor,
      enabled: nextCursor >= state.sourceIds.length && claimed.phase === "approving"
        ? false : state.enabled,
      phase: nextCursor >= state.sourceIds.length
        ? (claimed.phase === "approving" ? "done"
          : claimed.phase === "approving-and-publishing" ? "publishing" : "collections")
        : claimed.phase,
      results: [...state.results, result],
      nextRequestAt: new Date(Date.now() + INTERVAL_MS),
      lastError: null,
      updatedAt: new Date(),
    }).where(eq(helpMovideskPublicationState.id, 1));
  });
}

let started = false;
let busy = false;
export function startMovideskBulkPublicationWorker(): void {
  if (started || !enabled()) return;
  if (env.NODE_ENV === "production" && env.F10_HELP_VIDEO_WORKER !== "1") return;
  started = true;
  const timer = setInterval(() => {
    if (busy) return;
    busy = true;
    void tickMovideskBulkPublication()
      .catch((cause) => console.error("[movidesk-publicacao] worker", cause instanceof Error ? cause.name : "unknown"))
      .finally(() => { busy = false; });
  }, INTERVAL_MS);
  timer.unref();
}
