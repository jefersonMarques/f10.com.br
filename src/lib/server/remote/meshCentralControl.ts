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

type MeshCentralControlConfig = {
  configured: boolean;
  meshCtrlPath: string;
  url: string;
  loginUser: string;
  loginKeyFile: string;
  loginPassword: string;
  loginDomain: string;
  publicBaseUrl: string;
  windowsAgentType: number;
  deviceConsentFlags: number;
};

function parseInteger(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) return fallback;
  return parsed;
}

function readConfig(): MeshCentralControlConfig {
  const meshCtrlPath = env.MESHCENTRAL_MESHCTRL_PATH?.trim() ?? "";
  const url = env.MESHCENTRAL_CONTROL_URL?.trim() ?? "";
  const loginUser = env.MESHCENTRAL_CONTROL_USER?.trim() || "f10-operations";
  const loginKeyFile = env.MESHCENTRAL_CONTROL_LOGIN_KEY_FILE?.trim() ?? "";
  const loginPassword = env.MESHCENTRAL_CONTROL_PASSWORD ?? "";
  const loginDomain = env.MESHCENTRAL_CONTROL_DOMAIN?.trim() || "acesso-remoto";
  const publicBaseUrl = env.MESHCENTRAL_BASE_URL?.trim() ?? "";
  const hasCredential = Boolean(loginKeyFile || loginPassword);
  let validUrl = false;
  let validPublicUrl = false;

  try {
    const parsed = new URL(url);
    validUrl = parsed.protocol === "ws:" || parsed.protocol === "wss:";
  } catch {
    validUrl = false;
  }

  try {
    const parsed = new URL(publicBaseUrl);
    validPublicUrl = parsed.protocol === "https:" || (parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname));
  } catch {
    validPublicUrl = false;
  }

  return {
    configured:
      Boolean(meshCtrlPath) &&
      existsSync(meshCtrlPath) &&
      validUrl &&
      validPublicUrl &&
      Boolean(loginUser) &&
      hasCredential &&
      (!loginKeyFile || existsSync(loginKeyFile)),
    meshCtrlPath,
    url,
    loginUser,
    loginKeyFile,
    loginPassword,
    loginDomain,
    publicBaseUrl,
    windowsAgentType: parseInteger(env.MESHCENTRAL_WINDOWS_AGENT_TYPE, 4, 1, 11000),
    deviceConsentFlags: parseInteger(env.MESHCENTRAL_DEVICE_CONSENT_FLAGS, 8, 0, 0x7fffffff),
  };
}

function authenticationArgs(config: MeshCentralControlConfig): string[] {
  const args = ["--url", config.url, "--loginuser", config.loginUser];
  if (config.loginKeyFile) {
    args.push("--loginkeyfile", config.loginKeyFile, "--logindomain", config.loginDomain);
  } else {
    args.push("--loginpass", config.loginPassword);
  }
  return args;
}

function runMeshCtrl(command: string, commandArgs: string[] = []): Promise<string> {
  const config = readConfig();
  if (!config.configured) throw new Error("MESHCENTRAL_CONTROL_NOT_CONFIGURED");

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
        if (error) {
          reject(new Error(`MESHCENTRAL_CONTROL_FAILED:${stderr.trim() || stdout.trim() || error.message}`));
          return;
        }
        resolve(stdout.trim());
      },
    );
  });
}

function parseJsonArray(output: string): Array<Record<string, unknown>> {
  const first = output.indexOf("[");
  const last = output.lastIndexOf("]");
  if (first < 0 || last < first) throw new Error("MESHCENTRAL_CONTROL_INVALID_JSON");
  const parsed = JSON.parse(output.slice(first, last + 1));
  if (!Array.isArray(parsed)) throw new Error("MESHCENTRAL_CONTROL_INVALID_JSON");
  return parsed.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item));
}

function meshIdSuffix(value: string): string {
  const suffix = value.split("/").at(-1) ?? "";
  if (!suffix) throw new Error("MESHCENTRAL_GROUP_ID_INVALID");
  return suffix;
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
  };
}

export async function listMeshCentralDeviceGroups(): Promise<MeshCentralDeviceGroup[]> {
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

export async function ensureMeshCentralDeviceGroup(name: string): Promise<MeshCentralDeviceGroup> {
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

export async function listMeshCentralDevices(groupName: string): Promise<MeshCentralDevice[]> {
  const output = await runMeshCtrl("ListDevices", ["--group", groupName, "--json"]);
  return parseJsonArray(output)
    .map((device) => {
      const id = typeof device._id === "string" ? device._id : "";
      const name = typeof device.name === "string" ? device.name : "";
      const groupId = typeof device.meshid === "string" ? device.meshid : "";
      if (!id || !name) return null;
      const conn = typeof device.conn === "number" ? device.conn : Number(device.conn ?? 0);
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

export function buildMeshCentralAgentDownloadUrl(groupId: string): string {
  const config = readConfig();
  if (!config.configured) throw new Error("MESHCENTRAL_CONTROL_NOT_CONFIGURED");
  const base = new URL(config.publicBaseUrl);
  const basePath = base.pathname.endsWith("/") ? base.pathname : `${base.pathname}/`;
  const url = new URL(base.toString());
  url.pathname = `${basePath}meshagents`.replace(/\/+/g, "/");
  url.search = "";
  url.searchParams.set("id", String(config.windowsAgentType));
  url.searchParams.set("meshid", meshIdSuffix(groupId));
  url.searchParams.set("installflags", "2");
  return url.toString();
}
