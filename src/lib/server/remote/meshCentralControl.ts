import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { env } from "$env/dynamic/private";

export type MeshCentralDevice = {
  id: string;
  name: string;
  online: boolean;
  groupId: string;
  raw: Record<string, unknown>;
};

export type MeshCentralDeviceGroup = {
  id: string;
  shortId: string;
  name: string;
};

export type MeshCentralDesktopShare = {
  id: string;
  url: string;
  expiresAt: Date;
};

type MeshCentralControlConfig = {
  configured: boolean;
  meshCtrlPath: string;
  url: string;
  baseUrl: URL | null;
  loginUser: string;
  loginKeyFile: string;
  loginPassword: string;
  loginDomain: string;
  windowsAgentType: number;
  deviceConsentFlags: number;
  shareMinutes: number;
};

function parseInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    return fallback;
  }
  return parsed;
}

function parsePublicBaseUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    const allowed =
      url.protocol === "https:" ||
      (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname));
    return allowed ? url : null;
  } catch {
    return null;
  }
}

function readConfig(): MeshCentralControlConfig {
  const meshCtrlPath = env.MESHCENTRAL_MESHCTRL_PATH?.trim() ?? "";
  const url = env.MESHCENTRAL_CONTROL_URL?.trim() ?? "";
  const baseUrl = parsePublicBaseUrl(env.MESHCENTRAL_BASE_URL?.trim() ?? "");
  const loginUser = env.MESHCENTRAL_CONTROL_USER?.trim() || "f10-operations";
  const loginKeyFile = env.MESHCENTRAL_CONTROL_LOGIN_KEY_FILE?.trim() ?? "";
  const loginPassword = env.MESHCENTRAL_CONTROL_PASSWORD ?? "";
  const loginDomain = env.MESHCENTRAL_CONTROL_DOMAIN?.trim() || "acesso-remoto";
  const hasCredential = Boolean(loginKeyFile || loginPassword);
  let validUrl = false;

  try {
    const parsed = new URL(url);
    validUrl = parsed.protocol === "ws:" || parsed.protocol === "wss:";
  } catch {
    validUrl = false;
  }

  return {
    configured:
      Boolean(meshCtrlPath) &&
      existsSync(meshCtrlPath) &&
      validUrl &&
      Boolean(baseUrl) &&
      Boolean(loginUser) &&
      hasCredential &&
      (!loginKeyFile || existsSync(loginKeyFile)),
    meshCtrlPath,
    url,
    baseUrl,
    loginUser,
    loginKeyFile,
    loginPassword,
    loginDomain,
    windowsAgentType: parseInteger(
      env.MESHCENTRAL_WINDOWS_AGENT_TYPE,
      4,
      1,
      11000,
    ),
    deviceConsentFlags: parseInteger(
      env.MESHCENTRAL_DEVICE_CONSENT_FLAGS,
      8,
      0,
      0x7fffffff,
    ),
    shareMinutes: parseInteger(env.MESHCENTRAL_SHARE_MINUTES, 30, 5, 60),
  };
}

function authenticationArgs(config: MeshCentralControlConfig): string[] {
  const args = ["--url", config.url, "--loginuser", config.loginUser];
  if (config.loginKeyFile) {
    args.push(
      "--loginkeyfile",
      config.loginKeyFile,
      "--logindomain",
      config.loginDomain,
    );
  } else {
    args.push("--loginpass", config.loginPassword);
  }
  return args;
}

function sanitizeMeshCtrlOutput(value: string): string {
  return value
    .replace(/URL:\s*\S+/gi, "URL: [redacted]")
    .replace(/(sharing\?c=)[^\s]+/gi, "$1[redacted]");
}

function assertMeshCtrlOutput(output: string): void {
  const normalized = output.toLowerCase();
  if (
    normalized.includes("unable to connect") ||
    normalized.includes("invalid login") ||
    normalized.includes("access denied")
  ) {
    throw new Error(`MESHCENTRAL_CONTROL_FAILED:${sanitizeMeshCtrlOutput(output)}`);
  }
}

