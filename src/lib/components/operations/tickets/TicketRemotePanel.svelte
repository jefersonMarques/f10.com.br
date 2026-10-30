<script lang="ts">
  import { deserialize } from "$app/forms";
  import { onMount } from "svelte";
  import { AlertCircle, CheckCircle2, Download, MonitorCog, RefreshCw, ShieldCheck } from "lucide-svelte";

  type RemoteDevice = {
    id: string;
    name: string;
    online: boolean;
    lastOnlineAt: string | null;
    lastSeenAt: string | null;
  };

  type RemoteOverview = {
    devices: RemoteDevice[];
    requiresCustomerLink: boolean;
    providerConfigured: boolean;
    controlConfigured: boolean;
    canUseRemote: boolean;
    syncError: string;
  };

  type RemoteAction = "enroll" | "sync";

  export let ticketId: string;
  export let onRefresh: () => void | Promise<void> = () => undefined;
  export let onSelectCustomer: () => void = () => undefined;

  let overview: RemoteOverview | null = null;
  let loading = true;
  let busy: RemoteAction | null = null;
  let feedback: { success: boolean; message: string } | null = null;

  function formatLastSeen(value: string | null): string {
    if (!value) return "Nunca conectado";
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  }

  async function loadDevices(): Promise<void> {
    loading = true;
    try {
      const response = await fetch(`/api/app/tickets/${ticketId}/remote`, {
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Não foi possível consultar os computadores.");
      overview = await response.json() as RemoteOverview;
    } catch {
      overview = null;
      feedback = { success: false, message: "Não foi possível consultar os computadores. Tente novamente." };
    } finally {
      loading = false;
    }
  }

  async function runAction(action: RemoteAction): Promise<void> {
    if (busy) return;
    busy = action;
    feedback = null;

    try {
      const response = await fetch(`/app/tickets/${ticketId}/remote?/${action}`, {
        method: "POST",
        body: new FormData(),
        headers: {
          accept: "application/json",
          "x-sveltekit-action": "true",
        },
      });
      const result = deserialize(await response.text());
      const message = result.type === "success" || result.type === "failure"
        ? String((result.data as { message?: string } | null)?.message ?? "")
        : "";

      if (result.type !== "success") {
        feedback = { success: false, message: message || "Não foi possível concluir a operação." };
        return;
      }

      feedback = { success: true, message: message || "Operação concluída." };
      await loadDevices();
      await onRefresh();
    } catch {
      feedback = { success: false, message: "Falha de comunicação. Tente novamente." };
    } finally {
      busy = null;
    }
  }

  onMount(() => {
    void loadDevices();
  });
</script>

<section class="min-h-0 flex-1 overflow-y-auto bg-[var(--app-surface-subtle)] p-3 sm:p-5">
  <div class="mx-auto w-full max-w-[1000px] space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="flex items-center gap-2 text-[14px] font-semibold text-[var(--app-text)]"><MonitorCog size={17}/>Acesso remoto</h2>
      <button type="button" on:click={() => void loadDevices()} disabled={loading || Boolean(busy)}
        class="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-[12px] font-semibold text-[var(--app-primary)] disabled:opacity-50">
        <RefreshCw size={14}/>Atualizar
      </button>
    </div>

    {#if feedback}
      <div role="status" class={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-[12px] ${feedback.success ? "bg-[var(--app-success-bg)] text-[var(--app-success-text)]" : "bg-[var(--app-danger-bg)] text-[var(--app-danger-text)]"}`}>
        {#if feedback.success}<CheckCircle2 size={16}/>{:else}<AlertCircle size={16}/>{/if}
        <span>{feedback.message}</span>
      </div>
    {/if}

    {#if loading}
      <div role="status" class="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 text-[13px] text-[var(--app-text-muted)]">Consultando computadores...</div>
    {:else if overview}
      {#if overview.requiresCustomerLink}
        <div class="rounded-xl border border-[var(--app-warning-border)] bg-[var(--app-warning-bg)] p-4">
          <p class="text-[13px] font-semibold text-[var(--app-warning-text)]">Cliente não vinculado</p>
          <button type="button" on:click={onSelectCustomer} class="mt-2 text-[12px] font-semibold text-[var(--app-primary)] underline underline-offset-2">Vincular cliente ao ticket</button>
        </div>
      {/if}

      {#if overview.syncError}
        <p role="status" class="rounded-lg bg-[var(--app-warning-bg)] p-3 text-[12px] text-[var(--app-warning-text)]">{overview.syncError}</p>
      {/if}

      <div class="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)]">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--app-border-soft)] px-4 py-3">
          <h3 class="text-[13px] font-semibold text-[var(--app-text)]">Computadores <span class="text-[var(--app-text-muted)]">({overview.devices.length})</span></h3>
          <button type="button" disabled={Boolean(busy) || overview.requiresCustomerLink || !overview.controlConfigured}
            on:click={() => void runAction("sync")}
            class="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold text-[var(--app-primary)] hover:bg-[var(--app-surface-muted)] disabled:opacity-50">
            <RefreshCw size={14}/>{busy === "sync" ? "Verificando..." : "Sincronizar"}
          </button>
        </div>
        {#if overview.devices.length === 0}
          <div class="px-4 py-8 text-center text-[13px] text-[var(--app-text-muted)]">Nenhum computador vinculado ao cliente.</div>
        {:else}
          <div class="divide-y divide-[var(--app-border-soft)]">
            {#each overview.devices as device (device.id)}
              <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div class="flex min-w-0 items-center gap-3">
                  <span class={`h-2.5 w-2.5 shrink-0 rounded-full ${device.online ? "bg-green-600" : "bg-gray-400"}`} aria-label={device.online ? "Online" : "Offline"}></span>
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <strong class="break-words text-[13px] text-[var(--app-text)]">{device.name}</strong>
                      <span class="text-[11px] text-[var(--app-text-muted)]">{device.online ? "Online" : "Offline"}</span>
                    </div>
                    <p class="text-[11px] text-[var(--app-text-muted)]">Última conexão: {formatLastSeen(device.lastOnlineAt ?? device.lastSeenAt)}</p>
                  </div>
                </div>
                <form method="POST" action={`/app/tickets/${ticketId}/remote?/start`}>
                  <input type="hidden" name="deviceId" value={device.id}/>
                  <button type="submit"
                    disabled={!overview.canUseRemote || !device.online || !overview.providerConfigured || overview.requiresCustomerLink}
                    class="inline-flex min-h-9 items-center gap-2 rounded-lg bg-[var(--app-primary)] px-3 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                    <MonitorCog size={15}/>Acessar
                  </button>
                </form>
              </div>
            {/each}
          </div>
        {/if}
        <div class="border-t border-[var(--app-border-soft)] p-3">
          <button type="button" disabled={Boolean(busy) || overview.requiresCustomerLink || !overview.controlConfigured}
            on:click={() => void runAction("enroll")}
            class="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-[var(--app-border)] text-[12px] font-semibold text-[var(--app-primary)] disabled:opacity-50">
            <Download size={15}/>{busy === "enroll" ? "Enviando..." : overview.devices.length ? "Adicionar computador" : "Enviar instalador ao cliente"}
          </button>
        </div>
      </div>
      <p class="flex items-center gap-2 px-1 text-[11px] text-[var(--app-text-muted)]"><ShieldCheck size={15} class="shrink-0"/>O acesso continua exigindo autorização no computador do cliente.</p>
    {/if}
  </div>
</section>
