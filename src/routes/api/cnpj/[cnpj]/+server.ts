import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params, fetch }) => {
  const cnpj = (params.cnpj ?? "").replace(/\D+/g, "");

  if (cnpj.length !== 14) {
    throw error(400, "CNPJ inválido (use 14 dígitos).");
  }

  const upstream = await fetch(`https://publica.cnpj.ws/cnpj/${cnpj}`, {
    headers: { Accept: "application/json" }
  });

  if (upstream.status === 429) {
    throw error(429, "Muitas requisições (limite da API pública).");
  }

  if (upstream.status === 404) {
    throw error(404, "CNPJ não encontrado.");
  }

  if (!upstream.ok) {
    throw error(upstream.status, "Falha ao consultar CNPJ.");
  }

  const data = await upstream.json();

  return json(data, {
    headers: {
      // Cache ajuda MUITO por causa de limite em API pública
      "Cache-Control": "public, max-age=21600"
    }
  });
};
