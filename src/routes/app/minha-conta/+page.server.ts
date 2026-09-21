import { fail, redirect, type Actions, type Cookies } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import {
  changeUserEmail,
  changeUserPassword,
  getUserAccount,
  replaceUserAvatar,
  updateUserName,
} from "$lib/server/account/userAccountRepository";
import { getSessionUser, SESSION_COOKIE_NAME } from "$lib/server/auth/session";
import { getAssetStorageStatus } from "$lib/server/storage/assetStorage";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

async function requireSession(cookies: Cookies, returnTo = "/app/minha-conta") {
  const token = cookies.get(SESSION_COOKIE_NAME);
  if (!token) throw redirect(303, `/login?returnTo=${encodeURIComponent(returnTo)}`);
  const session = await getSessionUser(token);
  if (!session) {
    cookies.delete(SESSION_COOKIE_NAME, { path: "/" });
    throw redirect(303, `/login?returnTo=${encodeURIComponent(returnTo)}`);
  }
  return session;
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readRawString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function isValidEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isStrongEnoughPassword(value: string): boolean {
  return value.length >= 12 && value.length <= 200 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

function detectAvatar(bytes: Uint8Array): { contentType: string; extension: string } | null {
  const png = bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  if (png) return { contentType: "image/png", extension: "png" };

  const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (jpeg) return { contentType: "image/jpeg", extension: "jpg" };

  const webp = bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (webp) return { contentType: "image/webp", extension: "webp" };

  return null;
}

export const load: PageServerLoad = async ({ cookies }) => {
  const session = await requireSession(cookies);
  const account = await getUserAccount(session.user.id);
  return {
    account: {
      id: account.id,
      name: account.name,
      email: account.email,
      hasAvatar: Boolean(account.avatarKey),
    },
    avatarStorageConfigured: getAssetStorageStatus().configured,
  };
};

export const actions: Actions = {
  name: async ({ cookies, request }) => {
    const session = await requireSession(cookies);
    const formData = await request.formData();
    const name = readString(formData, "name");
    if (name.length < 2 || name.length > 120) {
      return fail(400, { success: false, action: "name", message: "Informe um nome entre 2 e 120 caracteres." });
    }

    try {
      await updateUserName(session.user.id, name);
      return { success: true, action: "name", message: "Nome atualizado." };
    } catch {
      return fail(400, { success: false, action: "name", message: "Não foi possível atualizar o nome." });
    }
  },

  email: async ({ cookies, request }) => {
    const session = await requireSession(cookies);
    const formData = await request.formData();
    const email = readString(formData, "email").toLowerCase();
    const currentPassword = readRawString(formData, "currentPassword");

    if (!isValidEmail(email) || !currentPassword) {
      return fail(400, { success: false, action: "email", message: "Revise o e-mail e informe sua senha atual." });
    }

    try {
      await changeUserEmail(session.user.id, session.sessionId, currentPassword, email);
      return { success: true, action: "email", message: "E-mail atualizado. As outras sessões foram encerradas." };
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "";
      if (code === "CURRENT_PASSWORD_INVALID") {
        return fail(400, { success: false, action: "email", message: "A senha atual está incorreta." });
      }
      if (code === "EMAIL_ALREADY_USED") {
        return fail(409, { success: false, action: "email", message: "Este e-mail já está em uso." });
      }
      return fail(400, { success: false, action: "email", message: "Não foi possível atualizar o e-mail." });
    }
  },

  password: async ({ cookies, request }) => {
    const session = await requireSession(cookies);
    const formData = await request.formData();
    const currentPassword = readRawString(formData, "currentPassword");
    const newPassword = readRawString(formData, "newPassword");
    const confirmPassword = readRawString(formData, "confirmPassword");

    if (!currentPassword || !isStrongEnoughPassword(newPassword)) {
      return fail(400, {
        success: false,
        action: "password",
        message: "A nova senha deve ter pelo menos 12 caracteres, com letras e números.",
      });
    }
    if (newPassword !== confirmPassword) {
      return fail(400, { success: false, action: "password", message: "A confirmação da nova senha não confere." });
    }

    try {
      await changeUserPassword(session.user.id, session.sessionId, currentPassword, newPassword);
      return { success: true, action: "password", message: "Senha atualizada. As outras sessões foram encerradas." };
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "";
      if (code === "CURRENT_PASSWORD_INVALID") {
        return fail(400, { success: false, action: "password", message: "A senha atual está incorreta." });
      }
      if (code === "PASSWORD_UNCHANGED") {
        return fail(400, { success: false, action: "password", message: "A nova senha precisa ser diferente da atual." });
      }
      return fail(400, { success: false, action: "password", message: "Não foi possível atualizar a senha." });
    }
  },

  avatar: async ({ cookies, request }) => {
    const session = await requireSession(cookies);
    if (!getAssetStorageStatus().configured) {
      return fail(503, { success: false, action: "avatar", message: "O armazenamento de avatares ainda não está configurado." });
    }

    const formData = await request.formData();
    const file = formData.get("avatar");
    if (!(file instanceof File) || file.size < 1 || file.size > MAX_AVATAR_BYTES) {
      return fail(400, { success: false, action: "avatar", message: "Envie uma imagem JPG, PNG ou WebP de até 2 MB." });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const detected = detectAvatar(bytes);
    if (!detected) {
      return fail(400, { success: false, action: "avatar", message: "Formato de imagem inválido. Use JPG, PNG ou WebP." });
    }

    try {
      await replaceUserAvatar(session.user.id, bytes, detected.contentType, detected.extension);
      return { success: true, action: "avatar", message: "Avatar atualizado." };
    } catch {
      return fail(503, { success: false, action: "avatar", message: "Não foi possível armazenar o avatar." });
    }
  },
};
