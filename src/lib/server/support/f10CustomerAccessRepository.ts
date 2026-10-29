import { sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { parseLegacyF10Groups, type LegacyGroup, isF10CustomerRole } from "./f10CustomerAccessParsing";

type Row = Record<string, unknown>;
const rowsOf = (value: unknown) => value as Row[];

const sourceSystem = (unitId: number) => unitId === 1 ? "f10_sheet" : "f10_sheet_unit_" + unitId;

type AccessUser = {
  legacy_user_id: string;
  contact_id: string;
  name: string;
  email: string | null;
  legacy_groups: unknown;
  authenticated_at: Date | null;
  assigned_count: number;
};

function userFrom(row: Row): AccessUser {
  return {
    legacy_user_id: String(row.legacy_user_id),
    contact_id: String(row.contact_id),
    name: String(row.name),
    email: typeof row.email === "string" ? row.email : null,
    legacy_groups: row.legacy_groups,
    authenticated_at: row.authenticated_at as Date | null,
    assigned_count: Number(row.assigned_count ?? 0),
  };
}

export async function listF10CustomerAccessPeople(unitId: number, query: string, page: number, pendingOnly: boolean) {
  const db = getDatabase();
  const search = "%" + query.trim().slice(0, 100) + "%";
  const filter = sql`(
    ${query.trim().length === 0} OR c.name ILIKE ${search}
    OR coalesce(c.email, '') ILIKE ${search} OR i.legacy_user_id ILIKE ${search}
  ) AND (
    ${!pendingOnly} OR NOT EXISTS (
      SELECT 1 FROM customer_f10_unit_assignments au
      WHERE au.legacy_user_id = i.legacy_user_id
    )
  )`;
  const count = rowsOf(await db.execute(sql`
    SELECT count(*)::integer AS total FROM customer_f10_identities i
    JOIN customer_contacts c ON c.id = i.customer_contact_id
    WHERE ${filter}
  `));
  const total = Number(count[0]?.total ?? 0);
  const pages = Math.max(1, Math.ceil(total / 20));
  const selectedPage = Math.max(1, Math.min(page, pages));
  const rows = rowsOf(await db.execute(sql`
    SELECT i.legacy_user_id, c.id AS contact_id, c.name, c.email,
           s.legacy_groups, s.created_at AS authenticated_at,
           (SELECT count(*)::integer FROM customer_f10_unit_assignments a
            WHERE a.legacy_user_id = i.legacy_user_id) AS assigned_count
    FROM customer_f10_identities i
    JOIN customer_contacts c ON c.id = i.customer_contact_id
    LEFT JOIN LATERAL (
      SELECT legacy_groups, created_at FROM customer_portal_sessions
      WHERE legacy_user_id = i.legacy_user_id AND auth_source = 'f10'
      ORDER BY created_at DESC, id DESC LIMIT 1
    ) s ON true
    WHERE ${filter}
    ORDER BY (NOT EXISTS (
      SELECT 1 FROM customer_f10_unit_assignments a
      WHERE a.legacy_user_id = i.legacy_user_id
    )) DESC, c.name, i.legacy_user_id
    LIMIT 20 OFFSET ${(selectedPage - 1) * 20}
  `));
  const groups = rowsOf(await db.execute(sql`
    SELECT source_group_id, name
    FROM customer_groups WHERE source_system = ${sourceSystem(unitId)}
  `));
  const names = new Map(groups.map((row) => [String(row.source_group_id), String(row.name)]));
  return {
    rows: rows.map((row) => {
      const user = userFrom(row);
      const granted = parseLegacyF10Groups(user.legacy_groups);
      return {
        userId: user.legacy_user_id,
        name: user.name, email: user.email,
        contactId: user.contact_id,
        assignedCount: user.assigned_count,
        hasSnapshot: Boolean(user.authenticated_at),
        groups: granted.map((group) => ({
          ...group, matched: names.has(group.groupId),
          commercialName: names.get(group.groupId) ?? null,
        })),
      };
    }),
    total, pages, page: selectedPage,
  };
}

export async function getF10CustomerAccessUser(unitId: number, userId: string,
  options: { query: string; groupId: string; page: number }) {
  const db = getDatabase();
  const record = rowsOf(await db.execute(sql`
    SELECT i.legacy_user_id, c.id AS contact_id, c.name, c.email,
           s.legacy_groups, s.created_at AS authenticated_at,
           (SELECT count(*)::integer FROM customer_f10_unit_assignments a
            WHERE a.legacy_user_id = i.legacy_user_id) AS assigned_count
    FROM customer_f10_identities i
    JOIN customer_contacts c ON c.id = i.customer_contact_id
    LEFT JOIN LATERAL (
      SELECT legacy_groups, created_at FROM customer_portal_sessions
      WHERE legacy_user_id = i.legacy_user_id AND auth_source = 'f10'
      ORDER BY created_at DESC, id DESC LIMIT 1
    ) s ON true
    WHERE i.legacy_user_id = ${userId}
    LIMIT 1
  `))[0];
  if (!record) return null;
  const user = userFrom(record);
  const grantedGroups = parseLegacyF10Groups(user.legacy_groups);
  const groupIds = grantedGroups.map((group) => group.groupId);
  const groups = groupIds.length ? rowsOf(await db.execute(sql`
    SELECT g.id, g.source_group_id, g.name,
           count(u.id)::integer AS unit_count
    FROM customer_groups g
    LEFT JOIN customer_units u ON u.group_id = g.id
      AND u.source_system = ${sourceSystem(unitId)}
    WHERE g.source_system = ${sourceSystem(unitId)}
      AND g.source_group_id IN (${sql.join(groupIds.map((id) => sql`${id}`), sql`, `)})
    GROUP BY g.id, g.source_group_id, g.name
    ORDER BY g.name
  `)) : [];
  const matched = new Map(groups.map((group) => [String(group.source_group_id), group]));
  const allowed = grantedGroups.map((group) => ({
    ...group,
    commercialName: matched.has(group.groupId) ? String(matched.get(group.groupId)?.name) : null,
    unitCount: Number(matched.get(group.groupId)?.unit_count ?? 0),
  }));
  const source = sourceSystem(unitId);
  const allowedGroupIds = [...matched.keys()];
  if (!allowedGroupIds.length) {
    return {
      user: { userId, name: user.name, email: user.email, contactId: user.contact_id,
        authenticatedAt: user.authenticated_at, assignedCount: user.assigned_count },
      groups: allowed,
      units: [], total: 0, page: 1, pages: 1,
    };
  }
  const query = options.query.trim().slice(0, 120);
  const search = "%" + query + "%";
  const activeGroup = allowedGroupIds.includes(options.groupId) ? options.groupId : "";
  const filter = sql`
    u.source_system = ${source}
    AND g.source_system = ${source}
    AND g.source_group_id IN (${sql.join(allowedGroupIds.map((id) => sql`${id}`), sql`, `)})
    AND (${activeGroup === ""} OR g.source_group_id = ${activeGroup})
    AND (${query === ""} OR coalesce(nullif(u.apelido, ''), u.name) ILIKE ${search}
      OR u.source_id ILIKE ${search})
  `;
  const count = rowsOf(await db.execute(sql`
    SELECT count(*)::integer AS total FROM customer_units u
    JOIN customer_groups g ON g.id = u.group_id WHERE ${filter}
  `));
  const total = Number(count[0]?.total ?? 0);
  const pages = Math.max(1, Math.ceil(total / 25));
  const page = Math.max(1, Math.min(options.page, pages));
  const units = rowsOf(await db.execute(sql`
    SELECT u.id, u.source_id, coalesce(nullif(u.apelido, ''), u.name) AS apelido,
           u.commercial_status, g.source_group_id, g.name AS group_name,
           a.function_role, a.updated_at AS assigned_at
    FROM customer_units u
    JOIN customer_groups g ON g.id = u.group_id
    LEFT JOIN customer_f10_unit_assignments a ON a.customer_unit_id = u.id
      AND a.legacy_user_id = ${userId}
    WHERE ${filter}
    ORDER BY (a.customer_unit_id IS NULL) DESC, g.name,
             coalesce(nullif(u.apelido, ''), u.name), u.source_id
    LIMIT 25 OFFSET ${(page - 1) * 25}
  `));
  return {
    user: { userId, name: user.name, email: user.email, contactId: user.contact_id,
      authenticatedAt: user.authenticated_at, assignedCount: user.assigned_count },
    groups: allowed, units, total, page, pages,
  };
}

export async function changeF10CustomerAccessAssignment(input: {
  unitId: number; userId: string; customerUnitId: string; actorId: string;
  action: "assign" | "remove"; role: string;
}): Promise<"saved" | "removed" | "not_allowed"> {
  const db = getDatabase();
  return db.transaction(async (tx) => {
    if (input.action === "remove") {
      const result = rowsOf(await tx.execute(sql`
        DELETE FROM customer_f10_unit_assignments
        WHERE legacy_user_id = ${input.userId}
          AND customer_unit_id = ${input.customerUnitId}::uuid
        RETURNING customer_unit_id
      `));
      return result.length ? "removed" : "not_allowed";
    }
    if (!isF10CustomerRole(input.role)) return "not_allowed";
    const source = sourceSystem(input.unitId);
    const valid = rowsOf(await tx.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM customer_f10_identities i
        JOIN LATERAL (
          SELECT legacy_groups FROM customer_portal_sessions
          WHERE legacy_user_id = i.legacy_user_id AND auth_source = 'f10'
          ORDER BY created_at DESC, id DESC LIMIT 1
        ) s ON true
        JOIN LATERAL jsonb_array_elements(
          CASE WHEN jsonb_typeof(s.legacy_groups) = 'array'
            THEN s.legacy_groups ELSE '[]'::jsonb END
        ) lg(group_entry) ON true
        JOIN customer_units u ON u.id = ${input.customerUnitId}::uuid
          AND u.source_system = ${source}
        JOIN customer_groups g ON g.id = u.group_id
          AND g.source_system = ${source}
        WHERE i.legacy_user_id = ${input.userId}
          AND lg.group_entry ->> 'grupo_id' = g.source_group_id
      ) AS permitted
    `));
    if (valid[0]?.permitted !== true) return "not_allowed";
    await tx.execute(sql`
      INSERT INTO customer_f10_unit_assignments (
        legacy_user_id, customer_unit_id, function_role, assigned_by
      ) VALUES (
        ${input.userId}, ${input.customerUnitId}::uuid, ${input.role},
        ${input.actorId}::uuid
      )
      ON CONFLICT (legacy_user_id, customer_unit_id) DO UPDATE SET
        function_role = excluded.function_role,
        assigned_by = excluded.assigned_by, updated_at = now()
    `);
    return "saved";
  });
}
