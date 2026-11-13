import { error, fail, type Actions } from "@sveltejs/kit";
import { sql } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { getPermissionScope, hasPermission } from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import { requireTicketAccess } from "$lib/server/support/supportAccess";
import {
  addTicketCustomerParticipant,
  getContactContractAccess,
  getTicketContractLinks,
  listTicketCustomers,
  readContractSelection,
  removeTicketCustomerParticipant,
  replaceTicketContractLinks,
} from "$lib/server/support/customerContractAccessRepository";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function ticketIdOf(raw: string | undefined): string {
  if (!raw || !UUID.test(raw)) throw error(404, "Ticket não encontrado.");
  return raw;
}

async function authorizeWrite(
  cookies: Parameters<typeof requireAppPermission>[0],
  ticketId: string,
) {
  const { session, permissions } = await requireAppPermission(
    cookies, "tickets.reply", "/app/tickets/" + ticketId,
  );
  if (!hasPermission(permissions, "customers.view", "all")) {
    throw error(403, "Acesso não autorizado.");
  }
  const scope = getPermissionScope(permissions, "tickets.reply");
  if (!scope) throw error(403, "Acesso não autorizado.");
  await requireTicketAccess(session.user.id, scope, ticketId);
  return session.user.id;
}

export const load: PageServerLoad = async ({ parent, params, setHeaders }) => {
  const layout = await parent();
  const ticketId = ticketIdOf(params.ticketId);
  const permissions = new Map(layout.permissions.map((item) => [item.code, item.scope]));
  if (!hasPermission(permissions, "customers.view", "all")) {
    throw error(403, "Acesso não autorizado.");
  }
  const result = await getDatabase().execute(sql`
    SELECT t.customer_contact_id::text AS "contactId", c.name, c.email,
      t.ticket_number AS "ticketNumber", t.subject
    FROM tickets t
    LEFT JOIN customer_contacts c ON c.id = t.customer_contact_id
    WHERE t.id = ${ticketId}::uuid
  `);
  const ticket = (result as unknown as Array<{
    contactId: string | null;
    name: string | null;
    email: string | null;
    ticketNumber: number;
    subject: string;
  }>)[0];
  if (!ticket) throw error(404, "Ticket não encontrado.");

  const [contracts, participants, allowedContracts] = await Promise.all([
    getTicketContractLinks(ticketId),
    listTicketCustomers(ticketId),
    ticket.contactId ? getContactContractAccess(ticket.contactId) : Promise.resolve([]),
  ]);
  setHeaders({ "Cache-Control": "private, no-store" });
  return {
    ticketId,
    ticket,
    contracts,
    participants,
    allowedContracts,
    canEdit: hasPermission(permissions, "tickets.reply"),
  };
};

export const actions: Actions = {
  saveContracts: async ({ cookies, params, request }) => {
    const ticketId = ticketIdOf(params.ticketId);
    const userId = await authorizeWrite(cookies, ticketId);
    try {
      const selected = readContractSelection(await request.formData(), "contractIds");
      await replaceTicketContractLinks(ticketId, userId, selected);
      return { success: true, message: "Contratos atualizados." };
    } catch {
      return fail(400, { success: false,
        message: "Selecione ao menos um contrato autorizado ao solicitante." });
    }
  },

  addParticipant: async ({ cookies, params, request }) => {
    const ticketId = ticketIdOf(params.ticketId);
    const userId = await authorizeWrite(cookies, ticketId);
    const form = await request.formData();
    const contactId = String(form.get("contactId") ?? "");
    try {
      await addTicketCustomerParticipant(ticketId, contactId, userId);
      return { success: true, message: "Acompanhante adicionado." };
    } catch {
      return fail(400, { success: false,
        message: "Pessoa inválida ou sem acesso a todos os contratos do ticket." });
    }
  },

  removeParticipant: async ({ cookies, params, request }) => {
    const ticketId = ticketIdOf(params.ticketId);
    const userId = await authorizeWrite(cookies, ticketId);
    const form = await request.formData();
    const contactId = String(form.get("contactId") ?? "");
    try {
      await removeTicketCustomerParticipant(ticketId, contactId, userId);
      return { success: true, message: "Acompanhante removido." };
    } catch {
      return fail(400, { success: false, message: "Não foi possível remover acompanhante." });
    }
  },
};
