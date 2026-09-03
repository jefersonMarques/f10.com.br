import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { PermissionScope } from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import { users } from "$lib/server/db/schema";
import {
  serviceRequestAttachments,
  serviceRequestChangeSets,
  serviceRequestFieldChanges,
  serviceRequests,
} from "$lib/server/db/serviceRequestSchema";
import { customerContacts, ticketEvents, tickets } from "$lib/server/db/supportSchema";
import type { CustomerF10PortalSession } from "$lib/server/customerPortal/customerF10AuthRepository";
import { requireTicketAccess } from "$lib/server/support/supportAccess";
import { notifySupportTicketNeedsAttention } from "$lib/server/support/supportTeamNotifications";
import {
  decryptServiceRequestSecret,
  encryptServiceRequestSecrets,
} from "$lib/server/serviceRequests/serviceRequestCrypto";
import {
  normalizeServiceRequestFields,
  serviceRequestLabel,
  type ServiceRequestDataValue,
  type ServiceRequestType,
} from "$lib/server/serviceRequests/serviceRequestDefinitions";

const NFSE_SECRET_FIELDS = [
  "certificatePassword",
  "cityHallPassword",
  "securityPhrase",
] as const;

const IMMUTABLE_FIELDS = new Set([
  "submittedAt",
  "submissionKind",
  "emailFields",
  "contract",
  "cityCheckStatus",
  "cityCheckMessage",
  "cityCheckCity",
  "cityCheckState",
  "cityCheckIbgeCode",
  "cityCheckProvider",
  "cityCheckCheckedAt",
]);

const HIDDEN_PRESENTATION_FIELDS = new Set(["emailFields"]);

const FIELD_LABELS: Record<string, string> = {
  cnpj: "CNPJ",
  legalName: "Razão social",
  fantasyName: "Nome fantasia",
  unitLegalName: "Razão social da unidade",
  unitFantasyName: "Nome fantasia da unidade",
  cnaeMain: "CNAE principal",
  cep: "CEP",
  street: "Logradouro",
  number: "Número",
  complement: "Complemento",
  neighborhood: "Bairro",
  city: "Cidade",
  state: "UF",
  phone: "Telefone",
  unitPhone: "Telefone comercial",
  email: "E-mail",
  website: "Site",
  managerName: "Responsável",
  managerCpf: "CPF do responsável",
  managerRg: "RG do responsável",
  managerWhatsapp: "WhatsApp do responsável",
  managerEmail: "E-mail do responsável",
  marketingSite: "Site para divulgação",
  marketingInstagram: "Instagram",
  marketingFacebook: "Facebook",
  noteKind: "Tipo de nota",
  municipalRegistration: "Inscrição municipal",
  stateRegistration: "Inscrição estadual",
  isSimples: "Optante pelo Simples Nacional",
  supportsCulturalProjects: "Incentivo a projetos culturais",
  usesNationalNfseEnvironment: "Usa ambiente nacional da NFS-e",
  cityHallLogin: "Login da prefeitura",
  serviceRpsBatchNumber: "Número do lote RPS",
  serviceListItem: "Item da lista de serviço",
  taxationCode: "Código de tributação",
  taxationPlace: "Local de tributação",
  specialRegime: "Regime especial",
  issRequirement: "Exigibilidade do ISS",
  issWithholding: "ISS retido",
  roundIss: "Arredondar ISS",
  aliquotPis: "Alíquota PIS",
  aliquotCofins: "Alíquota COFINS",
  aliquotInss: "Alíquota INSS",
  aliquotIr: "Alíquota IR",
  aliquotCsll: "Alíquota CSLL",
  aliquotIss: "Alíquota ISS",
  ibptPercent: "Percentual IBPT",
  serviceDescription: "Descrição do serviço",
  commerceLastInvoiceNumber: "Último número de nota",
  commerceBatchNumber: "Número do lote",
  commerceNumbering: "Numeração",
  commerceSeries: "Série",
  commerceNcmCode: "NCM",
  commerceCfopCode: "CFOP",
  commerceReturnCfop: "CFOP de devolução",
  commerceOperationNature: "Natureza da operação",
  commerceIcmsAliquot: "Alíquota ICMS",
  commerceCstIcms: "CST ICMS",
  commerceCsosn: "CSOSN",
  commerceIpiAliquot: "Alíquota IPI",
  commerceCstIpi: "CST IPI",
  commercePisAliquot: "Alíquota PIS do comércio",
  commerceCstPis: "CST PIS",
  commerceCofinsAliquot: "Alíquota COFINS do comércio",
  commerceCstCofins: "CST COFINS",
  commerceItemDescription: "Descrição do item",
  commerceGtin: "GTIN",
  commerceFiscalBenefitCode: "Código de benefício fiscal",
  submittedAt: "Enviado em",
  contract: "Contrato e aceite",
  cityCheckStatus: "Status da validação da cidade",
  cityCheckMessage: "Mensagem da validação da cidade",
  cityCheckCity: "Cidade validada",
  cityCheckState: "UF validada",
  cityCheckIbgeCode: "Código IBGE",
  cityCheckProvider: "Provedor identificado",
  cityCheckCheckedAt: "Validação realizada em",
};

