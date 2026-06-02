// src/routes/api/nfse/nfse-city-check/+server.ts
import { json, type RequestHandler } from "@sveltejs/kit";

const COVERAGE_API_URL = "https://backend.f10.com.br/dfe/nfse/cidades-cobertura";

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

function normalizeState(value: string): string {
  return value
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 2)
    .toUpperCase();
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function extractCityNames(payload: unknown): string[] {
  const data = payload as {
    data?: unknown;
    cidades?: unknown;
    cities?: unknown;
  };

  const source = Array.isArray(payload)
    ? payload
    : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.cidades)
        ? data.cidades
        : Array.isArray(data?.cities)
          ? data.cities
          : [];

  return Array.from(
    new Set(
      source
        .map((item) => {
          if (typeof item === "string") return item.trim();
          if (!item || typeof item !== "object") return "";

          const city = item as {
            nome?: unknown;
            name?: unknown;
            cidade?: unknown;
            city?: unknown;
          };

          return String(
            city.nome ?? city.name ?? city.cidade ?? city.city ?? "",
          ).trim();
        })
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

async function fetchCoveredCities(state: string): Promise<string[]> {
  const params = new URLSearchParams({ uf: state });
  const response = await fetch(`${COVERAGE_API_URL}?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(
      `Falha ao consultar cobertura de NFS-e. Status ${response.status}.`,
    );
  }

  return extractCityNames(await response.json());
}

export const GET: RequestHandler = async ({ url }) => {
  const city = String(url.searchParams.get("city") || "").trim();
  const state = normalizeState(String(url.searchParams.get("state") || ""));

  if (!city || state.length !== 2) {
    return json({ message: "Cidade e UF são obrigatórias." }, { status: 400 });
  }

  try {
    const coveredCities = await fetchCoveredCities(state);
    const normalizedCity = normalizeText(city);
    const matchedCity =
      coveredCities.find((coveredCity) => normalizeText(coveredCity) === normalizedCity) ??
      "";

    const response: CityAvailabilityResponse = {
      available: Boolean(matchedCity),
      city: matchedCity || city,
      state,
      ibgeCode: "",
      provider: "F10 Coverage API",
      message: matchedCity
        ? "Cidade disponível na cobertura de NFS-e da F10."
        : "Cidade ainda não encontrada na cobertura de NFS-e da F10.",
      checkedAt: new Date().toISOString(),
      raw: {
        source: COVERAGE_API_URL,
        coveredCitiesCount: coveredCities.length,
      },
    };

    return json(response);
  } catch (error) {
    return json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao verificar cidade.",
      },
      { status: 500 },
    );
  }
};
