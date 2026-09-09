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

type ClassifiedSegment = IdentifiedSegment & {
  classification: HelpVideoSegmentClassification;
  topicKey: string;
};

export type HelpVideoGeneratedPartStep = HelpVideoGeneratedStep & {
  sourceSegmentIds: string[];
};

type GeneratedPartStep = HelpVideoGeneratedPartStep;

type GeneratedPartResponse = {
  steps: GeneratedPartStep[];
};

export type HelpVideoGeneratedMetadata = Omit<HelpVideoGeneratedArticle, "steps">;
type GeneratedMetadata = HelpVideoGeneratedMetadata;

export type HelpVideoArticleCheckpoint = {
  classifiedSegments?: Array<{
    id: string;
    sourceIndex: number;
    start: number;
    end: number;
    text: string;
    classification: HelpVideoSegmentClassification;
    topicKey: string;
  }>;
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
    | "video_coverage"
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
  return segments.map((segment, index) => ({
    ...segment,
    id: segmentId(index),
    sourceIndex: index,
  }));
}

function classifyTranscript(
  segments: IdentifiedSegment[],
): ClassifiedSegment[] {
  return segments.map((segment) => ({
    ...segment,
    classification: "explanation",
    topicKey: `janela_${String(
      Math.floor(segment.start / GENERATION_PART_SECONDS) + 1,
    ).padStart(3, "0")}`,
  }));
}

function isRelevant(segment: ClassifiedSegment): boolean {
  return segment.classification !== "irrelevant";
}

function buildGenerationParts(segments: ClassifiedSegment[]): ClassifiedSegment[][] {
  const relevant = segments.filter(isRelevant);
  if (relevant.length === 0) return [];

  const parts: ClassifiedSegment[][] = [];
  let current: ClassifiedSegment[] = [];

  const flush = () => {
    if (current.length > 0) parts.push(current);
    current = [];
  };

  for (const segment of relevant) {
    const first = current[0];
    const previous = current.at(-1);
    const duration = first ? segment.end - first.start : 0;
    const topicChanged =
      Boolean(previous) &&
      previous!.topicKey !== segment.topicKey &&
      first !== undefined &&
      previous!.end - first.start >= 3 * 60;
    const sourceGap =
      Boolean(previous) && segment.sourceIndex - previous!.sourceIndex > 8;

    if (
      current.length >= GENERATION_PART_SEGMENTS ||
      duration > GENERATION_PART_SECONDS ||
      topicChanged ||
      sourceGap
    ) {
      flush();
    }
    current.push(segment);
  }
  flush();
  return parts;
}

function partSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["steps"],
    properties: {
      steps: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "title",
            "description",
            "instruction",
            "sourceSegmentIds",
            "screenshots",
          ],
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            instruction: { type: "string" },
            sourceSegmentIds: {
              type: "array",
              items: { type: "string" },
            },
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

function stepHasEditorialIssue(step: GeneratedPartStep): boolean {
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

function normalizePartSteps(
  response: GeneratedPartResponse,
  allowedIds: Set<string>,
): GeneratedPartStep[] {
  return response.steps.flatMap((step) => {
    const title = step.title.trim().slice(0, 180);
    const instruction = step.instruction.trim().slice(0, 50_000);
    if (!title || !instruction) return [];

    const sourceSegmentIds = Array.from(
      new Set(
        step.sourceSegmentIds.filter(
          (id) => typeof id === "string" && allowedIds.has(id),
        ),
      ),
    );
    const screenshots = (step.screenshots ?? []).slice(0, 1).flatMap((item) => {
      const startSeconds = Number(item.startSeconds);
      const endSeconds = Number(item.endSeconds);
      if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds) || endSeconds <= startSeconds) {
        return [];
      }
      return [{
        startSeconds: Math.max(0, startSeconds),
        endSeconds: Math.max(0, endSeconds),
        capture: item.capture === "before" ? "before" as const : "after" as const,
        target: item.target.trim().slice(0, 1_000),
        altText: item.altText.trim().slice(0, 500),
        assistantDescription: item.assistantDescription.trim().slice(0, 20_000),
      }];
    });

    return [{
      title,
      description: step.description.trim().slice(0, 2_000),
      instruction,
      sourceSegmentIds,
      screenshots,
    }];
  });
}

