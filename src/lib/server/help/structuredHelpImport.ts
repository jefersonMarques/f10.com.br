import { and, eq, inArray } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import { helpContentVersions } from "$lib/server/db/schema";
import {
  helpAssets,
  helpContents,
  helpContentSteps,
  helpStepBlocks,
} from "$lib/server/db/structuredHelpSchema";
import { normalizeHelpSlug } from "$lib/server/help/helpArticleRepository";

const IMPORT_FORMAT = "f10-help-import";
const IMPORT_VERSION = 1;
const MAX_CONTENTS = 250;
const MAX_STEPS_PER_CONTENT = 80;
const MAX_BLOCKS_PER_STEP = 80;
const MAX_TOTAL_BLOCKS = 8_000;

type NoticeVariant = "info" | "warning" | "success" | "danger";

export type HelpImportBlock =
  | { type: "text"; text: string }
  | { type: "notice"; text: string; variant?: NoticeVariant }
  | { type: "link"; url: string; label: string }
  | {
      type: "image";
      url: string;
      altText?: string;
      aiSummary?: string;
    }
  | {
      type: "video";
      url: string;
      altText?: string;
      transcript?: string;
      aiSummary?: string;
    };

export type HelpImportStep = {
  title: string;
  description?: string;
  aiKnowledge?: string;
  blocks: HelpImportBlock[];
};

