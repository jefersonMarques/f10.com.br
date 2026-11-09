import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL?.trim();
const searchTerm = (process.env.HELP_KNOWLEDGE_QUERY ?? "matr").trim().slice(0, 80);

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

const sql = postgres(databaseUrl, {
  max: 1,
  connect_timeout: 10,
  idle_timeout: 5,
  prepare: false,
});

async function inspectInfrastructure() {
  const [migration] = await sql`
    SELECT EXISTS (
      SELECT 1
      FROM schema_migrations
      WHERE name = '0049_help_search_knowledge_model.sql'
    ) AS applied
  `;

  const [trigger] = await sql`
    SELECT t.tgenabled AS enabled
    FROM pg_trigger t
    WHERE t.tgrelid = 'help_publications'::regclass
      AND t.tgname = 'help_publications_search_document_sync'
      AND NOT t.tgisinternal
    LIMIT 1
  `;

  return {
    migrationApplied: Boolean(migration?.applied),
    publicationTriggerEnabled: trigger?.enabled === "O" || trigger?.enabled === "A",
  };
}

async function inspectCoverage() {
  const [coverage] = await sql`
    SELECT
      count(*)::integer AS imported,
      count(*) FILTER (WHERE c.status = 'draft')::integer AS drafts,
      count(*) FILTER (WHERE c.status = 'published')::integer AS publishedStatus,
      count(*) FILTER (WHERE c.status = 'archived')::integer AS archived,
      count(*) FILTER (WHERE p.entity_id IS NOT NULL)::integer AS publicSnapshots,
      count(*) FILTER (WHERE p.entity_id IS NOT NULL AND d.content_id IS NOT NULL)::integer AS indexedPublications,
      count(*) FILTER (WHERE p.entity_id IS NOT NULL AND d.content_id IS NULL)::integer AS missingSearchDocuments,
      count(*) FILTER (
        WHERE p.entity_id IS NOT NULL
          AND (
            p.snapshot -> 'knowledge' ->> 'version' IS DISTINCT FROM '1'
            OR jsonb_typeof(p.snapshot -> 'knowledge' -> 'fragments') IS DISTINCT FROM 'array'
          )
      )::integer AS invalidKnowledgeSnapshots,
      count(*) FILTER (
        WHERE p.entity_id IS NOT NULL
          AND d.content_id IS NOT NULL
          AND btrim(concat_ws(' ', d.public_text, d.assistant_text)) = ''
      )::integer AS emptyIndexedContent
    FROM help_contents c
    LEFT JOIN help_publications p
      ON p.entity_type = 'content'
      AND p.entity_id = c.id::text
    LEFT JOIN help_search_documents d ON d.content_id = c.id
    WHERE c.import_source = 'movidesk'
  `;

  return coverage;
}

async function inspectMissingIndex() {
  return sql`
    SELECT
      c.id,
      c.title,
      c.status,
      p.published_at AS publishedAt
    FROM help_contents c
    JOIN help_publications p
      ON p.entity_type = 'content'
      AND p.entity_id = c.id::text
    LEFT JOIN help_search_documents d ON d.content_id = c.id
    WHERE c.import_source = 'movidesk'
      AND d.content_id IS NULL
    ORDER BY p.published_at DESC
    LIMIT 25
  `;
}

async function inspectRelatedArticles() {
  if (!searchTerm) return [];

  const pattern = `%${searchTerm.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
  return sql`
    SELECT
      c.id,
      c.title,
      c.status,
      p.entity_id IS NOT NULL AS published,
      d.content_id IS NOT NULL AS indexed,
      coalesce(
        jsonb_array_length(
          CASE
            WHEN jsonb_typeof(p.snapshot -> 'knowledge' -> 'fragments') = 'array'
            THEN p.snapshot -> 'knowledge' -> 'fragments'
            ELSE '[]'::jsonb
          END
        ), 0
      ) AS knowledgeFragments
    FROM help_contents c
    LEFT JOIN help_publications p
      ON p.entity_type = 'content'
      AND p.entity_id = c.id::text
    LEFT JOIN help_search_documents d ON d.content_id = c.id
    WHERE c.import_source = 'movidesk'
      AND (
        c.title ILIKE ${pattern}
        OR c.summary ILIKE ${pattern}
      )
    ORDER BY
      (p.entity_id IS NOT NULL) DESC,
      c.title
    LIMIT 35
  `;
}

try {
  const infrastructure = await inspectInfrastructure();
  const coverage = await inspectCoverage();
  const missingIndex = await inspectMissingIndex();
  const relatedArticles = await inspectRelatedArticles();

  const report = {
    infrastructure,
    coverage,
    missingIndex,
    searchTerm,
    relatedArticles,
    readOnly: true,
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (
    !infrastructure.migrationApplied
    || !infrastructure.publicationTriggerEnabled
    || Number(coverage.missingsearchdocuments ?? coverage.missingSearchDocuments) > 0
    || Number(coverage.invalidknowledgesnapshots ?? coverage.invalidKnowledgeSnapshots) > 0
  ) {
    process.exitCode = 1;
  }
} finally {
  await sql.end({ timeout: 5 });
}