function runMeshCtrl(
  command: string,
  commandArgs: string[] = [],
): Promise<string> {
  const config = readConfig();
  if (!config.configured) {
    throw new Error("MESHCENTRAL_CONTROL_NOT_CONFIGURED");
  }

  const args = [
    config.meshCtrlPath,
    command,
    ...commandArgs,
    ...authenticationArgs(config),
  ];

  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      args,
      {
        windowsHide: true,
        timeout: 15_000,
        maxBuffer: 2 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        const output = stdout.trim();
        if (error) {
          reject(
            new Error(
              `MESHCENTRAL_CONTROL_FAILED:${sanitizeMeshCtrlOutput(stderr.trim() || output || error.message)}`,
            ),
          );
          return;
        }
        try {
          assertMeshCtrlOutput(output);
          resolve(output);
        } catch (cause) {
          reject(cause);
        }
      },
    );
  });
}

function parseJsonArray(output: string): Array<Record<string, unknown>> {
  const first = output.indexOf("[");
  const last = output.lastIndexOf("]");
  if (first < 0 || last < first) {
    throw new Error("MESHCENTRAL_CONTROL_INVALID_JSON");
  }
  const parsed = JSON.parse(output.slice(first, last + 1));
  if (!Array.isArray(parsed)) {
    throw new Error("MESHCENTRAL_CONTROL_INVALID_JSON");
  }
  return parsed.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
}

function meshIdSuffix(value: string): string {
  const suffix = value.split("/").filter(Boolean).at(-1) ?? "";
  if (!suffix) throw new Error("MESHCENTRAL_GROUP_ID_INVALID");
  return suffix;
}

function agentDownloadBaseUrl(controlUrl: string): URL {
  const url = new URL(controlUrl);
  if (url.protocol === "ws:") url.protocol = "http:";
  else if (url.protocol === "wss:") url.protocol = "https:";
  else throw new Error("MESHCENTRAL_CONTROL_URL_INVALID");

  const basePath = url.pathname.endsWith("/")
    ? url.pathname
    : `${url.pathname}/`;
  url.pathname = `${basePath}meshagents`.replace(/\/+/g, "/");
  url.search = "";
  url.hash = "";
  return url;
}

