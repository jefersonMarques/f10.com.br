import { sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";

type DatabaseRow = Record<string, unknown>;

export async function getF10CustomerContractDetails(unitId: number, contractId: number) {
  const sheetSource = unitId === 1 ? "f10_sheet" : "f10_sheet_unit_" + unitId;
  const rows = await getDatabase().execute(sql`
    SELECT
      c.unit_id AS "unitId",
      c.contract_id::text AS "contractId",
      c.numero_contrato AS "contractNumber",
      c.pessoa_id::text AS "personId",
      c.titular_id::text AS "holderId",
      c.x_status AS "apiStatus",
      c.status AS "apiStatusCode",
      c.curso_id::text AS "courseId",
      c.fonte_id::text AS "sourceId",
      c.vendedor_id::text AS "sellerId",
      c.telemarketing_id::text AS "telemarketingId",
      c.matricula AS "enrollmentDate",
      c.conclusao AS "completionDate",
      c.data_cancelamento AS "cancellationDate",
      c.first_seen_at AS "firstSeenAt",
      c.last_seen_at AS "lastSeenAt",
      coalesce(
        nullif(p.spreadsheet_student_name, ''),
        nullif(sheet.account_name, ''),
        nullif(c.source_record ->> 'nome_fantasia', ''),
        nullif(c.source_record ->> 'razao_social', '')
      ) AS "accountName",
      coalesce(
        nullif(person.customer_name, ''),
        nullif(contact.name, ''),
        nullif(c.source_record ->> 'nome', '')
      ) AS "personName",
      coalesce(nullif(p.spreadsheet_holder_name, ''), nullif(sheet.holder_name, '')) AS "holderName",
      coalesce(nullif(p.apelido, ''), nullif(sheet.nickname, '')) AS "nickname",
      coalesce(nullif(person.email, ''), nullif(contact.email, ''), nullif(sheet.email, '')) AS "email",
      coalesce(nullif(person.phone, ''), nullif(contact.phone, ''), nullif(sheet.phone, '')) AS "phone",
      coalesce(nullif(person.whatsapp, ''), nullif(contact.whatsapp, ''), nullif(sheet.mobile, '')) AS "mobile",
      sheet.holder_email AS "holderEmail",
      sheet.holder_phone AS "holderPhone",
      sheet.holder_mobile AS "holderMobile",
      coalesce(nullif(p.razao_social, ''), nullif(c.source_record ->> 'razao_social', '')) AS "legalName",
      coalesce(nullif(p.contracted_plan, ''), nullif(sheet.plan, '')) AS "plan",
      coalesce(nullif(p.city, ''), nullif(sheet.city, '')) AS "city",
      coalesce(nullif(p.account_executive, ''), nullif(sheet.account_executive, '')) AS "accountExecutive",
      sheet.commercial_status AS "sheetStatus",
      sheet.cancellation_reason AS "cancellationReason",
      sheet.billing_access_url AS "billingUrl",
      g.name AS "groupName",
      sheet.id::text AS "sheetUnitId",
      contact.id::text AS "customerContactId"
    FROM f10_customer_contracts c
    LEFT JOIN f10_customer_contract_profiles p
      ON p.unit_id = c.unit_id AND p.contract_id = c.contract_id
    LEFT JOIN LATERAL (
      SELECT
        u.id, o.name AS account_name,
        u.apelido AS nickname,
        u.commercial_status, u.contracted_plan AS plan, u.city,
        u.account_executive, u.cancellation_reason, u.billing_access_url,
        general.email, general.phone, general.mobile,
        holder.name AS holder_name, holder.email AS holder_email,
        holder.phone AS holder_phone, holder.mobile AS holder_mobile,
        u.group_id
      FROM customer_units u
      JOIN customer_organizations o ON o.id = u.organization_id
      LEFT JOIN customer_unit_contacts general
        ON general.unit_id = u.id AND general.contact_kind = 'general'
      LEFT JOIN customer_unit_contacts holder
        ON holder.unit_id = u.id AND holder.contact_kind = 'holder'
      WHERE u.source_system = ${sheetSource}
        AND (
          (u.f10_unit_id = c.unit_id AND u.f10_contract_id = c.contract_id)
          OR (
            u.source_id = c.numero_contrato AND c.numero_contrato IS NOT NULL
            AND (
              SELECT count(*) FROM f10_customer_contracts other
              WHERE other.unit_id = c.unit_id
                AND other.numero_contrato = c.numero_contrato
            ) = 1
          )
        )
      ORDER BY
        CASE WHEN u.f10_unit_id = c.unit_id AND u.f10_contract_id = c.contract_id
          THEN 0 ELSE 1 END, u.id
      LIMIT 1
    ) sheet ON true
    LEFT JOIN customer_groups g ON g.id = coalesce(p.group_id, sheet.group_id)
    LEFT JOIN f10_customer_external_identities identity
      ON identity.unit_id = c.unit_id AND identity.person_id = c.pessoa_id
    LEFT JOIN customer_contacts contact ON contact.id = identity.customer_contact_id
    LEFT JOIN LATERAL (
      SELECT r.customer_name, nullif(r.email, '') AS email,
        nullif(r.phone, '') AS phone, nullif(r.whatsapp, '') AS whatsapp
      FROM f10_customer_sync_rows r
      JOIN f10_customer_sync_batches b ON b.id = r.batch_id
      WHERE b.unit_id = c.unit_id AND r.person_id = c.pessoa_id
        AND nullif(r.customer_name, '') IS NOT NULL
      ORDER BY b.created_at DESC
      LIMIT 1
    ) person ON true
    WHERE c.unit_id = ${unitId} AND c.contract_id = ${contractId}
    LIMIT 1
  `);

  return ((rows as unknown as DatabaseRow[])[0] ?? null);
}
