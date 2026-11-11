import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { getPermissionScope, type PermissionScope } from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import { customerContacts, customerOrganizations, ticketEvents, tickets } from "$lib/server/db/supportSchema";
import { canAccessTicket, type SupportPermissionMap } from "$lib/server/support/supportAccess";
import { ensureDistinctMergeGroups, uniqueMergeMemberIds } from "$lib/support/ticketMergeRules";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_MERGE_DEPTH = 100;

export type TicketMergeMember = {
  id: string;
  linkId: string | null;
  parentId: string | null;
  ticketNumber: number;
  subject: string;
  status: string;
  channel: string;
  customerName: string | null;
  organizationName: string | null;
  serviceRequestType: string | null;
  mergedAt: Date | null;
};

export type TicketMergeContext = {
  rootId: string;
  isSource: boolean;
  rootAccessible: boolean;
  members: TicketMergeMember[];
  canMerge: boolean;
  canUnmerge: boolean;
};

type TreeRow = {
  id: string;
  parent_id: string | null;
  link_id: string | null;
  merged_at: Date | null;
  depth: number;
};

function requiredScope(
  permissions: SupportPermissionMap,
  permissionCode: string,
): PermissionScope {
  const scope = getPermissionScope(permissions, permissionCode);
  if (!scope) throw new Error("TICKET_MERGE_FORBIDDEN");
  return scope;
}

async function ensureMemberAccess(
  actorUserId: string,
  viewScope: PermissionScope,
  mutationScope: PermissionScope,
  ids: string[],
): Promise<void> {
  for (const id of ids) {
    const [canView, canMutate] = await Promise.all([
      canAccessTicket(actorUserId, viewScope, id),
      canAccessTicket(actorUserId, mutationScope, id),
    ]);
    if (!canView || !canMutate) throw new Error("TICKET_MERGE_TICKET_NOT_ACCESSIBLE");
  }
}

export async function getMergeRoot(ticketId: string): Promise<string> {
  if (!UUID.test(ticketId)) throw new Error("TICKET_MERGE_INVALID_TICKET");
  const rows = await getDatabase().execute(sql`
    WITH RECURSIVE ancestors AS (
      SELECT ${ticketId}::uuid AS id, 0 AS depth, ARRAY[${ticketId}::uuid] AS visited
      UNION ALL
      SELECT link.primary_ticket_id, parent.depth + 1, parent.visited || link.primary_ticket_id
      FROM ancestors parent
      JOIN ticket_merge_links link ON link.source_ticket_id = parent.id
        AND link.unmerged_at IS NULL
      WHERE parent.depth < ${MAX_MERGE_DEPTH}
        AND NOT link.primary_ticket_id = ANY(parent.visited)
    )
    SELECT id::text AS id, depth FROM ancestors ORDER BY depth DESC LIMIT 1
  `) as unknown as Array<{ id: string; depth: number }>;
  if (!rows[0] || rows[0].depth >= MAX_MERGE_DEPTH) {
    throw new Error("TICKET_MERGE_GROUP_TOO_DEEP");
  }
  return rows[0].id;
}

export async function getMergeTree(rootId: string): Promise<TreeRow[]> {
  const rows = await getDatabase().execute(sql`
    WITH RECURSIVE members AS (
      SELECT ${rootId}::uuid AS id, NULL::uuid AS parent_id, NULL::uuid AS link_id,
        NULL::timestamptz AS merged_at, 0 AS depth, ARRAY[${rootId}::uuid] AS visited
      UNION ALL
      SELECT link.source_ticket_id, link.primary_ticket_id, link.id, link.merged_at,
        parent.depth + 1, parent.visited || link.source_ticket_id
      FROM members parent
      JOIN ticket_merge_links link ON link.primary_ticket_id = parent.id
        AND link.unmerged_at IS NULL
      WHERE parent.depth < ${MAX_MERGE_DEPTH}
        AND NOT link.source_ticket_id = ANY(parent.visited)
    )
    SELECT id::text, parent_id::text, link_id::text, merged_at, depth FROM members
  `) as unknown as TreeRow[];
  if (rows.some((row) => row.depth >= MAX_MERGE_DEPTH)) {
    throw new Error("TICKET_MERGE_GROUP_TOO_DEEP");
  }
  return rows;
}

