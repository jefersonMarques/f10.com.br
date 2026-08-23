import { and, eq, inArray } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import {
  helpAssets,
  helpCategories,
  helpContentCategories,
  helpContentFeaturedVideos,
  helpContents,
  helpContentSteps,
  helpStepBlocks,
} from "$lib/server/db/structuredHelpSchema";
import { normalizeHelpSlug } from "$lib/server/help/helpArticleRepository";
import { normalizeHelpCategorySlug } from "$lib/server/help/helpCategoryRepository";

const IMPORT_FORMAT = "f10-help-import";
const IMPORT_VERSION = 1 as const;
const MAX_CONTENTS = 250;
const MAX_STEPS_PER_CONTENT = 80;
const MAX_BLOCKS_PER_STEP = 80;
const MAX_TOTAL_BLOCKS = 8_000;
const MAX_CATEGORIES_PER_CONTENT = 12;
const MAX_SEARCH_ALIASES = 80;

type NoticeVariant = "info" | "warning" | "success" | "danger";

export type HelpImportCategory = {
  slug: string;
  destinationUrl?: string;
};

export type HelpImportFeaturedVideo = {
  url: string;
  description?: string;
  subtitles: string;
  assistantSummary?: string;
};

export type HelpImportBlock =
  | { type: "text"; text: string }
  | { type: "notice"; text: string; variant?: NoticeVariant }
  | { type: "link"; url: string; label: string }
  | {
      type: "image";
      url: string;
      altText?: string;
      assistantDescription?: string;
    }
  | {
      type: "file";
      url: string;
      label: string;
      extractedText?: string;
      assistantSummary?: string;
    };

export type HelpImportStep = {
  title: string;
  description?: string;
  assistantKnowledge?: string;
  blocks: HelpImportBlock[];
};

export type HelpImportContent = {
  externalId: string;
  title: string;
  slug?: string;
  summary?: string;
  categories: HelpImportCategory[];
  searchAliases: string[];
  assistantKnowledge?: string;
  internalSupportNotes?: string;
  featuredVideo?: HelpImportFeaturedVideo;
  steps: HelpImportStep[];
};

export type HelpImportFile = {
  format: typeof IMPORT_FORMAT;
  version: typeof IMPORT_VERSION;
  source: string;
  contents: HelpImportContent[];
};

export type HelpImportValidation = {
  valid: boolean;
  source: string;
  contentCount: number;
  stepCount: number;
  blockCount: number;
  issues: string[];
  parsed: HelpImportFile | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(record: Record<string, unknown>, key: string): string {
  return typeof record[key] === "string" ? record[key].trim() : "";
}

function optionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = readString(record, key);
  return value || undefined;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isDestinationUrl(value: string): boolean {
  if (!value) return true;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  return isHttpUrl(value);
}

function parseStringArray(
  value: unknown,
  path: string,
  issues: string[],
  maxItems: number,
): string[] {
  if (!Array.isArray(value)) {
    issues.push(`${path}: deve ser uma lista.`);
    return [];
  }
  if (value.length > maxItems) issues.push(`${path}: máximo de ${maxItems} itens.`);
  const result: string[] = [];
  for (const [index, item] of value.entries()) {
    if (typeof item !== "string" || !item.trim()) {
      issues.push(`${path}[${index}]: informe um texto válido.`);
      continue;
    }
    const normalized = item.trim();
    if (normalized.length > 160) {
      issues.push(`${path}[${index}]: máximo de 160 caracteres.`);
      continue;
    }
    result.push(normalized);
  }
  return Array.from(new Set(result));
}

function parseCategories(
  value: unknown,
  path: string,
  issues: string[],
): HelpImportCategory[] {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push(`${path}: todo conteúdo precisa de pelo menos uma categoria.`);
    return [];
  }
  if (value.length > MAX_CATEGORIES_PER_CONTENT) {
    issues.push(`${path}: máximo de ${MAX_CATEGORIES_PER_CONTENT} categorias por conteúdo.`);
  }

  const result = new Map<string, HelpImportCategory>();
  for (const [index, item] of value.entries()) {
    const record = asRecord(item);
    if (!record) {
      issues.push(`${path}[${index}]: categoria inválida.`);
      continue;
    }
    const slug = normalizeHelpCategorySlug(readString(record, "slug"));
    const destinationUrl = optionalString(record, "destinationUrl");
    if (!slug) {
      issues.push(`${path}[${index}].slug: obrigatório.`);
      continue;
    }
    if (destinationUrl && (!isDestinationUrl(destinationUrl) || destinationUrl.length > 1000)) {
      issues.push(`${path}[${index}].destinationUrl: use caminho interno iniciado por / ou URL http/https.`);
      continue;
    }
    result.set(slug, { slug, destinationUrl });
  }
  return Array.from(result.values());
}

