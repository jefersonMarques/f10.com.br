import { createAiStructuredResponse, AiGatewayError } from "$lib/server/ai/aiGateway";

export type HelpVideoSourceSegment = {
  start: number;
  end: number;
  text: string;
};

export type HelpVideoArticleCategory = {
  slug: string;
  name: string;
  description: string;
};

export type HelpVideoPlannedScreenshot = {
  startSeconds: number;
  endSeconds: number;
  capture: "before" | "after";
  target: string;
  altText: string;
  assistantDescription: string;
};

export type HelpVideoGeneratedStep = {
  title: string;
  description: string;
  instruction: string;
  screenshots: HelpVideoPlannedScreenshot[];
};

export type HelpVideoGeneratedArticle = {
  title: string;
  slug: string;
  summary: string;
  quickGuide: string;
  categories: string[];
  searchAliases: string[];
  assistantKnowledge: string;
  steps: HelpVideoGeneratedStep[];
};

export type HelpVideoSegmentClassification =
  | "action"
  | "rule"
  | "condition"
  | "result"
  | "explanation"
  | "repetition"
  | "irrelevant";

type IdentifiedSegment = HelpVideoSourceSegment & {
  id: string;
  sourceIndex: number;
};

type GenerationPart = {
  partIndex: number;
  core: IdentifiedSegment[];
  before: IdentifiedSegment[];
  after: IdentifiedSegment[];
};

export type HelpVideoGeneratedPartStep = HelpVideoGeneratedStep & {
  sourceSegmentIds: string[];
};

type GeneratedPartStep = HelpVideoGeneratedPartStep;

type GeneratedPartResponse = {
  hasUsefulContent: boolean;
  steps: HelpVideoGeneratedStep[];
};

export type HelpVideoGeneratedMetadata = Omit<HelpVideoGeneratedArticle, "steps">;
type GeneratedMetadata = HelpVideoGeneratedMetadata;

export type HelpVideoArticleCheckpoint = {
  totalParts?: number;
  completedParts?: Array<{
    partIndex: number;
    segmentIds: string[];
    steps: HelpVideoGeneratedPartStep[];
  }>;
  metadata?: HelpVideoGeneratedMetadata;
};

export type HelpVideoCoverage = {
  generatedAt: string;
  summary: {
    totalSegments: number;
    relevantSegments: number;
    coveredRelevantSegments: number;
    ignoredSegments: number;
    uncoveredRelevantSegments: number;
    processingParts: number;
    generatedSteps: number;
  };
  segments: Array<{
    id: string;
    start: number;
    end: number;
    classification: HelpVideoSegmentClassification;
    topicKey: string;
    stepIndexes: number[];
  }>;
};

export type HelpVideoArticlePipelineAiUsage = {
  operation:
    | "video_coverage_audit"
    | "video_article_part"
    | "video_article_metadata";
  provider?: string;
  model: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  latencyMs: number;
  status: "success" | "failed";
  failureCode?: string | null;
};

type PipelineProgressHandler = (progress: {
  label: string;
  detail?: string;
}) => void | Promise<void>;

type PipelineAiUsageHandler = (
  usage: HelpVideoArticlePipelineAiUsage,
) => void | Promise<void>;

const GENERATION_PART_SEGMENTS = 36;
const GENERATION_PART_SECONDS = 6 * 60;
const PART_CONTEXT_SECONDS = 45;
const PART_CONTEXT_SEGMENTS = 8;
const PART_GENERATION_ATTEMPTS = 2;
const RETRYABLE_PART_FAILURE_CODES = new Set([
  "AI_TIMEOUT",
  "AI_OUTPUT_INCOMPLETE",
  "AI_EMPTY_RESPONSE",
  "AI_INVALID_JSON",
]);

