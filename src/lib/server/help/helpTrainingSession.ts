import { dev } from "$app/environment";
import type { Cookies } from "@sveltejs/kit";

export const HELP_TRAINING_SESSION_COOKIE = "f10_training_session";
export const HELP_TRAINING_INVITE_COOKIE = "f10_training_invite";
export const HELP_TRAINING_PUBLIC_SESSION_COOKIE = "f10_training_public_session";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const PUBLIC_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const INVITE_STAGING_MAX_AGE_SECONDS = 15 * 60;

function sessionMaxAge(expiresAt: Date, limitSeconds: number): number {
  return Math.max(
    60,
    Math.min(limitSeconds, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
  );
}

export function setHelpTrainingSessionCookie(
  cookies: Cookies,
  token: string,
  expiresAt: Date,
): void {
  cookies.set(HELP_TRAINING_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: !dev,
    path: "/treinamento",
    maxAge: sessionMaxAge(expiresAt, SESSION_MAX_AGE_SECONDS),
  });
}

export function getHelpTrainingSessionCookie(cookies: Cookies): string {
  return cookies.get(HELP_TRAINING_SESSION_COOKIE)?.trim() ?? "";
}

export function clearHelpTrainingSessionCookie(cookies: Cookies): void {
  cookies.delete(HELP_TRAINING_SESSION_COOKIE, { path: "/treinamento" });
}

export function setHelpTrainingPublicSessionCookie(
  cookies: Cookies,
  token: string,
  expiresAt: Date,
): void {
  cookies.set(HELP_TRAINING_PUBLIC_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: !dev,
    path: "/treinamento",
    maxAge: sessionMaxAge(expiresAt, PUBLIC_SESSION_MAX_AGE_SECONDS),
  });
}

export function getHelpTrainingPublicSessionCookie(cookies: Cookies): string {
  return cookies.get(HELP_TRAINING_PUBLIC_SESSION_COOKIE)?.trim() ?? "";
}

export function clearHelpTrainingPublicSessionCookie(cookies: Cookies): void {
  cookies.delete(HELP_TRAINING_PUBLIC_SESSION_COOKIE, { path: "/treinamento" });
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