const SECRET_LABELS: Record<string, string> = {
  certificatePassword: "Senha do certificado digital",
  cityHallPassword: "Senha da prefeitura",
  securityPhrase: "Frase de segurança",
};

type ServiceRequestRow = {
  id: string;
  ticketId: string;
  requestType: ServiceRequestType;
  customerContactId: string;
  version: number;
  data: Record<string, unknown>;
  secretsEncrypted: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
  ticketStatus: string;
};

export type ServiceRequestFieldView = {
  key: string;
  label: string;
  value: string | number | boolean | null;
  displayValue: string;
  editable: boolean;
  inputKind: "text" | "number" | "boolean" | "textarea" | "readonly";
};

export type ServiceRequestSecretView = {
  key: string;
  label: string;
  present: boolean;
};

export type ServiceRequestAttachmentView = {
  id: string;
  fieldKey: string;
  label: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  href: string;
};

export type ServiceRequestHistoryChangeView = {
  fieldKey: string;
  label: string;
  previousValue: string;
  nextValue: string;
  secretChanged: boolean;
};

export type ServiceRequestHistoryView = {
  version: number;
  source: "customer" | "user" | "system";
  actorName: string;
  createdAt: string;
  changes: ServiceRequestHistoryChangeView[];
};

export type ServiceRequestDetailsView = {
  id: string;
  ticketId: string;
  requestType: ServiceRequestType;
  label: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  fields: ServiceRequestFieldView[];
  secrets: ServiceRequestSecretView[];
  attachments: ServiceRequestAttachmentView[];
  history: ServiceRequestHistoryView[];
};

export type UpdateServiceRequestInput = {
  expectedVersion: number;
  fields: Record<string, unknown>;
  delayAcknowledged?: boolean;
};

function humanizeFieldKey(fieldKey: string): string {
  const separated = fieldKey
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_.:-]+/g, " ")
    .trim();
  if (!separated) return fieldKey;
  return separated.charAt(0).toUpperCase() + separated.slice(1);
}

function fieldLabel(fieldKey: string): string {
  return FIELD_LABELS[fieldKey] ?? humanizeFieldKey(fieldKey);
}

function secretFields(requestType: ServiceRequestType): readonly string[] {
  return requestType === "nfse" ? NFSE_SECRET_FIELDS : [];
}

function attachmentLabel(fieldKey: string): string {
  const labels: Record<string, string> = {
    certificate_file: "Certificado digital",
    invoice_xml_file: "XML recente de nota fiscal",
    doc_rg_cnh: "RG ou CNH",
    doc_cnpj: "Documento do CNPJ",
    doc_contrato: "Contrato Social",
    doc_selfie: "Selfie com documento",
  };
  return labels[fieldKey] ?? fieldLabel(fieldKey);
}

function displayValue(fieldKey: string, value: unknown): string {
  if (fieldKey === "contract") {
    if (value && typeof value === "object") {
      const accepted = (value as Record<string, unknown>).accepted;
      return accepted === true ? "Aceite registrado" : "Contrato registrado";
    }
    return "Contrato registrado";
  }
  if (value === null || value === undefined || value === "") return "Não informado";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  return "Dados estruturados registrados";
}

function historyValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Não informado";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  return "Dados estruturados";
}

