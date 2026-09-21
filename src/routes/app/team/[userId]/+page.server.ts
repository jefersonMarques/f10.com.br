import { error, fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import { regenerateManagedUserInvite } from "$lib/server/users/userInviteManagement";
import { sendManagedUserInviteEmail } from "$lib/server/users/userInviteMailer";
import { listAssignableAccessProfiles } from "$lib/server/users/accessProfileRepository";
import {
  getManagedUserDetails,
  setManagedUserProfile,
  setManagedUserStatus,
} from "$lib/server/users/userManagementRepository";
import {
  listUserSupportTeams,
  setManagedUserSupportTeamMembership,
} from "$lib/server/users/userSupportTeamRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f-]{36}$/i.test(value);
}

function readFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export const load: PageServerLoad = async ({ params, parent }) => {
  const layout = await parent();
  const permissionMap = new Map(
    layout.permissions.map((permission) => [permission.code, permission.scope]),
  );

  if (!hasPermission(permissionMap, "users.view")) {
    throw error(403, "Acesso não autorizado.");
  }
  if (!isUuid(params.userId)) throw error(404, "Usuário não encontrado.");

  try {
    const [details, supportTeams, accessProfiles] = await Promise.all([
      getManagedUserDetails(layout.user.id, layout.roles, params.userId),
      listUserSupportTeams(params.userId),
      listAssignableAccessProfiles(layout.user.id, layout.roles),
    ]);
    return {
      details,
      supportTeams,
      accessProfiles,
      canManage:
        hasPermission(permissionMap, "users.manage") &&
        layout.user.id !== params.userId &&
        accessProfiles.some((profile) => profile.code === details.roles[0]),
      isSelf: layout.user.id === params.userId,
    };
  } catch (cause) {
    if (cause instanceof Error && cause.message === "USER_NOT_MANAGEABLE") {
      throw error(403, "Este usuário não pode ser administrado pelo seu perfil.");
    }
    throw error(404, "Usuário não encontrado.");
  }
};

export const actions: Actions = {
  profile: async ({ cookies, params, request }) => {
    if (!isUuid(params.userId)) {
      return fail(404, { success: false, message: "Usuário não encontrado." });
    }
    const { session } = await requireAppPermission(
      cookies,
      "users.manage",
      `/app/team/${params.userId}`,
    );
    const roleCode = readFormValue(await request.formData(), "roleCode");
    if (!roleCode) {
      return fail(400, { success: false, message: "Selecione um perfil de acesso." });
    }

    try {
      await setManagedUserProfile(
        session.user.id,
        session.roles,
        params.userId,
        roleCode,
      );
      return { success: true, message: "Perfil de acesso atualizado." };
    } catch {
      return fail(403, {
        success: false,
        message: "Não foi possível atribuir este perfil ao usuário.",
      });
    }
  },

  supportTeam: async ({ cookies, params, request }) => {
    if (!isUuid(params.userId)) return fail(404, { success: false, message: "Usuário não encontrado." });
    const { session } = await requireAppPermission(cookies, "users.manage", `/app/team/${params.userId}`);
    const formData = await request.formData();
    const teamId = readFormValue(formData, "teamId");
    if (!isUuid(teamId)) return fail(400, { success: false, message: "Equipe inválida." });

    try {
      const included = formData.has("included");
      await setManagedUserSupportTeamMembership(
        session.user.id,
        session.roles,
        params.userId,
        teamId,
        included,
      );
      return {
        success: true,
        message: included ? "Área de atuação adicionada." : "Área de atuação removida.",
      };
    } catch {
      return fail(403, { success: false, message: "Não foi possível alterar esta área de atuação." });
    }
  },

  status: async ({ cookies, params, request }) => {
    if (!isUuid(params.userId)) return fail(404, { success: false, message: "Usuário não encontrado." });
    const { session } = await requireAppPermission(cookies, "users.manage", `/app/team/${params.userId}`);
    const requestedStatus = readFormValue(await request.formData(), "status");
    if (requestedStatus !== "active" && requestedStatus !== "inactive") {
      return fail(400, { success: false, message: "Status inválido." });
    }

    try {
      await setManagedUserStatus(session.user.id, session.roles, params.userId, requestedStatus);
      return {
        success: true,
        message: requestedStatus === "active" ? "Usuário reativado." : "Usuário desativado e sessões revogadas.",
      };
    } catch (cause) {
      const message = cause instanceof Error && cause.message === "USER_REQUIRES_ACTIVATION"
        ? "Este usuário ainda precisa concluir a ativação da conta."
        : "Não foi possível alterar o status deste usuário.";
      return fail(409, { success: false, message });
    }
  },

  regenerateInvite: async ({ cookies, params, url }) => {
    if (!isUuid(params.userId)) return fail(404, { success: false, message: "Usuário não encontrado." });
    const { session } = await requireAppPermission(cookies, "users.manage", `/app/team/${params.userId}`);

    try {
      const invitation = await regenerateManagedUserInvite(session.user.id, session.roles, params.userId);
      const inviteUrl = new URL(`/login/activate?token=${encodeURIComponent(invitation.token)}`, url.origin).toString();
      const emailSent = await sendManagedUserInviteEmail({
        email: invitation.user.email,
        name: invitation.user.name,
        inviteUrl,
        expiresAt: invitation.expiresAt,
      }).then(() => true).catch((cause) => {
        console.error("[user.invite.email.regenerated]", {
          userId: params.userId,
          errorCode: cause instanceof Error ? cause.message : "USER_INVITE_EMAIL_FAILED",
        });
        return false;
      });
      return {
        success: true,
        message: emailSent
          ? "Novo convite criado e enviado por e-mail."
          : "Novo link criado. O e-mail não foi enviado; copie o link abaixo.",
        inviteUrl,
        expiresAt: invitation.expiresAt.toISOString(),
      };
    } catch {
      return fail(409, { success: false, message: "Não foi possível gerar um novo convite para este usuário." });
    }
  },
};