const EDITORIAL_INVALID_PATTERNS = [
  /\bna transcri(?:ção|cao)\b/i,
  /\b(?:conforme|segundo|de acordo com).{0,80}\btranscri(?:ção|cao)\b/i,
  /\b(?:explica(?:ção|cao)|conteúdo|informação).{0,50}\b(?:da|na) transcri(?:ção|cao)\b/i,
  /\ba transcri(?:ção|cao) (?:diz|informa|menciona|mostra|indica|explica)\b/i,
  /\bno vídeo (?:é |foi )?(?:dito|mencionado|mostrado|explicado|informado)\b/i,
  /\bo vídeo (?:diz|mostra|explica|informa|menciona)\b/i,
  /\bconforme (?:o )?vídeo\b/i,
  /\bna grava(?:ção|cao)\b/i,
  /\bo narrador\b/i,
  /\bfoi (?:dito|mencionado) (?:no|na) (?:vídeo|áudio|grava(?:ção|cao))\b/i,
  /\bnesta etapa não há ações? de interface\b/i,
  /\b(?:esta|essa) etapa (?:é|e) (?:apenas|somente) (?:explicativa|conceitual)\b/i,
  /\bsem ações? de interface\b/i,
  /\bapenas compreensão (?:da|do|de)\b/i,
  /\b(?:não|nao) (?:há|ha) (?:necessidade de )?(?:screenshot|captura de tela)\b/i,
  /(?:^|\n)\s*(?:\*\*|__)?\s*(?:svg|html|xml|css|json)\s*(?:\*\*|__)?\s*(?=\n|$)/i,
  /<\/?svg\b/i,
];

function aiFailureCode(cause: unknown): string {
  if (cause instanceof AiGatewayError) return cause.code;
  if (cause instanceof Error) return cause.message.slice(0, 180);
  return "AI_REQUEST_FAILED";
}

function retryablePartFailure(cause: unknown): boolean {
  return cause instanceof AiGatewayError
    && RETRYABLE_PART_FAILURE_CODES.has(cause.code);
}

async function reportAiUsage(
  handler: PipelineAiUsageHandler | undefined,
  usage: HelpVideoArticlePipelineAiUsage,
): Promise<void> {
  if (!handler) return;
  await Promise.resolve(handler(usage)).catch(() => undefined);
}

function segmentId(index: number): string {
  return `S${String(index + 1).padStart(6, "0")}`;
}

function formatTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function identifiedSegments(
  segments: HelpVideoSourceSegment[],
): IdentifiedSegment[] {
  return segments
    .map((segment, index) => ({
      ...segment,
      text: segment.text.trim(),
      id: segmentId(index),
      sourceIndex: index,
    }))
    .filter((segment) => segment.text.length > 0);
}

function buildCoreParts(segments: IdentifiedSegment[]): IdentifiedSegment[][] {
  const parts: IdentifiedSegment[][] = [];
  let current: IdentifiedSegment[] = [];

  const flush = () => {
    if (current.length === 0) return;
    parts.push(current);
    current = [];
  };

  for (const segment of segments) {
    const first = current[0];
    const exceedsSegmentLimit = current.length >= GENERATION_PART_SEGMENTS;
    const exceedsTimeLimit =
      Boolean(first)
      && segment.end - first!.start > GENERATION_PART_SECONDS;

    if (exceedsSegmentLimit || exceedsTimeLimit) flush();
    current.push(segment);
  }

  flush();
  return parts;
}

function buildGenerationParts(segments: IdentifiedSegment[]): GenerationPart[] {
  return buildCoreParts(segments).map((core, partIndex) => {
    const first = core[0]!;
    const last = core.at(-1)!;
    const coreIds = new Set(core.map((segment) => segment.id));

    const before = segments
      .filter(
        (segment) =>
          !coreIds.has(segment.id)
          && segment.end <= first.start
          && segment.end >= first.start - PART_CONTEXT_SECONDS,
      )
      .slice(-PART_CONTEXT_SEGMENTS);

    const after = segments
      .filter(
        (segment) =>
          !coreIds.has(segment.id)
          && segment.start >= last.end
          && segment.start <= last.end + PART_CONTEXT_SECONDS,
      )
      .slice(0, PART_CONTEXT_SEGMENTS);

    return {
      partIndex,
      core,
      before,
      after,
    };
  });
}

function partSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["hasUsefulContent", "steps"],
    properties: {
      hasUsefulContent: { type: "boolean" },
      steps: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "title",
            "description",
            "instruction",
            "screenshots",
          ],
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            instruction: { type: "string" },
            screenshots: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: [
                  "startSeconds",
                  "endSeconds",
                  "capture",
                  "target",
                  "altText",
                  "assistantDescription",
                ],
                properties: {
                  startSeconds: { type: "number" },
                  endSeconds: { type: "number" },
                  capture: { type: "string", enum: ["before", "after"] },
                  target: { type: "string" },
                  altText: { type: "string" },
                  assistantDescription: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  };
}

function editorialInvalid(value: string): boolean {
  return EDITORIAL_INVALID_PATTERNS.some((pattern) => pattern.test(value));
}

function stepHasEditorialIssue(step: HelpVideoGeneratedStep): boolean {
  return [
    step.title,
    step.description,
    step.instruction,
    ...step.screenshots.flatMap((item) => [
      item.target,
      item.altText,
      item.assistantDescription,
    ]),
  ].some((value) => editorialInvalid(value));
}

function normalizeScreenshot(
  screenshot: HelpVideoPlannedScreenshot,
): HelpVideoPlannedScreenshot | null {
  const startSeconds = Number(screenshot.startSeconds);
  const endSeconds = Number(screenshot.endSeconds);
  if (
    !Number.isFinite(startSeconds)
    || !Number.isFinite(endSeconds)
    || endSeconds <= startSeconds
  ) {
    return null;
  }

  return {
    startSeconds: Math.max(0, startSeconds),
    endSeconds: Math.max(0, endSeconds),
    capture: screenshot.capture === "before" ? "before" : "after",
    target: screenshot.target.trim().slice(0, 1_000),
    altText: screenshot.altText.trim().slice(0, 500),
    assistantDescription: screenshot.assistantDescription.trim().slice(0, 20_000),
  };
}

function normalizePartSteps(
  response: GeneratedPartResponse,
  segmentIds: string[],
): GeneratedPartStep[] {
  return response.steps.flatMap((step) => {
    const title = step.title.trim().slice(0, 180);
    const description = step.description.trim().slice(0, 2_000);
    const instruction = step.instruction.trim().slice(0, 50_000);
    if (!title || !instruction) return [];

    const screenshots = (step.screenshots ?? [])
      .slice(0, 1)
      .flatMap((item) => {
        const normalized = normalizeScreenshot(item);
        return normalized ? [normalized] : [];
      });

    return [{
      title,
      description,
      instruction,
      screenshots,
      sourceSegmentIds: [...segmentIds],
    }];
  });
}

function segmentInput(segment: IdentifiedSegment): string {
  return `[${formatTime(segment.start)}-${formatTime(segment.end)}] ${segment.text}`;
}

function partInput(part: GenerationPart): string {
  const sections: string[] = [];

  if (part.before.length > 0) {
    sections.push([
      "CONTEXTO ANTERIOR — apenas para continuidade; não repita conteúdo já resolvido:",
      ...part.before.map(segmentInput),
    ].join("\n"));
  }

  sections.push([
    "JANELA PRINCIPAL — gere conteúdo somente a partir destes trechos:",
    ...part.core.map(segmentInput),
  ].join("\n"));

  if (part.after.length > 0) {
    sections.push([
      "CONTEXTO POSTERIOR — apenas para continuidade; não antecipe conteúdo que será tratado depois:",
      ...part.after.map(segmentInput),
    ].join("\n"));
  }

  return sections.join("\n\n");
}