function parseFeaturedVideo(
  value: unknown,
  path: string,
  issues: string[],
): HelpImportFeaturedVideo | undefined {
  if (value === undefined || value === null) return undefined;
  const record = asRecord(value);
  if (!record) {
    issues.push(`${path}: featuredVideo inválido.`);
    return undefined;
  }

  const url = readString(record, "url");
  const description = optionalString(record, "description");
  const subtitles = readString(record, "subtitles");
  const assistantSummary = optionalString(record, "assistantSummary");

  if (!isHttpUrl(url)) issues.push(`${path}.url: use URL http/https válida.`);
  if ((description?.length ?? 0) > 500) issues.push(`${path}.description: máximo de 500 caracteres.`);
  if (!subtitles) issues.push(`${path}.subtitles: obrigatório quando existe vídeo.`);
  if (subtitles.length > 200_000) issues.push(`${path}.subtitles: máximo de 200.000 caracteres.`);
  if ((assistantSummary?.length ?? 0) > 20_000) {
    issues.push(`${path}.assistantSummary: máximo de 20.000 caracteres.`);
  }

  if (!isHttpUrl(url) || !subtitles) return undefined;
  return { url, description, subtitles, assistantSummary };
}

function parseBlock(
  value: unknown,
  path: string,
  issues: string[],
): HelpImportBlock | null {
  const record = asRecord(value);
  if (!record) {
    issues.push(`${path}: bloco inválido.`);
    return null;
  }
  const type = readString(record, "type");

  if (type === "text") {
    const text = readString(record, "text");
    if (!text || text.length > 50_000) {
      issues.push(`${path}.text: obrigatório e máximo de 50.000 caracteres.`);
      return null;
    }
    return { type, text };
  }

  if (type === "notice") {
    const text = readString(record, "text");
    const variant = optionalString(record, "variant") as NoticeVariant | undefined;
    const allowed: NoticeVariant[] = ["info", "warning", "success", "danger"];
    if (!text || text.length > 50_000) {
      issues.push(`${path}.text: obrigatório e máximo de 50.000 caracteres.`);
      return null;
    }
    if (variant && !allowed.includes(variant)) {
      issues.push(`${path}.variant: use info, warning, success ou danger.`);
      return null;
    }
    return { type, text, variant };
  }

  if (type === "link") {
    const url = readString(record, "url");
    const label = readString(record, "label");
    if (!isHttpUrl(url) || !label || label.length > 240) {
      issues.push(`${path}: link precisa de URL http/https e label válido.`);
      return null;
    }
    return { type, url, label };
  }

  if (type === "image") {
    const url = readString(record, "url");
    const altText = optionalString(record, "altText");
    const assistantDescription = optionalString(record, "assistantDescription");
    if (!isHttpUrl(url)) {
      issues.push(`${path}.url: imagem precisa de URL http/https válida.`);
      return null;
    }
    if ((altText?.length ?? 0) > 500) issues.push(`${path}.altText: máximo de 500 caracteres.`);
    if ((assistantDescription?.length ?? 0) > 20_000) {
      issues.push(`${path}.assistantDescription: máximo de 20.000 caracteres.`);
    }
    return { type, url, altText, assistantDescription };
  }

  if (type === "file") {
    const url = readString(record, "url");
    const label = readString(record, "label");
    const extractedText = optionalString(record, "extractedText");
    const assistantSummary = optionalString(record, "assistantSummary");
    if (!isHttpUrl(url) || !label || label.length > 240) {
      issues.push(`${path}: file precisa de URL http/https e label válido.`);
      return null;
    }
    if ((extractedText?.length ?? 0) > 200_000) {
      issues.push(`${path}.extractedText: máximo de 200.000 caracteres.`);
    }
    if ((assistantSummary?.length ?? 0) > 20_000) {
      issues.push(`${path}.assistantSummary: máximo de 20.000 caracteres.`);
    }
    return { type, url, label, extractedText, assistantSummary };
  }

  if (type === "video") {
    issues.push(`${path}: vídeo não pode existir dentro dos passos. Use featuredVideo.`);
    return null;
  }

  issues.push(`${path}: tipo de bloco não suportado: ${type || "vazio"}.`);
  return null;
}

