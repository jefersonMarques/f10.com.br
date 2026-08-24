<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { Check, ChevronLeft, ChevronRight, Sparkles } from "lucide-svelte";
  import HelpInlineImageAnnotationEditor from "$lib/components/help/HelpInlineImageAnnotationEditor.svelte";
  import type { HelpImageAnnotation } from "$lib/help/helpImageAnnotations";

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
  let stripElement: HTMLDivElement | null = null;

  $: selected = candidates.find((candidate) => candidate.assetId === selectedAssetId)
    ?? candidates[0]
    ?? null;
  $: selectedIndex = selected
    ? candidates.findIndex((candidate) => candidate.assetId === selected.assetId)
    : -1;

  function assetUrl(assetId: string): string {
    return `/api/app/help/assets/${assetId}`;
  }

  function formatSeconds(value: number | null): string {
    if (value === null) return "";
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    return `${String(minutes).padStart(2, "0")}:${seconds.toFixed(1).padStart(4, "0")}`;
  }

  function selectCandidate(assetId: string): void {
    selectedAssetId = assetId;
    const index = candidates.findIndex((candidate) => candidate.assetId === assetId);
    if (index >= 0) {
      stripElement?.children.item(index)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }

  function move(direction: number): void {
    if (selectedIndex < 0 || candidates.length < 2) return;
    const nextIndex = Math.min(Math.max(selectedIndex + direction, 0), candidates.length - 1);
    const next = candidates[nextIndex];
    if (next) selectCandidate(next.assetId);
  }

  async function saveReview(
    annotations: HelpImageAnnotation[],
  ): Promise<{ success: boolean; message?: string }> {
    if (!selectedAssetId) return { success: false, message: "Selecione um screenshot." };
    try {
      const response = await fetch(
        `/api/app/help/content/${contentId}/images/${blockId}/review`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ assetId: selectedAssetId, annotations }),
        },
      );
      const payload = await response.json().catch(() => ({})) as {
        success?: boolean;
        message?: string;
      };
      const success = response.ok && Boolean(payload.success);
      if (!success) {
        return {
          success: false,
          message: payload.message || "Não foi possível salvar o screenshot e as marcações.",
        };
      }
      await invalidateAll();
      return { success: true, message: payload.message || "Screenshot e marcações salvos." };
    } catch {
      return {
        success: false,
        message: "A conexão foi interrompida ao salvar o screenshot e as marcações.",
      };
    }
  }
</script>

{#if selected}
  <section class="overflow-hidden rounded-[20px] border border-[#D8DDF4] bg-[#F8F9FF]">
    <header class="flex flex-wrap items-start justify-between gap-3 border-b border-[#E1E4F2] px-4 py-3 sm:px-5">
      <div>
        <div class="flex items-center gap-2">
          <Sparkles size={15} class="text-[#EA6D0B]" />
          <strong class="text-[12px] font-semibold text-[#222A3D]">Revisar screenshot e fazer marcações</strong>
        </div>
        <p class="mt-1 max-w-[700px] text-[9px] leading-4 text-[#7B8292]">
          A sugestão automática já vem selecionada. Troque pelo carrossel se outro frame representar melhor a etapa e faça as marcações diretamente na imagem escolhida. Um único salvamento confirma tudo.
        </p>
      </div>
      {#if selected.recommended}
        <span class="rounded-full bg-[#FFF0E4] px-2.5 py-1 text-[8px] font-bold text-[#A9510D]">SUGESTÃO F10</span>
      {/if}
    </header>

    <div class="p-4 sm:p-5">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span class="text-[9px] font-semibold text-[#626A7A]">Frame {selectedIndex + 1} de {candidates.length}{selected.timeSeconds !== null ? ` · ${formatSeconds(selected.timeSeconds)}` : ""}</span>
        {#if candidates.length > 1}
          <div class="flex gap-1.5">
            <button
              type="button"
              aria-label="Frame anterior"
              disabled={selectedIndex <= 0}
              on:click={() => move(-1)}
              class="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DDE1EA] bg-white text-[#000A57] disabled:opacity-30"
            ><ChevronLeft size={16}/></button>
            <button
              type="button"
              aria-label="Próximo frame"
              disabled={selectedIndex >= candidates.length - 1}
              on:click={() => move(1)}
              class="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DDE1EA] bg-white text-[#000A57] disabled:opacity-30"
            ><ChevronRight size={16}/></button>
          </div>
        {/if}
      </div>

      {#key selected.assetId}
        <HelpInlineImageAnnotationEditor
          {contentId}
          {blockId}
          imageUrl={assetUrl(selected.assetId)}
          altText="Screenshot em revisão"
          initialAnnotations={[]}
          {disabled}
          saveLabel="Salvar screenshot e marcações"
          saveHandler={saveReview}
        />
      {/key}

      <div bind:this={stripElement} class="mt-3 flex gap-2 overflow-x-auto pb-1">
        {#each candidates as candidate, index}
          <button
            type="button"
            on:click={() => selectCandidate(candidate.assetId)}
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

      <p class="mt-3 text-[9px] leading-4 text-[#8A909E]">Ao salvar, somente o frame escolhido permanece. As outras opções são removidas do banco e do armazenamento.</p>
    </div>
  </section>
{/if}
