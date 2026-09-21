import { error, fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  createTeam as createManagedTeam,
  getTeamManagementSettings,
  updateTeam as updateManagedTeam,
} from "$lib/server/users/teamManagementRepository";
import { listAssignableAccessProfiles } from "$lib/server/users/accessProfileRepository";
import { sendManagedUserInviteEmail } from "$lib/server/users/userInviteMailer";
import {
  createManagedUserInvite,
  listManagedUsers,
  type ManagedRoleCode,
} from "$lib/server/users/userManagementRepository";

function readFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function readMemberUserIds(formData: FormData): string[] | null {
  const values = formData
    .getAll("memberUserId")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim());
  if (values.some((value) => !isUuid(value))) return null;
  return Array.from(new Set(values));
}

function isValidEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function teamErrorMessage(cause: unknown): string {
  const code = cause instanceof Error ? cause.message : "";
  if (code === "TEAM_NAME_ALREADY_EXISTS") return "Já existe uma equipe com este nome.";
  if (code === "TEAM_MEMBER_NOT_ELIGIBLE") return "Um ou mais integrantes não estão disponíveis para esta equipe.";
  if (code === "TEAM_IN_USE") return "Esta equipe está vinculada a uma fila ou área ativa e não pode ser desativada.";
  if (code === "TEAM_NOT_FOUND") return "Equipe não encontrada.";
  return "Não foi possível salvar a equipe.";
}

export const load: PageServerLoad = async ({ parent }) => {
  const layout = await parent();
  const permissionMap = new Map(
    layout.permissions.map((permission) => [permission.code, permission.scope]),
  );

  if (!hasPermission(permissionMap, "users.view")) {
    throw error(403, "Acesso não autorizado.");
  }

  const [managedUsers, teamManagement, accessProfiles] = await Promise.all([
    listManagedUsers(layout.roles),
    getTeamManagementSettings(),
    listAssignableAccessProfiles(layout.user.id, layout.roles),
  ]);

  return {
    users: managedUsers,
    teamManagement,
    accessProfiles,
    canManage: hasPermission(permissionMap, "users.manage"),
    canManageTeams: hasPermission(permissionMap, "system.settings.manage"),
    canCreateAdmin: layout.roles.includes("SUPER_ADMIN"),
  };
};

export const actions: Actions = {
  createTeam: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(
      cookies,
      "system.settings.manage",
      "/app/team",
    );
    const formData = await request.formData();
    const name = readFormValue(formData, "name");
    const memberUserIds = readMemberUserIds(formData);
    if (name.length < 2 || name.length > 80 || !memberUserIds) {
      return fail(400, {
        success: false,
        action: "createTeam",
        message: "Informe um nome válido e revise os integrantes da equipe.",
      });
    }

    try {
      await createManagedTeam(session.user.id, { name, memberUserIds });
      return {
        success: true,
        action: "createTeam",
        message: "Equipe criada. Agora ela pode ser vinculada às filas de atendimento.",
      };
    } catch (cause) {
      return fail(400, {
        success: false,
        action: "createTeam",
        message: teamErrorMessage(cause),
      });
    }
  },

  updateTeam: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(
      cookies,
      "system.settings.manage",
      "/app/team",
    );
    const formData = await request.formData();
    const teamId = readFormValue(formData, "teamId");
    const name = readFormValue(formData, "name");
    const memberUserIds = readMemberUserIds(formData);
    if (!isUuid(teamId) || name.length < 2 || name.length > 80 || !memberUserIds) {
      return fail(400, {
        success: false,
        action: "updateTeam",
        message: "Revise os dados da equipe.",
      });
    }

    try {
      await updateManagedTeam(session.user.id, teamId, {
        name,
        active: formData.has("active"),
        memberUserIds,
      });
      return {
        success: true,
        action: "updateTeam",
        message: "Equipe atualizada.",
      };
    } catch (cause) {
      return fail(400, {
        success: false,
        action: "updateTeam",
        message: teamErrorMessage(cause),
      });
    }
  },

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
    const roleCode: ManagedRoleCode = requestedRole || "EMPLOYEE";
    const values = {
      name,
      email,
      roleCode,
      includeInChatRouting: formData.has("includeInChatRouting"),
    };

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
      const emailSent = await sendManagedUserInviteEmail({
        email: invitation.user.email,
        name: invitation.user.name,
        inviteUrl,
        expiresAt: invitation.expiresAt,
      }).then(() => true).catch((cause) => {
        console.error("[user.invite.email]", {
          userId: invitation.user.id,
          errorCode: cause instanceof Error ? cause.message : "USER_INVITE_EMAIL_FAILED",
        });
        return false;
      });

      return {
        success: true,
        message: emailSent
          ? "Usuário criado e convite enviado por e-mail."
          : "Usuário criado. O e-mail não foi enviado; copie o link de ativação abaixo.",
        inviteUrl,
        invitedUserName: invitation.user.name,
        expiresAt: invitation.expiresAt.toISOString(),
      };
    } catch (cause) {
      const message =
        cause instanceof Error && cause.message === "EMAIL_ALREADY_EXISTS"
          ? "Já existe um usuário cadastrado com este e-mail."
          : cause instanceof Error && cause.message === "CHAT_ROUTING_PERMISSION_REQUIRED"
            ? "Este perfil não pode participar da distribuição do chat."
            : "Não foi possível criar o usuário com o perfil informado.";

      return fail(409, {
        success: false,
        message,
        values,
      });
    }
  },
};
