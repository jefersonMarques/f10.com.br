import { error, type RequestHandler } from "@sveltejs/kit";
import { getOptionalCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import { getCustomerAvatarResponse } from "$lib/server/customerPortal/customerProfileRepository";

export const GET: RequestHandler = async ({ cookies }) => {
  const session = await getOptionalCustomerF10PortalSession(cookies, { touchActivity: false });
  if (!session) throw error(401, "Acesso não autorizado.");
  const avatar = await getCustomerAvatarResponse(session).catch(() => null);
  if (!avatar) throw error(404, "Foto não encontrada.");
  return avatar;
};
