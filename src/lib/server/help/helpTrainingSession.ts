import { dev } from "$app/environment";
import type { Cookies } from "@sveltejs/kit";

export const HELP_TRAINING_SESSION_COOKIE = "f10_training_session";
export const HELP_TRAINING_INVITE_COOKIE = "f10_training_invite";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const INVITE_STAGING_MAX_AGE_SECONDS = 15 * 60;

export function setHelpTrainingSessionCookie(
  cookies: Cookies,
  token: string,
  expiresAt: Date,
): void {
  const maxAge = Math.max(
    60,
    Math.min(SESSION_MAX_AGE_SECONDS, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
  );
  cookies.set(HELP_TRAINING_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: !dev,
    path: "/treinamento",
    maxAge,
  });
}

export function getHelpTrainingSessionCookie(cookies: Cookies): string {
  return cookies.get(HELP_TRAINING_SESSION_COOKIE)?.trim() ?? "";
}

export function clearHelpTrainingSessionCookie(cookies: Cookies): void {
  cookies.delete(HELP_TRAINING_SESSION_COOKIE, { path: "/treinamento" });
}

export function setHelpTrainingInviteCookie(cookies: Cookies, token: string): void {
  cookies.set(HELP_TRAINING_INVITE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: !dev,
    path: "/treinamento",
    maxAge: INVITE_STAGING_MAX_AGE_SECONDS,
  });
}

export function getHelpTrainingInviteCookie(cookies: Cookies): string {
  return cookies.get(HELP_TRAINING_INVITE_COOKIE)?.trim() ?? "";
}

export function clearHelpTrainingInviteCookie(cookies: Cookies): void {
  cookies.delete(HELP_TRAINING_INVITE_COOKIE, { path: "/treinamento" });
}
