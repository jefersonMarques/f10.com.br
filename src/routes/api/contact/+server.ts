// src/routes/api/contact/+server.ts
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
  const data = await request.json().catch(() => null);

  // Validação básica no servidor (sempre valide no back!)
  if (!data?.name || !data?.email || !data?.phone || !data?.company || !data?.message) {
    return new Response("Dados obrigatórios ausentes.", { status: 400 });
  }

  // TODO: persistir no banco, enviar e-mail, acionar n8n, etc.
  // Exemplo: await fetch("https://n8n....", { method:"POST", body: JSON.stringify(data) });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
