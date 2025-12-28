import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url, fetch }) => {
  const cep = (url.searchParams.get("cep") ?? "").replace(/\D+/g, "");

  if (cep.length !== 8) {
    throw error(400, "CEP inválido (use 8 dígitos).");
  }

  const upstream = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
    headers: { Accept: "application/json" }
  });

  if (!upstream.ok) {
    throw error(upstream.status, "Falha ao consultar CEP.");
  }

  const data = await upstream.json();

  // ViaCEP retorna { erro: true } quando não encontra
  if (data?.erro) {
    throw error(404, "CEP não encontrado.");
  }

  return json(data, {
    headers: {
      "Cache-Control": "public, max-age=86400"
    }
  });
};
