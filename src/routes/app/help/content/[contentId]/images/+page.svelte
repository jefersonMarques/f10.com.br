<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { CheckCircle2, Download, ExternalLink, Eye, Info, LoaderCircle, PenTool, PlayCircle, Save, Sparkles, TriangleAlert, X } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import HelpCategoryIcon from "$lib/components/help/HelpCategoryIcon.svelte";
  import HelpRichText from "$lib/components/help/HelpRichText.svelte";
  import HelpScreenshotReviewCarousel from "$lib/components/help/HelpScreenshotReviewCarousel.svelte";
  import { readHelpImageAnnotationsFromMetadata } from "$lib/help/helpImageAnnotations";
  import type { HelpHumanReviewInteraction } from "$lib/help/helpHumanReview";
  import type { PageData } from "./$types";

  export let data: PageData;

  let savingAll = false;
  let saveMessage = "";
  let saveSuccess = false;
  let hasUnsavedReview = false;
  let showUntouchedModal = false;
  let untouchedCount = 0;

  type ReviewItemPayload = {
    blockId: string;
    assetId: string;
    annotations: unknown[];
    interactions: HelpHumanReviewInteraction[];
    reviewed: boolean;
    touched: boolean;
  };

  function assetUrl(assetId: string): string {
    return `/api/app/help/assets/${assetId}`;
  }

  function youtubeEmbedUrl(value: string | null): string | null {
    if (!value) return null;
    try {
      const url = new URL(value);
      let id = "";
      if (url.hostname === "youtu.be") id = url.pathname.slice(1).split("/")[0] ?? "";
      if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) {
        if (url.pathname === "/watch") id = url.searchParams.get("v") ?? "";
        else if (url.pathname.startsWith("/embed/") || url.pathname.startsWith("/shorts/")) {
          id = url.pathname.split("/")[2] ?? "";
        }
      }
      return /^[A-Za-z0-9_-]{6,20}$/.test(id)
        ? `https://www.youtube-nocookie.com/embed/${id}`
        : null;
    } catch {
      return null;
    }
  }

  function safeJson<T>(value: string, fallback: T): T {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  function collectReviewItems(): ReviewItemPayload[] {
    return Array.from(document.querySelectorAll<HTMLElement>("[data-human-review-item]")).map((element) => {
      const annotationsInput = element.querySelector<HTMLInputElement>("[data-review-annotations]");
      const interactionsInput = element.querySelector<HTMLInputElement>("[data-review-interactions]");
      return {
        blockId: element.dataset.blockId ?? "",
        assetId: element.dataset.assetId ?? "",
        annotations: safeJson<unknown[]>(annotationsInput?.value ?? "[]", []),
        interactions: safeJson<HelpHumanReviewInteraction[]>(interactionsInput?.value ?? "[]", []),
        reviewed: element.dataset.reviewed === "true",
        touched: element.dataset.touched === "true",
      };
    });
  }

  async function persistAll(confirmUntouched: boolean): Promise<void> {
    const items = collectReviewItems();
    savingAll = true;
    saveMessage = "";
    saveSuccess = false;
    try {
      const response = await fetch(`/api/app/help/content/${data.content.id}/images/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          confirmUntouched,
          items: items.map((item) => ({
            blockId: item.blockId,
            assetId: item.assetId,
            annotations: item.annotations,
            interactions: item.interactions,
          })),
        }),
      });
      const payload = await response.json().catch(() => ({})) as { success?: boolean; message?: string };
      saveSuccess = response.ok && Boolean(payload.success);
      saveMessage = payload.message || (saveSuccess ? "Revisão humana salva." : "Não foi possível salvar a revisão humana.");
      if (!saveSuccess) return;
      hasUnsavedReview = false;
      showUntouchedModal = false;
      await invalidateAll();
    } catch {
      saveMessage = "A conexão foi interrompida ao salvar a revisão humana.";
    } finally {
      savingAll = false;
    }
  }

  async function saveAll(): Promise<void> {
    if (savingAll || !data.canEdit || data.humanReview.total === 0) return;
    const items = collectReviewItems();
    untouchedCount = items.filter((item) => !item.reviewed && !item.touched).length;
    if (untouchedCount > 0) {
      showUntouchedModal = true;
      return;
    }
    await persistAll(false);
  }

  function markInteraction(): void {
    hasUnsavedReview = true;
    saveMessage = "";
  }

  function beforeUnload(event: BeforeUnloadEvent): void {
    if (!hasUnsavedReview) return;
    event.preventDefault();
    event.returnValue = "";
  }
</script>

<svelte:head><title>Revisão humana | {data.content.title} | F10 Operations</title></svelte:head>
<svelte:window on:beforeunload={beforeUnload} />

<ApplicationContent width="standard">
  <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
    <ApplicationBackLink href={`/app/help/content/${data.content.id}`} label="Editor" />
    <div class="flex flex-wrap items-center gap-2">
      <span class="application-text-meta inline-flex items-center gap-2 rounded-full bg-[#EEF0FF] px-3 py-1.5 font-bold text-[#000A57]"><PenTool size={13}/>REVISÃO HUMANA</span>
      <a href={`/app/help/content/${data.content.id}/preview`} class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3.5 font-semibold text-[#000A57]"><Eye size={14}/>Preview</a>
      {#if data.canEdit && data.humanReview.total > 0}
        <button type="button" disabled={savingAll} on:click={saveAll} class="application-text-caption inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 font-semibold text-white disabled:cursor-wait disabled:opacity-60">{#if savingAll}<LoaderCircle size={14} class="animate-spin"/>{:else}<Save size={14}/>{/if}{savingAll ? "Salvando..." : "Salvar tudo"}</button>
      {/if}
    </div>
  </div>

  <section class="mb-4 rounded-[18px] border border-[#D8DDF4] bg-[#F8F9FF] px-4 py-3">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div><strong class="text-[11px] font-semibold text-[#000A57]">Revisão obrigatória antes da publicação</strong><p class="mt-1 max-w-[760px] text-[10px] leading-5 text-[#5F6678]">Confira cada screenshot, escolha o melhor frame quando houver carrossel e faça as marcações necessárias. “Salvar tudo” confirma a revisão das imagens de uma vez. Se alguma imagem ainda não tiver recebido nenhuma interação, o F10 pede uma confirmação explícita para evitar esquecimentos.</p></div>
      {#if data.humanReview.total > 0}<span class={`rounded-full px-3 py-1.5 text-[9px] font-bold ${data.humanReview.pending === 0 ? "bg-[#EAF7EE] text-[#2F7045]" : "bg-[#FFF0E4] text-[#A9510D]"}`}>{data.humanReview.reviewed}/{data.humanReview.total} revisadas</span>{/if}
    </div>
  </section>

  {#if saveMessage}
    <div class={`mb-4 flex items-start gap-2 rounded-2xl border px-4 py-3 text-[10px] font-medium ${saveSuccess ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>
      {#if saveSuccess}<CheckCircle2 size={15}/>{:else}<TriangleAlert size={15}/>{/if}<span>{saveMessage}</span>
    </div>
  {/if}

  <main data-help-content-id={data.content.id}>
    <header class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
      {#if data.content.categories.length > 0}<div class="flex flex-wrap gap-2">{#each data.content.categories as category}<span class="application-text-meta inline-flex items-center gap-1.5 rounded-full bg-[#FFF3E9] px-3 py-1.5 font-bold uppercase tracking-[0.08em] text-[#B85408]"><HelpCategoryIcon name={category.icon} size={12}/>{category.name}</span>{/each}</div>{/if}
      <h1 class="mt-2 text-[24px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[30px]">{data.content.title}</h1>
      {#if data.content.summary}<HelpRichText text={data.content.summary} className="mt-2 max-w-[800px] space-y-1 text-[12px] leading-6 text-[#707788]"/>{/if}
    </header>

    {#if data.content.featuredVideo}
      {@const featuredEmbed = youtubeEmbedUrl(data.content.featuredVideo.sourceUrl)}
      <section class="mt-5 overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
        {#if featuredEmbed}<div class="aspect-video overflow-hidden bg-black"><iframe src={featuredEmbed} title={data.content.featuredVideo.altText || `Vídeo: ${data.content.title}`} class="h-full w-full" allowfullscreen></iframe></div>{:else if data.content.featuredVideo.storageKey}<video controls preload="metadata" class="aspect-video h-auto w-full bg-black" src={assetUrl(data.content.featuredVideo.id)}><track kind="captions" /></video>{:else if data.content.featuredVideo.sourceUrl}<a href={data.content.featuredVideo.sourceUrl} target="_blank" rel="noopener noreferrer" class="flex min-h-20 items-center justify-between gap-3 px-5 py-4 text-[11px] font-semibold text-[#000A57]"><span class="inline-flex items-center gap-2"><PlayCircle size={18}/>Assistir ao vídeo principal</span><ExternalLink size={13}/></a>{/if}
      </section>
      <section class="mt-3 flex items-start gap-3 rounded-[18px] border border-[#F1D7BD] bg-[#FFF9F3] px-4 py-3 text-[#7A3B08]"><Info size={16} class="mt-0.5 shrink-0"/><p class="text-[10px] font-medium leading-5">Os ícones do sistema podem ser diferentes do atual, sempre leia os títulos de cada item.</p></section>
    {/if}

    {#if data.content.quickGuide}<section class="mt-4 rounded-[20px] border border-[#D8DDF4] bg-[#F8F9FF] px-5 py-5"><div class="flex items-center gap-2"><Sparkles size={16} class="text-[#EA6D0B]"/><h2 class="text-[13px] font-semibold text-[#000A57]">Resumo rápido</h2></div><HelpRichText text={data.content.quickGuide} className="mt-3 space-y-1.5 text-[12px] leading-6 text-[#4E5565]"/></section>{/if}

    <div class="mt-5 space-y-5">
      {#each data.content.steps as step, index}
        <section class="overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
          <header class="flex items-start gap-4 border-b border-[#EEF0F5] px-5 py-5 sm:px-6"><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#000A57] text-[12px] font-bold text-white">{index + 1}</span><div><h2 class="text-[17px] font-semibold text-[#252B3B]">{step.title}</h2>{#if step.description}<HelpRichText text={step.description} className="mt-1 space-y-1 text-[11px] leading-5 text-[#7A8190]"/>{/if}</div></header>
          <div class="space-y-5 px-5 py-6 sm:px-6">
            {#each step.blocks as block}
              {#if block.blockType === "text"}<HelpRichText text={block.textContent} className="space-y-1.5 text-[13px] leading-7 text-[#505767]"/>
              {:else if block.blockType === "notice"}<div class={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${block.noticeVariant === "warning" || block.noticeVariant === "danger" ? "border-[#F0D0C8] bg-[#FFF8F5]" : "border-[#D8DEF2] bg-[#F8F9FF]"}`}>{#if block.noticeVariant === "warning" || block.noticeVariant === "danger"}<TriangleAlert size={16}/>{:else}<Info size={16}/>{/if}<HelpRichText text={block.textContent} className="min-w-0 space-y-1 text-[11px] leading-6"/></div>
              {:else if block.blockType === "image" && block.asset}
                {@const review = data.screenshotReview.find((item) => item.blockId === block.id)}
                {@const humanStatus = data.humanReview.items.find((item) => item.blockId === block.id)}
                <HelpScreenshotReviewCarousel
                  contentId={data.content.id}
                  blockId={block.id}
                  candidates={review?.candidates ?? [{ assetId: block.asset.id, candidateIndex: 1, timeSeconds: null, recommended: false }]}
                  initialAnnotations={readHelpImageAnnotationsFromMetadata(block.metadata)}
                  reviewed={humanStatus?.reviewed ?? false}
                  disabled={!data.canEdit}
                  on:interaction={markInteraction}
                  on:replaced={() => { hasUnsavedReview = false; saveMessage = "Imagem substituída. Faça a revisão desta imagem e use “Salvar tudo”."; saveSuccess = false; }}
                />
              {:else if block.blockType === "file" && block.asset}
                {@const fileUrl = block.asset.storageKey ? assetUrl(block.asset.id) : block.asset.sourceUrl}
                {#if fileUrl}<a href={fileUrl} target="_blank" rel="noopener noreferrer" class="flex items-center justify-between rounded-2xl border border-[#E1E4EC] bg-[#FAFAFC] px-4 py-4"><span class="text-[11px] font-semibold text-[#303645]">{block.linkLabel || "Baixar arquivo"}</span><Download size={17} class="text-[#000A57]"/></a>{/if}
              {:else if block.blockType === "link" && block.linkUrl}<a href={block.linkUrl} target="_blank" rel="noopener noreferrer" class="application-text-caption inline-flex items-center gap-2 rounded-xl bg-[#EEF0FF] px-4 py-2.5 font-semibold text-[#000A57]">{block.linkLabel || "Abrir link"}<ExternalLink size={12}/></a>{/if}
            {/each}
          </div>
        </section>
      {/each}
    </div>
  </main>

  {#if data.canEdit && data.humanReview.total > 0}
    <div class="sticky bottom-4 z-20 mt-5 flex items-center justify-between gap-3 rounded-2xl border border-[#D8DDF4] bg-white/95 px-4 py-3 shadow-lg backdrop-blur"><span class="text-[9px] text-[#707788]">{data.humanReview.pending === 0 && !hasUnsavedReview ? "Todas as imagens já possuem revisão humana salva." : "Revise as imagens e salve todas as alterações antes de publicar."}</span><button type="button" disabled={savingAll} on:click={saveAll} class="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-[#000A57] px-4 text-[10px] font-semibold text-white disabled:opacity-60">{#if savingAll}<LoaderCircle size={14} class="animate-spin"/>{:else}<Save size={14}/>{/if}{savingAll ? "Salvando..." : "Salvar tudo"}</button></div>
  {/if}
</ApplicationContent>

{#if showUntouchedModal}
  <div class="fixed inset-0 z-[140] flex items-center justify-center bg-[#050A1A]/60 px-4" role="presentation">
    <section role="dialog" aria-modal="true" aria-labelledby="human-review-warning-title" class="w-full max-w-[520px] rounded-[24px] bg-white p-5 shadow-2xl sm:p-6">
      <div class="flex items-start justify-between gap-4"><div><h2 id="human-review-warning-title" class="text-[16px] font-semibold text-[#11182C]">Existem imagens sem interação</h2><p class="mt-1 text-[10px] leading-5 text-[#777D8D]">{untouchedCount} {untouchedCount === 1 ? "imagem ainda não teve" : "imagens ainda não tiveram"} troca de frame nem marcação nesta revisão.</p></div><button type="button" on:click={() => showUntouchedModal = false} class="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F3F4F7] text-[#6E7482]" aria-label="Fechar"><X size={16}/></button></div>
      <div class="mt-4 rounded-2xl border border-[#F1D7BD] bg-[#FFF9F3] px-4 py-3 text-[10px] leading-5 text-[#7A3B08]">Isso pode significar que alguma imagem foi esquecida. Se você já conferiu visualmente essas imagens e elas estão corretas como estão, confirme abaixo. Essa confirmação passa a valer como a interação humana obrigatória.</div>
      <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={savingAll} on:click={() => showUntouchedModal = false} class="min-h-10 rounded-xl border border-[#DDE1EA] px-4 text-[10px] font-semibold text-[#626979]">Voltar e revisar</button><button type="button" disabled={savingAll} on:click={() => persistAll(true)} class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 text-[10px] font-semibold text-white disabled:opacity-60">{#if savingAll}<LoaderCircle size={14} class="animate-spin"/>{:else}<CheckCircle2 size={14}/>{/if}Confirmar revisão e salvar tudo</button></div>
    </section>
  </div>
{/if}
