import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import {
  getServiceRequestEmailSettings,
  updateServiceRequestEmailRecipients,
} from "$lib/server/serviceRequests/serviceRequestEmailSettings";

function readRecipients(formData: FormData, key: string): string[] {
  const values = formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
  const unique = Array.from(new Set(values));
  if (unique.length > 100) throw new Error("SERVICE_REQUEST_EMAIL_RECIPIENT_LIMIT");
  if (unique.some((value) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))) {
    throw new Error("SERVICE_REQUEST_EMAIL_RECIPIENT_INVALID");
  }
  return unique;
}

export const load: PageServerLoad = async ({ cookies }) => {
  await requireAppPermission(cookies, "system.settings.manage", "/app/settings/tickets");
  const settings = await getServiceRequestEmailSettings();
  return {
    nfse: settings.find((setting) => setting.requestType === "nfse")!,
    cellCoin: settings.find((setting) => setting.requestType === "cell_coin")!,
  };
};

export const actions: Actions = {
  saveNotifications: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(
      cookies,
      "system.settings.manage",
      "/app/settings/tickets",
    );

    try {
      const formData = await request.formData();
      await updateServiceRequestEmailRecipients(session.user.id, {
        nfse: readRecipients(formData, "nfseRecipientUserId"),
        cell_coin: readRecipients(formData, "cellCoinRecipientUserId"),
      });
      return {
        success: true,
        action: "saveNotifications",
        message: "Notificações de tickets atualizadas.",
      };
    } catch {
      return fail(400, {
        success: false,
        action: "saveNotifications",
        message: "Não foi possível salvar. Revise as pessoas selecionadas.",
      });
    }
  },
};
