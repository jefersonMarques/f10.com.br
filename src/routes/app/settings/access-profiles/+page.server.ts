import { error, fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission, type PermissionScope } from "$lib/server/auth/permissions";
import {
  createAccessProfile,
  listAccessProfiles,
  listPermissionCatalog,
  updateAccessProfile,
  type AccessProfileGrant,
} from "$lib/server/users/accessProfileRepository";

function readText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function readScope(value: FormDataEntryValue | null): PermissionScope {
  return value === "team" || value === "all" ? value : "own";
}

function profileMessage(cause: unknown): string {
  const code = cause instanceof Error ? cause.message : "";
  if (code === "ACCESS_PROFILE_NAME_INVALID") return "Informe um nome entre 2 e 80 caracteres.";
  if (code === "ACCESS_PROFILE_NAME_EXISTS") return "Já existe um perfil com este nome.";
  if (code === "ACCESS_PROFILE_SUPER_ADMIN_READ_ONLY") return "O perfil Super Admin é protegido e não pode ser alterado.";
  if (code === "ACCESS_PROFILE_FULL_ACCESS_RESERVED") return "Acesso total é reservado ao Super Admin. Remova ao menos uma permissão ou reduza um escopo.";
  if (code === "ACCESS_PROFILE_PERMISSION_NOT_DELEGABLE") return "O perfil não pode receber um acesso maior que o seu.";
  return "Não foi possível salvar o perfil.";
}

export const load: PageServerLoad = async ({ parent }) => {
  const layout = await parent();
  const permissionMap = new Map(layout.permissions.map((permission) => [permission.code, permission.scope]));
  if (!hasPermission(permissionMap, "roles.manage")) throw error(403, "Acesso não autorizado.");

  const [profiles, permissionCatalog] = await Promise.all([
    listAccessProfiles(),
    listPermissionCatalog(),
  ]);

  return { profiles, permissionCatalog };
};

export const actions: Actions = {
  create: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(
      cookies,
      "roles.manage",
      "/app/settings/access-profiles",
    );
    const name = readText(await request.formData(), "name");

    try {
      const profileId = await createAccessProfile(session.user.id, name);
      return {
        success: true,
        action: "create",
        profileId,
        message: "Perfil criado.",
      };
    } catch (cause) {
      return fail(400, {
        success: false,
        action: "create",
        message: profileMessage(cause),
      });
    }
  },

  update: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(
      cookies,
      "roles.manage",
      "/app/settings/access-profiles",
    );
    const formData = await request.formData();
    const profileId = readText(formData, "profileId");
    const name = readText(formData, "name");
    if (!isUuid(profileId)) {
      return fail(400, { success: false, action: "update", message: "Perfil inválido." });
    }

    const grants: AccessProfileGrant[] = formData
      .getAll("permissionCode")
      .filter((value): value is string => typeof value === "string")
      .map((permissionCode) => ({
        permissionCode: permissionCode as AccessProfileGrant["permissionCode"],
        scope: readScope(formData.get(`scope:${permissionCode}`)),
      }));

    try {
      await updateAccessProfile(session.user.id, profileId, { name, grants });
      return {
        success: true,
        action: "update",
        profileId,
        message: "Perfil atualizado.",
      };
    } catch (cause) {
      return fail(400, {
        success: false,
        action: "update",
        profileId,
        message: profileMessage(cause),
      });
    }
  },
};
