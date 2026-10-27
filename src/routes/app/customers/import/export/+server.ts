import { error, type RequestHandler } from "@sveltejs/kit";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import { getCustomerImportReport } from "$lib/server/support/customerImportRepository";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function escapeCsv(value: string | number | boolean): string {
  const text = String(value);
  const safe = /^[=+@-]/.test(text) ? "'" + text : text;
  return '"' + safe.replaceAll('"', '""') + '"';
}

export const GET: RequestHandler = async ({ cookies, url }) => {
  const context = await requireAppPermission(cookies, "customers.manage", "/app/customers/import");
  if (!hasPermission(context.permissions, "customers.manage", "all")) {
    throw error(403, "Acesso não autorizado.");
  }
  const batchId = url.searchParams.get("batch") ?? "";
  if (!UUID_PATTERN.test(batchId)) throw error(400, "Lote inválido.");

  const headers = [
    "Line", "Source ID", "Group ID", "Unit", "Group", "Holder",
    "Commercial status", "Plan", "Decision", "Warnings", "Error", "Applied",
  ];
  const records = await getCustomerImportReport(batchId);
  const lines = records.map((record) => [
    record.lineNumber, record.sourceId, record.sourceGroupId,
    record.unitName, record.groupName, record.holderName,
    record.commercialStatus, record.plan, record.decision,
    record.warnings, record.errorCode, record.applied,
  ].map(escapeCsv).join(";"));

  const csv = "\uFEFF" + [headers.map(escapeCsv).join(";"), ...lines].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="f10-customer-import-' + batchId + '.csv"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
};