function parseStep(
  value: unknown,
  path: string,
  issues: string[],
): HelpImportStep | null {
  const record = asRecord(value);
  if (!record) {
    issues.push(`${path}: passo inválido.`);
    return null;
  }

  const title = readString(record, "title");
  const description = optionalString(record, "description");
  const assistantKnowledge = optionalString(record, "assistantKnowledge");
  const blocksValue = record.blocks;

  if (!title || title.length > 180) issues.push(`${path}.title: obrigatório e máximo de 180 caracteres.`);
  if ((description?.length ?? 0) > 2_000) issues.push(`${path}.description: máximo de 2.000 caracteres.`);
  if ((assistantKnowledge?.length ?? 0) > 20_000) {
    issues.push(`${path}.assistantKnowledge: máximo de 20.000 caracteres.`);
  }
  if (!Array.isArray(blocksValue) || blocksValue.length === 0) {
    issues.push(`${path}.blocks: informe ao menos um bloco público.`);
    return null;
  }
  if (blocksValue.length > MAX_BLOCKS_PER_STEP) {
    issues.push(`${path}.blocks: máximo de ${MAX_BLOCKS_PER_STEP} blocos.`);
    return null;
  }

  const blocks = blocksValue
    .map((block, index) => parseBlock(block, `${path}.blocks[${index}]`, issues))
    .filter((block): block is HelpImportBlock => Boolean(block));

  if (!title || blocks.length !== blocksValue.length) return null;
  return { title, description, assistantKnowledge, blocks };
}

function parseContent(
  value: unknown,
  index: number,
  issues: string[],
): HelpImportContent | null {
  const path = `contents[${index}]`;
  const record = asRecord(value);
  if (!record) {
    issues.push(`${path}: conteúdo inválido.`);
    return null;
  }

  const externalId = readString(record, "externalId");
  const title = readString(record, "title");
  const slug = optionalString(record, "slug");
  const summary = optionalString(record, "summary");
  const categories = parseCategories(record.categories, `${path}.categories`, issues);
  const searchAliases = parseStringArray(
    record.searchAliases ?? [],
    `${path}.searchAliases`,
    issues,
    MAX_SEARCH_ALIASES,
  );
  const assistantKnowledge = optionalString(record, "assistantKnowledge");
  const internalSupportNotes = optionalString(record, "internalSupportNotes");
  const featuredVideo = parseFeaturedVideo(record.featuredVideo, `${path}.featuredVideo`, issues);
  const stepsValue = record.steps;

  if (!externalId || externalId.length > 240) {
    issues.push(`${path}.externalId: obrigatório e máximo de 240 caracteres.`);
  }
  if (!title || title.length < 4 || title.length > 160) {
    issues.push(`${path}.title: deve ter entre 4 e 160 caracteres.`);
  }
  if ((slug?.length ?? 0) > 160) issues.push(`${path}.slug: máximo de 160 caracteres.`);
  if ((summary?.length ?? 0) > 320) issues.push(`${path}.summary: máximo de 320 caracteres.`);
  if ((assistantKnowledge?.length ?? 0) > 40_000) {
    issues.push(`${path}.assistantKnowledge: máximo de 40.000 caracteres.`);
  }
  if ((internalSupportNotes?.length ?? 0) > 40_000) {
    issues.push(`${path}.internalSupportNotes: máximo de 40.000 caracteres.`);
  }
  if (!Array.isArray(stepsValue) || stepsValue.length === 0) {
    issues.push(`${path}.steps: informe ao menos um passo.`);
    return null;
  }
  if (stepsValue.length > MAX_STEPS_PER_CONTENT) {
    issues.push(`${path}.steps: máximo de ${MAX_STEPS_PER_CONTENT} passos.`);
    return null;
  }

  const steps = stepsValue
    .map((step, stepIndex) => parseStep(step, `${path}.steps[${stepIndex}]`, issues))
    .filter((step): step is HelpImportStep => Boolean(step));

  if (!externalId || !title || categories.length === 0 || steps.length !== stepsValue.length) return null;
  return {
    externalId,
    title,
    slug,
    summary,
    categories,
    searchAliases,
    assistantKnowledge,
    internalSupportNotes,
    featuredVideo,
    steps,
  };
}

