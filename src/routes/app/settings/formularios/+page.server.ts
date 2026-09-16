import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import {
  getServiceRequestEmailSettings,
  updateServiceRequestEmailRecipients,
} from "$lib/server/serviceRequests/serviceRequestEmailSettings";

function readRecipient(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string" || !value.trim()) return null;
  const recipientUserId = value.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(recipientUserId)) {
    throw new Error("SERVICE_REQUEST_EMAIL_RECIPIENT_INVALID");
  }
  return recipientUserId;
}

export const load: PageServerLoad = async ({ cookies }) => {
  await requireAppPermission(cookies, "system.settings.manage", "/app/settings/formularios");
  const settings = await getServiceRequestEmailSettings();
  return {
    nfse: settings.find((setting) => setting.requestType === "nfse")!,
    cellCoin: settings.find((setting) => setting.requestType === "cell_coin")!,
  };
};

export const actions: Actions = {
  save: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(
      cookies,
      "system.settings.manage",
      "/app/settings/formularios",
    );

    try {
      const formData = await request.formData();
      await updateServiceRequestEmailRecipients(session.user.id, {
        nfse: readRecipient(formData, "nfseRecipientUserId"),
        cell_coin: readRecipient(formData, "cellCoinRecipientUserId"),
      });
      return {
        success: true,
        action: "save",
        message: "Destinatários dos formulários atualizados.",
      };
    } catch {
      return fail(400, {
        success: false,
        action: "save",
        message: "Selecione uma pessoa ativa da equipe responsável por cada formulário.",
      });
    }
  },
};