function missingCoverage(
  requiredIds: string[],
  steps: GeneratedPartStep[],
): string[] {
  const covered = new Set(steps.flatMap((step) => step.sourceSegmentIds));
  return requiredIds.filter((id) => !covered.has(id));
}

type CoverageAuditResponse = {
  segments: Array<{
    segmentId: string;
    covered: boolean;
  }>;
};

function coverageAuditSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["segments"],
    properties: {
      segments: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["segmentId", "covered"],
          properties: {
            segmentId: { type: "string" },
            covered: { type: "boolean" },
          },
        },
      },
    },
  };
}

async function auditPartCoverage(
  part: ClassifiedSegment[],
  steps: GeneratedPartStep[],
  onAiUsage?: PipelineAiUsageHandler,
): Promise<string[]> {
  const startedAt = Date.now();
  let responseMeta: {
    provider?: string;
    model: string;
    inputTokens?: number | null;
    outputTokens?: number | null;
  } = { model: "ai-gateway" };

  try {
    const response = await createAiStructuredResponse<CoverageAuditResponse>({
      task: "content_edit",
      requiredCapabilities: ["content.draft"],
      instructions: [
        "Audite se cada segmento da fonte está REALMENTE representado no texto público gerado.",
        "Retorne exatamente um item para cada segmentId recebido.",
        "Marque covered=true somente quando a ação, regra, condição, resultado ou explicação daquele segmento estiver expressa no título, descrição ou instrução.",
        "Ignore sourceSegmentIds declarados pelas etapas; eles não são prova de cobertura.",
        "Não exija repetição literal. Considere paráfrases fiéis equivalentes.",
        "Se qualquer detalhe operacional relevante do segmento estiver ausente, marque covered=false.",
      ].join("\n"),
      userInput: [
        "FONTE:",
        partInput(part),
        "CONTEÚDO GERADO:",
        steps.map((step, index) => [
          `ETAPA ${index + 1}: ${step.title}`,
          step.description,
          step.instruction,
        ].filter(Boolean).join("\n")).join("\n\n"),
      ].join("\n\n"),
      schemaName: "f10_help_video_coverage_audit",
      schema: coverageAuditSchema(),
      maxOutputTokens: 6_000,
      timeoutMs: 120_000,
    });
    responseMeta = {
      provider: response.provider,
      model: response.model,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
    };

    const expected = new Set(part.map((segment) => segment.id));
    const seen = new Set<string>();
    const uncovered: string[] = [];
    for (const item of response.data.segments) {
      if (!expected.has(item.segmentId) || seen.has(item.segmentId)) {
        throw new Error("HELP_VIDEO_COVERAGE_AUDIT_INVALID");
      }
      seen.add(item.segmentId);
      if (!item.covered) uncovered.push(item.segmentId);
    }
    if (seen.size !== expected.size) {
      throw new Error("HELP_VIDEO_COVERAGE_AUDIT_INVALID");
    }

    await reportAiUsage(onAiUsage, {
      operation: "video_coverage_audit",
      ...responseMeta,
      latencyMs: Date.now() - startedAt,
      status: "success",
    });
    return uncovered;
  } catch (cause) {
    await reportAiUsage(onAiUsage, {
      operation: "video_coverage_audit",
      ...responseMeta,
      latencyMs: Date.now() - startedAt,
      status: "failed",
      failureCode: aiFailureCode(cause),
    });
    throw new Error(`HELP_VIDEO_COVERAGE_AUDIT_FAILED:${aiFailureCode(cause)}`);
  }
}

function partInput(part: ClassifiedSegment[]): string {
  return part
    .map(
      (segment) =>
        `[${segment.id}] [${segment.classification}] [${segment.topicKey}] [${formatTime(segment.start)}-${formatTime(segment.end)}] ${segment.text}`,
    )
    .join("\n");
}

