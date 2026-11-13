import { error, json, type RequestHandler } from "@sveltejs/kit";
import { sql } from "drizzle-orm";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { getPermissionScope, hasPermission } from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import { requireTicketAccess } from "$lib/server/support/supportAccess";
import {
  addTicketContract,
  addTicketCustomerParticipant,
  getContactContractAccess,
  getTicketContractLinks,
  listTicketCustomers,
  removeTicketContract,
  removeTicketCustomerParticipant,
} from "$lib/server/support/customerContractAccessRepository";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type UpdateAction = "addContract" | "removeContract" |
  "addParticipant" | "removeParticipant";

type UpdateInput = {
  action: UpdateAction;
  contractId?: string;
  contactId?: string;
  grantToRequester?: boolean;
};

function requiredTicketId(value: string | undefined): string {
  if (!value || !UUID_PATTERN.test(value)) {
    throw error(404, "Ticket não encontrado.");
  }
  return value;
}

function asContractId(value: string | undefined): number {
  if (!value || !/^[1-9][0-9]*$/.test(value)) {
    throw error(400, "Contrato inválido.");
  }
  const id = Number(value);
  if (!Number.isSafeInteger(id)) throw error(400, "Contrato inválido.");
  return id;
}

async function authorizedContext(
  cookies: Parameters<typeof requireAppPermission>[0],
  pathname: string,
  permission: "tickets.view" | "tickets.reply",
  ticketId: string,
) {
  const { session, permissions } = await requireAppPermission(
    cookies, permission, pathname,
  );
  const scope = getPermissionScope(permissions, permission);
  if (!scope || !hasPermission(permissions, "customers.view", "all")) {
    throw error(403, "Acesso não autorizado.");
  }
  await requireTicketAccess(session.user.id, scope, ticketId);
  return { userId: session.user.id, permissions };
}

export const GET: RequestHandler = async ({ cookies, params, url }) => {
  const ticketId = requiredTicketId(params.ticketId);
  const { permissions } = await authorizedContext(
    cookies, url.pathname, "tickets.view", ticketId,
  );

  const result = await getDatabase().execute(sql`
    SELECT t.customer_contact_id::text AS "contactId",
      c.name AS "requesterName", c.email AS "requesterEmail"
    FROM tickets t
    LEFT JOIN customer_contacts c ON c.id = t.customer_contact_id
    WHERE t.id = ${ticketId}::uuid
  `);
  const ticket = (result as unknown as Array<{
    contactId: string | null;
    requesterName: string | null;
    requesterEmail: string | null;
  }>)[0];
  if (!ticket) throw error(404, "Ticket não encontrado.");

  const [contracts, participants, allowedContracts] = await Promise.all([
    getTicketContractLinks(ticketId),
    listTicketCustomers(ticketId),
    ticket.contactId
      ? getContactContractAccess(ticket.contactId)
      : Promise.resolve([]),
  ]);

  return json({
    requester: ticket,
    contracts,
    participants: participants.filter((person) =>
      person.contactId !== ticket.contactId),
    allowedContracts,
    canEdit: hasPermission(permissions, "tickets.reply"),
    canManageCustomers: hasPermission(permissions, "customers.manage", "all"),
  }, { headers: { "Cache-Control": "private, no-store" } });
};

export const POST: RequestHandler = async ({ cookies, params, url, request }) => {
  const ticketId = requiredTicketId(params.ticketId);
  const { userId, permissions } = await authorizedContext(
    cookies, url.pathname, "tickets.reply", ticketId,
  );
  let input: UpdateInput;
  try {
    input = await request.json() as UpdateInput;
  } catch {
    throw error(400, "Operação inválida.");
  }

  if (!input || typeof input !== "object") {
    throw error(400, "Operação inválida.");
  }
  try {
    switch (input.action) {
      case "addContract": {
        const contractId = asContractId(input.contractId);
        const grantAccess = input.grantToRequester === true;
        if (grantAccess &&
            !hasPermission(permissions, "customers.manage", "all")) {
          throw error(403, "Sem permissão para autorizar contratos.");
        }
        await addTicketContract(ticketId, userId, contractId, grantAccess);
        break;
      }
      case "removeContract":
        await removeTicketContract(
          ticketId, userId, asContractId(input.contractId),
        );
        break;
      case "addParticipant":
      case "removeParticipant": {
        if (!input.contactId || !UUID_PATTERN.test(input.contactId)) {
          throw error(400, "Pessoa inválida.");
        }
        if (input.action === "addParticipant") {
          await addTicketCustomerParticipant(
            ticketId, input.contactId, userId,
          );
        } else {
          await removeTicketCustomerParticipant(
            ticketId, input.contactId, userId,
          );
        }
        break;
      }
      default:
        throw error(400, "Operação desconhecida.");
    }
  } catch (cause) {
    if (cause && typeof cause === "object" && "status" in cause) {
      throw cause;
    }
    const code = cause instanceof Error ? cause.message : "";
    const messages: Record<string, string> = {
      SUPPORT_TICKET_REQUESTER_REQUIRED: "Selecione primeiro o solicitante principal.",
      SUPPORT_TICKET_CONTRACT_REQUIRED: "O ticket deve manter ao menos um contrato.",
      SUPPORT_TICKET_CONTRACT_FORBIDDEN: "Solicitante sem autorização para este contrato.",
      SUPPORT_PARTICIPANT_CONTRACT_FORBIDDEN: "A pessoa não possui acesso a todas as empresas do ticket.",
      SUPPORT_PARTICIPANT_IS_REQUESTER: "O solicitante já acompanha o ticket.",
      SUPPORT_CONTRACT_NOT_FOUND: "Contrato não encontrado na API F10.",
    };
    throw error(409, messages[code] ?? "Não foi possível salvar as alterações.");
  }

  return json({ success: true }, {
    headers: { "Cache-Control": "private, no-store" },
  });
};
