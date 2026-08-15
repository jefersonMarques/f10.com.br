import { and, asc, eq, isNotNull } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import { helpPublications } from "$lib/server/db/helpPublications";
import {
  helpDestinations,
  helpOptions,
  helpQuestions,
} from "$lib/server/db/schema";
import { saveHelpContentVersion } from "$lib/server/help/helpVersionRepository";

export type HelpFlowOptionInput = {
  key: string;
  label: string;
  description: string;
  icon: string;
  target: string;
};

export type HelpQuestionInput = {
  eyebrow: string;
  title: string;
  description: string;
  compact: boolean;
  searchLabel: string;
  options: HelpFlowOptionInput[];
};

export function normalizeHelpFlowId(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function optionTargetToColumns(target: string) {
  if (target === "search") {
    return {
      nextQuestionId: null,
      destinationId: null,
      opensSearch: true,
    };
  }

  if (target.startsWith("question:")) {
    return {
      nextQuestionId: target.slice("question:".length),
      destinationId: null,
      opensSearch: false,
    };
  }

  if (target.startsWith("destination:")) {
    return {
      nextQuestionId: null,
      destinationId: target.slice("destination:".length),
      opensSearch: false,
    };
  }

  throw new Error("INVALID_FLOW_TARGET");
}

function columnsToOptionTarget(option: {
  nextQuestionId: string | null;
  destinationId: string | null;
  opensSearch: boolean;
}): string {
  if (option.opensSearch) return "search";
  if (option.nextQuestionId) return `question:${option.nextQuestionId}`;
  if (option.destinationId) return `destination:${option.destinationId}`;
  return "";
}

async function getQuestion(questionId: string) {
  const db = getDatabase();
  const [question] = await db
    .select()
    .from(helpQuestions)
    .where(eq(helpQuestions.id, questionId))
    .limit(1);

  return question ?? null;
}

async function getQuestionOptions(questionId: string) {
  const db = getDatabase();

  return db
    .select()
    .from(helpOptions)
    .where(eq(helpOptions.questionId, questionId))
    .orderBy(asc(helpOptions.sortOrder));
}

async function buildQuestionSnapshot(questionId: string) {
  const question = await getQuestion(questionId);
  if (!question) return null;

  const options = await getQuestionOptions(questionId);

  return {
    id: question.id,
    eyebrow: question.eyebrow,
    title: question.title,
    description: question.description,
    compact: question.compact,
    searchLabel: question.searchLabel ?? undefined,
    options: options.map((option) => ({
      id: option.optionKey,
      label: option.label,
      description: option.description,
      icon: option.icon,
      nextQuestionId: option.nextQuestionId ?? undefined,
      destinationId: option.destinationId ?? undefined,
      opensSearch: option.opensSearch || undefined,
    })),
    sortOrder: question.sortOrder,
  };
}

async function saveCurrentQuestionVersion(
  questionId: string,
  actorUserId: string,
): Promise<void> {
  const snapshot = await buildQuestionSnapshot(questionId);
  if (!snapshot) return;

  await saveHelpContentVersion(
    "question",
    questionId,
    snapshot,
    actorUserId,
  );
}

async function validateTargets(
  questionId: string,
  options: HelpFlowOptionInput[],
): Promise<void> {
  const db = getDatabase();
  const [questionRows, destinationRows] = await Promise.all([
    db.select({ id: helpQuestions.id }).from(helpQuestions),
    db.select({ id: helpDestinations.id }).from(helpDestinations),
  ]);
  const questionIds = new Set(questionRows.map((row) => row.id));
  const destinationIds = new Set(destinationRows.map((row) => row.id));

  if (!questionIds.has(questionId)) throw new Error("QUESTION_NOT_FOUND");

  for (const option of options) {
    if (option.target === "search") continue;

    if (option.target.startsWith("question:")) {
      const targetId = option.target.slice("question:".length);
      if (!questionIds.has(targetId)) throw new Error("QUESTION_TARGET_NOT_FOUND");
      continue;
    }

    if (option.target.startsWith("destination:")) {
      const targetId = option.target.slice("destination:".length);
      if (!destinationIds.has(targetId)) {
        throw new Error("DESTINATION_TARGET_NOT_FOUND");
      }
      continue;
    }

    throw new Error("INVALID_FLOW_TARGET");
  }
}

async function ensureAcyclicQuestionGraph(
  questionId: string,
  options: HelpFlowOptionInput[],
): Promise<void> {
  const db = getDatabase();
  const existingEdges = await db
    .select({
      questionId: helpOptions.questionId,
      nextQuestionId: helpOptions.nextQuestionId,
    })
    .from(helpOptions)
    .where(isNotNull(helpOptions.nextQuestionId));

  const graph = new Map<string, string[]>();

  function addEdge(from: string, to: string): void {
    const edges = graph.get(from) ?? [];
    edges.push(to);
    graph.set(from, edges);
  }

  for (const edge of existingEdges) {
    if (!edge.nextQuestionId || edge.questionId === questionId) continue;
    addEdge(edge.questionId, edge.nextQuestionId);
  }

  for (const option of options) {
    if (!option.target.startsWith("question:")) continue;
    addEdge(questionId, option.target.slice("question:".length));
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(node: string): boolean {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;

    visiting.add(node);

    for (const target of graph.get(node) ?? []) {
      if (visit(target)) return true;
    }

    visiting.delete(node);
    visited.add(node);
    return false;
  }

  for (const node of graph.keys()) {
    if (visit(node)) throw new Error("QUESTION_CYCLE");
  }
}

export async function listHelpQuestionsForAdmin() {
  const db = getDatabase();
  const [questions, options] = await Promise.all([
    db
      .select({
        id: helpQuestions.id,
        eyebrow: helpQuestions.eyebrow,
        title: helpQuestions.title,
        status: helpQuestions.status,
        sortOrder: helpQuestions.sortOrder,
        updatedAt: helpQuestions.updatedAt,
      })
      .from(helpQuestions)
      .orderBy(asc(helpQuestions.sortOrder), asc(helpQuestions.title)),
    db.select({ questionId: helpOptions.questionId }).from(helpOptions),
  ]);

  const optionCounts = new Map<string, number>();
  for (const option of options) {
    optionCounts.set(
      option.questionId,
      (optionCounts.get(option.questionId) ?? 0) + 1,
    );
  }

  return questions.map((question) => ({
    ...question,
    optionCount: optionCounts.get(question.id) ?? 0,
  }));
}

export async function getHelpQuestionForEdit(questionId: string) {
  const db = getDatabase();
  const question = await getQuestion(questionId);
  if (!question) return null;

  const [options, publication, questionTargets, destinationTargets] =
    await Promise.all([
      getQuestionOptions(questionId),
      db
        .select({ publishedAt: helpPublications.publishedAt })
        .from(helpPublications)
        .where(
          and(
            eq(helpPublications.entityType, "question"),
            eq(helpPublications.entityId, questionId),
          ),
        )
        .limit(1),
      db
        .select({ id: helpQuestions.id, title: helpQuestions.title })
        .from(helpQuestions)
        .orderBy(asc(helpQuestions.title)),
      db
        .select({ id: helpDestinations.id, title: helpDestinations.title })
        .from(helpDestinations)
        .orderBy(asc(helpDestinations.title)),
    ]);

  return {
    id: question.id,
    eyebrow: question.eyebrow,
    title: question.title,
    description: question.description,
    compact: question.compact,
    searchLabel: question.searchLabel ?? "",
    status: question.status,
    publishedAt: publication[0]?.publishedAt ?? null,
    hasPublishedVersion: publication.length > 0,
    options: options.map((option) => ({
      key: option.optionKey,
      label: option.label,
      description: option.description,
      icon: option.icon,
      target: columnsToOptionTarget(option),
    })),
    questionTargets,
    destinationTargets,
  };
}

export async function createHelpQuestion(
  actorUserId: string,
  requestedId: string,
  title: string,
): Promise<string> {
  const db = getDatabase();
  const questionId = normalizeHelpFlowId(requestedId || title);

  if (!questionId) throw new Error("INVALID_QUESTION_ID");

  const [created] = await db
    .insert(helpQuestions)
    .values({
      id: questionId,
      eyebrow: "Ajuda F10",
      title: title.trim(),
      description: "",
      status: "draft",
      sortOrder: 999,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    })
    .returning({ id: helpQuestions.id });

  if (!created) throw new Error("QUESTION_NOT_CREATED");

  await saveCurrentQuestionVersion(created.id, actorUserId);
  await recordAuditEvent({
    actorUserId,
    action: "help.question.created",
    entityType: "help_question",
    entityId: created.id,
  });

  return created.id;
}

export async function updateHelpQuestion(
  actorUserId: string,
  questionId: string,
  input: HelpQuestionInput,
): Promise<void> {
  const db = getDatabase();
  const question = await getQuestion(questionId);

  if (!question) throw new Error("QUESTION_NOT_FOUND");
  if (question.status === "archived") throw new Error("QUESTION_ARCHIVED");

  await validateTargets(questionId, input.options);
  await ensureAcyclicQuestionGraph(questionId, input.options);

  await db.transaction(async (tx) => {
    await tx
      .update(helpQuestions)
      .set({
        eyebrow: input.eyebrow.trim(),
        title: input.title.trim(),
        description: input.description.trim(),
        compact: input.compact,
        searchLabel: input.searchLabel.trim() || null,
        status: "draft",
        updatedBy: actorUserId,
        updatedAt: new Date(),
      })
      .where(eq(helpQuestions.id, questionId));

    await tx.delete(helpOptions).where(eq(helpOptions.questionId, questionId));

    if (input.options.length > 0) {
      await tx.insert(helpOptions).values(
        input.options.map((option, sortOrder) => ({
          questionId,
          optionKey: option.key,
          label: option.label.trim(),
          description: option.description.trim(),
          icon: option.icon,
          ...optionTargetToColumns(option.target),
          sortOrder,
        })),
      );
    }
  });

  await saveCurrentQuestionVersion(questionId, actorUserId);
  await recordAuditEvent({
    actorUserId,
    action: "help.question.updated",
    entityType: "help_question",
    entityId: questionId,
    metadata: {
      previousStatus: question.status,
      optionCount: input.options.length,
    },
  });
}

export async function publishHelpQuestion(
  actorUserId: string,
  questionId: string,
): Promise<void> {
  const db = getDatabase();
  const question = await getQuestion(questionId);

  if (!question) throw new Error("QUESTION_NOT_FOUND");
  if (question.status === "archived") throw new Error("QUESTION_ARCHIVED");

  const snapshot = await buildQuestionSnapshot(questionId);
  if (!snapshot) throw new Error("QUESTION_NOT_FOUND");
  if (snapshot.options.length === 0) throw new Error("QUESTION_WITHOUT_OPTIONS");

  const publishedAt = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(helpQuestions)
      .set({
        status: "published",
        publishedAt,
        updatedBy: actorUserId,
        updatedAt: publishedAt,
      })
      .where(eq(helpQuestions.id, questionId));

    await tx
      .insert(helpPublications)
      .values({
        entityType: "question",
        entityId: questionId,
        snapshot,
        publishedBy: actorUserId,
        publishedAt,
      })
      .onConflictDoUpdate({
        target: [helpPublications.entityType, helpPublications.entityId],
        set: {
          snapshot,
          publishedBy: actorUserId,
          publishedAt,
        },
      });
  });

  await saveCurrentQuestionVersion(questionId, actorUserId);
  await recordAuditEvent({
    actorUserId,
    action: "help.question.published",
    entityType: "help_question",
    entityId: questionId,
    metadata: { optionCount: snapshot.options.length },
  });
}
