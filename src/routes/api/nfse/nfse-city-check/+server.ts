// src/routes/api/nfse/nfse-city-check/+server.ts
import { json, type RequestHandler } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";

const DEFAULT_ACBR_API_BASE_URL = "https://hom.acbr.api.br";
const DEFAULT_ACBR_AUTH_URL =
  "https://auth.acbr.api.br/realms/ACBrAPI/protocol/openid-connect/token";
const DEFAULT_ACBR_SCOPES = "nfse";

type AcbrTokenCache = {
  accessToken: string;
  expiresAt: number;
};

type Municipality = {
  id: number;
  nome: string;
};

type CityAvailabilityResponse = {
  available: boolean;
  city: string;
  state: string;
  ibgeCode: string;
  provider: string;
  message: string;
  checkedAt: string;
  raw: Record<string, unknown> | null;
};

let tokenCache: AcbrTokenCache | null = null;

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getAcbrBaseUrl(): string {
  return (env.ACBR_API_BASE_URL || DEFAULT_ACBR_API_BASE_URL).replace(/\/+$/, "");
}

async function getAccessToken(): Promise<string> {
  const clientId = env.ACBR_CLIENT_ID;
  const clientSecret = env.ACBR_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Credenciais da ACBr API não configuradas. Defina ACBR_CLIENT_ID e ACBR_CLIENT_SECRET no .env.",
    );
  }

  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 30_000) {
    return tokenCache.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: env.ACBR_SCOPES || DEFAULT_ACBR_SCOPES,
  });

  const response = await fetch(env.ACBR_AUTH_URL || DEFAULT_ACBR_AUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Falha ao autenticar na ACBr API. Status ${response.status}. ${text}`.trim());
  }

  const data = await response.json();
  const accessToken = String(data.access_token || "");
  const expiresIn = Number(data.expires_in || 300);

  if (!accessToken) {
    throw new Error("A ACBr API não retornou access_token.");
  }

  tokenCache = {
    accessToken,
    expiresAt: now + Math.max(60, expiresIn - 30) * 1000,
  };

  return accessToken;
}

async function resolveMunicipality(city: string, state: string): Promise<Municipality | null> {
  const response = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(
      state,
    )}/municipios`,
  );

  if (!response.ok) {
    throw new Error("Não foi possível consultar municípios no IBGE.");
  }

  const municipalities = (await response.json()) as Municipality[];
  const normalizedCity = normalizeText(city);

  return (
    municipalities.find((municipality) => normalizeText(municipality.nome) === normalizedCity) ||
    municipalities.find((municipality) => normalizeText(municipality.nome).includes(normalizedCity)) ||
    null
  );
}

function extractCityCodes(payload: unknown): Set<string> {
  const codes = new Set<string>();
  const candidates = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: unknown[] })?.data)
      ? (payload as { data: unknown[] }).data
      : Array.isArray((payload as { cidades?: unknown[] })?.cidades)
        ? (payload as { cidades: unknown[] }).cidades
        : [];

  for (const item of candidates) {
    if (typeof item === "string" || typeof item === "number") {
      codes.add(String(item));
      continue;
    }

    if (!item || typeof item !== "object") continue;

    const record = item as Record<string, unknown>;
    const code =
      record.codigo_ibge ||
      record.codigoIbge ||
      record.ibge ||
      record.codigo_municipio ||
      record.codigoMunicipio ||
      record.codigo;

    if (code !== undefined && code !== null) {
      codes.add(String(code));
    }
  }

  return codes;
}

function extractProvider(metadata: unknown): string {
  if (!metadata || typeof metadata !== "object") return "";

  const record = metadata as Record<string, unknown>;
  const provider =
    record.provedor ||
    record.provider ||
    record.nome_provedor ||
    record.nomeProvedor ||
    (record.nfse && typeof record.nfse === "object"
      ? (record.nfse as Record<string, unknown>).provedor
      : "");

  return provider ? String(provider) : "";
}

async function fetchAcbrJson(path: string, accessToken: string): Promise<{ ok: boolean; status: number; data: unknown }> {
  const response = await fetch(`${getAcbrBaseUrl()}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const text = await response.text();
  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  return { ok: response.ok, status: response.status, data };
}

export const GET: RequestHandler = async ({ url }) => {
  const city = String(url.searchParams.get("city") || "").trim();
  const state = String(url.searchParams.get("state") || "")
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 2)
    .toUpperCase();

  if (!city || state.length !== 2) {
    return json({ message: "Cidade e UF são obrigatórias." }, { status: 400 });
  }

  try {
    const municipality = await resolveMunicipality(city, state);

    if (!municipality) {
      return json(
        {
          available: false,
          city,
          state,
          ibgeCode: "",
          provider: "",
          message: "Cidade não encontrada na base oficial do IBGE para a UF informada.",
          checkedAt: new Date().toISOString(),
          raw: null,
        } satisfies CityAvailabilityResponse,
        { status: 200 },
      );
    }

    const ibgeCode = String(municipality.id);
    const accessToken = await getAccessToken();
    const citiesResponse = await fetchAcbrJson("/dfe/nfse/cidades", accessToken);

    if (!citiesResponse.ok) {
      throw new Error(`Falha ao consultar cidades atendidas na ACBr API. Status ${citiesResponse.status}.`);
    }

    const supportedCodes = extractCityCodes(citiesResponse.data);
    const isListedAsSupported = supportedCodes.has(ibgeCode);
    let metadata: unknown = null;
    let provider = "";

    const metadataResponse = await fetchAcbrJson(`/nfse/cidades/${encodeURIComponent(ibgeCode)}`, accessToken);

    if (metadataResponse.ok) {
      metadata = metadataResponse.data;
      provider = extractProvider(metadataResponse.data);
    }

    const isAvailable = isListedAsSupported || metadataResponse.ok;

    const response: CityAvailabilityResponse = {
      available: isAvailable,
      city: municipality.nome,
      state,
      ibgeCode,
      provider,
      message: isAvailable
        ? "Cidade disponível na cobertura de NFS-e da ACBr API."
        : "Cidade ainda não encontrada na cobertura de NFS-e da ACBr API.",
      checkedAt: new Date().toISOString(),
      raw: metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>) : null,
    };

    return json(response);
  } catch (error) {
    return json(
      {
        message: error instanceof Error ? error.message : "Erro inesperado ao verificar cidade.",
      },
      { status: 500 },
    );
  }
};