export function validateHelpImportJson(rawJson: string): HelpImportValidation {
  const issues: string[] = [];
  let value: unknown;
  try {
    value = JSON.parse(rawJson);
  } catch {
    return {
      valid: false,
      source: "",
      contentCount: 0,
      stepCount: 0,
      blockCount: 0,
      issues: ["Arquivo JSON inválido."],
      parsed: null,
    };
  }

  const root = asRecord(value);
  if (!root) {
    return {
      valid: false,
      source: "",
      contentCount: 0,
      stepCount: 0,
      blockCount: 0,
      issues: ["A raiz do arquivo deve ser um objeto JSON."],
      parsed: null,
    };
  }

  const format = readString(root, "format");
  const version = root.version;
  const source = readString(root, "source");
  const contentsValue = root.contents;

  if (format !== IMPORT_FORMAT) issues.push(`format deve ser "${IMPORT_FORMAT}".`);
  if (version !== IMPORT_VERSION) issues.push(`version deve ser ${IMPORT_VERSION}.`);
  if (!source || source.length > 80) issues.push("source é obrigatório e deve ter até 80 caracteres.");
  if (!Array.isArray(contentsValue) || contentsValue.length === 0) {
    issues.push("contents deve possuir ao menos um conteúdo.");
  } else if (contentsValue.length > MAX_CONTENTS) {
    issues.push(`Máximo de ${MAX_CONTENTS} conteúdos por arquivo.`);
  }

  const contents = Array.isArray(contentsValue)
    ? contentsValue
        .map((content, index) => parseContent(content, index, issues))
        .filter((content): content is HelpImportContent => Boolean(content))
    : [];

  const externalIds = new Set<string>();
  const slugs = new Set<string>();
  for (const [index, content] of contents.entries()) {
    if (externalIds.has(content.externalId)) {
      issues.push(`contents[${index}].externalId: duplicado no arquivo.`);
    }
    externalIds.add(content.externalId);
    const normalizedSlug = normalizeHelpSlug(content.slug || content.title);
    if (!normalizedSlug) {
      issues.push(`contents[${index}].slug: não foi possível gerar um endereço válido.`);
    } else if (slugs.has(normalizedSlug)) {
      issues.push(`contents[${index}].slug: duplicado no arquivo.`);
    }
    slugs.add(normalizedSlug);
  }

  const stepCount = contents.reduce((total, content) => total + content.steps.length, 0);
  const blockCount = contents.reduce(
    (contentTotal, content) =>
      contentTotal + content.steps.reduce((stepTotal, step) => stepTotal + step.blocks.length, 0),
    0,
  );
  if (blockCount > MAX_TOTAL_BLOCKS) {
    issues.push(`Máximo de ${MAX_TOTAL_BLOCKS} blocos por arquivo.`);
  }

  const parsed: HelpImportFile | null =
    format === IMPORT_FORMAT &&
    version === IMPORT_VERSION &&
    source &&
    Array.isArray(contentsValue) &&
    contents.length === contentsValue.length &&
    issues.length === 0
      ? { format: IMPORT_FORMAT, version: IMPORT_VERSION, source, contents }
      : null;

  return {
    valid: Boolean(parsed),
    source,
    contentCount: contents.length,
    stepCount,
    blockCount,
    issues,
    parsed,
  };
}

