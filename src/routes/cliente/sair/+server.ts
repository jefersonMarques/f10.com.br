import { redirect, type RequestHandler } from "@sveltejs/kit";
import { logoutCustomerPortal } from "$lib/server/customerPortal/customerPortalSession";

export const POST: RequestHandler = async ({ cookies }) => {
  await logoutCustomerPortal(cookies);
  throw redirect(303, "/cliente");
};