async function loadMergeMembers(rows: TreeRow[]): Promise<TicketMergeMember[]> {
  if (rows.length === 0) return [];
  const records = await getDatabase()
    .select({
      id: tickets.id,
      ticketNumber: tickets.ticketNumber,
      subject: tickets.subject,
      status: tickets.status,
      channel: tickets.channel,
      customerName: customerContacts.name,
      organizationName: customerOrganizations.name,
      serviceRequestType: sql<string | null>`(
        SELECT sr.request_type::text
        FROM service_requests sr WHERE sr.ticket_id = ${tickets.id}
        LIMIT 1
      )`,
    })
    .from(tickets)
    .leftJoin(customerContacts, eq(tickets.customerContactId, customerContacts.id))
    .leftJoin(customerOrganizations, eq(customerContacts.organizationId, customerOrganizations.id))
    .where(inArray(tickets.id, rows.map((row) => row.id)));

  const references = new Map(rows.map((row) => [row.id, row]));
  return records.map((record) => {
    const reference = references.get(record.id);
    return {
      ...record,
      linkId: reference?.link_id ?? null,
      parentId: reference?.parent_id ?? null,
      mergedAt: reference?.merged_at ?? null,
    };
  }).sort((left, right) => left.ticketNumber - right.ticketNumber);
}

export async function getTicketMergeContext(
  actorUserId: string,
  permissions: SupportPermissionMap,
  ticketId: string,
): Promise<TicketMergeContext> {
  const viewScope = requiredScope(permissions, "tickets.view");
  const rootId = await getMergeRoot(ticketId);
  const tree = await getMergeTree(rootId);
  const accessible = await Promise.all(tree.map(async (row) =>
    (await canAccessTicket(actorUserId, viewScope, row.id)) ? row : null
  ));
  const rows = accessible.filter((row): row is TreeRow => row !== null);
  const members = await loadMergeMembers(rows);
  const rootAccessible = rows.some((row) => row.id === rootId);
  return {
    rootId,
    isSource: rootId !== ticketId,
    rootAccessible,
    members,
    canMerge: rootAccessible && Boolean(getPermissionScope(permissions, "tickets.merge")),
    canUnmerge: rootAccessible && Boolean(getPermissionScope(permissions, "tickets.unmerge")),
  };
}