function inputKind(fieldKey: string, value: unknown): ServiceRequestFieldView["inputKind"] {
  if (IMMUTABLE_FIELDS.has(fieldKey) || value === null || typeof value === "object") return "readonly";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (typeof value === "string" && (/description|complement|message/i.test(fieldKey) || value.length > 140)) {
    return "textarea";
  }
  return "text";
}

function fieldView(fieldKey: string, value: unknown): ServiceRequestFieldView {
  const kind = inputKind(fieldKey, value);
  return {
    key: fieldKey,
    label: fieldLabel(fieldKey),
    value:
      value === null || ["string", "number", "boolean"].includes(typeof value)
        ? value as string | number | boolean | null
        : null,
    displayValue: displayValue(fieldKey, value),
    editable: kind !== "readonly",
    inputKind: kind,
  };
}

async function readRequestRow(ticketId: string, customerContactId?: string): Promise<ServiceRequestRow | null> {
  const db = getDatabase();
  const conditions = [eq(serviceRequests.ticketId, ticketId)];
  if (customerContactId) conditions.push(eq(serviceRequests.customerContactId, customerContactId));

  const [row] = await db
    .select({
      id: serviceRequests.id,
      ticketId: serviceRequests.ticketId,
      requestType: serviceRequests.requestType,
      customerContactId: serviceRequests.customerContactId,
      version: serviceRequests.version,
      data: serviceRequests.data,
      secretsEncrypted: serviceRequests.secretsEncrypted,
      createdAt: serviceRequests.createdAt,
      updatedAt: serviceRequests.updatedAt,
      ticketStatus: tickets.status,
    })
    .from(serviceRequests)
    .innerJoin(tickets, eq(tickets.id, serviceRequests.ticketId))
    .where(and(...conditions))
    .limit(1);

  return row ?? null;
}

async function buildDetails(
  row: ServiceRequestRow,
  audience: "customer" | "support",
): Promise<ServiceRequestDetailsView> {
  const db = getDatabase();
  const [attachments, changeSets] = await Promise.all([
    db
      .select({
        id: serviceRequestAttachments.id,
        fieldKey: serviceRequestAttachments.fieldKey,
        originalName: serviceRequestAttachments.originalName,
        mimeType: serviceRequestAttachments.mimeType,
        sizeBytes: serviceRequestAttachments.sizeBytes,
      })
      .from(serviceRequestAttachments)
      .where(eq(serviceRequestAttachments.serviceRequestId, row.id))
      .orderBy(serviceRequestAttachments.createdAt),
    db
      .select({
        id: serviceRequestChangeSets.id,
        version: serviceRequestChangeSets.version,
        source: serviceRequestChangeSets.source,
        actorUserName: users.name,
        actorCustomerName: customerContacts.name,
        createdAt: serviceRequestChangeSets.createdAt,
      })
      .from(serviceRequestChangeSets)
      .leftJoin(users, eq(users.id, serviceRequestChangeSets.actorUserId))
      .leftJoin(
        customerContacts,
        eq(customerContacts.id, serviceRequestChangeSets.actorCustomerContactId),
      )
      .where(eq(serviceRequestChangeSets.serviceRequestId, row.id))
      .orderBy(desc(serviceRequestChangeSets.version))
      .limit(20),
  ]);

  const changeSetIds = changeSets.filter((changeSet) => changeSet.version > 1).map((changeSet) => changeSet.id);
  const changes = changeSetIds.length > 0
    ? await db
        .select({
          changeSetId: serviceRequestFieldChanges.changeSetId,
          fieldKey: serviceRequestFieldChanges.fieldKey,
          previousValue: serviceRequestFieldChanges.previousValue,
          nextValue: serviceRequestFieldChanges.nextValue,
          secretChanged: serviceRequestFieldChanges.secretChanged,
        })
        .from(serviceRequestFieldChanges)
        .where(inArray(serviceRequestFieldChanges.changeSetId, changeSetIds))
        .orderBy(serviceRequestFieldChanges.createdAt)
    : [];
  const changesBySet = new Map<string, ServiceRequestHistoryChangeView[]>();
  for (const change of changes) {
    const list = changesBySet.get(change.changeSetId) ?? [];
    list.push({
      fieldKey: change.fieldKey,
      label: change.secretChanged
        ? SECRET_LABELS[change.fieldKey] ?? fieldLabel(change.fieldKey)
        : fieldLabel(change.fieldKey),
      previousValue: change.secretChanged ? "Credencial anterior protegida" : historyValue(change.previousValue),
      nextValue: change.secretChanged ? "Credencial alterada" : historyValue(change.nextValue),
      secretChanged: change.secretChanged,
    });
    changesBySet.set(change.changeSetId, list);
  }

  return {
    id: row.id,
    ticketId: row.ticketId,
    requestType: row.requestType,
    label: serviceRequestLabel(row.requestType),
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    fields: Object.entries(row.data)
      .filter(([fieldKey]) => !HIDDEN_PRESENTATION_FIELDS.has(fieldKey))
      .map(([fieldKey, value]) => fieldView(fieldKey, value)),
    secrets: secretFields(row.requestType).map((fieldKey) => ({
      key: fieldKey,
      label: SECRET_LABELS[fieldKey] ?? fieldLabel(fieldKey),
      present: Boolean(row.secretsEncrypted[fieldKey]),
    })),
    attachments: attachments.map((attachment) => ({
      ...attachment,
      label: attachmentLabel(attachment.fieldKey),
      href: audience === "customer"
        ? `/cliente/chamados/${row.ticketId}/solicitacao/anexos/${attachment.id}`
        : `/app/tickets/${row.ticketId}/service-request/attachments/${attachment.id}`,
    })),
    history: changeSets.map((changeSet) => ({
      version: changeSet.version,
      source: changeSet.source,
      actorName:
        changeSet.actorUserName ??
        changeSet.actorCustomerName ??
        (changeSet.source === "system" ? "Sistema" : changeSet.source === "customer" ? "Cliente" : "Equipe F10"),
      createdAt: changeSet.createdAt.toISOString(),
      changes: changeSet.version === 1 ? [] : changesBySet.get(changeSet.id) ?? [],
    })),
  };
}

