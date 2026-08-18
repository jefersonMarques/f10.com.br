import { createHash } from "node:crypto";
import { env } from "$env/dynamic/private";
import type { CustomerF10GroupSnapshot } from "$lib/server/db/customerPortalSchema";

const DEFAULT_F10_BACKEND_URL = "https://backend.f10.com.br";
const REQUEST_TIMEOUT_MS = 12_000;

type F10LoginResponse = {
  token?: unknown;
  user_id?: unknown;
};

type F10GroupsResponse = {
  grupos?: unknown;
};

type F10JwtPayload = {
  id?: unknown;
  nome?: unknown;
  login?: unknown;
  iat?: unknown;
  exp?: unknown;
};

export type AuthenticatedF10Customer = {
  token: string;
  userId: string;
  login: string;
  expiresAt: Date;
  groups: CustomerF10GroupSnapshot[];
};

function backendUrl(path: string): string {
  const base = (env.F10_BACKEND_URL?.trim() || DEFAULT_F10_BACKEND_URL).replace(/\/$/, "");
  return `${base}${path}`;
}

function passwordMd5(password: string): string {
  return createHash("md5").update(password, "utf8").digest("hex");
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const payload = await response.json().catch(() => ({}));
  return payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : {};
}

function isSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function parseGroups(value: unknown): CustomerF10GroupSnapshot[] {
  if (!Array.isArray(value)) throw new Error("F10_CUSTOMER_GROUPS_INVALID");

  return value.map((rawGroup) => {
    if (!rawGroup || typeof rawGroup !== "object" || Array.isArray(rawGroup)) {
      throw new Error("F10_CUSTOMER_GROUPS_INVALID");
    }
    const group = rawGroup as Record<string, unknown>;
    const groupName = typeof group.grupo === "string" ? group.grupo.trim() : "";
    const groupId = group.grupo_id;
    const rawUnits = group.unidades;
    if (!groupName || !isSafeInteger(groupId) || !Array.isArray(rawUnits)) {
      throw new Error("F10_CUSTOMER_GROUPS_INVALID");
    }

    const units = rawUnits.map((rawUnit) => {
      if (!rawUnit || typeof rawUnit !== "object" || Array.isArray(rawUnit)) {
        throw new Error("F10_CUSTOMER_GROUPS_INVALID");
      }
      const unit = rawUnit as Record<string, unknown>;
      const schema = typeof unit.schema === "string" ? unit.schema.trim() : "";
      const unitName = typeof unit.unidade === "string" ? unit.unidade.trim() : "";
      const unitId = unit.unidade_id;
      if (!schema || !unitName || !isSafeInteger(unitId)) {
        throw new Error("F10_CUSTOMER_GROUPS_INVALID");
      }
      return { schema, unidade: unitName, unidade_id: unitId };
    });

    return {
      grupo: groupName,
      grupo_id: groupId,
      subgrupo: Boolean(group.subgrupo),
      unidades: units,
    };
  });
}

function decodeJwtPayload(token: string): F10JwtPayload {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("F10_CUSTOMER_TOKEN_INVALID");
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("F10_CUSTOMER_TOKEN_INVALID");
    }
    return payload as F10JwtPayload;
  } catch (cause) {
    if (cause instanceof Error && cause.message === "F10_CUSTOMER_TOKEN_INVALID") throw cause;
    throw new Error("F10_CUSTOMER_TOKEN_INVALID");
  }
}

async function requestGroups(token: string): Promise<CustomerF10GroupSnapshot[]> {
  const response = await fetch(backendUrl("/adm/user/groups"), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const payload = await readJson(response) as F10GroupsResponse & Record<string, unknown>;
  if (!response.ok) {
    if (response.status === 401 || response.status === 403 || response.status === 400) {
      throw new Error("F10_CUSTOMER_TOKEN_REJECTED");
    }
    throw new Error("F10_CUSTOMER_BACKEND_UNAVAILABLE");
  }
  return parseGroups(payload.grupos);
}

export async function getAuthenticatedF10CustomerGroups(
  token: string,
): Promise<CustomerF10GroupSnapshot[]> {
  if (!token) throw new Error("F10_CUSTOMER_TOKEN_INVALID");
  return requestGroups(token);
}

export async function authenticateF10Customer(
  email: string,
  password: string,
): Promise<AuthenticatedF10Customer> {
  const login = email.trim().toLowerCase();
  if (!login || !password) throw new Error("F10_CUSTOMER_LOGIN_INVALID");

  let response: Response;
  try {
    response = await fetch(backendUrl("/adm/user/login"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        login,
        pass: passwordMd5(password),
        web: true,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new Error("F10_CUSTOMER_BACKEND_UNAVAILABLE");
  }

  const payload = await readJson(response) as F10LoginResponse & Record<string, unknown>;
  if (!response.ok) {
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      throw new Error("F10_CUSTOMER_LOGIN_INVALID");
    }
    throw new Error("F10_CUSTOMER_BACKEND_UNAVAILABLE");
  }

  const token = typeof payload.token === "string" ? payload.token.trim() : "";
  const userId = typeof payload.user_id === "string"
    ? payload.user_id.trim()
    : typeof payload.user_id === "number"
      ? String(payload.user_id)
      : "";
  if (!token || !userId) throw new Error("F10_CUSTOMER_LOGIN_RESPONSE_INVALID");

  let groups: CustomerF10GroupSnapshot[];
  try {
    groups = await requestGroups(token);
  } catch (cause) {
    if (cause instanceof Error && cause.message === "F10_CUSTOMER_TOKEN_REJECTED") {
      throw new Error("F10_CUSTOMER_LOGIN_INVALID");
    }
    throw cause;
  }

  const claims = decodeJwtPayload(token);
  const claimId = typeof claims.id === "string" || typeof claims.id === "number"
    ? String(claims.id)
    : "";
  const claimLogin = typeof claims.login === "string" ? claims.login.trim().toLowerCase() : "";
  const exp = typeof claims.exp === "number" ? claims.exp : Number(claims.exp);
  if (claimId !== userId || (claimLogin && claimLogin !== login) || !Number.isFinite(exp)) {
    throw new Error("F10_CUSTOMER_LOGIN_RESPONSE_INVALID");
  }

  const expiresAt = new Date(exp * 1000);
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    throw new Error("F10_CUSTOMER_TOKEN_EXPIRED");
  }

  return { token, userId, login, expiresAt, groups };
}
