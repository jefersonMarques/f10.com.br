<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { Check, CheckCircle2, ChevronLeft, ChevronRight, ImagePlus, LoaderCircle, Sparkles } from "lucide-svelte";
  import HelpInlineImageAnnotationEditor from "$lib/components/help/HelpInlineImageAnnotationEditor.svelte";
  import type { HelpImageAnnotation } from "$lib/help/helpImageAnnotations";
  import type { HelpHumanReviewInteraction } from "$lib/help/helpHumanReview";

  export let contentId: string;
  export let blockId: string;
  export let candidates: Array<{
    assetId: string;
    candidateIndex: number;
    timeSeconds: number | null;
    recommended: boolean;
  }> = [];
  export let initialAnnotations: HelpImageAnnotation[] = [];
  export let activeAssetId: string | null = null;
  export let initialSelectedAssetId: string | null = null;
  export let initialInteractions: HelpHumanReviewInteraction[] = [];
  export let reviewed = false;
  export let disabled = false;

  const dispatch = createEventDispatcher<{ interaction: void; replaced: void }>();
  let candidateOptions = [...candidates];
  let selectedAssetId = "";
  let annotations: HelpImageAnnotation[] = [];
  let annotationDrafts = new Map<string, HelpImageAnnotation[]>();
  let stripElement: HTMLDivElement | null = null;
  let savedInteractions: HelpHumanReviewInteraction[] = [];
  let imageInteracted = false;
  let annotationInteracted = false;
  let lastAnnotationSignature = "[]";
  let appliedServerState = "";
  let candidateFile: File | null = null;
  let addingCandidate = false;
  let candidateMessage = "";

  function preferredAssetId(options = candidateOptions): string {
    if (initialSelectedAssetId && options.some((candidate) => candidate.assetId === initialSelectedAssetId)) {
      return initialSelectedAssetId;
    }
    if (activeAssetId && options.some((candidate) => candidate.assetId === activeAssetId)) {
      return activeAssetId;
    }
    return options.find((candidate) => candidate.recommended)?.assetId
      ?? options[0]?.assetId
      ?? "";
  }

  function serverStateSignature(): string {
    return JSON.stringify({
      candidates: candidates.map((candidate) => [
        candidate.assetId,
        candidate.candidateIndex,
        candidate.timeSeconds,
        candidate.recommended,
      ]),
      annotations: initialAnnotations,
      activeAssetId,
      initialSelectedAssetId,
      initialInteractions,
      reviewed,
    });
  }

  $: {
    const nextServerState = serverStateSignature();
    if (nextServerState !== appliedServerState) {
      appliedServerState = nextServerState;
      candidateOptions = [...candidates];
      selectedAssetId = preferredAssetId(candidateOptions);
      annotations = initialAnnotations;
      annotationDrafts = selectedAssetId
        ? new Map([[selectedAssetId, initialAnnotations]])
        : new Map();
      savedInteractions = [...initialInteractions];
      imageInteracted = false;
      annotationInteracted = false;
      lastAnnotationSignature = JSON.stringify(initialAnnotations);
      candidateFile = null;
      candidateMessage = "";
    }
  }

  $: selected = candidateOptions.find((candidate) => candidate.assetId === selectedAssetId)
    ?? candidateOptions[0]
    ?? null;
  $: selectedIndex = selected
    ? candidateOptions.findIndex((candidate) => candidate.assetId === selected.assetId)
    : -1;
  $: annotationSignature = JSON.stringify(annotations);
  $: if (annotationSignature !== lastAnnotationSignature) {
    annotationInteracted = true;
    lastAnnotationSignature = annotationSignature;
    if (selectedAssetId) annotationDrafts.set(selectedAssetId, annotations);
    dispatch("interaction");
  }
  $: interactions = Array.from(new Set([
    ...savedInteractions,
    ...(imageInteracted ? ["image_selected" as const] : []),
    ...(annotationInteracted ? ["annotated" as const] : []),
  ])) satisfies HelpHumanReviewInteraction[];
  $: interacted = imageInteracted || annotationInteracted;
  $: hasSavedDraft = Boolean(initialSelectedAssetId);

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
    if (assetId === selectedAssetId) {
      imageInteracted = true;
      dispatch("interaction");
      return;
    }
    if (selectedAssetId) annotationDrafts.set(selectedAssetId, annotations);
    selectedAssetId = assetId;
    annotations = annotationDrafts.get(assetId) ?? [];
    lastAnnotationSignature = JSON.stringify(annotations);
    imageInteracted = true;
    dispatch("interaction");
    const index = candidateOptions.findIndex((candidate) => candidate.assetId === assetId);
    if (index >= 0) {
      stripElement?.children.item(index)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }

  function move(direction: number): void {
    if (selectedIndex < 0 || candidateOptions.length < 2) return;
    const nextIndex = Math.min(Math.max(selectedIndex + direction, 0), candidateOptions.length - 1);
    const next = candidateOptions[nextIndex];
    if (next) selectCandidate(next.assetId);
  }

  function chooseCandidateFile(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    candidateFile = input.files?.[0] ?? null;
    candidateMessage = "";
  }

  async function addCandidate(): Promise<void> {
    if (!candidateFile || addingCandidate || disabled) return;
    addingCandidate = true;
    candidateMessage = "";

    try {
      const formData = new FormData();
      formData.set("file", candidateFile);
      const response = await fetch(
        `/api/app/help/content/${contentId}/images/${blockId}/review/candidates`,
        { method: "POST", body: formData },
      );
      const payload = await response.json().catch(() => ({})) as {
        success?: boolean;
        message?: string;
        candidate?: {
          assetId: string;
          candidateIndex: number;
          timeSeconds: null;
          recommended: false;
        };
      };
      if (!response.ok || !payload.success || !payload.candidate) {
        candidateMessage = payload.message || "Não foi possível adicionar a imagem.";
        return;
      }

      if (selectedAssetId) annotationDrafts.set(selectedAssetId, annotations);
      candidateOptions = [...candidateOptions, payload.candidate].sort((left, right) =>
        left.candidateIndex - right.candidateIndex,
      );
      candidateFile = null;
      candidateMessage = payload.message || "Imagem adicionada como alternativa.";
      selectCandidate(payload.candidate.assetId);
    } catch {
      candidateMessage = "A conexão foi interrompida ao adicionar a imagem.";
    } finally {
      addingCandidate = false;
    }
  }
