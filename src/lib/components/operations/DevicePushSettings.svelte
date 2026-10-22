<script lang="ts">
  import { onMount } from "svelte";
  import { BellRing, BellOff, LoaderCircle } from "lucide-svelte";

  let available = false;
  let configured = false;
  let enabled = false;
  let loading = false;
  let error = "";
  let publicKey = "";

  const compatible = () => typeof window !== "undefined" &&
    "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;

  function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
    const binary = atob(base64url.replace(/-/g, "+").replace(/_/g, "/").padEnd(
      Math.ceil(base64url.length / 4) * 4, "="
    ));
    const bytes = new Uint8Array(new ArrayBuffer(binary.length));
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  onMount(() => {
    available = compatible();
    if (!available) return;
    void (async () => {
      try {
        const response = await fetch("/app/notifications/push", { cache: "no-store" });
        if (!response.ok) return;
        const value = await response.json();
        publicKey = typeof value.publicKey === "string" ? value.publicKey : "";
        configured = Boolean(value.enabled && publicKey);
        const registration = await navigator.serviceWorker.getRegistration("/app/");
        enabled = Boolean(await registration?.pushManager.getSubscription()) &&
          Notification.permission === "granted";
      } catch { /* Settings remain available for retry. */ }
    })();
  });

  async function toggle(): Promise<void> {
    if (!available || !configured || loading) return;
    loading = true;
    error = "";
    try {
      const registration = await navigator.serviceWorker.register("/f10-notifications-sw.js", {
        scope: "/app/",
        updateViaCache: "none",
      });
      const subscription = await registration.pushManager.getSubscription();
      if (enabled) {
        if (subscription) {
          const result = await fetch("/app/notifications/push", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
          if (!result.ok) throw new Error("Não foi possível desligar os avisos.");
          await subscription.unsubscribe();
        }
        enabled = false;
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Autorize as notificações nas configurações deste navegador.");
      }
      const current = subscription ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(publicKey),
      });
      const response = await fetch("/app/notifications/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(current.toJSON()),
      });
      if (!response.ok) {
        if (!subscription) await current.unsubscribe();
        throw new Error("Não foi possível vincular este dispositivo.");
      }
      enabled = true;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : "Erro ao configurar avisos.";
    } finally {
      loading = false;
    }
  }
</script>

<div class="border-b border-[#EEF0F5] px-3 py-2">
  <button type="button" on:click={() => void toggle()} disabled={!available || !configured || loading}
    class="flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-[13px] font-semibold text-[#000A57] hover:bg-[#F5F6FA] disabled:cursor-not-allowed disabled:opacity-55">
    {#if loading}<LoaderCircle size={17} class="animate-spin"/>
    {:else if enabled}<BellOff size={17}/>{:else}<BellRing size={17}/>{/if}
    <span class="flex-1">{enabled ? "Desativar avisos neste dispositivo" : "Ativar avisos no dispositivo"}</span>
    {#if enabled}<span class="h-2 w-2 rounded-full bg-[#27985A]"></span>{/if}
  </button>
  {#if error}
    <p role="alert" class="px-2 pb-2 text-[12px] text-red-700">{error}</p>
  {:else if !available}
    <p class="px-2 pb-1 text-[12px] text-[#777E8D]">No iPhone, adicione o F10 à Tela de Início para ativar.</p>
  {:else if !configured}
    <p class="px-2 pb-1 text-[12px] text-[#777E8D]">Avisos externos aguardam configuração do servidor.</p>
  {/if}
</div>
