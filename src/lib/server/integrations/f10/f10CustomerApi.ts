import { env } from "$env/dynamic/private";
import {
  parseF10Contracts,
  parseF10Person,
  parseF10UnitId,
  type F10CustomerPerson,
} from "$lib/server/integrations/f10/f10CustomerSyncParsing";

const BASE_URL = "https://api.f10.com.br";
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RESPONSE_BYTES = 16 * 1024 * 1024;

export function getConfiguredF10UnitId(): number {
  return parseF10UnitId(env.F10_UID);
}

export function isF10CustomerApiConfigured(): boolean {
  if (!env.F10_API_BEARER_TOKEN?.trim()) return false;
  try {
    getConfiguredF10UnitId();
    return true;
  } catch {
    return false;
  }
}

async function apiGet(path: string): Promise<unknown> {
  const token = env.F10_API_BEARER_TOKEN?.trim();
  if (!token) throw new Error("F10_API_NOT_CONFIGURED");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(BASE_URL + path, {
        method: "GET",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        redirect: "error",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      if (attempt === 2) throw new Error("F10_API_UNAVAILABLE");
      continue;
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error("F10_API_UNAUTHORIZED");
    }
    if (!response.ok) {
      if ((response.status === 429 || response.status >= 500) && attempt < 2) continue;
      throw new Error(response.status === 429 ? "F10_API_RATE_LIMITED" : "F10_API_HTTP_ERROR");
    }
    const length = Number(response.headers.get("content-length") ?? 0);
    if (length > MAX_RESPONSE_BYTES) throw new Error("F10_API_RESPONSE_TOO_LARGE");

    let payloadText: string;
    try {
      payloadText = await response.text();
    } catch {
      throw new Error("F10_API_READ_FAILED");
    }
    if (Buffer.byteLength(payloadText, "utf8") > MAX_RESPONSE_BYTES) {
      throw new Error("F10_API_RESPONSE_TOO_LARGE");
    }
    try {
      return JSON.parse(payloadText) as unknown;
    } catch {
      throw new Error("F10_API_INVALID_JSON");
    }
  }
  throw new Error("F10_API_UNAVAILABLE");
}

export async function listF10CustomerContractOwners(unitId: number) {
  if (!Number.isSafeInteger(unitId) || unitId <= 0) throw new Error("F10_UID_INVALID");
  const response = await apiGet(`/unidade/contratos/${unitId}`);
  return parseF10Contracts(response);
}

export async function getF10CustomerPerson(unitId: number, personId: number): Promise<F10CustomerPerson> {
  if (!Number.isSafeInteger(unitId) || unitId <= 0) throw new Error("F10_UID_INVALID");
  if (!Number.isSafeInteger(personId) || personId <= 0) throw new Error("F10_PERSON_ID_INVALID");
  const response = await apiGet(`/unidade/pessoas/${unitId}/${personId}`);
  return parseF10Person(response, personId);
}
