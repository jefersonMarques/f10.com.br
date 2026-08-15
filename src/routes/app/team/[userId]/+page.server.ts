import { error, fail, type Actions, type PageServerLoad } from "@sveltejs/kit";
import { requireAppPermission } from "$lib/server/auth/authorization";
import {
  PERMISSION_CODES,
  hasPermission,
  type PermissionCode,
  type PermissionScope,
} from "$lib/server/auth/permissions";
import {
  getManagedUserDetails,
  setManagedUserPermission,
  setManagedUserStatus,
  type UserPermissionEffect,
} from "$lib/server/users/userManagementRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f-]{36}$/i.test(value);
}

function readFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isPermissionCode(value: string): value is PermissionCode {
  return (PERMISSION_CODES as readonly string[]).includes(value);
}

function isPermissionScope(value: string): value is PermissionScope {
  return value === "own" || value === "team" || value === "all";
}

function isPermissionEffect(
  value: string,
): value is UserPermissionEffect | "inherit" {
  return value === "inherit" || value === "allow" || value === "deny";
}

export const load: PageServerLoad = async ({ params, parent }) => {
  const layout = await parent();
  const permissionMap = new Map(
    layout.permissions.map((permission) => [permission.code, permission.scope]),
  );

  if (!hasPermission(permissionMap, "users.view")) {
    throw error(403, "Acesso não autorizado.");
  }

  if (!isUuid(params.userId)) {
    throw error(404, "Usuário não encontrado.");
  }

  try {
    return {
      details: await getManagedUserDetails(
        layout.user.id,
        layout.roles,
        params.userId,
      ),
      canManage: hasPermission(permissionMap, "users.manage"),
    };
  } catch (cause) {
    if (cause instanceof Error && cause.message === "USER_NOT_MANAGEABLE") {
      throw error(403, "Este usuário não pode ser administrado pelo seu perfil.");
    }

    throw error(404, "Usuário não encontrado.");
  }
};

export const actions: Actions = {
  permission: async ({ cookies, params, request }) => {
    if (!isUuid(params.userId)) {
      return fail(404, { success: false, message: "Usuário não encontrado." });
    }

    const { session } = await requireAppPermission(
      cookies,
      "users.manage",
      `/app/team/${params.userId}`,
    );
    const formData = await request.formData();
    const permissionCode = readFormValue(formData, "permissionCode");
    const effect = readFormValue(formData, "effect");
    const scope = readFormValue(formData, "scope");

    if (
      !isPermissionCode(permissionCode) ||
      !isPermissionEffect(effect) ||
      !isPermissionScope(scope)
    ) {
      return fail(400, {
        success: false,
        message: "Configuração de permissão inválida.",
      });
    }

    try {
      await setManagedUserPermission(
        session.user.id,
        session.roles,
        params.userId,
        permissionCode,
        effect,
        scope,
      );

      return {
        success: true,
        message: "Permissão atualizada.",
      };
    } catch (cause) {
      const message =
        cause instanceof Error && cause.message === "SCOPE_NOT_DELEGABLE"
          ? "Você não pode conceder um escopo maior que o seu próprio acesso."
          : cause instanceof Error &&
              cause.message === "PERMISSION_NOT_DELEGABLE"
            ? "Você não pode delegar uma permissão que não possui."
            : "Não foi possível alterar esta permissão.";

      return fail(403, { success: false, message });
    }
  },

  status: async ({ cookies, params, request }) => {
    if (!isUuid(params.userId)) {
      return fail(404, { success: false, message: "Usuário não encontrado." });
    }

    const { session } = await requireAppPermission(
      cookies,
      "users.manage",
      `/app/team/${params.userId}`,
    );
    const formData = await request.formData();
    const requestedStatus = readFormValue(formData, "status");

    if (requestedStatus !== "active" && requestedStatus !== "inactive") {
      return fail(400, { success: false, message: "Status inválido." });
    }

    try {
      await setManagedUserStatus(
        session.user.id,
        session.roles,
        params.userId,
        requestedStatus,
      );

      return {
        success: true,
        message:
          requestedStatus === "active"
            ? "Usuário reativado."
            : "Usuário desativado e sessões revogadas.",
      };
    } catch (cause) {
      const message =
        cause instanceof Error &&
        cause.message === "INVITED_USER_REQUIRES_ACTIVATION"
          ? "O usuário precisa concluir o link de ativação para ficar ativo."
          : "Não foi possível alterar o status deste usuário.";

      return fail(409, { success: false, message });
    }
  },
};