export type HelpImportContent = {
  externalId: string;
  title: string;
  slug?: string;
  summary?: string;
  category?: string;
  aiGeneralKnowledge?: string;
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

type ParsedHelpImportBlock = HelpImportBlock | null | undefined;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(record: Record<string, unknown>, key: string): string {
  return typeof record[key] === "string" ? record[key].trim() : "";
}

function optionalString(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
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

function parseBlock(
  value: unknown,
  path: string,
  issues: string[],
): ParsedHelpImportBlock {
  const record = asRecord(value);
  if (!record) {
    issues.push(`${path}: bloco inválido.`);
    return null;
  }

  const type = readString(record, "type");

  if (type === "text") {
    const text = readString(record, "text");
    if (!text || text.length > 30_000) {
      issues.push(
        `${path}: bloco de texto deve ter entre 1 e 30.000 caracteres.`,
      );
      return null;
    }
    return { type, text };
  }

  if (type === "notice") {
    const text = readString(record, "text");
    const variantValue = optionalString(record, "variant");
    const allowedVariants: NoticeVariant[] = [
      "info",
      "warning",
      "success",
      "danger",
    ];

    if (!text || text.length > 15_000) {
      issues.push(`${path}: aviso deve ter entre 1 e 15.000 caracteres.`);
      return null;
    }

    if (
      variantValue &&
      !allowedVariants.includes(variantValue as NoticeVariant)
    ) {
      issues.push(`${path}: variant inválido.`);
      return null;
    }

    const variant = variantValue as NoticeVariant | undefined;
    return { type, text, variant };
  }

  if (type === "link") {
    const url = readString(record, "url");
    const label = readString(record, "label");
    if (!isHttpUrl(url) || !label || label.length > 200) {
      issues.push(`${path}: link precisa de URL http/https e label válido.`);
      return null;
    }
    return { type, url, label };
  }

  if (type === "image" || type === "video") {
    const url = readString(record, "url");
    const altText = optionalString(record, "altText");
    const aiSummary = optionalString(record, "aiSummary");
    const transcript = optionalString(record, "transcript");

    if (!isHttpUrl(url)) {
      if (type === "image") {
        // JSON simples não transporta arquivo local. Se a imagem ainda não possui
        // URL pública, ignoramos apenas este bloco para permitir o upload manual
        // posteriormente no editor do conteúdo.
        return undefined;
      }
      issues.push(`${path}: vídeo precisa de URL http/https válida.`);
      return null;
    }
    if ((altText?.length ?? 0) > 500 || (aiSummary?.length ?? 0) > 20_000) {
      issues.push(`${path}: altText ou aiSummary excede o limite.`);
      return null;
    }
    if ((transcript?.length ?? 0) > 80_000) {
      issues.push(`${path}: transcrição excede 80.000 caracteres.`);
      return null;
    }

    if (type === "image") return { type, url, altText, aiSummary };
    return { type, url, altText, transcript, aiSummary };
  }

  issues.push(
    `${path}: tipo de bloco não suportado: ${type || "vazio"}.`,
  );
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
  const aiKnowledge = optionalString(record, "aiKnowledge");
  const blocksValue = record.blocks;

  if (!title || title.length > 180) {
    issues.push(
      `${path}: título do passo é obrigatório e deve ter até 180 caracteres.`,
    );
  }
  if ((description?.length ?? 0) > 10_000) {
    issues.push(`${path}: descrição excede 10.000 caracteres.`);
  }
  if ((aiKnowledge?.length ?? 0) > 30_000) {
    issues.push(`${path}: conhecimento da IA excede 30.000 caracteres.`);
  }
  if (!Array.isArray(blocksValue) || blocksValue.length === 0) {
    issues.push(`${path}: cada passo deve ter ao menos um bloco.`);
    return null;
  }
  if (blocksValue.length > MAX_BLOCKS_PER_STEP) {
    issues.push(
      `${path}: máximo de ${MAX_BLOCKS_PER_STEP} blocos por passo.`,
    );
    return null;
  }

  const parsedBlocks = blocksValue.map((block, index) =>
    parseBlock(block, `${path}.blocks[${index}]`, issues),
  );
  const blocks = parsedBlocks.filter(
    (block): block is HelpImportBlock => Boolean(block),
  );

  if (!title || parsedBlocks.some((block) => block === null)) return null;
  return { title, description, aiKnowledge, blocks };
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
  const category = optionalString(record, "category");
  const aiGeneralKnowledge = optionalString(record, "aiGeneralKnowledge");
  const stepsValue = record.steps;

  if (!externalId || externalId.length > 240) {
    issues.push(
      `${path}: externalId é obrigatório e deve ter até 240 caracteres.`,
    );
  }
  if (!title || title.length < 4 || title.length > 160) {
    issues.push(`${path}: título deve ter entre 4 e 160 caracteres.`);
  }
  if ((slug?.length ?? 0) > 160) {
    issues.push(`${path}: slug excede 160 caracteres.`);
  }
  if ((summary?.length ?? 0) > 320) {
    issues.push(`${path}: resumo excede 320 caracteres.`);
  }
  if ((category?.length ?? 0) > 120) {
    issues.push(`${path}: categoria excede 120 caracteres.`);
  }
  if ((aiGeneralKnowledge?.length ?? 0) > 40_000) {
    issues.push(
      `${path}: conhecimento geral da IA excede 40.000 caracteres.`,
    );
  }
  if (!Array.isArray(stepsValue) || stepsValue.length === 0) {
    issues.push(`${path}: conteúdo deve possuir ao menos um passo.`);
    return null;
  }
  if (stepsValue.length > MAX_STEPS_PER_CONTENT) {
    issues.push(
      `${path}: máximo de ${MAX_STEPS_PER_CONTENT} passos por conteúdo.`,
    );
    return null;
  }

  const steps = stepsValue
    .map((step, stepIndex) =>
      parseStep(step, `${path}.steps[${stepIndex}]`, issues),
    )
    .filter((step): step is HelpImportStep => Boolean(step));

  if (!externalId || !title || steps.length !== stepsValue.length) {
    return null;
  }

  return {
    externalId,
    title,
    slug,
    summary,
    category,
    aiGeneralKnowledge,
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

  if (format !== IMPORT_FORMAT) {
    issues.push(`format deve ser "${IMPORT_FORMAT}".`);
  }
  if (version !== IMPORT_VERSION) {
    issues.push(`version deve ser ${IMPORT_VERSION}.`);
  }
  if (!source || source.length > 80) {
    issues.push("source é obrigatório e deve ter até 80 caracteres.");
  }
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
  let stepCount = 0;
  let blockCount = 0;

  for (const [index, content] of contents.entries()) {
    const slug = normalizeHelpSlug(content.slug || content.title);
    if (!slug) {
      issues.push(`contents[${index}]: não foi possível gerar slug válido.`);
    }
    if (externalIds.has(content.externalId)) {
      issues.push(`contents[${index}]: externalId duplicado no arquivo.`);
    }
    if (slug && slugs.has(slug)) {
      issues.push(
        `contents[${index}]: slug duplicado no arquivo: ${slug}.`,
      );
    }
    externalIds.add(content.externalId);
    if (slug) slugs.add(slug);
    stepCount += content.steps.length;
    blockCount += content.steps.reduce(
      (total, step) => total + step.blocks.length,
      0,
    );
  }

  if (blockCount > MAX_TOTAL_BLOCKS) {
    issues.push(`Máximo de ${MAX_TOTAL_BLOCKS} blocos por arquivo.`);
  }

  const contentArrayLength = Array.isArray(contentsValue)
    ? contentsValue.length
    : 0;
  const parsed: HelpImportFile | null =
    issues.length === 0 &&
    format === IMPORT_FORMAT &&
    version === IMPORT_VERSION &&
    Boolean(source) &&
    contents.length === contentArrayLength
      ? {
          format: IMPORT_FORMAT,
          version: IMPORT_VERSION,
          source,
          contents,
        }
      : null;

  return {
    valid: Boolean(parsed),
    source,
    contentCount: contents.length,
    stepCount,
    blockCount,
    issues: issues.slice(0, 100),
    parsed,
  };
}

export async function importStructuredHelpFile(
  actorUserId: string,
  file: HelpImportFile,
) {
  const db = getDatabase();
  const normalizedSlugs = file.contents.map((content) =>
    normalizeHelpSlug(content.slug || content.title),
  );
  const externalIds = file.contents.map((content) => content.externalId);

  const [existingSlugs, existingExternalIds] = await Promise.all([
    db
      .select({ slug: helpContents.slug })
      .from(helpContents)
      .where(inArray(helpContents.slug, normalizedSlugs)),
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

  if (existingSlugs.length > 0) {
    throw new Error(
      `IMPORT_SLUG_CONFLICT:${existingSlugs.map((row) => row.slug).join(",")}`,
    );
  }
  if (existingExternalIds.length > 0) {
    throw new Error(
      `IMPORT_EXTERNAL_ID_CONFLICT:${existingExternalIds
        .map((row) => row.externalId)
        .filter(Boolean)
        .join(",")}`,
    );
  }

  const imported = await db.transaction(async (tx) => {
    const result: Array<{
      id: string;
      title: string;
      externalId: string;
    }> = [];

    for (const content of file.contents) {
      const slug = normalizeHelpSlug(content.slug || content.title);
      const [createdContent] = await tx
        .insert(helpContents)
        .values({
          slug,
          title: content.title,
          summary: content.summary ?? "",
          category: content.category ?? "",
          aiGeneralKnowledge: content.aiGeneralKnowledge ?? "",
          status: "draft",
          importSource: file.source,
          importExternalId: content.externalId,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        })
        .returning({ id: helpContents.id });

      if (!createdContent) throw new Error("IMPORT_CONTENT_NOT_CREATED");

      for (const [stepIndex, step] of content.steps.entries()) {
        const [createdStep] = await tx
          .insert(helpContentSteps)
          .values({
            contentId: createdContent.id,
            title: step.title,
            description: step.description ?? "",
            aiKnowledge: step.aiKnowledge ?? "",
            sortOrder: (stepIndex + 1) * 10,
          })
          .returning({ id: helpContentSteps.id });

        if (!createdStep) throw new Error("IMPORT_STEP_NOT_CREATED");

        for (const [blockIndex, block] of step.blocks.entries()) {
          let assetId: string | null = null;

          if (block.type === "image" || block.type === "video") {
            const [asset] = await tx
              .insert(helpAssets)
              .values({
                contentId: createdContent.id,
                assetType: block.type,
                sourceUrl: block.url,
                altText: block.altText ?? "",
                transcript:
                  block.type === "video" ? block.transcript ?? "" : "",
                aiSummary: block.aiSummary ?? "",
                metadata: { importedFrom: file.source },
                createdBy: actorUserId,
              })
              .returning({ id: helpAssets.id });

            assetId = asset?.id ?? null;
            if (!assetId) throw new Error("IMPORT_ASSET_NOT_CREATED");
          }

          await tx.insert(helpStepBlocks).values({
            stepId: createdStep.id,
            blockType: block.type,
            textContent:
              block.type === "text" || block.type === "notice"
                ? block.text
                : "",
            assetId,
            linkUrl: block.type === "link" ? block.url : null,
            linkLabel: block.type === "link" ? block.label : null,
            noticeVariant:
              block.type === "notice" ? block.variant ?? "info" : null,
            metadata: { importedFrom: file.source },
            sortOrder: (blockIndex + 1) * 10,
          });
        }
      }

      await tx.insert(helpContentVersions).values({
        entityType: "content",
        entityId: createdContent.id,
        version: 1,
        snapshot: {
          import: {
            source: file.source,
            externalId: content.externalId,
          },
          title: content.title,
          slug,
          summary: content.summary ?? "",
          category: content.category ?? "",
          aiGeneralKnowledge: content.aiGeneralKnowledge ?? "",
          status: "draft",
          steps: content.steps.map((step, stepIndex) => ({
            title: step.title,
            description: step.description ?? "",
            aiKnowledge: step.aiKnowledge ?? "",
            sortOrder: (stepIndex + 1) * 10,
            blocks: step.blocks,
          })),
        },
        createdBy: actorUserId,
      });

      result.push({
        id: createdContent.id,
        title: content.title,
        externalId: content.externalId,
      });
    }

    return result;
  });

  const stepCount = file.contents.reduce(
    (total, content) => total + content.steps.length,
    0,
  );
  const blockCount = file.contents.reduce(
    (total, content) =>
      total +
      content.steps.reduce(
        (stepTotal, step) => stepTotal + step.blocks.length,
        0,
      ),
    0,
  );

  await recordAuditEvent({
    actorUserId,
    action: "help.content.imported",
    entityType: "help_content_import",
    metadata: {
      source: file.source,
      contentCount: file.contents.length,
      stepCount,
      blockCount,
      externalIds: imported.map((item) => item.externalId),
    },
  });

  return {
    imported,
    source: file.source,
    contentCount: file.contents.length,
    stepCount,
    blockCount,
  };
}