function validateShareUrl(rawUrl: string, baseUrl: URL): string {
  const shareUrl = new URL(rawUrl);
  if (shareUrl.origin !== baseUrl.origin) {
    throw new Error("MESHCENTRAL_SHARE_URL_ORIGIN_MISMATCH");
  }
  const basePath = baseUrl.pathname.endsWith("/")
    ? baseUrl.pathname
    : `${baseUrl.pathname}/`;
  if (!shareUrl.pathname.startsWith(basePath)) {
    throw new Error("MESHCENTRAL_SHARE_URL_PATH_MISMATCH");
  }
  return shareUrl.toString();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getMeshCentralControlStatus() {
  const config = readConfig();
  return {
    configured: config.configured,
    url: config.url,
    loginUser: config.loginUser,
    loginDomain: config.loginDomain,
    usesLoginKey: Boolean(config.loginKeyFile),
    windowsAgentType: config.windowsAgentType,
    deviceConsentFlags: config.deviceConsentFlags,
    shareMinutes: config.shareMinutes,
  };
}

export async function listMeshCentralDeviceGroups(): Promise<
  MeshCentralDeviceGroup[]
> {
  const output = await runMeshCtrl("ListDeviceGroups", ["--json"]);
  return parseJsonArray(output)
    .map((group) => {
      const id = typeof group._id === "string" ? group._id : "";
      const name = typeof group.name === "string" ? group.name : "";
      if (!id || !name) return null;
      return { id, shortId: meshIdSuffix(id), name };
    })
    .filter((group): group is MeshCentralDeviceGroup => Boolean(group));
}

export async function ensureMeshCentralDeviceGroup(
  name: string,
): Promise<MeshCentralDeviceGroup> {
  const safeName = name.trim().slice(0, 120);
  if (!safeName) throw new Error("MESHCENTRAL_GROUP_NAME_REQUIRED");

  let groups = await listMeshCentralDeviceGroups();
  let existing = groups.find((group) => group.name === safeName);
  if (existing) return existing;

  const config = readConfig();
  await runMeshCtrl("AddDeviceGroup", [
    "--name",
    safeName,
    "--desc",
    "Gerenciado pelo F10 Operations",
    "--consent",
    String(config.deviceConsentFlags),
  ]);

  groups = await listMeshCentralDeviceGroups();
  existing = groups.find((group) => group.name === safeName);
  if (!existing) throw new Error("MESHCENTRAL_GROUP_NOT_CREATED");
  return existing;
}

export async function listMeshCentralDevices(
  groupName: string,
): Promise<MeshCentralDevice[]> {
  const output = await runMeshCtrl("ListDevices", [
    "--group",
    groupName,
    "--json",
  ]);
  return parseJsonArray(output)
    .map((device) => {
      const id = typeof device._id === "string" ? device._id : "";
      const name = typeof device.name === "string" ? device.name : "";
      const groupId = typeof device.meshid === "string" ? device.meshid : "";
      if (!id || !name) return null;
      const conn =
        typeof device.conn === "number"
          ? device.conn
          : Number(device.conn ?? 0);
      return {
        id,
        name,
        groupId,
        online: Number.isFinite(conn) && conn > 0,
        raw: device,
      };
    })
    .filter((device): device is MeshCentralDevice => Boolean(device));
}

export async function createMeshCentralDesktopShare(
  providerDeviceId: string,
  guestName: string,
): Promise<MeshCentralDesktopShare> {
  const config = readConfig();
  if (!config.configured || !config.baseUrl) {
    throw new Error("MESHCENTRAL_CONTROL_NOT_CONFIGURED");
  }

  // A listagem também faz o MeshCentral limpar shares expirados antes da criação.
  await runMeshCtrl("DeviceSharing", ["--id", providerDeviceId]);

  const output = await runMeshCtrl("DeviceSharing", [
    "--id",
    providerDeviceId,
    "--add",
    guestName.trim().slice(0, 80) || "F10 Operations",
    "--type",
    "desktop",
    "--consent",
    "prompt",
    "--duration",
    String(config.shareMinutes),
  ]);
  const id = output.match(/^ID:\s*(.+)$/m)?.[1]?.trim() ?? "";
  const rawUrl = output.match(/^URL:\s*(.+)$/m)?.[1]?.trim() ?? "";
  if (!id || !rawUrl) throw new Error("MESHCENTRAL_SHARE_NOT_CREATED");

  return {
    id,
    url: validateShareUrl(rawUrl, config.baseUrl),
    expiresAt: new Date(Date.now() + config.shareMinutes * 60_000),
  };
}

export async function revokeMeshCentralDesktopShare(
  providerDeviceId: string,
  shareId: string,
): Promise<void> {
  const safeShareId = shareId.trim();
  if (!safeShareId) return;

  await runMeshCtrl("DeviceSharing", [
    "--id",
    providerDeviceId,
    "--remove",
    safeShareId,
  ]);

  const remaining = await runMeshCtrl("DeviceSharing", ["--id", providerDeviceId]);
  const identifierPattern = new RegExp(
    `^Identifier:\\s*${escapeRegExp(safeShareId)}\\s*$`,
    "m",
  );
  if (identifierPattern.test(remaining)) {
    throw new Error("MESHCENTRAL_SHARE_NOT_REVOKED");
  }
}

export function buildMeshCentralAgentDownloadUrl(groupId: string): string {
  const config = readConfig();
  if (!config.configured) {
    throw new Error("MESHCENTRAL_CONTROL_NOT_CONFIGURED");
  }
  const url = agentDownloadBaseUrl(config.url);
  url.searchParams.set("id", String(config.windowsAgentType));
  url.searchParams.set("meshid", meshIdSuffix(groupId));
  url.searchParams.set("installflags", "2");
  return url.toString();
}
