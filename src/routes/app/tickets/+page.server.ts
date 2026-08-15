import {
  error,
  fail,
  redirect,
  type Actions,
  type PageServerLoad,
} from "@sveltejs/kit";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  createManualTicket,
  listSupportQueues,
  listSupportTickets,
  type TicketPriority,
} from "$lib/server/support/supportRepository";

function readFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isTicketPriority(value: string): value is TicketPriority {
  return value === "low" || value === "normal" || value === "high" || value === "urgent";
}

function createPermissionMap(
  permissions: Array<{ code: string; scope: "own" | "team" | "all" }>,
) {
  return new Map(
    permissions.map((permission) => [permission.code, permission.scope]),
  );
}

export const load: PageServerLoad = async ({ parent }) => {
  const layout = await parent();
  const permissionMap = createPermissionMap(layout.permissions);

  if (!hasPermission(permissionMap, "tickets.view")) {
    throw error(403, "Acesso não autorizado.");
  }

  const canCreate = hasPermission(permissionMap, "tickets.create");
  const [tickets, queues] = await Promise.all([
    listSupportTickets(layout.user.id, permissionMap),
    canCreate ? listSupportQueues() : Promise.resolve([]),
  ]);

  return {
    tickets,
    queues,
    canCreate,
  };
};

export const actions: Actions = {
  create: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(
      cookies,
      "tickets.create",
      "/app/tickets",
    );
    const formData = await request.formData();
    const subject = readFormValue(formData, "subject");
    const message = readFormValue(formData, "message");
    const priority = readFormValue(formData, "priority");
    const customerName = readFormValue(formData, "customerName");
    const customerEmail = readFormValue(formData, "customerEmail").toLowerCase();
    const customerPhone = readFormValue(formData, "customerPhone");
    const organizationName = readFormValue(formData, "organizationName");
    const queueId = readFormValue(formData, "queueId");

    if (subject.length < 3 || subject.length > 180) {
      return fail(400, {
        success: false,
        action: "create",
        message: "Informe um assunto entre 3 e 180 caracteres.",
      });
    }

    if (message.length < 1 || message.length > 10000) {
      return fail(400, {
        success: false,
        action: "create",
        message: "A descrição do atendimento deve ter entre 1 e 10.000 caracteres.",
      });
    }

    if (customerName.length < 2 || customerName.length > 120) {
      return fail(400, {
        success: false,
        action: "create",
        message: "Informe o nome do cliente entre 2 e 120 caracteres.",
      });
    }

    if (organizationName.length > 160) {
      return fail(400, {
        success: false,
        action: "create",
        message: "O nome da escola ou empresa deve ter no máximo 160 caracteres.",
      });
    }

    if (customerEmail.length > 254 || customerPhone.length > 40) {
      return fail(400, {
        success: false,
        action: "create",
        message: "E-mail ou telefone do cliente excede o tamanho permitido.",
      });
    }

    if (!queueId) {
      return fail(400, {
        success: false,
        action: "create",
        message: "Selecione uma fila de atendimento.",
      });
    }

    if (!isTicketPriority(priority)) {
      return fail(400, {
        success: false,
        action: "create",
        message: "Prioridade inválida.",
      });
    }

    try {
      const ticket = await createManualTicket(session.user.id, permissions, {
        subject,
        message,
        priority,
        customerName,
        customerEmail,
        customerPhone,
        organizationName,
        queueId,
      });

      throw redirect(303, `/app/tickets/${ticket.id}`);
    } catch (cause) {
      if (
        cause &&
        typeof cause === "object" &&
        "status" in cause &&
        cause.status === 303
      ) {
        throw cause;
      }

      return fail(409, {
        success: false,
        action: "create",
        message: "Não foi possível criar o ticket. Verifique a fila e tente novamente.",
      });
    }
  },
};
