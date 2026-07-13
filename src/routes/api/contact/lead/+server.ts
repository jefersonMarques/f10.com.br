// src/routes/api/contact/lead/+server.ts
import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import {
  buildAbsoluteSource,
  isValidBrazilPhone,
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
  const message = safeString(body?.message);

  const schoolName = safeString(body?.schoolName) || undefined;
  const requestOrigin = new URL(request.url).origin;
  const source = buildAbsoluteSource(safeString(body?.source) || "/", requestOrigin);
  const page = safeString(body?.page) || undefined;
  const product = safeString(body?.product) || undefined;
  const subSource = safeString(body?.subSource) || undefined;
  const description = safeString(body?.description) || undefined;
  const createdAt = safeString(body?.createdAt) || new Date().toISOString();

  if (!name) {
    return json({ ok: false, error: "Nome é obrigatório." }, { status: 400 });
  }

  if (!isValidBrazilPhone(phone)) {
    return json({ ok: false, error: "WhatsApp com DDD é obrigatório." }, { status: 400 });
  }

  if (!email || !isValidEmail(email)) {
    return json({ ok: false, error: "E-mail válido é obrigatório." }, { status: 400 });
  }

  if (!message) {
    return json({ ok: false, error: "Mensagem é obrigatória." }, { status: 400 });
  }

  const lead: BaseLead = {
    name,
    phone,
    email,
    message,
    schoolName,
    source,
    page,
    product,
    subSource,
    description,
    createdAt,
  };

  const result = await processLead("contact", lead);

  return json({
    ok: true,
    email: true,
    f10: result.f10,
    exact: result.exact,
    f10Result: result.f10Result,
    exactResult: result.exactResult,
  });
};
