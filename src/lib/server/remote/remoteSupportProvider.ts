import { env } from "$env/dynamic/private";

export type RemoteProviderStatus = {
  provider: "meshcentral" | "disabled";
  configured: boolean;
  baseUrl: string;
  hasDeviceTemplate: boolean;
};

export interface RemoteSupportProvider {
  readonly name: "meshcentral";
  testConnection(): Promise<boolean>;
  getLaunchUrl(providerDeviceId: string): string;
}

function normalizeBasePath(pathname: string): string {
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

function meshCentralNodeId(providerDeviceId: string): string {
  const nodeId = providerDeviceId.trim().split("/").filter(Boolean).at(-1) ?? "";
  if (!nodeId) throw new Error("REMOTE_PROVIDER_DEVICE_ID_INVALID");
  return nodeId;
}

function readMeshCentralConfiguration() {
  const provider = env.REMOTE_SUPPORT_PROVIDER?.trim() === "meshcentral" ? "meshcentral" : "disabled";
  const baseUrl = env.MESHCENTRAL_BASE_URL?.trim() ?? "";
  const deviceUrlTemplate = env.MESHCENTRAL_DEVICE_URL_TEMPLATE?.trim() ?? "";
  let parsedBase: URL | null = null;
  try { parsedBase = baseUrl ? new URL(baseUrl) : null; } catch { parsedBase = null; }
  const validProtocol = parsedBase?.protocol === "https:" || (parsedBase?.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsedBase.hostname));
  return {
    provider,
    baseUrl,
    deviceUrlTemplate,
    parsedBase,
    configured: provider === "meshcentral" && Boolean(parsedBase) && Boolean(validProtocol) && deviceUrlTemplate.includes("{deviceId}"),
  } as const;
}

class MeshCentralProvider implements RemoteSupportProvider {
  readonly name = "meshcentral" as const;
  private readonly config = readMeshCentralConfiguration();

  async testConnection(): Promise<boolean> {
    if (!this.config.configured || !this.config.parsedBase) return false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);
    try {
      const response = await fetch(this.config.parsedBase, { method: "GET", redirect: "manual", signal: controller.signal });
      return response.status >= 200 && response.status < 500;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  getLaunchUrl(providerDeviceId: string): string {
    if (!this.config.configured || !this.config.parsedBase) throw new Error("REMOTE_PROVIDER_NOT_CONFIGURED");
    const nodeId = meshCentralNodeId(providerDeviceId);
    const raw = this.config.deviceUrlTemplate.replaceAll("{deviceId}", encodeURIComponent(nodeId));
    const url = new URL(raw, this.config.parsedBase);
    if (url.origin !== this.config.parsedBase.origin) throw new Error("REMOTE_PROVIDER_URL_ORIGIN_MISMATCH");

    const basePath = normalizeBasePath(this.config.parsedBase.pathname);
    const launchPath = normalizeBasePath(url.pathname);
    if (!launchPath.startsWith(basePath)) throw new Error("REMOTE_PROVIDER_URL_PATH_MISMATCH");

    return url.toString();
  }
}

export function getRemoteProviderStatus(): RemoteProviderStatus {
  const config = readMeshCentralConfiguration();
  return {
    provider: config.provider,
    configured: config.configured,
    baseUrl: config.baseUrl,
    hasDeviceTemplate: config.deviceUrlTemplate.includes("{deviceId}"),
  };
}

export function getRemoteSupportProvider(): RemoteSupportProvider {
  const status = getRemoteProviderStatus();
  if (!status.configured || status.provider !== "meshcentral") throw new Error("REMOTE_PROVIDER_NOT_CONFIGURED");
  return new MeshCentralProvider();
}

export async function testRemoteSupportProvider(): Promise<boolean> {
  try { return await getRemoteSupportProvider().testConnection(); } catch { return false; }
}