async function generatePart(
  part: GenerationPart,
  partCount: number,
  onAiUsage?: PipelineAiUsageHandler,
): Promise<GeneratedPartStep[]> {
  const startedAt = Date.now();
  const segmentIds = part.core.map((segment) => segment.id);
  let lastCause: unknown = null;
  let lastResponseMeta: {
    provider?: string;
    model: string;
    inputTokens?: number | null;
    outputTokens?: number | null;
  } = { model: "ai-gateway" };

  for (let attempt = 1; attempt <= PART_GENERATION_ATTEMPTS; attempt += 1) {
    try {
      const response = await createAiStructuredResponse<GeneratedPartResponse>({
        task: "content_edit",
        requiredCapabilities: ["content.draft"],
        instructions: [
          "Escreva documentação oficial F10 para o usuário final usando somente a JANELA PRINCIPAL.",
          "Os blocos de contexto anterior e posterior servem apenas para manter continuidade entre partes. Não repita o contexto anterior e não antecipe o contexto posterior.",
          "Preserve ações, campos, valores, regras, condições, exceções e resultados úteis presentes na janela principal.",
          "Agrupe falas relacionadas em etapas coerentes. Não crie uma etapa para cada frase.",
          "Remova saudações, hesitações, repetições e falas sem valor operacional.",
          "Se a janela principal realmente não contiver informação útil para um artigo de ajuda, retorne hasUsefulContent=false e steps=[].",
          "Se houver informação operacional útil, retorne hasUsefulContent=true e pelo menos uma etapa.",
          "A fonte é evidência interna. NUNCA mencione transcrição, vídeo, gravação, narrador, áudio ou processo de geração.",
          "Não explique que uma etapa é conceitual, que não possui ação de interface ou que não precisa de screenshot.",
          "Não produza placeholders ou artefatos como **svg**, <svg>, <html>, JSON isolado ou nomes de formatos sem função editorial.",
          "Use Markdown para tornar a leitura rápida e visual. O formato suportado é: listas numeradas, listas com -, **negrito**, *ênfase* e `destaque inline`.",
          "Use `texto entre crases` para itens que o usuário precisa localizar ou reconhecer na interface: botões, campos, menus, abas, opções, status, valores e nomes curtos. Exemplos: clique em `Salvar`, abra `Financeiro`, selecione `Ativo`.",
          "Use **negrito** somente para conceitos ou alertas curtos importantes. Não coloque frases ou parágrafos inteiros em negrito.",
          "Prefira parágrafos curtos, listas e ações objetivas. Evite blocos densos de texto.",
          "Não use títulos Markdown com #, tabelas, blocos de código com três crases ou links em sintaxe Markdown.",
          "Toda ação executável deve ficar em linha numerada usando 1., 2., 3. e deve aplicar `badges` nos elementos de interface relevantes.",
          "Para etapa de interface, planeje no máximo um screenshot usando os timecodes da JANELA PRINCIPAL.",
          "Use screenshots: [] quando não houver estado visual útil a capturar.",
          "Não invente telas, campos, URLs, regras ou resultados.",
          attempt === 2
            ? "A tentativa anterior falhou estruturalmente ou editorialmente. Gere uma resposta simples, completa e estritamente dentro do schema."
            : "",
        ].filter(Boolean).join("\n"),
        userInput: [
          `PARTE ${part.partIndex + 1} DE ${partCount}`,
          partInput(part),
        ].join("\n\n"),
        schemaName: attempt === 1
          ? "f10_help_video_article_part"
          : "f10_help_video_article_part_retry",
        schema: partSchema(),
        maxOutputTokens: 10_000,
        timeoutMs: 180_000,
      });

      lastResponseMeta = {
        provider: response.provider,
        model: response.model,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
      };

      const steps = normalizePartSteps(response.data, segmentIds);
      if (!response.data.hasUsefulContent && steps.length === 0) {
        await reportAiUsage(onAiUsage, {
          operation: "video_article_part",
          ...lastResponseMeta,
          latencyMs: Date.now() - startedAt,
          status: "success",
        });
        return [];
      }

      if (steps.length === 0) {
        lastCause = new Error("HELP_VIDEO_ARTICLE_PART_EMPTY");
        continue;
      }

      if (steps.some(stepHasEditorialIssue)) {
        lastCause = new Error("HELP_VIDEO_ARTICLE_EDITORIAL_INVALID");
        continue;
      }

      await reportAiUsage(onAiUsage, {
        operation: "video_article_part",
        ...lastResponseMeta,
        latencyMs: Date.now() - startedAt,
        status: "success",
      });
      return steps;
    } catch (cause) {
      lastCause = cause;
      if (attempt < PART_GENERATION_ATTEMPTS && retryablePartFailure(cause)) {
        continue;
      }
      break;
    }
  }

  const failure = lastCause ?? new Error("HELP_VIDEO_ARTICLE_PART_FAILED");
  await reportAiUsage(onAiUsage, {
    operation: "video_article_part",
    ...lastResponseMeta,
    latencyMs: Date.now() - startedAt,
    status: "failed",
    failureCode: aiFailureCode(failure),
  });
  throw new Error(`HELP_VIDEO_ARTICLE_PART_FAILED:${aiFailureCode(failure)}`);
}

function metadataSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "title",
      "slug",
      "summary",
      "quickGuide",
      "categories",
      "searchAliases",
      "assistantKnowledge",
    ],
    properties: {
      title: { type: "string" },
      slug: { type: "string" },
      summary: { type: "string" },
      quickGuide: { type: "string" },
      categories: { type: "array", items: { type: "string" } },
      searchAliases: { type: "array", items: { type: "string" } },
      assistantKnowledge: { type: "string" },
    },
  };
}

function metadataHasEditorialIssue(metadata: GeneratedMetadata): boolean {
  return [
    metadata.title,
    metadata.summary,
    metadata.quickGuide,
    metadata.assistantKnowledge,
  ].some((value) => editorialInvalid(value));
}

async function generateMetadata(
  steps: GeneratedPartStep[],
  categories: HelpVideoArticleCategory[],
  onAiUsage?: PipelineAiUsageHandler,
): Promise<GeneratedMetadata> {
  const startedAt = Date.now();
  const stepOutline = steps
    .map((step, index) => {
      const context = step.description.trim() || step.instruction.trim().slice(0, 320);
      return `${index + 1}. ${step.title}${context ? ` — ${context}` : ""}`;
    })
    .join("\n");

  let lastResponseMeta: {
    provider?: string;
    model: string;
    inputTokens?: number | null;
    outputTokens?: number | null;
  } = { model: "ai-gateway" };

  try {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const response = await createAiStructuredResponse<GeneratedMetadata>({
        task: "content_edit",
        requiredCapabilities: ["content.draft"],
        instructions: [
          "Crie somente os metadados editoriais para um artigo oficial da Base de Conhecimento F10.",
          "As etapas abaixo já foram produzidas e não devem ser reescritas.",
          "Use o conjunto das etapas para produzir título, slug, resumo, guia rápido, categorias, aliases e conhecimento complementar.",
          "quickGuide deve ser curto, sequencial e baseado apenas nas etapas existentes.",
          "No quickGuide, use Markdown simples com lista numerada e `texto entre crases` para botões, campos, menus, opções, status ou valores que mereçam destaque visual.",
          "Use **negrito** com moderação para conceitos importantes; não transforme frases inteiras em destaque.",
          "Não use títulos com #, tabelas ou blocos de código.",
          "Não invente fatos.",
          "Nunca mencione transcrição, vídeo, gravação, narrador, áudio ou processo de geração.",
          "Não produza placeholders ou artefatos de formatação.",
          attempt === 2
            ? "A tentativa anterior falhou editorialmente. Reescreva os metadados de forma direta e objetiva."
            : "",
        ].filter(Boolean).join("\n"),
        userInput: [
          "ETAPAS DO ARTIGO:",
          stepOutline,
          `CATEGORIAS PERMITIDAS: ${categories.map((category) => `${category.slug} (${category.name})`).join(", ")}`,
        ].join("\n\n"),
        schemaName: attempt === 1
          ? "f10_help_video_article_metadata"
          : "f10_help_video_article_metadata_retry",
        schema: metadataSchema(),
        maxOutputTokens: 4_000,
        timeoutMs: 120_000,
      });

      lastResponseMeta = {
        provider: response.provider,
        model: response.model,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
      };

      const metadata: GeneratedMetadata = {
        title: response.data.title.trim().slice(0, 160),
        slug: response.data.slug.trim().slice(0, 120),
        summary: response.data.summary.trim().slice(0, 320),
        quickGuide: response.data.quickGuide.trim().slice(0, 12_000),
        categories: response.data.categories
          .map((value) => value.trim())
          .filter(Boolean)
          .slice(0, 12),
        searchAliases: response.data.searchAliases
          .map((value) => value.trim())
          .filter(Boolean)
          .slice(0, 80),
        assistantKnowledge: response.data.assistantKnowledge.trim().slice(0, 40_000),
      };

      if (metadata.title && !metadataHasEditorialIssue(metadata)) {
        await reportAiUsage(onAiUsage, {
          operation: "video_article_metadata",
          ...lastResponseMeta,
          latencyMs: Date.now() - startedAt,
          status: "success",
        });
        return metadata;
      }
    }

    throw new Error("HELP_VIDEO_ARTICLE_EDITORIAL_INVALID");
  } catch (cause) {
    await reportAiUsage(onAiUsage, {
      operation: "video_article_metadata",
      ...lastResponseMeta,
      latencyMs: Date.now() - startedAt,
      status: "failed",
      failureCode: aiFailureCode(cause),
    });
    if (
      cause instanceof Error
      && cause.message === "HELP_VIDEO_ARTICLE_EDITORIAL_INVALID"
    ) {
      throw cause;
    }
    throw new Error(`HELP_VIDEO_ARTICLE_METADATA_FAILED:${aiFailureCode(cause)}`);
  }
}