export async function importStructuredHelpFile(
  actorUserId: string,
  file: HelpImportFile,
) {
  const db = getDatabase();
  const requestedCategorySlugs = Array.from(
    new Set(file.contents.flatMap((content) => content.categories.map((category) => category.slug))),
  );
  const categoryRows = requestedCategorySlugs.length
    ? await db
        .select({ id: helpCategories.id, slug: helpCategories.slug })
        .from(helpCategories)
        .where(
          and(
            inArray(helpCategories.slug, requestedCategorySlugs),
            eq(helpCategories.active, true),
          ),
        )
    : [];
  const categoryBySlug = new Map(categoryRows.map((category) => [category.slug, category.id]));
  const invalidCategories = requestedCategorySlugs.filter((slug) => !categoryBySlug.has(slug));
  if (invalidCategories.length > 0) {
    throw new Error(`IMPORT_CATEGORY_INVALID:${invalidCategories.join(",")}`);
  }

  const normalizedContents = file.contents.map((content) => ({
    ...content,
    normalizedSlug: normalizeHelpSlug(content.slug || content.title),
  }));
  if (normalizedContents.some((content) => !content.normalizedSlug)) {
    throw new Error("IMPORT_INVALID_SLUG");
  }

  const slugs = normalizedContents.map((content) => content.normalizedSlug);
  const externalIds = normalizedContents.map((content) => content.externalId);
  const [slugConflicts, externalConflicts] = await Promise.all([
    db.select({ slug: helpContents.slug }).from(helpContents).where(inArray(helpContents.slug, slugs)),
    db
      .select({ externalId: helpContents.importExternalId })
      .from(helpContents)
      .where(
        and(
          eq(helpContents.importSource, file.source),
          inArray(helpContents.importExternalId, externalIds),
        ),
      ),
  ]);
  if (slugConflicts.length > 0) {
    throw new Error(`IMPORT_SLUG_CONFLICT:${slugConflicts.map((item) => item.slug).join(",")}`);
  }
  if (externalConflicts.length > 0) {
    throw new Error(
      `IMPORT_EXTERNAL_ID_CONFLICT:${externalConflicts
        .map((item) => item.externalId)
        .filter(Boolean)
        .join(",")}`,
    );
  }

  const imported: Array<{ id: string; externalId: string; title: string }> = [];

  await db.transaction(async (tx) => {
    for (const content of normalizedContents) {
      const [created] = await tx
        .insert(helpContents)
        .values({
          slug: content.normalizedSlug,
          title: content.title.trim(),
          summary: content.summary?.trim() ?? "",
          searchAliases: Array.from(new Set(content.searchAliases.map((item) => item.trim().toLowerCase()))),
          assistantKnowledge: content.assistantKnowledge?.trim() ?? "",
          internalSupportNotes: content.internalSupportNotes?.trim() ?? "",
          status: "draft",
          importSource: file.source,
          importExternalId: content.externalId,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        })
        .returning({ id: helpContents.id });
      if (!created) throw new Error("IMPORT_CONTENT_NOT_CREATED");

      await tx.insert(helpContentCategories).values(
        content.categories.map((category, categoryIndex) => ({
          contentId: created.id,
          categoryId: categoryBySlug.get(category.slug)!,
          destinationUrl: category.destinationUrl?.trim() ?? "",
          sortOrder: (categoryIndex + 1) * 10,
        })),
      );

      if (content.featuredVideo) {
        const [videoAsset] = await tx
          .insert(helpAssets)
          .values({
            contentId: created.id,
            assetType: "video",
            sourceUrl: content.featuredVideo.url,
            altText: content.featuredVideo.description ?? "",
            subtitles: content.featuredVideo.subtitles,
            assistantSummary: content.featuredVideo.assistantSummary ?? "",
            createdBy: actorUserId,
          })
          .returning({ id: helpAssets.id });
        if (!videoAsset) throw new Error("IMPORT_VIDEO_NOT_CREATED");
        await tx.insert(helpContentFeaturedVideos).values({
          contentId: created.id,
          assetId: videoAsset.id,
        });
      }

      for (const [stepIndex, step] of content.steps.entries()) {
        const [createdStep] = await tx
          .insert(helpContentSteps)
          .values({
            contentId: created.id,
            title: step.title,
            description: step.description ?? "",
            assistantKnowledge: step.assistantKnowledge ?? "",
            sortOrder: (stepIndex + 1) * 10,
          })
          .returning({ id: helpContentSteps.id });
        if (!createdStep) throw new Error("IMPORT_STEP_NOT_CREATED");

        for (const [blockIndex, block] of step.blocks.entries()) {
          let assetId: string | null = null;
          if (block.type === "image") {
            const [asset] = await tx
              .insert(helpAssets)
              .values({
                contentId: created.id,
                assetType: "image",
                sourceUrl: block.url,
                altText: block.altText ?? "",
                assistantDescription: block.assistantDescription ?? "",
                createdBy: actorUserId,
              })
              .returning({ id: helpAssets.id });
            assetId = asset?.id ?? null;
          } else if (block.type === "file") {
            const [asset] = await tx
              .insert(helpAssets)
              .values({
                contentId: created.id,
                assetType: "file",
                sourceUrl: block.url,
                extractedText: block.extractedText ?? "",
                assistantSummary: block.assistantSummary ?? "",
                createdBy: actorUserId,
              })
              .returning({ id: helpAssets.id });
            assetId = asset?.id ?? null;
          }

          await tx.insert(helpStepBlocks).values({
            stepId: createdStep.id,
            blockType: block.type,
            textContent: block.type === "text" || block.type === "notice" ? block.text : "",
            assetId,
            linkUrl: block.type === "link" ? block.url : null,
            linkLabel: block.type === "link" || block.type === "file" ? block.label : null,
            noticeVariant: block.type === "notice" ? block.variant ?? "info" : null,
            sortOrder: (blockIndex + 1) * 10,
          });
        }
      }

      imported.push({ id: created.id, externalId: content.externalId, title: content.title });
    }
  });

  await recordAuditEvent({
    actorUserId,
    action: "help.content.imported",
    entityType: "help_import",
    metadata: {
      source: file.source,
      contentCount: imported.length,
      version: file.version,
    },
  });

  return {
    source: file.source,
    contentCount: imported.length,
    stepCount: file.contents.reduce((total, content) => total + content.steps.length, 0),
    blockCount: file.contents.reduce(
      (contentTotal, content) =>
        contentTotal + content.steps.reduce((stepTotal, step) => stepTotal + step.blocks.length, 0),
      0,
    ),
    imported,
  };
}