function requireExpectedVersion(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error("SERVICE_REQUEST_VERSION_INVALID");
  return value;
}

function coercePatchValue(current: unknown, raw: unknown): ServiceRequestDataValue {
  if (typeof current === "boolean") {
    if (raw === true || raw === "true") return true;
    if (raw === false || raw === "false") return false;
    throw new Error("SERVICE_REQUEST_FIELD_TYPE_INVALID");
  }
  if (typeof current === "number") {
    const value = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(value)) throw new Error("SERVICE_REQUEST_FIELD_TYPE_INVALID");
    return value;
  }
  if (typeof current === "string") {
    if (typeof raw !== "string") throw new Error("SERVICE_REQUEST_FIELD_TYPE_INVALID");
    return raw;
  }
  throw new Error("SERVICE_REQUEST_FIELD_NOT_EDITABLE");
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function updateRequest(params: {
  row: ServiceRequestRow;
  source: "customer" | "user";
  actorUserId?: string;
  actorCustomerContactId?: string;
  input: UpdateServiceRequestInput;
}): Promise<void> {
  const expectedVersion = requireExpectedVersion(params.input.expectedVersion);
  if (params.row.ticketStatus === "closed") throw new Error("SERVICE_REQUEST_TICKET_CLOSED");
  if (params.source === "customer" && params.input.delayAcknowledged !== true) {
    throw new Error("SERVICE_REQUEST_DELAY_ACK_REQUIRED");
  }

  const secretFieldSet = new Set(secretFields(params.row.requestType));
  const patch: Record<string, ServiceRequestDataValue> = {};
  const rawSecrets: Record<string, string> = {};

  for (const [fieldKey, rawValue] of Object.entries(params.input.fields)) {
    if (secretFieldSet.has(fieldKey)) {
      if (typeof rawValue !== "string") throw new Error("SERVICE_REQUEST_SECRET_TYPE_INVALID");
      if (rawValue.trim()) rawSecrets[fieldKey] = rawValue;
      continue;
    }
    if (!(fieldKey in params.row.data)) throw new Error(`SERVICE_REQUEST_FIELD_UNKNOWN:${fieldKey}`);
    if (IMMUTABLE_FIELDS.has(fieldKey)) throw new Error(`SERVICE_REQUEST_FIELD_IMMUTABLE:${fieldKey}`);
    patch[fieldKey] = coercePatchValue(params.row.data[fieldKey], rawValue);
  }

  const normalized = normalizeServiceRequestFields(params.row.requestType, {
    ...params.row.data,
    ...patch,
    ...rawSecrets,
  });
  const changedFields = Object.keys(patch).filter(
    (fieldKey) => !sameValue(params.row.data[fieldKey], normalized.data[fieldKey]),
  );
  const changedSecrets = Object.keys(normalized.secrets);
  if (changedFields.length === 0 && changedSecrets.length === 0) {
    throw new Error("SERVICE_REQUEST_NO_CHANGES");
  }

  const encryptedSecrets = encryptServiceRequestSecrets(normalized.secrets);
  const nextSecrets = { ...params.row.secretsEncrypted, ...encryptedSecrets };
  const nextVersion = expectedVersion + 1;
  const now = new Date();
  const db = getDatabase();

  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`service-request:${params.row.id}`}))`);
    const [locked] = await tx
      .select({ version: serviceRequests.version })
      .from(serviceRequests)
      .where(eq(serviceRequests.id, params.row.id))
      .limit(1);
    if (!locked) throw new Error("SERVICE_REQUEST_NOT_FOUND");
    if (locked.version !== expectedVersion) throw new Error("SERVICE_REQUEST_VERSION_CONFLICT");

    await tx
      .update(serviceRequests)
      .set({
        version: nextVersion,
        data: normalized.data,
        secretsEncrypted: nextSecrets,
        updatedAt: now,
      })
      .where(eq(serviceRequests.id, params.row.id));

    const [changeSet] = await tx
      .insert(serviceRequestChangeSets)
      .values({
        serviceRequestId: params.row.id,
        version: nextVersion,
        source: params.source,
        actorUserId: params.actorUserId ?? null,
        actorCustomerContactId: params.actorCustomerContactId ?? null,
      })
      .returning({ id: serviceRequestChangeSets.id });
    if (!changeSet) throw new Error("SERVICE_REQUEST_CHANGE_SET_NOT_CREATED");

    const fieldChanges = [
      ...changedFields.map((fieldKey) => ({
        changeSetId: changeSet.id,
        fieldKey,
        previousValue: params.row.data[fieldKey] ?? null,
        nextValue: normalized.data[fieldKey] ?? null,
        secretChanged: false,
      })),
      ...changedSecrets.map((fieldKey) => ({
        changeSetId: changeSet.id,
        fieldKey,
        previousValue: null,
        nextValue: null,
        secretChanged: true,
      })),
    ];
    await tx.insert(serviceRequestFieldChanges).values(fieldChanges);

    await tx.insert(ticketEvents).values({
      ticketId: params.row.ticketId,
      actorUserId: params.actorUserId ?? null,
      eventType: "service_request.updated",
      metadata: {
        serviceRequestId: params.row.id,
        requestType: params.row.requestType,
        version: nextVersion,
        source: params.source,
        changedFields,
        changedSecretFields: changedSecrets,
        delayAcknowledged: params.source === "customer" ? true : undefined,
      },
    });

    if (params.source === "customer") {
      await tx
        .update(tickets)
        .set({
          status: params.row.ticketStatus === "resolved" || params.row.ticketStatus === "waiting_customer"
            ? "open"
            : params.row.ticketStatus as "new" | "open" | "in_progress" | "waiting_customer" | "resolved" | "closed",
          updatedAt: now,
        })
        .where(eq(tickets.id, params.row.ticketId));
    }
  });

  if (params.source === "customer") {
    await notifySupportTicketNeedsAttention(
      params.row.ticketId,
      `Cliente alterou os dados da solicitação de ${serviceRequestLabel(params.row.requestType)}.`,
    ).catch((cause) => {
      console.error("[service-request.update.notification]", {
        ticketId: params.row.ticketId,
        requestType: params.row.requestType,
        causeType: cause instanceof Error ? cause.name : typeof cause,
      });
    });
  }
}

export async function getCustomerServiceRequestForTicket(
  session: CustomerF10PortalSession,
  ticketId: string,
): Promise<ServiceRequestDetailsView | null> {
  const row = await readRequestRow(ticketId, session.contactId);
  return row ? buildDetails(row, "customer") : null;
}

export async function getSupportServiceRequestForTicket(
  userId: string,
  scope: PermissionScope,
  ticketId: string,
): Promise<ServiceRequestDetailsView | null> {
  await requireTicketAccess(userId, scope, ticketId);
  const row = await readRequestRow(ticketId);
  return row ? buildDetails(row, "support") : null;
}

export async function updateCustomerServiceRequest(
  session: CustomerF10PortalSession,
  ticketId: string,
  input: UpdateServiceRequestInput,
): Promise<void> {
  const row = await readRequestRow(ticketId, session.contactId);
  if (!row) throw new Error("SERVICE_REQUEST_NOT_FOUND");
  await updateRequest({
    row,
    source: "customer",
    actorCustomerContactId: session.contactId,
    input,
  });
}

export async function updateSupportServiceRequest(
  userId: string,
  scope: PermissionScope,
  ticketId: string,
  input: UpdateServiceRequestInput,
): Promise<void> {
  await requireTicketAccess(userId, scope, ticketId);
  const row = await readRequestRow(ticketId);
  if (!row) throw new Error("SERVICE_REQUEST_NOT_FOUND");
  await updateRequest({ row, source: "user", actorUserId: userId, input });
}

export async function revealSupportServiceRequestSecret(
  userId: string,
  scope: PermissionScope,
  ticketId: string,
  fieldKey: string,
): Promise<string> {
  await requireTicketAccess(userId, scope, ticketId);
  const row = await readRequestRow(ticketId);
  if (!row) throw new Error("SERVICE_REQUEST_NOT_FOUND");
  if (!secretFields(row.requestType).includes(fieldKey)) {
    throw new Error("SERVICE_REQUEST_SECRET_FIELD_INVALID");
  }
  const encrypted = row.secretsEncrypted[fieldKey];
  if (!encrypted) throw new Error("SERVICE_REQUEST_SECRET_NOT_SET");
  const value = decryptServiceRequestSecret(encrypted);

  await getDatabase().insert(ticketEvents).values({
    ticketId,
    actorUserId: userId,
    eventType: "service_request.secret.revealed",
    metadata: {
      serviceRequestId: row.id,
      requestType: row.requestType,
      fieldKey,
    },
  });
  return value;
}

export async function getCustomerServiceRequestAttachment(
  session: CustomerF10PortalSession,
  ticketId: string,
  attachmentId: string,
) {
  const db = getDatabase();
  const [attachment] = await db
    .select({
      id: serviceRequestAttachments.id,
      storageKey: serviceRequestAttachments.storageKey,
      originalName: serviceRequestAttachments.originalName,
      mimeType: serviceRequestAttachments.mimeType,
      sizeBytes: serviceRequestAttachments.sizeBytes,
    })
    .from(serviceRequestAttachments)
    .innerJoin(serviceRequests, eq(serviceRequests.id, serviceRequestAttachments.serviceRequestId))
    .where(
      and(
        eq(serviceRequests.ticketId, ticketId),
        eq(serviceRequests.customerContactId, session.contactId),
        eq(serviceRequestAttachments.id, attachmentId),
      ),
    )
    .limit(1);
  return attachment ?? null;
}

export async function getSupportServiceRequestAttachment(
  userId: string,
  scope: PermissionScope,
  ticketId: string,
  attachmentId: string,
) {
  await requireTicketAccess(userId, scope, ticketId);
  const db = getDatabase();
  const [attachment] = await db
    .select({
      id: serviceRequestAttachments.id,
      storageKey: serviceRequestAttachments.storageKey,
      originalName: serviceRequestAttachments.originalName,
      mimeType: serviceRequestAttachments.mimeType,
      sizeBytes: serviceRequestAttachments.sizeBytes,
    })
    .from(serviceRequestAttachments)
    .innerJoin(serviceRequests, eq(serviceRequests.id, serviceRequestAttachments.serviceRequestId))
    .where(
      and(
        eq(serviceRequests.ticketId, ticketId),
        eq(serviceRequestAttachments.id, attachmentId),
      ),
    )
    .limit(1);
  return attachment ?? null;
}
