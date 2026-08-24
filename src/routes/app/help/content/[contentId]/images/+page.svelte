<script lang="ts">
  import { Eye, Image as ImageIcon, PenTool } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import HelpAnnotatedImage from "$lib/components/help/HelpAnnotatedImage.svelte";
  import { readHelpImageAnnotationsFromMetadata } from "$lib/help/helpImageAnnotations";
  import type { PageData } from "./$types";

  export let data: PageData;

  $: imageCount = data.content.steps.reduce(
    (total, step) => total + step.blocks.filter((block) => block.blockType === "image" && block.asset).length,
    0,
  );

  function assetUrl(assetId: string): string {
    return `/api/app/help/assets/${assetId}`;
  }
</script>

<svelte:head><title>Marcar imagens | {data.content.title} | F10 Operations</title></svelte:head>

<ApplicationContent width="wide">
  <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
    <ApplicationBackLink href={`/app/help/content/${data.content.id}`} label="Editor" />
    <a href={`/app/help/content/${data.content.id}/preview`} class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3.5 font-semibold text-[#000A57]"><Eye size={14}/>Preview</a>
  </div>

  <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
    <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
      <div>
        <div class="flex items-center gap-2"><PenTool size={18} class="text-[#000A57]"/><h1 class="text-[20px] font-semibold tracking-[-0.03em] text-[#11182C]">Marcar imagens</h1></div>
        <p class="mt-2 max-w-[820px] text-[11px] leading-5 text-[#777E8E]">Selecione um screenshot para adicionar números, destaques, setas ou textos. A imagem original permanece intacta e o Preview mostra o resultado final.</p>
      </div>
      <span class="application-text-meta w-fit rounded-full bg-[#F3F4F7] px-3 py-1.5 font-bold text-[#656C7B]">{imageCount} {imageCount === 1 ? "imagem" : "imagens"}</span>
    </div>
  </section>

  {#if imageCount === 0}
    <section class="mt-4 rounded-[20px] border border-dashed border-[#D6DAE3] bg-white px-5 py-10 text-center">
      <ImageIcon size={26} class="mx-auto text-[#A7ADBA]"/>
      <p class="mt-3 text-[12px] font-semibold text-[#555C6D]">Este artigo ainda não possui screenshots.</p>
      <p class="mt-1 text-[10px] text-[#9297A5]">Adicione ou importe imagens nos passos antes de criar marcações.</p>
    </section>
  {:else}
    <div class="mt-4 space-y-5">
      {#each data.content.steps as step, stepIndex}
        {@const stepImages = step.blocks.filter((block) => block.blockType === "image" && block.asset)}
        {#if stepImages.length > 0}
          <section class="overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
            <header class="flex items-center gap-3 border-b border-[#EEF0F5] bg-[#FAFAFC] px-5 py-4 sm:px-6">
              <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-[#000A57] text-[11px] font-bold text-white">{stepIndex + 1}</span>
              <div><p class="application-text-meta font-bold uppercase tracking-[0.1em] text-[#EA6D0B]">Passo {stepIndex + 1}</p><h2 class="mt-0.5 text-[14px] font-semibold text-[#303645]">{step.title}</h2></div>
            </header>

            <div class="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
              {#each stepImages as block}
                {@const annotations = readHelpImageAnnotationsFromMetadata(block.metadata)}
                {@const imageUrl = block.asset?.storageKey ? assetUrl(block.asset.id) : block.asset?.sourceUrl}
                {#if imageUrl && block.asset}
                  <article class="overflow-hidden rounded-2xl border border-[#E1E4EC] bg-[#FAFAFC]">
                    <div class="bg-white p-3">
                      <HelpAnnotatedImage src={imageUrl} alt={block.asset.altText || "Screenshot do passo"} {annotations} className="max-h-[280px] rounded-xl border border-[#E6E8EE] bg-white" />
                    </div>
                    <div class="border-t border-[#E8EAF0] p-4">
                      <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0"><strong class="block truncate text-[11px] text-[#343B4B]">{block.asset.altText || "Screenshot sem título"}</strong><span class="application-text-meta mt-1 block text-[#8A909E]">{annotations.length} {annotations.length === 1 ? "marcação" : "marcações"}</span></div>
                        {#if annotations.length > 0}<span class="application-text-meta shrink-0 rounded-full bg-[#EEF8F1] px-2 py-1 font-bold text-[#2F7045]">Marcada</span>{/if}
                      </div>
                      {#if data.canEdit}
                        <a href={`/app/help/content/${data.content.id}/blocks/${block.id}/annotate`} class="application-text-caption mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-3 font-semibold text-white"><PenTool size={14}/>{annotations.length > 0 ? "Editar marcações" : "Marcar imagem"}</a>
                      {:else}
                        <a href={`/app/help/content/${data.content.id}/blocks/${block.id}/annotate`} class="application-text-caption mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#D6DBE7] bg-white px-3 font-semibold text-[#000A57]"><Eye size={14}/>Ver marcações</a>
                      {/if}
                    </div>
                  </article>
                {/if}
              {/each}
            </div>
          </section>
        {/if}
      {/each}
    </div>
  {/if}
</ApplicationContent>
