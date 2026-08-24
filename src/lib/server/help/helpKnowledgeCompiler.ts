export type HelpKnowledgeTargetType = "article" | "featured_video" | "step" | "block";

export type HelpKnowledgeCompiledFragment = {
  id: string;
  targetType: HelpKnowledgeTargetType;
  stepId: string | null;
  blockId: string | null;
  anchor: string | null;
  publicText: string;
  assistantKnowledge: string;
  searchText: string;
};

export type HelpKnowledgeDocument = {
  version: 1;
  contentId: string;
  slug: string;
  title: string;
  searchAliases: string[];
  fragments: HelpKnowledgeCompiledFragment[];
};

type CompilerAsset = {
  id: string;
  assetType: "image" | "video" | "file";
  sourceUrl: string | null;
  storageKey: string | null;
  altText: string;
  assistantDescription: string;
  subtitles: string;
  assistantSummary: string;
  extractedText: string;
};

type CompilerBlock = {
  id: string;
  blockType: "text" | "image" | "notice" | "link" | "file";
  textContent: string;
  linkUrl: string | null;
  linkLabel: string | null;
  noticeVariant: string | null;
  sortOrder: number;
  asset: CompilerAsset | null;
};

type CompilerStep = {
  id: string;
  title: string;
  description: string;
  assistantKnowledge: string;
  sortOrder: number;
  blocks: CompilerBlock[];
};

type CompilerCategory = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  effectiveDestinationUrl: string;
  active: boolean;
};

export type HelpKnowledgeCompilerInput = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  searchAliases: string[];
  assistantKnowledge: string;
  internalSupportNotes: string;
  status: string;
  publishedAt: Date | null;
  categories: CompilerCategory[];
  featuredVideo: CompilerAsset | null;
  steps: CompilerStep[];
};

const MAX_FRAGMENT_TEXT_CHARS = 3_000;
const MAX_SEARCH_TEXT_CHARS = 8_000;
const VIDEO_CHUNK_CHARS = 1_600;

function trimText(value: string, limit: number): string {
  const normalized = value.trim();
  return normalized.length <= limit ? normalized : normalized.slice(0, limit);
}

function joinText(values: Array<string | null | undefined>): string {
  return values.map((value) => value?.trim() ?? "").filter(Boolean).join("\n");
}

function normalizeSubtitles(value: string): string {
  return value
    .replace(/^WEBVTT.*$/gim, "")
    .replace(/^\d+\s*$/gm, "")
    .replace(/^.*\d{1,2}:\d{2}(?::\d{2})?[.,]\d{3}\s+-->\s+.*$/gm, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function chunkText(value: string, maxChars = VIDEO_CHUNK_CHARS): string[] {
  const normalized = normalizeSubtitles(value);
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs.length > 0 ? paragraphs : [normalized]) {
    if (paragraph.length > maxChars) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let index = 0; index < paragraph.length; index += maxChars) {
        chunks.push(paragraph.slice(index, index + maxChars));
      }
      continue;
    }

    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxChars && current) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = candidate;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function addFragment(
  fragments: HelpKnowledgeCompiledFragment[],
  input: {
    id: string;
    targetType: HelpKnowledgeTargetType;
    stepId?: string | null;
    blockId?: string | null;
    anchor?: string | null;
    publicText: string;
    assistantKnowledge?: string;
    searchExtras?: string[];
  },
): void {
  const publicText = trimText(input.publicText, MAX_FRAGMENT_TEXT_CHARS);
  const assistantKnowledge = trimText(input.assistantKnowledge ?? "", MAX_FRAGMENT_TEXT_CHARS);
  if (!publicText && !assistantKnowledge) return;

  fragments.push({
    id: input.id,
    targetType: input.targetType,
    stepId: input.stepId ?? null,
    blockId: input.blockId ?? null,
    anchor: input.anchor ?? null,
    publicText,
    assistantKnowledge,
    searchText: trimText(
      joinText([publicText, assistantKnowledge, ...(input.searchExtras ?? [])]),
      MAX_SEARCH_TEXT_CHARS,
    ),
  });
}

