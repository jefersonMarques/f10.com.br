// src/routes/api/whatsapp-lead/+server.ts
import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import {
  buildAbsoluteSource,
  isValidBrazilPhone,
  normalizePhone,
  processLead,
  safeString,
  type BaseLead,
} from "$lib/server/leads/lead-service";

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => null);

  const name = safeString(body?.name);
  const phone = normalizePhone(safeString(body?.phone));
  const requestOrigin = new URL(request.url).origin;
  const source = buildAbsoluteSource(
    safeString(body?.source) || "floating_whatsapp_button",
    requestOrigin,
  );

  const product = safeString(body?.product) || undefined;
  const subSource = safeString(body?.subSource) || undefined;
  const description = safeString(body?.description) || undefined;
  const schoolName = safeString(body?.schoolName) || undefined;

  if (!name || !isValidBrazilPhone(phone)) {
    return json(
      {
        ok: false,
        error:
          "Nome e telefone são obrigatórios. Envie um número de WhatsApp válido com DDD.",
      },
      { status: 400 },
    );
  }

  const lead: BaseLead = {
    name,
    phone,
    source,
    product,
    subSource,
    description,
    schoolName,
    createdAt: new Date().toISOString(),
  };

  const result = await processLead("whatsapp", lead);

  return json({
    ok: true,
    f10: result.f10,
    exactSales: result.exact,
    f10Result: result.f10Result,
    exactResult: result.exactResult,
  });
};
