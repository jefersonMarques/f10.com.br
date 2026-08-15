import { error, fail, type Actions, type PageServerLoad } from "@sveltejs/kit";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  createManagedUserInvite,
  listManagedUsers,
  type ManagedRoleCode,
} from "$lib/server/users/userManagementRepository";

function readFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export const load: PageServerLoad = async ({ parent }) => {
  const layout = await parent();
  const permissionMap = new Map(
    layout.permissions.map((permission) => [permission.code, permission.scope]),
  );

  if (!hasPermission(permissionMap, "users.view")) {
    throw error(403, "Acesso não autorizado.");
  }

  return {
    users: await listManagedUsers(layout.roles),
    canManage: hasPermission(permissionMap, "users.manage"),
    canCreateAdmin: layout.roles.includes("SUPER_ADMIN"),
  };
};

export const actions: Actions = {
  invite: async ({ cookies, request, url }) => {
    const { session } = await requireAppPermission(
      cookies,
      "users.manage",
      "/app/team",
    );
    const formData = await request.formData();
    const name = readFormValue(formData, "name");
    const email = readFormValue(formData, "email").toLowerCase();
    const requestedRole = readFormValue(formData, "roleCode");
    const roleCode: ManagedRoleCode =
      requestedRole === "ADMIN" ? "ADMIN" : "EMPLOYEE";
    const values = { name, email, roleCode };

    if (name.length < 2 || name.length > 120) {
      return fail(400, {
        success: false,
        message: "Informe um nome entre 2 e 120 caracteres.",
        values,
      });
    }

    if (!isValidEmail(email)) {
      return fail(400, {
        success: false,
        message: "Informe um e-mail válido.",
        values,
      });
    }

    try {
      const invitation = await createManagedUserInvite(
        session.user.id,
        session.roles,
        values,
      );
      const inviteUrl = new URL(
        `/login/activate?token=${encodeURIComponent(invitation.token)}`,
        url.origin,
      ).toString();

      return {
        success: true,
        message: "Usuário criado. Envie o link de ativação abaixo ao novo integrante.",
        inviteUrl,
        invitedUserName: invitation.user.name,
        expiresAt: invitation.expiresAt.toISOString(),
      };
    } catch (cause) {
      const message =
        cause instanceof Error && cause.message === "EMAIL_ALREADY_EXISTS"
          ? "Já existe um usuário cadastrado com este e-mail."
          : "Não foi possível criar o usuário com o perfil informado.";

      return fail(409, {
        success: false,
        message,
        values,
      });
    }
  },
};