export function validateHelpKnowledgePublication(content: HelpKnowledgeCompilerInput): void {
  if (content.categories.length === 0 || content.categories.some((category) => !category.active)) {
    throw new Error("CONTENT_CATEGORY_REQUIRED");
  }
  if (content.featuredVideo && !content.featuredVideo.subtitles.trim()) {
    throw new Error("FEATURED_VIDEO_SUBTITLES_REQUIRED");
  }
  if (content.steps.length === 0) throw new Error("CONTENT_STEP_REQUIRED");

  for (const step of content.steps) {
    if (!step.title.trim()) throw new Error("STEP_TITLE_REQUIRED");
    if (step.blocks.length === 0) throw new Error("STEP_BLOCK_REQUIRED");

    const meaningfulBlocks = step.blocks.filter((block) => {
      if (block.blockType === "text" || block.blockType === "notice") {
        return Boolean(block.textContent.trim());
      }
      if (block.blockType === "link") return Boolean(block.linkUrl && block.linkLabel);
      return Boolean(block.asset?.sourceUrl || block.asset?.storageKey || block.asset?.extractedText);
    });
    if (meaningfulBlocks.length === 0) throw new Error("STEP_BLOCK_REQUIRED");

    const images = step.blocks.filter((block) => block.blockType === "image");
    const hasOnlyImages = images.length > 0 && images.length === step.blocks.length;
    if (
      hasOnlyImages &&
      images.some(
        (block) => !block.asset?.altText.trim() && !block.asset?.assistantDescription.trim(),
      )
    ) {
      throw new Error("IMAGE_DESCRIPTION_REQUIRED");
    }
  }
}

export function compileHelpPublicSnapshot(content: HelpKnowledgeCompilerInput) {
  return {
    slug: content.slug,
    title: content.title,
    summary: content.summary,
    categories: content.categories.map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      description: category.description,
      icon: category.icon,
      destinationUrl: category.effectiveDestinationUrl,
    })),
    featuredVideo: content.featuredVideo
      ? {
          id: content.featuredVideo.id,
          assetType: content.featuredVideo.assetType,
          sourceUrl: content.featuredVideo.sourceUrl,
          storageKey: content.featuredVideo.storageKey,
          altText: content.featuredVideo.altText,
        }
      : null,
    steps: content.steps.map((step) => ({
      id: step.id,
      title: step.title,
      description: step.description,
      sortOrder: step.sortOrder,
      blocks: step.blocks.map((block) => ({
        id: block.id,
        blockType: block.blockType,
        textContent: block.textContent,
        linkUrl: block.linkUrl,
        linkLabel: block.linkLabel,
        noticeVariant: block.noticeVariant,
        sortOrder: block.sortOrder,
        asset: block.asset
          ? {
              id: block.asset.id,
              assetType: block.asset.assetType,
              sourceUrl: block.asset.sourceUrl,
              storageKey: block.asset.storageKey,
              altText: block.asset.altText,
            }
          : null,
      })),
    })),
  };
}

export function compileHelpVersionSnapshot(
  content: HelpKnowledgeCompilerInput,
  publishedAt: Date,
) {
  const serializeAsset = (asset: CompilerAsset | null) =>
    asset
      ? {
          id: asset.id,
          assetType: asset.assetType,
          sourceUrl: asset.sourceUrl,
          storageKey: asset.storageKey,
          altText: asset.altText,
          assistantDescription: asset.assistantDescription,
          subtitles: asset.subtitles,
          assistantSummary: asset.assistantSummary,
          extractedText: asset.extractedText,
        }
      : null;

  return {
    slug: content.slug,
    title: content.title,
    summary: content.summary,
    searchAliases: content.searchAliases,
    assistantKnowledge: content.assistantKnowledge,
    internalSupportNotes: content.internalSupportNotes,
    categories: content.categories,
    featuredVideo: serializeAsset(content.featuredVideo),
    status: "published",
    publishedAt: publishedAt.toISOString(),
    steps: content.steps.map((step) => ({
      id: step.id,
      title: step.title,
      description: step.description,
      assistantKnowledge: step.assistantKnowledge,
      sortOrder: step.sortOrder,
      blocks: step.blocks.map((block) => ({
        id: block.id,
        blockType: block.blockType,
        textContent: block.textContent,
        linkUrl: block.linkUrl,
        linkLabel: block.linkLabel,
        noticeVariant: block.noticeVariant,
        sortOrder: block.sortOrder,
        asset: serializeAsset(block.asset),
      })),
    })),
  };
}

