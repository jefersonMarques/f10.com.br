// src/routes/api/contact-modal/+server.ts
import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import {
  buildAbsoluteSource,
  isValidEmail,
  normalizePhone,
  processLead,
  safeString,
  type BaseLead,
} from "$lib/server/leads/lead-service";

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => null);

  const name = safeString(body?.name);
  const phone = normalizePhone(safeString(body?.phone));
  const email = safeString(body?.email);
  const schoolName = safeString(body?.schoolName) || undefined;

  const requestOrigin = new URL(request.url).origin;
  const source = buildAbsoluteSource(safeString(body?.source) || "/", requestOrigin);
  const page = safeString(body?.page) || undefined;
  const product = safeString(body?.product) || undefined;
  const subSource = safeString(body?.subSource) || undefined;
  const description = safeString(body?.description) || undefined;

  if (!name || phone.length < 10 || !isValidEmail(email)) {
    return json(
      {
        ok: false,
        error: "Nome, e-mail válido e WhatsApp com DDD são obrigatórios.",
      },
      { status: 400 },
    );
  }

  const lead: BaseLead = {
    name,
    phone,
    email,
    schoolName,
    source,
    page,
    product,
    subSource,
    description,
    createdAt: new Date().toISOString(),
  };

  const result = await processLead("contact-modal", lead);

  return json({
    ok: true,
    f10: result.f10,
    exactSales: result.exact,
    f10Result: result.f10Result,
    exactResult: result.exactResult,
  });
};