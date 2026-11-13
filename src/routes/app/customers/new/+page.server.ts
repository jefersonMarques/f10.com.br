import { error, fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import { createManualCustomerContact } from "$lib/server/support/customerContactManagementRepository";

export const load: PageServerLoad = async ({ parent }) => {
  const layout = await parent();
  const permissions = new Map(layout.permissions.map((item) => [item.code, item.scope]));
  if (!hasPermission(permissions, "customers.manage", "all")) {
    throw error(403, "Acesso não autorizado.");
  }
  return {};
};

export const actions: Actions = {
  default: async ({ cookies, request }) => {
    const { permissions } = await requireAppPermission(
      cookies, "customers.manage", "/app/customers/new",
    );
    if (!hasPermission(permissions, "customers.manage", "all")) {
      throw error(403, "Acesso não autorizado.");
    }
    const form = await request.formData();
    const field = (name: string): string => String(form.get(name) ?? "").trim();
    try {
      const id = await createManualCustomerContact({
        name: field("name"),
        email: field("email"),
        phone: field("phone"),
        whatsapp: field("whatsapp"),
      });
      throw redirect(303, "/app/customers/" + id);
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) {
        throw cause;
      }
      const code = cause instanceof Error ? cause.message : "";
      return fail(400, {
        message: code === "CUSTOMER_EMAIL_ALREADY_REGISTERED"
          ? "Já existe uma pessoa com este e-mail. Abra o cadastro existente."
          : "Revise nome, e-mail e contatos antes de salvar.",
      });
    }
  },
};