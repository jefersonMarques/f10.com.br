<script lang="ts">
  import { Monitor, Save, Settings2 } from "lucide-svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  let activeSection: "general" | "webview" = "general";
</script>

<svelte:head><title>Configurações | Helpdesk F10</title></svelte:head>

{#if form?.message}
  <div role="status" class={`application-text-caption mb-4 rounded-xl border px-4 py-3 font-medium ${form.success ? "border-app-success-border bg-app-success-bg text-app-success-text" : "border-app-danger-border bg-app-danger-bg text-app-danger-text"}`}>
    {form.message}
  </div>
{/if}

<div class="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Configurações gerais">
  <button type="button" role="tab" aria-selected={activeSection === "general"}
    on:click={() => (activeSection = "general")}
    class:active={activeSection === "general"}
    class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-lg border border-app-border-control px-3 font-semibold text-app-text">
    <Settings2 size={16}/> Geral
  </button>
  <button type="button" role="tab" aria-selected={activeSection === "webview"}
    on:click={() => (activeSection = "webview")}
    class:active={activeSection === "webview"}
    class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-lg border border-app-border-control px-3 font-semibold text-app-text">
    <Monitor size={16}/> WebView F10
  </button>
</div>

{#if activeSection === "general"}
  <section class="rounded-2xl border border-app-border bg-app-surface p-4 sm:p-5">
    <h2 class="application-text-section font-semibold text-app-text">Identidade e ambiente</h2>
    <form method="POST" action="?/saveGeneral" class="mt-4 grid gap-4 sm:grid-cols-2">
      <label class="block">
        <span class="application-text-caption mb-1 block font-semibold text-app-text">Nome exibido do suporte</span>
        <input name="supportDisplayName" value={data.general.supportDisplayName} maxlength="120"
          class="application-text-caption h-11 w-full rounded-lg border border-app-border-control bg-app-surface px-3 text-app-text"/>
      </label>
      <label class="block">
        <span class="application-text-caption mb-1 block font-semibold text-app-text">Nome do remetente</span>
        <input name="supportSenderName" value={data.general.supportSenderName} maxlength="120"
          class="application-text-caption h-11 w-full rounded-lg border border-app-border-control bg-app-surface px-3 text-app-text"/>
      </label>
      <label class="block">
        <span class="application-text-caption mb-1 block font-semibold text-app-text">Fuso horário</span>
        <input name="timezone" value={data.general.timezone} maxlength="80"
          class="application-text-caption h-11 w-full rounded-lg border border-app-border-control bg-app-surface px-3 text-app-text"/>
      </label>
      <label class="block">
        <span class="application-text-caption mb-1 block font-semibold text-app-text">Autorização remota (minutos)</span>
        <input name="remoteConsentMinutes" type="number" min="5" max="120" value={data.general.remoteConsentMinutes}
          class="application-text-caption h-11 w-full rounded-lg border border-app-border-control bg-app-surface px-3 text-app-text"/>
      </label>
      <div class="flex justify-end sm:col-span-2">
        <button type="submit" class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-lg bg-app-primary px-4 font-semibold text-white">
          <Save size={15}/> Salvar alterações
        </button>
      </div>
    </form>
  </section>
{:else}
  <section class="rounded-2xl border border-app-border bg-app-surface p-4 sm:p-5">
    <h2 class="application-text-section font-semibold text-app-text">Áreas disponíveis no WebView F10</h2>
    <form method="POST" action="?/saveIframeF10" class="mt-4">
      <div class="grid gap-3 sm:grid-cols-2">
        {#each [
          { key: "support", label: "Suporte", checked: data.iframeF10.support },
          { key: "updates", label: "Atualizações", checked: data.iframeF10.updates },
          { key: "resources", label: "Recursos", checked: data.iframeF10.resources },
          { key: "notices", label: "Avisos", checked: data.iframeF10.notices },
        ] as section (section.key)}
          <label class="application-text-caption flex min-h-11 items-center gap-3 rounded-lg border border-app-border px-3 font-semibold text-app-text">
            <input type="checkbox" name={section.key} checked={section.checked} class="h-4 w-4"/>
            {section.label}
          </label>
        {/each}
      </div>
      <div class="mt-4 flex justify-end">
        <button type="submit" class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-lg bg-app-primary px-4 font-semibold text-white">
          <Save size={15}/> Salvar WebView
        </button>
      </div>
    </form>
  </section>
{/if}

<style>
  .active {
    background: var(--app-primary);
    color: white;
    border-color: var(--app-primary);
  }
</style>
