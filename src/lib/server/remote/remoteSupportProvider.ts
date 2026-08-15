import { env } from "$env/dynamic/private";

export type RemoteProviderStatus = {
  provider: "meshcentral" | "disabled";
  configured: boolean;
  baseUrl: string;
};

export interface RemoteSupportProvider {
  readonly name: "meshcentral";
  testConnection(): Promise<boolean>;
  getLaunchUrl(providerDeviceId: string): never;
}

function readMeshCentralConfiguration() {
  const provider = env.REMOTE_SUPPORT_PROVIDER?.trim() === "meshcentral" ? "meshcentral" : "disabled";
  const baseUrl = env.MESHCENTRAL_BASE_URL?.trim() ?? "";
  let parsedBase: URL | null = null;
  try {
    parsedBase = baseUrl ? new URL(baseUrl) : null;
  } catch {
    parsedBase = null;
  }
  const validProtocol =
    parsedBase?.protocol === "https:" ||
    (parsedBase?.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsedBase.hostname));
  return {
    provider,
    baseUrl,
    parsedBase,
    configured: provider === "meshcentral" && Boolean(parsedBase) && Boolean(validProtocol),
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
      const response = await fetch(this.config.parsedBase, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
      });
      return response.status >= 200 && response.status < 500;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  getLaunchUrl(_providerDeviceId: string): never {
    throw new Error("REMOTE_PROVIDER_DIRECT_LAUNCH_DISABLED");
  }
}

export function getRemoteProviderStatus(): RemoteProviderStatus {
  const config = readMeshCentralConfiguration();
  return {
    provider: config.provider,
    configured: config.configured,
    baseUrl: config.baseUrl,
  };
}

export function getRemoteSupportProvider(): RemoteSupportProvider {
  const status = getRemoteProviderStatus();
  if (!status.configured || status.provider !== "meshcentral") {
    throw new Error("REMOTE_PROVIDER_NOT_CONFIGURED");
  }
  return new MeshCentralProvider();
}

export async function testRemoteSupportProvider(): Promise<boolean> {
  try {
    return await getRemoteSupportProvider().testConnection();
  } catch {
    return false;
  }
}