function checkpointMatchesPart(
  candidate: NonNullable<HelpVideoArticleCheckpoint["completedParts"]>[number],
  part: GenerationPart,
): boolean {
  const segmentIds = part.core.map((segment) => segment.id);
  return (
    candidate.partIndex === part.partIndex
    && candidate.segmentIds.length === segmentIds.length
    && candidate.segmentIds.every((id, index) => id === segmentIds[index])
    && !candidate.steps.some(stepHasEditorialIssue)
  );
}

function coverageFromParts(
  segments: IdentifiedSegment[],
  parts: GenerationPart[],
  completedByPart: Map<number, {
    partIndex: number;
    segmentIds: string[];
    steps: GeneratedPartStep[];
  }>,
  generated: GeneratedPartStep[],
): HelpVideoCoverage {
  const stepIndexesByPart = new Map<number, number[]>();
  let stepOffset = 0;

  for (const part of parts) {
    const completed = completedByPart.get(part.partIndex);
    const indexes = completed
      ? completed.steps.map((_, index) => stepOffset + index)
      : [];
    stepIndexesByPart.set(part.partIndex, indexes);
    stepOffset += completed?.steps.length ?? 0;
  }

  const partBySegmentId = new Map<string, number>();
  for (const part of parts) {
    for (const segment of part.core) {
      partBySegmentId.set(segment.id, part.partIndex);
    }
  }

  const usefulPartIndexes = new Set(
    Array.from(completedByPart.values())
      .filter((part) => part.steps.length > 0)
      .map((part) => part.partIndex),
  );
  const relevantSegments = segments.filter((segment) => {
    const partIndex = partBySegmentId.get(segment.id);
    return partIndex !== undefined && usefulPartIndexes.has(partIndex);
  });

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalSegments: segments.length,
      relevantSegments: relevantSegments.length,
      coveredRelevantSegments: relevantSegments.length,
      ignoredSegments: segments.length - relevantSegments.length,
      uncoveredRelevantSegments: 0,
      processingParts: parts.length,
      generatedSteps: generated.length,
    },
    segments: segments.map((segment) => {
      const partIndex = partBySegmentId.get(segment.id);
      const useful = partIndex !== undefined && usefulPartIndexes.has(partIndex);
      return {
        id: segment.id,
        start: segment.start,
        end: segment.end,
        classification: useful ? "explanation" : "irrelevant",
        topicKey: partIndex === undefined
          ? "sem_parte"
          : `parte_${String(partIndex + 1).padStart(3, "0")}`,
        stepIndexes: partIndex === undefined
          ? []
          : stepIndexesByPart.get(partIndex) ?? [],
      };
    }),
  };
}

