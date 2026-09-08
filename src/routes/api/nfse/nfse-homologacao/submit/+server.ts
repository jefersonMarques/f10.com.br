import type { RequestHandler } from "./$types";
import { handleLegacyServiceRequestSubmission } from "$lib/server/serviceRequests/legacyServiceRequestAdapter";

export const POST: RequestHandler = async ({ request, cookies, url, getClientAddress }) => {
  return handleLegacyServiceRequestSubmission({
    request,
    cookies,
    url,
    clientAddress: getClientAddress(),
    requestType: "nfse",
  });
};
