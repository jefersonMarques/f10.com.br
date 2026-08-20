import { error, fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  createCustomerRelatedContact,
  getCustomerDirectoryDetails,
  updateCustomerDirectory,
} from "$lib/server/support/customerDirectoryRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function readFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function validContactFields(name: string, email: string, phone: string, whatsapp: string): boolean {
  return (
    name.length >= 2 &&
    name.length <= 120 &&
    email.length <= 254 &&
    phone.length <= 40 &&
    whatsapp.length <= 40
  );
}

export const load: PageServerLoad = async ({ params, parent }) => {
  if (!isUuid(params.customerId)) throw error(404, "Cliente não encontrado.");
  const layout = await parent();
  const permissions = new Map(
    layout.permissions.map((permission) => [permission.code, permission.scope]),
  );
  if (!hasPermission(permissions, "customers.view")) {
    throw error(403, "Acesso não autorizado.");
  }

  try {
    return await getCustomerDirectoryDetails(layout.user.id, permissions, params.customerId);
  } catch {
    throw error(404, "Cliente não encontrado ou fora do seu escopo de acesso.");
  }
};

export const actions: Actions = {
  update: async ({ cookies, params, request }) => {
    if (!isUuid(params.customerId)) {
      return fail(404, { success: false, action: "update", message: "Cliente não encontrado." });
    }
    const { session, permissions } = await requireAppPermission(
      cookies,
      "customers.manage",
      `/app/customers/${params.customerId}`,
    );
    const formData = await request.formData();
    const name = readFormValue(formData, "name");
    const email = readFormValue(formData, "email").toLowerCase();
    const phone = readFormValue(formData, "phone");
    const whatsapp = readFormValue(formData, "whatsapp");
    const organizationName = readFormValue(formData, "organizationName");
    const organizationDocument = readFormValue(formData, "organizationDocument");

    if (
      !validContactFields(name, email, phone, whatsapp) ||
      organizationName.length > 160 ||
      organizationDocument.length > 80
    ) {
      return fail(400, {
        success: false,
        action: "update",
        message: "Revise nome, contatos e dados da escola/organização.",
      });
    }

    try {
      await updateCustomerDirectory(session.user.id, permissions, params.customerId, {
        name,
        email,
        phone,
        whatsapp,
        active: formData.get("active") === "on",
        organizationName,
        organizationDocument,
      });
      return { success: true, action: "update", message: "Cadastro do cliente atualizado." };
    } catch {
      return fail(403, {
        success: false,
        action: "update",
        message: "Não foi possível atualizar este cliente.",
      });
    }
  },

  createContact: async ({ cookies, params, request }) => {
    if (!isUuid(params.customerId)) {
      return fail(404, { success: false, action: "createContact", message: "Cliente não encontrado." });
    }
    const { session, permissions } = await requireAppPermission(
      cookies,
      "customers.manage",
      `/app/customers/${params.customerId}`,
    );
    const formData = await request.formData();
    const name = readFormValue(formData, "name");
    const email = readFormValue(formData, "email").toLowerCase();
    const phone = readFormValue(formData, "phone");
    const whatsapp = readFormValue(formData, "whatsapp");
    if (!validContactFields(name, email, phone, whatsapp)) {
      return fail(400, {
        success: false,
        action: "createContact",
        message: "Revise os dados do novo contato.",
      });
    }

    try {
      await createCustomerRelatedContact(session.user.id, permissions, params.customerId, {
        name,
        email,
        phone,
        whatsapp,
      });
      return { success: true, action: "createContact", message: "Contato adicionado à organização." };
    } catch (cause) {
      const message = cause instanceof Error && cause.message === "CUSTOMER_ORGANIZATION_REQUIRED"
        ? "Vincule primeiro uma escola/organização ao cliente."
        : cause instanceof Error && cause.message === "CUSTOMER_CONTACT_ALREADY_EXISTS"
          ? "Já existe um contato com este e-mail nesta organização."
          : "Não foi possível adicionar o contato.";
      return fail(409, { success: false, action: "createContact", message });
    }
  },
};
