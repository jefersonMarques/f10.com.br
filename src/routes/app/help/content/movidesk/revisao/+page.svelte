<script lang="ts">
  import { ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, ShieldCheck, TriangleAlert } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  let checkedIds: string[] = [];
  let selectedSourceId: number | null = null;
  $: if (selectedSourceId !== (data.selected?.sourceId ?? null)) {
    selectedSourceId = data.selected?.sourceId ?? null;
    checkedIds = [];
  }
  $: allChecked = Boolean(data.selected?.images.length)
    && checkedIds.length === data.selected?.images.length;
  $: selectedIndex = data.candidates.findIndex((item) => item.sourceId === data.selected?.sourceId);
</script>

<ApplicationContent width="wide">
  <a href="/app/help/content/movidesk" class="inline-flex min-h-10 items-center gap-2 text-[13px] font-semibold text-[#000A57]">
    <ArrowLeft size={16}/> Voltar à migração
  </a>

  <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 class="text-[21px] font-semibold text-[#1B2640]">Revisar artigos com imagens</h1>
      <p class="mt-1 text-[13px] text-[#657084]">Confira cada captura e marque a confirmação. A aprovação não publica o artigo.</p>
    </div>
    <div class="rounded-xl border border-[#D5E9DB] bg-[#F5FBF6] px-4 py-3 text-[14px] font-semibold text-[#287B49]">
      {data.candidates.length} artigo(s) para revisar
    </div>
  </div>

  {#if data.approved}
    <div role="status" class="mt-4 flex items-center gap-2 rounded-xl border border-[#D5E9DB] bg-[#F5FBF6] p-3 text-[13px] font-medium text-[#267444]">
      <CheckCircle2 size={18}/> Artigo aprovado. Continue com o próximo.
    </div>
  {/if}

  {#if data.waitingForImages > 0}
    <div class="mt-3 flex items-start gap-2 rounded-xl border border-[#F0D7B5] bg-[#FFFAF2] p-3 text-[13px] text-[#825A21]">
      <TriangleAlert size={18} class="shrink-0"/>
      {data.waitingForImages} artigo(s) ainda têm imagens externas. Recupere essas mídias antes de conferir.
    </div>
  {/if}

  {#if data.outsidePublicPlan > 0}
    <p class="mt-3 text-[12px] text-[#687286]">
      {data.outsidePublicPlan} artigo(s) importados estão fora do plano público inicial e precisam de curadoria separada.
    </p>
  {/if}

  {#if data.selected}
    <div class="mt-5 grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside class="rounded-2xl border border-[#E0E5EF] bg-white p-3 lg:self-start">
        <h2 class="px-2 py-2 text-[13px] font-semibold text-[#273451]">Artigos para conferir</h2>
        <div class="max-h-[70vh] space-y-1 overflow-auto">
          {#each data.candidates as item}
            <a href={"/app/help/content/movidesk/revisao?sourceId=" + item.sourceId}
              aria-current={data.selected.sourceId === item.sourceId ? "page" : undefined}
              class={data.selected.sourceId === item.sourceId
                ? "block rounded-lg bg-[#EEF2FF] px-3 py-2.5 text-[13px] font-semibold text-[#000A57]"
                : "block rounded-lg px-3 py-2.5 text-[13px] text-[#4E5870] hover:bg-[#F5F7FB]"}>
              <span class="block">{item.title}</span>
              <span class="mt-1 block text-[11px] text-[#7B8493]">#{item.sourceId} · {item.imageCount} imagem(ns)</span>
            </a>
          {/each}
        </div>
      </aside>

      <section class="min-w-0 rounded-2xl border border-[#E0E5EF] bg-white p-4 sm:p-6">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[12px] font-semibold text-[#7A8394]">#{data.selected.sourceId} · {selectedIndex + 1} de {data.candidates.length}</p>
            <h2 class="mt-1 text-[19px] font-semibold text-[#182440]">{data.selected.title}</h2>
            <p class="mt-1 text-[13px] text-[#697385]">{data.selected.images.length} imagem(ns) para conferir.</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <a href={"/app/help/content/" + data.selected.contentId + "/preview"} target="_blank" rel="noopener noreferrer"
              class="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#D7DDEC] px-3 text-[12px] font-semibold text-[#000A57]">
              Ver artigo completo <ExternalLink size={15}/>
            </a>
            <a href={"/app/help/content/" + data.selected.contentId + "/images"} target="_blank" rel="noopener noreferrer"
              class="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#D7DDEC] px-3 text-[12px] font-semibold text-[#000A57]">
              Editar imagens <ExternalLink size={15}/>
            </a>
          </div>
        </div>

        <form method="POST" action="?/approveImages" class="mt-5">
          <input type="hidden" name="sourceId" value={data.selected.sourceId}/>
          <div class="space-y-5">
            {#each data.selected.images as item, i}
              <div class="rounded-xl border border-[#DCE1EB] p-3 sm:p-4">
                <p class="mb-3 text-[13px] font-semibold text-[#35415B]">{i + 1}. {item.stepTitle}</p>
                {#if item.storageKey}
                  <a href={"/api/app/help/assets/" + item.assetId} target="_blank" rel="noopener noreferrer"
                    title="Abrir imagem no tamanho original"
                    class="block overflow-auto rounded-lg bg-[#F7F8FA] p-2">
                    <img src={"/api/app/help/assets/" + item.assetId} alt={item.altText || item.stepTitle}
                      loading="lazy" class="block h-auto max-w-full"/>
                  </a>
                {:else}
                  <div class="flex items-center gap-2 text-[13px] text-[#A14C3E]">
                    <TriangleAlert size={16}/> Imagem não está no F10.
                  </div>
                {/if}
                <label class="mt-3 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg bg-[#F0F4FE] px-3 py-2 text-[13px] font-semibold text-[#203466]">
                  <input type="checkbox" name="reviewedBlockId" value={item.blockId} bind:group={checkedIds}
                    required class="h-5 w-5 accent-[#000A57]"/>
                  Conferi esta imagem e ela corresponde à instrução
                </label>
              </div>
            {/each}
          </div>

          {#if form?.message}
            <div role="alert" class="mt-4 rounded-lg border border-[#F0D7CB] bg-[#FFF8F5] p-3 text-[13px] text-[#904C3C]">{form.message}</div>
          {/if}

          <div class="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E8EF] pt-4">
            <span class="text-[13px] text-[#566175]">{checkedIds.length}/{data.selected.images.length} imagens confirmadas</span>
            <button type="submit" disabled={!allChecked} class="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#000A57] px-4 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
              <ShieldCheck size={17}/> Aprovar este artigo
            </button>
          </div>
        </form>

        <div class="mt-4 flex flex-wrap justify-between gap-2">
          {#if selectedIndex > 0}
            <a href={"/app/help/content/movidesk/revisao?sourceId=" + data.candidates[selectedIndex - 1].sourceId}
              class="inline-flex min-h-10 items-center gap-2 text-[13px] font-semibold text-[#000A57]">
              <ArrowLeft size={15}/> Anterior
            </a>
          {:else}
            <span></span>
          {/if}
          {#if selectedIndex + 1 < data.candidates.length}
            <a href={"/app/help/content/movidesk/revisao?sourceId=" + data.candidates[selectedIndex + 1].sourceId}
              class="inline-flex min-h-10 items-center gap-2 text-[13px] font-semibold text-[#000A57]">
              Pular para o próximo <ArrowRight size={15}/>
            </a>
          {/if}
        </div>
      </section>
    </div>
  {:else}
    <div class="mt-5 rounded-2xl border border-[#D5E9DB] bg-[#F5FBF6] p-6 text-center">
      <CheckCircle2 size={30} class="mx-auto text-[#287B49]"/>
      <h2 class="mt-2 text-[17px] font-semibold text-[#23543A]">Nenhum artigo com imagens aguardando conferência nesta seleção</h2>
      <p class="mt-2 text-[13px] text-[#586878]">Volte ao painel para publicar os aprovados ou acompanhar os demais impedimentos.</p>
      <a href="/app/help/content/movidesk" class="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#000A57] px-4 text-[13px] font-semibold text-white">
        Voltar à publicação <ArrowRight size={15}/>
      </a>
    </div>
  {/if}
</ApplicationContent>
