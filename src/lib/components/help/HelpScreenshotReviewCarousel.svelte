<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { Check, ChevronLeft, ChevronRight, LoaderCircle, Sparkles } from "lucide-svelte";

  export let contentId: string;
  export let blockId: string;
  export let candidates: Array<{
    assetId: string;
    candidateIndex: number;
    timeSeconds: number | null;
    recommended: boolean;
  }> = [];
  export let disabled = false;

  let selectedAssetId = candidates.find((candidate) => candidate.recommended)?.assetId
    ?? candidates[0]?.assetId
    ?? "";
  let saving = false;
  let errorMessage = "";
  let stripElement: HTMLDivElement | null = null;

  $: selected = candidates.find((candidate) => candidate.assetId === selectedAssetId)
    ?? candidates[0]
    ?? null;

  function assetUrl(assetId: string): string {
    return `/api/app/help/assets/${assetId}`;
  }

  function formatSeconds(value: number | null): string {
    if (value === null) return "";
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    return `${String(minutes).padStart(2, "0")}:${seconds.toFixed(1).padStart(4, "0")}`;
  }

  function move(direction: number): void {
    if (!selected || candidates.length < 2) return;
    const currentIndex = candidates.findIndex((candidate) => candidate.assetId === selected.assetId);
    const nextIndex = Math.min(Math.max(currentIndex + direction, 0), candidates.length - 1);
    const next = candidates[nextIndex];
    if (!next) return;
    selectedAssetId = next.assetId;
    stripElement?.children.item(nextIndex)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }

  async function confirmSelection(): Promise<void> {
    if (disabled || saving || !selectedAssetId) return;
    saving = true;
    errorMessage = "";
    try {
      const response = await fetch(
        `/api/app/help/content/${contentId}/images/${blockId}/review`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ assetId: selectedAssetId }),
        },
      );
      const payload = await response.json().catch(() => ({})) as {
        success?: boolean;
        message?: string;
      };
      if (!response.ok || !payload.success) {
        errorMessage = payload.message || "Não foi possível confirmar o screenshot.";
        return;
      }
      await invalidateAll();
    } catch {
      errorMessage = "A conexão foi interrompida ao confirmar o screenshot.";
    } finally {
      saving = false;
    }
  }
</script>

{#if selected}
  <section class="overflow-hidden rounded-[20px] border border-[#D8DDF4] bg-[#F8F9FF]">
    <header class="flex flex-wrap items-start justify-between gap-3 border-b border-[#E1E4F2] px-4 py-3 sm:px-5">
      <div>
        <div class="flex items-center gap-2">
          <Sparkles size={15} class="text-[#EA6D0B]" />
          <strong class="text-[12px] font-semibold text-[#222A3D]">Revisão do screenshot</strong>
        </div>
        <p class="mt-1 max-w-[680px] text-[9px] leading-4 text-[#7B8292]">
          A sugestão automática já vem selecionada. Escolha outro frame se ele representar melhor esta etapa; depois confirme para liberar a ferramenta de marcação.
        </p>
      </div>
      {#if selected.recommended}
        <span class="rounded-full bg-[#FFF0E4] px-2.5 py-1 text-[8px] font-bold text-[#A9510D]">SUGESTÃO F10</span>
      {/if}
    </header>

    <div class="p-4 sm:p-5">
      <div class="relative overflow-hidden rounded-2xl border border-[#DDE1EA] bg-black">
        <img
          src={assetUrl(selected.assetId)}
          alt="Candidato de screenshot"
          class="block aspect-video h-auto w-full object-contain"
        />
        {#if candidates.length > 1}
          <button
            type="button"
            aria-label="Frame anterior"
            disabled={candidates[0]?.assetId === selected.assetId}
            on:click={() => move(-1)}
            class="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#000A57] shadow disabled:opacity-30"
          ><ChevronLeft size={18}/></button>
          <button
            type="button"
            aria-label="Próximo frame"
            disabled={candidates.at(-1)?.assetId === selected.assetId}
            on:click={() => move(1)}
            class="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#000A57] shadow disabled:opacity-30"
          ><ChevronRight size={18}/></button>
        {/if}
      </div>

      <div bind:this={stripElement} class="mt-3 flex gap-2 overflow-x-auto pb-1">
        {#each candidates as candidate, index}
          <button
            type="button"
            on:click={() => selectedAssetId = candidate.assetId}
            class={`relative w-[132px] shrink-0 overflow-hidden rounded-xl border-2 bg-white text-left transition ${selectedAssetId === candidate.assetId ? "border-[#000A57]" : "border-transparent hover:border-[#C9CEDA]"}`}
          >
            <img src={assetUrl(candidate.assetId)} alt={`Frame ${index + 1}`} class="aspect-video w-full object-cover" />
            <span class="flex items-center justify-between gap-1 px-2 py-1.5 text-[8px] text-[#747B8B]">
              <span>Frame {index + 1}{candidate.timeSeconds !== null ? ` · ${formatSeconds(candidate.timeSeconds)}` : ""}</span>
              {#if candidate.recommended}<Sparkles size={10} class="shrink-0 text-[#EA6D0B]"/>{/if}
            </span>
            {#if selectedAssetId === candidate.assetId}
              <span class="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#000A57] text-white"><Check size={12}/></span>
            {/if}
          </button>
        {/each}
      </div>

      {#if errorMessage}
        <p class="mt-3 rounded-xl border border-[#F0C8C8] bg-[#FFF5F5] px-3 py-2 text-[9px] font-medium text-[#9B2C2C]">{errorMessage}</p>
      {/if}

      <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span class="text-[9px] leading-4 text-[#8A909E]">Ao confirmar, os frames não escolhidos são excluídos do armazenamento.</span>
        <button
          type="button"
          disabled={disabled || saving || !selectedAssetId}
          on:click={confirmSelection}
          class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#B8BCC8]"
        >
          {#if saving}<LoaderCircle size={14} class="animate-spin"/>{:else}<Check size={14}/>{/if}
          Confirmar screenshot e marcar
        </button>
      </div>
    </div>
  </section>
{/if}
