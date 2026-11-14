import { env } from "$env/dynamic/private";

const DEFAULT_BASE_URL = "https://backend.f10.com.br";
const REQUEST_TIMEOUT_MS = 12_000;
const MAX_RESPONSE_BYTES = 256 * 1024;

function paymentBaseUrl(): URL {
  const baseUrl = new URL(env.F10_BACKEND_URL?.trim() || DEFAULT_BASE_URL);
  if (baseUrl.protocol !== "https:" || baseUrl.username || baseUrl.password) {
    throw new Error("FINANCE_BACKEND_INVALID");
  }
  return baseUrl;
}

async function requestPaymentApi(
  path: string,
  options: { method?: "GET" | "POST"; token?: string; body?: Record<string, unknown> } = {},
): Promise<unknown> {
  const baseUrl = paymentBaseUrl();
  const endpoint = new URL(path, baseUrl);
  if (endpoint.origin !== baseUrl.origin) throw new Error("FINANCE_BACKEND_INVALID");

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
      redirect: "error",
    });
  } catch {
    throw new Error("FINANCE_BACKEND_UNAVAILABLE");
  }

  if (!response.ok) {
    if ([400, 401, 403].includes(response.status)) {
      throw new Error("FINANCE_PAYER_NOT_VALIDATED");
    }
    throw new Error("FINANCE_BACKEND_UNAVAILABLE");
  }

  const responseText = await response.text();
  if (Buffer.byteLength(responseText, "utf8") > MAX_RESPONSE_BYTES) {
    throw new Error("FINANCE_RESPONSE_TOO_LARGE");
  }
  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    throw new Error("FINANCE_RESPONSE_INVALID");
  }
}

export async function validateF10PaymentPayer(input: {
  unitId: number;
  document: string;
  birth: string;
}): Promise<string> {
  const response = await requestPaymentApi("/unidade/pessoa/validar", {
    method: "POST",
    body: {
      unidade_id: input.unitId,
      cpf: input.document,
      birth: input.birth,
    },
  });

  const value = response as { result?: unknown; token?: unknown } | null;
  if (value?.result !== true || typeof value.token !== "string" || !value.token) {
    throw new Error("FINANCE_PAYER_NOT_VALIDATED");
  }
  return value.token;
}

export async function listF10PaymentContracts(token: string): Promise<unknown> {
  return requestPaymentApi("/unidade/pessoa/contratos", { token });
}

export async function listF10PaymentInstallments(
  token: string,
  contractId: number,
): Promise<unknown> {
  return requestPaymentApi(`/unidade/pessoa/contrato/parcelas/${contractId}`, { token });
}

export async function getF10PaymentInstallment(
  token: string,
  receivableId: number,
): Promise<unknown> {
  return requestPaymentApi(`/unidade/pessoa/contrato/dadosParcela/${receivableId}`, { token });
}