export async function listTicketMergeCandidates(
  actorUserId: string,
  permissions: SupportPermissionMap,
  query: string,
): Promise<TicketMergeMember[]> {
  const viewScope = requiredScope(permissions, "tickets.view");
  const mergeScope = requiredScope(permissions, "tickets.merge");
  const normalized = query.trim().slice(0, 100);
  if (normalized.length < 2) return [];

  const number = Number(normalized.replace(/^#/, ""));
  const where = or(
    ilike(tickets.subject, `%${normalized}%`),
    Number.isSafeInteger(number) && number > 0 ? eq(tickets.ticketNumber, number) : undefined,
  );
  const results = await getDatabase()
    .select({ id: tickets.id })
    .from(tickets)
    .where(and(
      where,
      sql`NOT EXISTS (
        SELECT 1 FROM ticket_merge_links active
        WHERE active.source_ticket_id = ${tickets.id} AND active.unmerged_at IS NULL
      )`,
    ))
    .orderBy(desc(tickets.updatedAt))
    .limit(35);

  const accessible = await Promise.all(results.map(async (candidate) => {
    const [canView, canMerge] = await Promise.all([
      canAccessTicket(actorUserId, viewScope, candidate.id),
      canAccessTicket(actorUserId, mergeScope, candidate.id),
    ]);
    return canView && canMerge ? candidate.id : null;
  }));
  const ids = accessible.filter((id): id is string => id !== null).slice(0, 12);
  return loadMergeMembers(ids.map((id) => ({
    id, parent_id: null, link_id: null, merged_at: null, depth: 0,
  })));
}

export async function mergeTickets(
  actorUserId: string,
  permissions: SupportPermissionMap,
  primaryTicketId: string,
  sourceTicketId: string,
): Promise<string> {
  if (!UUID.test(primaryTicketId) || !UUID.test(sourceTicketId)) {
    throw new Error("TICKET_MERGE_INVALID_TICKET");
  }
  const viewScope = requiredScope(permissions, "tickets.view");
  const mergeScope = requiredScope(permissions, "tickets.merge");

  return getDatabase().transaction(async (tx) => {
    // Serializa mudanças de grupos, evitando corridas entre mesclagens e desfazimentos.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(108, 8108)`);

    const [primaryRoot, sourceRoot] = await Promise.all([
      getMergeRoot(primaryTicketId),
      getMergeRoot(sourceTicketId),
    ]);
    ensureDistinctMergeGroups(primaryRoot, sourceRoot);

    const [primaryGroup, sourceGroup] = await Promise.all([
      getMergeTree(primaryRoot),
      getMergeTree(sourceRoot),
    ]);
    await ensureMemberAccess(
      actorUserId, viewScope, mergeScope,
      uniqueMergeMemberIds([
        primaryGroup.map((item) => item.id),
        sourceGroup.map((item) => item.id),
      ]),
    );

    const [primary, source] = await Promise.all([
      tx.select({ id: tickets.id }).from(tickets).where(eq(tickets.id, primaryRoot)).limit(1),
      tx.select({ id: tickets.id }).from(tickets).where(eq(tickets.id, sourceRoot)).limit(1),
    ]);
    if (!primary[0] || !source[0]) throw new Error("TICKET_MERGE_INVALID_TICKET");

    await tx.execute(sql`
      INSERT INTO ticket_merge_links (primary_ticket_id, source_ticket_id, merged_by_user_id)
      VALUES (${primaryRoot}::uuid, ${sourceRoot}::uuid, ${actorUserId}::uuid)
    `);
    await tx.insert(ticketEvents).values([
      {
        ticketId: primaryRoot,
        actorUserId,
        eventType: "ticket.merged.primary",
        metadata: { sourceTicketId: sourceRoot },
      },
      {
        ticketId: sourceRoot,
        actorUserId,
        eventType: "ticket.merged.source",
        metadata: { primaryTicketId: primaryRoot },
      },
    ]);
    await tx.update(tickets)
      .set({ updatedAt: new Date() }).where(eq(tickets.id, primaryRoot));
    return primaryRoot;
  });
}

export async function unmergeTicket(
  actorUserId: string,
  permissions: SupportPermissionMap,
  linkId: string,
): Promise<string> {
  if (!UUID.test(linkId)) throw new Error("TICKET_MERGE_INVALID_LINK");
  const viewScope = requiredScope(permissions, "tickets.view");
  const unmergeScope = requiredScope(permissions, "tickets.unmerge");

  return getDatabase().transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(108, 8108)`);
    const links = await tx.execute(sql`
      SELECT id::text, primary_ticket_id::text, source_ticket_id::text
      FROM ticket_merge_links
      WHERE id = ${linkId}::uuid AND unmerged_at IS NULL
      LIMIT 1
    `) as unknown as Array<{
      id: string;
      primary_ticket_id: string;
      source_ticket_id: string;
    }>;
    const link = links[0];
    if (!link) throw new Error("TICKET_MERGE_LINK_NOT_FOUND");

    const primaryRoot = await getMergeRoot(link.primary_ticket_id);
    const [primaryGroup, sourceGroup] = await Promise.all([
      getMergeTree(primaryRoot),
      getMergeTree(link.source_ticket_id),
    ]);
    await ensureMemberAccess(
      actorUserId, viewScope, unmergeScope,
      uniqueMergeMemberIds([
        primaryGroup.map((item) => item.id),
        sourceGroup.map((item) => item.id),
      ]),
    );

    await tx.execute(sql`
      UPDATE ticket_merge_links SET unmerged_at = now(),
        unmerged_by_user_id = ${actorUserId}::uuid
      WHERE id = ${link.id}::uuid AND unmerged_at IS NULL
    `);
    await tx.insert(ticketEvents).values([
      {
        ticketId: link.primary_ticket_id,
        actorUserId,
        eventType: "ticket.merge_reverted.primary",
        metadata: { sourceTicketId: link.source_ticket_id },
      },
      {
        ticketId: link.source_ticket_id,
        actorUserId,
        eventType: "ticket.merge_reverted.source",
        metadata: { primaryTicketId: link.primary_ticket_id },
      },
    ]);
    await tx.update(tickets)
      .set({ updatedAt: new Date() })
      .where(eq(tickets.id, link.primary_ticket_id));
    return link.source_ticket_id;
  });
}