async function generateCoverageRecovery(
  missingSegments: ClassifiedSegment[],
  existingSteps: GeneratedPartStep[],
  partIndex: number,
  partCount: number,
  onAiUsage?: PipelineAiUsageHandler,
): Promise<GeneratedPartStep[]> {
  if (missingSegments.length === 0) return [];

  const startedAt = Date.now();
  const requiredIds = missingSegments.map((segment) => segment.id);
  const allowedIds = new Set(requiredIds);
  let responseMeta: {
    provider?: string;
    model: string;
    inputTokens?: number | null;
    outputTokens?: number | null;
  } = { model: "ai-gateway" };

  try {
    const response = await createAiStructuredResponse<GeneratedPartResponse>({
      task: "content_edit",
      requiredCapabilities: ["content.draft"],
      instructions: [
        "Complete um artigo F10 já existente usando SOMENTE os segmentos pendentes fornecidos.",
        "Crie apenas as etapas adicionais necessárias para representar integralmente esses segmentos.",
        "Não reescreva, resuma nem repita etapas que já estão cobertas.",
        "Cada segmentId recebido DEVE aparecer em sourceSegmentIds e seu fato operacional deve estar realmente presente no texto público.",
        "A fonte é evidência interna. NUNCA mencione transcrição, vídeo, gravação, narrador, áudio, processo de geração, ausência de ações ou ausência de screenshot.",
        "Não produza placeholders ou artefatos como **svg**, <svg>, **html**, JSON isolado ou nomes de formatos sem função editorial.",
        "Escreva diretamente a orientação ao usuário final.",
        "Preserve ações, campos, valores, regras, condições, exceções e resultados.",
        "Toda ação executável deve ficar em linha numerada usando **1.**, **2.**, **3.**.",
        "Para etapa de interface, planeje no máximo um screenshot usando os tempos dos segmentos pendentes.",
        "Não invente fatos, telas, campos, URLs ou resultados.",
      ].join("\n"),
      userInput: [
        `PARTE ORIGINAL ${partIndex + 1} DE ${partCount}`,
        `SEGMENTOS PENDENTES: ${requiredIds.join(", ")}`,
        "TRECHOS PENDENTES:",
        partInput(missingSegments),
        "ETAPAS JÁ GERADAS — USE APENAS PARA EVITAR DUPLICAÇÃO:",
        existingSteps
          .map((step, index) => [
            `ETAPA EXISTENTE ${index + 1}: ${step.title}`,
            step.description,
            step.instruction,
          ].filter(Boolean).join("\n"))
          .join("\n\n"),
      ].join("\n\n"),
      schemaName: "f10_help_video_article_coverage_recovery",
      schema: partSchema(),
      maxOutputTokens: 8_000,
      timeoutMs: 180_000,
    });

    responseMeta = {
      provider: response.provider,
      model: response.model,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
    };

    const recoverySteps = normalizePartSteps(response.data, allowedIds);
    if (recoverySteps.length === 0 || recoverySteps.some(stepHasEditorialIssue)) {
      throw new Error("HELP_VIDEO_COVERAGE_RECOVERY_INVALID");
    }

    const referencedMissing = missingCoverage(requiredIds, recoverySteps);
    if (referencedMissing.length > 0) {
      throw new Error("HELP_VIDEO_COVERAGE_RECOVERY_INCOMPLETE");
    }

    await reportAiUsage(onAiUsage, {
      operation: "video_article_part",
      ...responseMeta,
      latencyMs: Date.now() - startedAt,
      status: "success",
    });

    return recoverySteps;
  } catch (cause) {
    await reportAiUsage(onAiUsage, {
      operation: "video_article_part",
      ...responseMeta,
      latencyMs: Date.now() - startedAt,
      status: "failed",
      failureCode: aiFailureCode(cause),
    });
    throw new Error(`HELP_VIDEO_COVERAGE_RECOVERY_FAILED:${aiFailureCode(cause)}`);
  }
}