export async function generateHelpVideoArticle(input: {
  segments: HelpVideoSourceSegment[];
  categories: HelpVideoArticleCategory[];
  checkpoint?: HelpVideoArticleCheckpoint;
  onCheckpoint?: (
    checkpoint: HelpVideoArticleCheckpoint,
  ) => void | Promise<void>;
  onProgress?: PipelineProgressHandler;
  onAiUsage?: PipelineAiUsageHandler;
}): Promise<{
  article: HelpVideoGeneratedArticle;
  coverage: HelpVideoCoverage;
  checkpoint: HelpVideoArticleCheckpoint;
}> {
  const identified = identifiedSegments(input.segments);
  if (identified.length === 0) throw new Error("HELP_VIDEO_TRANSCRIPTION_EMPTY");

  const parts = buildGenerationParts(identified);
  if (parts.length === 0) throw new Error("HELP_VIDEO_COVERAGE_NO_RELEVANT_CONTENT");

  const checkpoint: HelpVideoArticleCheckpoint = {
    totalParts: parts.length,
    completedParts: [...(input.checkpoint?.completedParts ?? [])],
    metadata: input.checkpoint?.metadata,
  };
  await input.onCheckpoint?.(checkpoint);

  const completedByPart = new Map<number, {
    partIndex: number;
    segmentIds: string[];
    steps: GeneratedPartStep[];
  }>();

  for (const part of parts) {
    const saved = checkpoint.completedParts?.find((candidate) =>
      checkpointMatchesPart(candidate, part),
    );
    if (saved) completedByPart.set(part.partIndex, saved);
  }

  if (completedByPart.size > 0) {
    await input.onProgress?.({
      label: "Retomando conteúdo já processado",
      detail: `${completedByPart.size} de ${parts.length} parte(s) recuperada(s) do checkpoint`,
    });
  }

  for (const part of parts) {
    if (completedByPart.has(part.partIndex)) continue;

    await input.onProgress?.({
      label: `Gerando parte ${part.partIndex + 1} de ${parts.length}`,
      detail: `${formatTime(part.core[0]!.start)}–${formatTime(part.core.at(-1)!.end)}`,
    });

    const steps = await generatePart(part, parts.length, input.onAiUsage);
    completedByPart.set(part.partIndex, {
      partIndex: part.partIndex,
      segmentIds: part.core.map((segment) => segment.id),
      steps,
    });

    checkpoint.completedParts = Array.from(completedByPart.values())
      .sort((left, right) => left.partIndex - right.partIndex);
    checkpoint.metadata = undefined;
    await input.onCheckpoint?.(checkpoint);

    await input.onProgress?.({
      label: `Parte ${part.partIndex + 1} de ${parts.length} concluída`,
      detail: steps.length > 0
        ? `${steps.length} etapa(s) preservada(s)`
        : "Sem conteúdo operacional novo nesta janela",
    });
  }

  const generated = parts.flatMap(
    (part) => completedByPart.get(part.partIndex)?.steps ?? [],
  );

  if (generated.length === 0) {
    throw new Error("HELP_VIDEO_COVERAGE_NO_RELEVANT_CONTENT");
  }
  if (generated.some(stepHasEditorialIssue)) {
    throw new Error("HELP_VIDEO_ARTICLE_EDITORIAL_INVALID");
  }

  await input.onProgress?.({
    label: "Finalizando título e resumo",
    detail: `${generated.length} etapa(s) geradas em ${parts.length} parte(s)`,
  });

  const metadata =
    checkpoint.metadata && !metadataHasEditorialIssue(checkpoint.metadata)
      ? checkpoint.metadata
      : await generateMetadata(
          generated,
          input.categories,
          input.onAiUsage,
        );

  if (!checkpoint.metadata) {
    checkpoint.metadata = metadata;
    await input.onCheckpoint?.(checkpoint);
  }

  const article: HelpVideoGeneratedArticle = {
    ...metadata,
    steps: generated.map(({ sourceSegmentIds: _sourceSegmentIds, ...step }) => step),
  };

  return {
    article,
    coverage: coverageFromParts(
      identified,
      parts,
      completedByPart,
      generated,
    ),
    checkpoint,
  };
}