export function compileHelpKnowledgeDocument(
  content: HelpKnowledgeCompilerInput,
): HelpKnowledgeDocument {
  const fragments: HelpKnowledgeCompiledFragment[] = [];
  const categoryText = content.categories.map((category) =>
    joinText([category.slug, category.name, category.description]),
  );

  addFragment(fragments, {
    id: `article:${content.id}`,
    targetType: "article",
    publicText: joinText([content.title, content.summary, ...categoryText]),
    assistantKnowledge: content.assistantKnowledge,
    searchExtras: content.searchAliases,
  });

  if (content.featuredVideo) {
    const summary = content.featuredVideo.assistantSummary.trim();
    const chunks = chunkText(content.featuredVideo.subtitles);
    const publicText = joinText([
      `Vídeo principal do artigo ${content.title}.`,
      content.featuredVideo.altText,
    ]);

    if (chunks.length === 0 && summary) {
      addFragment(fragments, {
        id: `featured-video:${content.featuredVideo.id}:summary`,
        targetType: "featured_video",
        anchor: "help-featured-video",
        publicText,
        assistantKnowledge: summary,
      });
    }

    chunks.forEach((chunk, index) => {
      addFragment(fragments, {
        id: `featured-video:${content.featuredVideo?.id}:${index + 1}`,
        targetType: "featured_video",
        anchor: "help-featured-video",
        publicText,
        assistantKnowledge: joinText([summary, chunk]),
      });
    });
  }

  for (const step of content.steps) {
    addFragment(fragments, {
      id: `step:${step.id}`,
      targetType: "step",
      stepId: step.id,
      anchor: `help-step-${step.id}`,
      publicText: joinText([step.title, step.description]),
      assistantKnowledge: step.assistantKnowledge,
    });

    for (const block of step.blocks) {
      const asset = block.asset;
      const publicText = joinText([
        step.title,
        block.blockType === "text" || block.blockType === "notice" ? block.textContent : "",
        block.blockType === "link" || block.blockType === "file" ? block.linkLabel : "",
        asset?.altText,
      ]);
      const assistantKnowledge = joinText([
        asset?.assistantDescription,
        asset?.assistantSummary,
        asset?.extractedText,
      ]);

      addFragment(fragments, {
        id: `block:${block.id}`,
        targetType: "block",
        stepId: step.id,
        blockId: block.id,
        anchor: `help-block-${block.id}`,
        publicText,
        assistantKnowledge,
      });
    }
  }

  return {
    version: 1,
    contentId: content.id,
    slug: content.slug,
    title: content.title,
    searchAliases: content.searchAliases,
    fragments,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(record: Record<string, unknown>, key: string): string {
  return typeof record[key] === "string" ? String(record[key]).trim() : "";
}

export function parseHelpKnowledgeDocument(value: unknown): HelpKnowledgeDocument | null {
  const record = asRecord(value);
  if (!record || record.version !== 1) return null;

  const contentId = readString(record, "contentId");
  const slug = readString(record, "slug");
  const title = readString(record, "title");
  if (!contentId || !slug || !title || !Array.isArray(record.fragments)) return null;

  const fragments: HelpKnowledgeCompiledFragment[] = [];
  for (const item of record.fragments) {
    const fragment = asRecord(item);
    if (!fragment) return null;
    const targetType = readString(fragment, "targetType");
    if (!["article", "featured_video", "step", "block"].includes(targetType)) return null;
    const id = readString(fragment, "id");
    if (!id) return null;

    fragments.push({
      id,
      targetType: targetType as HelpKnowledgeTargetType,
      stepId: readString(fragment, "stepId") || null,
      blockId: readString(fragment, "blockId") || null,
      anchor: readString(fragment, "anchor") || null,
      publicText: readString(fragment, "publicText"),
      assistantKnowledge: readString(fragment, "assistantKnowledge"),
      searchText: readString(fragment, "searchText"),
    });
  }

  const searchAliases = Array.isArray(record.searchAliases)
    ? record.searchAliases.filter((item): item is string => typeof item === "string")
    : [];

  return {
    version: 1,
    contentId,
    slug,
    title,
    searchAliases,
    fragments,
  };
}