async function generatePart(
  part: ClassifiedSegment[],
  partIndex: number,
  partCount: number,
  onAiUsage?: PipelineAiUsageHandler,
): Promise<GeneratedPartStep[]> {
  const startedAt = Date.now();
  const requiredIds = part.map((segment) => segment.id);
  const allowedIds = new Set(requiredIds);
  let lastResponseMeta: {
    provider?: string;
    model: string;
    inputTokens?: number | null;
    outputTokens?: number | null;
  } = { model: "ai-gateway" };
  let lastMissing = requiredIds;
  let latestSteps: GeneratedPartStep[] = [];
  let latestEditorialIssue = false;

  try {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const response = await createAiStructuredResponse<GeneratedPartResponse>({
        task: "content_edit",
        requiredCapabilities: ["content.draft"],
        instructions: [
          "Escreva documentação oficial F10 para o usuário final usando somente os segmentos fornecidos.",
          "A fonte recebida é evidência interna. NUNCA mencione transcrição, gravação, narrador, áudio usado na geração, nem diga 'no vídeo é mostrado', 'foi dito' ou frases equivalentes.",
          "NUNCA explique o processo de geração. Não escreva frases como 'nesta etapa não há ações de interface', 'etapa explicativa', 'sem necessidade de screenshot' ou justificativas sobre por que uma imagem não foi criada.",
          "Se o trecho for conceitual, escreva diretamente o conceito útil ao usuário, sem comentar que ele é conceitual ou que não possui ações.",
          "Não produza marcadores soltos, placeholders ou lixo de formatação como **svg**, <svg>, **html**, JSON isolado ou nomes de formatos sem função no texto.",
          "Escreva diretamente a orientação: transforme cada fato em instrução, regra, condição, resultado ou explicação útil.",
          "Não resuma a ponto de perder ações, campos, valores, regras, condições, exceções ou resultados.",
          "Toda ação executável deve ficar em linha numerada usando **1.**, **2.**, **3.**.",
          "Agrupe ações relacionadas em etapas coerentes; não transforme automaticamente cada linha em uma etapa.",
          "Cada segmentId relevante recebido DEVE aparecer em sourceSegmentIds de pelo menos uma etapa.",
          "sourceSegmentIds é metadado interno e nunca deve ser citado no texto.",
          "Para etapa de interface, planeje no máximo um screenshot usando os tempos dos próprios segmentos da etapa.",
          "Não invente telas, campos, regras, URLs ou resultados.",
          attempt === 2
            ? `CORREÇÃO OBRIGATÓRIA: a auditoria detectou estes segmentos sem representação suficiente ou texto editorial inválido: ${lastMissing.join(", ") || "linguagem_de_bastidor_ou_artefato"}. Reescreva somente como documentação final para o usuário, sem comentar fonte, transcrição, vídeo, ausência de ações/screenshot ou processo de geração; remova qualquer token solto como **svg**.`
            : "",
        ].filter(Boolean).join("\n"),
        userInput: [
          `PARTE ${partIndex + 1} DE ${partCount}`,
          `SEGMENTOS OBRIGATÓRIOS: ${requiredIds.join(", ")}`,
          partInput(part),
        ].join("\n\n"),
        schemaName: attempt === 1
          ? "f10_help_video_article_part"
          : "f10_help_video_article_part_retry",
        schema: partSchema(),
        maxOutputTokens: 14_000,
        timeoutMs: 180_000,
      });
      lastResponseMeta = {
        provider: response.provider,
        model: response.model,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
      };

      const steps = normalizePartSteps(response.data, allowedIds);
      latestSteps = steps;
      lastMissing = missingCoverage(requiredIds, steps);
      const editorialLeak = steps.some(stepHasEditorialIssue);
      latestEditorialIssue = editorialLeak;
      if (steps.length > 0 && lastMissing.length === 0 && !editorialLeak) {
        lastMissing = await auditPartCoverage(part, steps, onAiUsage);
        if (lastMissing.length === 0) {
          await reportAiUsage(onAiUsage, {
            operation: "video_article_part",
            ...lastResponseMeta,
            latencyMs: Date.now() - startedAt,
            status: "success",
          });
          return steps;
        }
      }
      if (editorialLeak && lastMissing.length === 0) {
        lastMissing = ["linguagem_de_bastidor_ou_artefato"];
      }
    }

    const recoverableIds = lastMissing.filter((id) => allowedIds.has(id));
    if (
      latestSteps.length > 0
      && !latestEditorialIssue
      && recoverableIds.length > 0
      && recoverableIds.length === lastMissing.length
    ) {
      let combined = [...latestSteps];
      let pendingIds = [...recoverableIds];

      for (let recoveryRound = 1; recoveryRound <= 3 && pendingIds.length > 0; recoveryRound += 1) {
        const pendingIdSet = new Set(pendingIds);
        const missingSegments = part.filter((segment) => pendingIdSet.has(segment.id));
        const recoverySteps = await generateCoverageRecovery(
          missingSegments,
          combined,
          partIndex,
          partCount,
          onAiUsage,
        );
        combined = [...combined, ...recoverySteps];

        const referencedMissing = missingCoverage(requiredIds, combined);
        if (referencedMissing.length > 0) {
          pendingIds = referencedMissing;
          continue;
        }
        if (combined.some(stepHasEditorialIssue)) {
          throw new Error("HELP_VIDEO_ARTICLE_EDITORIAL_INVALID");
        }

        pendingIds = await auditPartCoverage(part, combined, onAiUsage);
      }

      if (pendingIds.length === 0) {
        await reportAiUsage(onAiUsage, {
          operation: "video_article_part",
          ...lastResponseMeta,
          latencyMs: Date.now() - startedAt,
          status: "success",
        });
        return combined;
      }

      lastMissing = pendingIds;
    }

    throw new Error("HELP_VIDEO_ARTICLE_PART_COVERAGE_INCOMPLETE");
  } catch (cause) {
    await reportAiUsage(onAiUsage, {
      operation: "video_article_part",
      ...lastResponseMeta,
      latencyMs: Date.now() - startedAt,
      status: "failed",
      failureCode: aiFailureCode(cause),
    });
    if (cause instanceof Error && cause.message === "HELP_VIDEO_ARTICLE_PART_COVERAGE_INCOMPLETE") {
      throw cause;
    }
    throw new Error(`HELP_VIDEO_ARTICLE_PART_FAILED:${aiFailureCode(cause)}`);
  }
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
  classifications: ClassifiedSegment[],
  categories: HelpVideoArticleCategory[],
  onAiUsage?: PipelineAiUsageHandler,
): Promise<GeneratedMetadata> {
  const startedAt = Date.now();
  const topics = Array.from(
    new Map(
      classifications
        .filter(isRelevant)
        .map((segment) => [segment.topicKey, segment.text.slice(0, 240)]),
    ).entries(),
  ).slice(0, 120);
  const stepOutline = steps
    .map((step, index) => `${index + 1}. ${step.title} — ${step.description}`)
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
          "O artigo já foi gerado em etapas com cobertura validada. Não reescreva nem resuma as etapas.",
          "quickGuide deve ser curto e sequencial; não precisa repetir todos os detalhes do artigo.",
          "A fonte é interna. NUNCA mencione transcrição, gravação, narrador, áudio de geração, 'no vídeo', 'foi dito' ou processo de criação.",
          "Não explique que uma etapa é conceitual, que não possui ações de interface ou que não precisa de screenshot. Escreva somente a informação útil ao usuário.",
          "Não produza placeholders ou artefatos como **svg**, <svg>, **html**, JSON isolado ou nomes de formatos sem função editorial.",
          "Não invente fatos.",
          attempt === 2 ? "A tentativa anterior usou linguagem de bastidor. Reescreva como documentação direta ao usuário." : "",
        ].filter(Boolean).join("\n"),
        userInput: [
          "ETAPAS:",
          stepOutline,
          "TÓPICOS COBERTOS:",
          topics.map(([key, sample]) => `${key}: ${sample}`).join("\n"),
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
        categories: response.data.categories.map((value) => value.trim()).filter(Boolean).slice(0, 12),
        searchAliases: response.data.searchAliases.map((value) => value.trim()).filter(Boolean).slice(0, 80),
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
    if (cause instanceof Error && cause.message === "HELP_VIDEO_ARTICLE_EDITORIAL_INVALID") {
      throw cause;
    }
    throw new Error(`HELP_VIDEO_ARTICLE_METADATA_FAILED:${aiFailureCode(cause)}`);
  }
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

  const checkpoint: HelpVideoArticleCheckpoint = {
    classifiedSegments: input.checkpoint?.classifiedSegments,
    completedParts: [...(input.checkpoint?.completedParts ?? [])],
    metadata: input.checkpoint?.metadata,
  };

  const checkpointClassified = checkpoint.classifiedSegments;
  const classifiedCheckpointValid =
    checkpointClassified?.length === identified.length
    && checkpointClassified.every((segment, index) => {
      const source = identified[index];
      return Boolean(
        source
        && segment.id === source.id
        && segment.sourceIndex === source.sourceIndex
        && segment.start === source.start
        && segment.end === source.end
        && segment.text === source.text,
      );
    });

  const classified: ClassifiedSegment[] = classifiedCheckpointValid
    ? checkpointClassified as ClassifiedSegment[]
    : classifyTranscript(identified);

  if (!classifiedCheckpointValid) {
    checkpoint.classifiedSegments = classified.map((segment) => ({ ...segment }));
    checkpoint.completedParts = [];
    checkpoint.metadata = undefined;
    await input.onCheckpoint?.(checkpoint);
  }
  const relevant = classified.filter(isRelevant);
  const ignored = classified.filter((segment) => !isRelevant(segment));
  if (relevant.length === 0) throw new Error("HELP_VIDEO_COVERAGE_NO_RELEVANT_CONTENT");

  const parts = buildGenerationParts(classified);
  const generated: GeneratedPartStep[] = [];

  for (const [index, part] of parts.entries()) {
    const segmentIds = part.map((segment) => segment.id);
    const saved = checkpoint.completedParts?.find(
      (candidate) =>
        candidate.partIndex === index
        && candidate.segmentIds.length === segmentIds.length
        && candidate.segmentIds.every((id, idIndex) => id === segmentIds[idIndex]),
    );
    const savedValid = Boolean(
      saved
      && saved.steps.length > 0
      && missingCoverage(segmentIds, saved.steps).length === 0
      && !saved.steps.some(stepHasEditorialIssue),
    );

    if (saved && savedValid) {
      generated.push(...saved.steps);
      await input.onProgress?.({
        label: "Retomando conteúdo já processado",
        detail: `Parte ${index + 1} de ${parts.length} recuperada do checkpoint`,
      });
      continue;
    }

    await input.onProgress?.({
      label: "Gerando conteúdo sem perder etapas",
      detail: `Parte ${index + 1} de ${parts.length} · ${part[0]?.id}-${part.at(-1)?.id}`,
    });
    const steps = await generatePart(part, index, parts.length, input.onAiUsage);
    generated.push(...steps);

    checkpoint.completedParts = [
      ...(checkpoint.completedParts ?? []).filter(
        (candidate) => candidate.partIndex !== index,
      ),
      {
        partIndex: index,
        segmentIds,
        steps,
      },
    ].sort((left, right) => left.partIndex - right.partIndex);
    checkpoint.metadata = undefined;
    await input.onCheckpoint?.(checkpoint);
  }

  const requiredIds = relevant.map((segment) => segment.id);
  const uncovered = missingCoverage(requiredIds, generated);
  if (uncovered.length > 0) {
    throw new Error(`HELP_VIDEO_COVERAGE_INCOMPLETE:${uncovered.slice(0, 20).join(",")}`);
  }
  if (generated.some(stepHasEditorialIssue)) {
    throw new Error("HELP_VIDEO_ARTICLE_EDITORIAL_INVALID");
  }

  await input.onProgress?.({
    label: "Finalizando título e resumo",
    detail: `${generated.length} etapa(s) · cobertura integral validada`,
  });
  const metadata = checkpoint.metadata && !metadataHasEditorialIssue(checkpoint.metadata)
    ? checkpoint.metadata
    : await generateMetadata(
        generated,
        classified,
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

  const stepIndexesBySegment = new Map<string, number[]>();
  generated.forEach((step, stepIndex) => {
    for (const id of step.sourceSegmentIds) {
      const indexes = stepIndexesBySegment.get(id) ?? [];
      indexes.push(stepIndex);
      stepIndexesBySegment.set(id, indexes);
    }
  });

  const coverage: HelpVideoCoverage = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalSegments: classified.length,
      relevantSegments: relevant.length,
      coveredRelevantSegments: relevant.length - uncovered.length,
      ignoredSegments: ignored.length,
      uncoveredRelevantSegments: uncovered.length,
      processingParts: parts.length,
      generatedSteps: generated.length,
    },
    segments: classified.map((segment) => ({
      id: segment.id,
      start: segment.start,
      end: segment.end,
      classification: segment.classification,
      topicKey: segment.topicKey,
      stepIndexes: stepIndexesBySegment.get(segment.id) ?? [],
    })),
  };

  return { article, coverage, checkpoint };
}
