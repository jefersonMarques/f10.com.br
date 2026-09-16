import { PassThrough, Readable } from "node:stream";
import archiver from "archiver";
import { asc, eq } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  serviceRequestAttachments,
  serviceRequests,
} from "$lib/server/db/serviceRequestSchema";
import { tickets } from "$lib/server/db/supportSchema";
import { createTextPdf } from "$lib/server/documents/simplePdf";
import {
  SERVICE_REQUEST_ATTACHMENT_DEFINITIONS,
  serviceRequestLabel,
  type ServiceRequestType,
} from "$lib/server/serviceRequests/serviceRequestDefinitions";
import { getServiceRequestObject } from "$lib/server/serviceRequests/serviceRequestStorage";

export type ServiceRequestTicketSummary = {
  requestType: ServiceRequestType;
  label: string;
};

export type ServiceRequestExport = {
  filename: string;
  stream: Readable;
};

const FIELD_LABELS: Record<string, string> = {
  cnpj: "CNPJ",
  legalName: "Razão social",
  fantasyName: "Nome fantasia",
  unitLegalName: "Razão social da unidade",
  unitFantasyName: "Nome fantasia da unidade",
  city: "Cidade",
  state: "Estado",
  noteKind: "Tipo de nota",
  managerName: "Responsável",
  managerEmail: "E-mail do responsável",
};

function humanizeKey(value: string): string {
  const known = FIELD_LABELS[value];
  if (known) return known;
  const words = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_.:-]+/g, " ")
    .trim();
  if (!words) return value;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function formatPrimitive(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  return String(value);
}

function flattenData(
  value: unknown,
  label: string,
  output: Array<{ label: string; value: string }>,
): void {
  if (Array.isArray(value)) {
    if (value.every((item) => item === null || ["string", "number", "boolean"].includes(typeof item))) {
      output.push({ label, value: value.map(formatPrimitive).join(", ") || "-" });
      return;
    }
    value.forEach((item, index) => flattenData(item, `${label} ${index + 1}`, output));
    return;
  }
  if (value && typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
      flattenData(nested, `${label} · ${humanizeKey(key)}`, output);
    });
    return;
  }
  output.push({ label, value: formatPrimitive(value) });
}

function pdfLines(input: {
  ticketNumber: number;
  requestType: ServiceRequestType;
  data: Record<string, unknown>;
}): string[] {
  const fields: Array<{ label: string; value: string }> = [];
  Object.entries(input.data).forEach(([key, value]) => {
    flattenData(value, humanizeKey(key), fields);
  });

  return [
    "DADOS DO FORMULÁRIO",
    "",
    `Ticket: #${input.ticketNumber}`,
    `Formulário: ${serviceRequestLabel(input.requestType)}`,
    "",
    ...fields.flatMap((field) => [`${field.label}:`, field.value, ""]),
    "Campos confidenciais armazenados de forma segura não são incluídos neste PDF.",
  ];
}

function safeArchiveName(value: string): string {
  return value
    .split(/[/\\]/)
    .pop()!
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9._()+\- ]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 160) || "arquivo";
}

function responseBodyAsNodeStream(body: ReadableStream<Uint8Array>): Readable {
  return Readable.from((async function* () {
    const reader = body.getReader();
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) return;
        yield Buffer.from(chunk.value);
      }
    } finally {
      reader.releaseLock();
    }
  })());
}

export async function getServiceRequestTicketSummary(
  ticketId: string,
): Promise<ServiceRequestTicketSummary | null> {
  const [row] = await getDatabase()
    .select({ requestType: serviceRequests.requestType })
    .from(serviceRequests)
    .where(eq(serviceRequests.ticketId, ticketId))
    .limit(1);
  if (!row) return null;
  return { requestType: row.requestType, label: serviceRequestLabel(row.requestType) };
}

export async function createServiceRequestExport(ticketId: string): Promise<ServiceRequestExport | null> {
  const db = getDatabase();
  const [request] = await db
    .select({
      serviceRequestId: serviceRequests.id,
      requestType: serviceRequests.requestType,
      data: serviceRequests.data,
      ticketNumber: tickets.ticketNumber,
    })
    .from(serviceRequests)
    .innerJoin(tickets, eq(tickets.id, serviceRequests.ticketId))
    .where(eq(serviceRequests.ticketId, ticketId))
    .limit(1);
  if (!request) return null;

  const attachments = await db
    .select({
      fieldKey: serviceRequestAttachments.fieldKey,
      storageKey: serviceRequestAttachments.storageKey,
      originalName: serviceRequestAttachments.originalName,
    })
    .from(serviceRequestAttachments)
    .where(eq(serviceRequestAttachments.serviceRequestId, request.serviceRequestId))
    .orderBy(asc(serviceRequestAttachments.createdAt), asc(serviceRequestAttachments.id));

  const output = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (cause) => output.destroy(cause));
  archive.pipe(output);
  archive.append(
    createTextPdf(pdfLines({
      ticketNumber: request.ticketNumber,
      requestType: request.requestType,
      data: request.data,
    })),
    { name: "dados-formulario.pdf" },
  );

  void (async () => {
    try {
      const definitions = new Map(
        SERVICE_REQUEST_ATTACHMENT_DEFINITIONS[request.requestType].map((definition) => [
          definition.fieldKey,
          definition.label,
        ]),
      );
      for (const [index, attachment] of attachments.entries()) {
        const response = await getServiceRequestObject(attachment.storageKey);
        if (!response.ok || !response.body) {
          throw new Error(`SERVICE_REQUEST_EXPORT_ATTACHMENT_FAILED:${response.status}`);
        }
        const folder = safeArchiveName(definitions.get(attachment.fieldKey) ?? attachment.fieldKey);
        const filename = `${String(index + 1).padStart(2, "0")}-${safeArchiveName(attachment.originalName)}`;
        archive.append(responseBodyAsNodeStream(response.body), {
          name: `anexos/${folder}/${filename}`,
        });
      }
      await archive.finalize();
    } catch (cause) {
      archive.abort();
      output.destroy(cause instanceof Error ? cause : new Error("SERVICE_REQUEST_EXPORT_FAILED"));
    }
  })();

  const suffix = request.requestType === "nfse" ? "nfse" : "cellcoin";
  return {
    filename: `ticket-${request.ticketNumber}-${suffix}.zip`,
    stream: output,
  };
}
