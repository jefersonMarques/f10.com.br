import { env } from "$env/dynamic/public";

export type SiteSupportChatProvider = "movidesk" | "f10";

export const supportChatClientId = "F907BBDD336B4365A1CE3C5176E1C082";
export const supportChatUrl = `https://chat.movidesk.com/ChatWidget/index/${supportChatClientId}`;

const configuredProvider = env.PUBLIC_SITE_SUPPORT_CHAT_PROVIDER?.trim().toLowerCase();

export const siteSupportChatProvider: SiteSupportChatProvider =
  configuredProvider === "f10" ? "f10" : "movidesk";