</script>

{#if selected}
  <section
    class={`overflow-hidden rounded-[20px] border ${reviewed && !interacted && !hasSavedDraft ? "border-[#CFE4D6] bg-[#F7FCF8]" : "border-[#D8DDF4] bg-[#F8F9FF]"}`}
    data-human-review-item
    data-block-id={blockId}
    data-asset-id={selectedAssetId}
    data-reviewed={reviewed ? "true" : "false"}
    data-touched={interacted || interactions.length > 0 ? "true" : "false"}
  >
    <input type="hidden" data-review-annotations value={JSON.stringify(annotations)} />
    <input type="hidden" data-review-interactions value={JSON.stringify(interactions)} />

    <header class="flex flex-wrap items-start justify-between gap-3 border-b border-[#E1E4F2] px-4 py-3 sm:px-5">
      <div>
        <div class="flex items-center gap-2">
          {#if reviewed && !interacted && !hasSavedDraft}<CheckCircle2 size={15} class="text-[#2F7045]"/>{:else}<Sparkles size={15} class="text-[#EA6D0B]"/>{/if}
          <strong class="text-[12px] font-semibold text-[#222A3D]">Revisão humana da imagem</strong>
        </div>
        <p class="mt-1 max-w-[720px] text-[9px] leading-4 text-[#7B8292]">
          Confira o screenshot, escolha a melhor alternativa e faça as marcações necessárias. “Salvar rascunho” preserva o trabalho sem aprovar a revisão; “Concluir revisão” confirma a seleção para futura publicação.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        {#if reviewed && !interacted && !hasSavedDraft}<span class="rounded-full bg-[#EAF7EE] px-2.5 py-1 text-[8px] font-bold text-[#2F7045]">REVISADO</span>{/if}
        {#if hasSavedDraft && !interacted}<span class="rounded-full bg-[#EEF0FF] px-2.5 py-1 text-[8px] font-bold text-[#000A57]">RASCUNHO SALVO</span>{/if}
        {#if selected.recommended && candidateOptions.length > 1}<span class="rounded-full bg-[#FFF0E4] px-2.5 py-1 text-[8px] font-bold text-[#A9510D]">SUGESTÃO F10</span>{/if}
        {#if interacted}<span class="rounded-full bg-[#EEF0FF] px-2.5 py-1 text-[8px] font-bold text-[#000A57]">ALTERAÇÃO PENDENTE</span>{/if}
      </div>
    </header>

    <div class="p-4 sm:p-5">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span class="text-[9px] font-semibold text-[#626A7A]">Imagem {selectedIndex + 1} de {candidateOptions.length}{selected.timeSeconds !== null ? ` · ${formatSeconds(selected.timeSeconds)}` : ""}</span>
        {#if candidateOptions.length > 1}
          <div class="flex gap-1.5">
            <button type="button" aria-label="Imagem anterior" disabled={selectedIndex <= 0 || disabled} on:click={() => move(-1)} class="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DDE1EA] bg-white text-[#000A57] disabled:opacity-30"><ChevronLeft size={16}/></button>
            <button type="button" aria-label="Próxima imagem" disabled={selectedIndex >= candidateOptions.length - 1 || disabled} on:click={() => move(1)} class="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DDE1EA] bg-white text-[#000A57] disabled:opacity-30"><ChevronRight size={16}/></button>
          </div>
        {/if}
      </div>

      {#key selected.assetId}
        <HelpInlineImageAnnotationEditor
          {contentId}
          {blockId}
          imageUrl={assetUrl(selected.assetId)}
          altText="Screenshot em revisão"
          initialAnnotations={annotationDrafts.get(selected.assetId) ?? []}
          bind:annotations
          {disabled}
          showSaveButton={false}
        />
      {/key}

      {#if candidateOptions.length > 1}
        <div bind:this={stripElement} class="mt-3 flex gap-2 overflow-x-auto pb-1">
          {#each candidateOptions as candidate, index}
            <button type="button" disabled={disabled} on:click={() => selectCandidate(candidate.assetId)} class={`relative w-[132px] shrink-0 overflow-hidden rounded-xl border-2 bg-white text-left transition ${selectedAssetId === candidate.assetId ? "border-[#000A57]" : "border-transparent hover:border-[#C9CEDA]"}`}>
              <img src={assetUrl(candidate.assetId)} alt={`Imagem ${index + 1}`} class="aspect-video w-full object-cover" />
              <span class="flex items-center justify-between gap-1 px-2 py-1.5 text-[8px] text-[#747B8B]"><span>Imagem {index + 1}{candidate.timeSeconds !== null ? ` · ${formatSeconds(candidate.timeSeconds)}` : ""}</span>{#if candidate.recommended}<Sparkles size={10} class="shrink-0 text-[#EA6D0B]"/>{/if}</span>
              {#if selectedAssetId === candidate.assetId}<span class="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#000A57] text-white"><Check size={12}/></span>{/if}
            </button>
          {/each}
        </div>
        <p class="mt-3 text-[9px] leading-4 text-[#8A909E]">As alternativas são preservadas no conteúdo mesmo depois de salvar ou concluir a revisão. Somente a imagem confirmada entra na próxima publicação.</p>
      {/if}

      {#if !disabled}
        <div class="mt-4 rounded-2xl border border-[#E2E5ED] bg-white p-3">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <label class="min-w-0 flex-1">
              <span class="text-[9px] font-semibold text-[#596071]">Adicionar outra imagem</span>
              <span class="mt-0.5 block text-[8px] text-[#959AA8]">A nova imagem entra no carrossel como alternativa e pode ser adicionada mesmo com alterações ainda não salvas.</span>
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" on:change={chooseCandidateFile} class="mt-2 block max-w-full text-[9px]" />
            </label>
            <button type="button" disabled={!candidateFile || addingCandidate} on:click={addCandidate} class="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#D8DDF4] bg-[#F8F9FF] px-3 text-[9px] font-semibold text-[#000A57] disabled:cursor-not-allowed disabled:opacity-40">{#if addingCandidate}<LoaderCircle size={13} class="animate-spin"/>{:else}<ImagePlus size={13}/>{/if}{addingCandidate ? "Adicionando..." : "Adicionar imagem"}</button>
          </div>
          {#if candidateMessage}<p class="mt-2 text-[8px] font-medium text-[#7A3B08]">{candidateMessage}</p>{/if}
        </div>
      {/if}
    </div>
  </section>
{/if}
