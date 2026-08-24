<script lang="ts">
  import { Download, ExternalLink, Eye, Info, PenTool, PlayCircle, Sparkles, TriangleAlert } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import HelpCategoryIcon from "$lib/components/help/HelpCategoryIcon.svelte";
  import HelpInlineImageAnnotationEditor from "$lib/components/help/HelpInlineImageAnnotationEditor.svelte";
  import HelpRichText from "$lib/components/help/HelpRichText.svelte";
  import HelpScreenshotReviewCarousel from "$lib/components/help/HelpScreenshotReviewCarousel.svelte";
  import { readHelpImageAnnotationsFromMetadata } from "$lib/help/helpImageAnnotations";
  import type { PageData } from "./$types";

  export let data: PageData;

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
</script>

<svelte:head><title>Revisar e marcar imagens | {data.content.title} | F10 Operations</title></svelte:head>

<ApplicationContent width="standard">
  <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
    <ApplicationBackLink href={`/app/help/content/${data.content.id}`} label="Editor" />
    <div class="flex flex-wrap items-center gap-2">
      <span class="application-text-meta inline-flex items-center gap-2 rounded-full bg-[#EEF0FF] px-3 py-1.5 font-bold text-[#000A57]"><PenTool size={13}/>REVISÃO + MARCAÇÃO</span>
      <a href={`/app/help/content/${data.content.id}/preview`} class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3.5 font-semibold text-[#000A57]"><Eye size={14}/>Preview</a>
    </div>
  </div>

  <section class="mb-4 rounded-[18px] border border-[#D8DDF4] bg-[#F8F9FF] px-4 py-3">
    <p class="text-[10px] leading-5 text-[#5F6678]">Percorra o artigo na ordem do Preview. Quando houver opções, confirme primeiro o screenshot mais correto; em seguida a ferramenta de marcação aparece no mesmo local. Cada passo mantém apenas uma imagem.</p>
  </section>

  <main data-help-content-id={data.content.id}>
    <header class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
      {#if data.content.categories.length > 0}
        <div class="flex flex-wrap gap-2">
          {#each data.content.categories as category}
            <span class="application-text-meta inline-flex items-center gap-1.5 rounded-full bg-[#FFF3E9] px-3 py-1.5 font-bold uppercase tracking-[0.08em] text-[#B85408]"><HelpCategoryIcon name={category.icon} size={12}/>{category.name}</span>
          {/each}
        </div>
      {/if}
      <h1 class="mt-2 text-[24px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[30px]">{data.content.title}</h1>
      {#if data.content.summary}<HelpRichText text={data.content.summary} className="mt-2 max-w-[800px] space-y-1 text-[12px] leading-6 text-[#707788]"/>{/if}
    </header>

    {#if data.content.featuredVideo}
      {@const featuredEmbed = youtubeEmbedUrl(data.content.featuredVideo.sourceUrl)}
      <section class="mt-5 overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
        {#if featuredEmbed}
          <div class="aspect-video overflow-hidden bg-black"><iframe src={featuredEmbed} title={data.content.featuredVideo.altText || `Vídeo: ${data.content.title}`} class="h-full w-full" allowfullscreen></iframe></div>
        {:else if data.content.featuredVideo.storageKey}
          <video controls preload="metadata" class="aspect-video h-auto w-full bg-black" src={assetUrl(data.content.featuredVideo.id)}><track kind="captions" /></video>
        {:else if data.content.featuredVideo.sourceUrl}
          <a href={data.content.featuredVideo.sourceUrl} target="_blank" rel="noopener noreferrer" class="flex min-h-20 items-center justify-between gap-3 px-5 py-4 text-[11px] font-semibold text-[#000A57]"><span class="inline-flex items-center gap-2"><PlayCircle size={18}/>Assistir ao vídeo principal</span><ExternalLink size={13}/></a>
        {/if}
      </section>
      <section class="mt-3 flex items-start gap-3 rounded-[18px] border border-[#F1D7BD] bg-[#FFF9F3] px-4 py-3 text-[#7A3B08]"><Info size={16} class="mt-0.5 shrink-0"/><p class="text-[10px] font-medium leading-5">Os ícones do sistema podem ser diferentes do atual, sempre leia os títulos de cada item.</p></section>
    {/if}

    {#if data.content.quickGuide}
      <section class="mt-4 rounded-[20px] border border-[#D8DDF4] bg-[#F8F9FF] px-5 py-5">
        <div class="flex items-center gap-2"><Sparkles size={16} class="text-[#EA6D0B]"/><h2 class="text-[13px] font-semibold text-[#000A57]">Resumo rápido</h2></div>
        <HelpRichText text={data.content.quickGuide} className="mt-3 space-y-1.5 text-[12px] leading-6 text-[#4E5565]"/>
      </section>
    {/if}

    <div class="mt-5 space-y-5">
      {#each data.content.steps as step, index}
        <section class="overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
          <header class="flex items-start gap-4 border-b border-[#EEF0F5] px-5 py-5 sm:px-6">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#000A57] text-[12px] font-bold text-white">{index + 1}</span>
            <div><h2 class="text-[17px] font-semibold text-[#252B3B]">{step.title}</h2>{#if step.description}<HelpRichText text={step.description} className="mt-1 space-y-1 text-[11px] leading-5 text-[#7A8190]"/>{/if}</div>
          </header>

          <div class="space-y-5 px-5 py-6 sm:px-6">
            {#each step.blocks as block}
              {#if block.blockType === "text"}
                <HelpRichText text={block.textContent} className="space-y-1.5 text-[13px] leading-7 text-[#505767]"/>
              {:else if block.blockType === "notice"}
                <div class={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${block.noticeVariant === "warning" || block.noticeVariant === "danger" ? "border-[#F0D0C8] bg-[#FFF8F5]" : "border-[#D8DEF2] bg-[#F8F9FF]"}`}>
                  {#if block.noticeVariant === "warning" || block.noticeVariant === "danger"}<TriangleAlert size={16}/>{:else}<Info size={16}/>{/if}
                  <HelpRichText text={block.textContent} className="min-w-0 space-y-1 text-[11px] leading-6"/>
                </div>
              {:else if block.blockType === "image" && block.asset}
                {@const review = data.screenshotReview.find((item) => item.blockId === block.id)}
                {#if review}
                  <HelpScreenshotReviewCarousel
                    contentId={data.content.id}
                    blockId={block.id}
                    candidates={review.candidates}
                    disabled={!data.canEdit}
                  />
                {:else}
                  {@const imageUrl = block.asset.storageKey ? assetUrl(block.asset.id) : block.asset.sourceUrl}
                  {#if imageUrl}
                    <HelpInlineImageAnnotationEditor
                      contentId={data.content.id}
                      blockId={block.id}
                      {imageUrl}
                      altText={block.asset.altText || "Screenshot do passo"}
                      initialAnnotations={readHelpImageAnnotationsFromMetadata(block.metadata)}
                      disabled={!data.canEdit}
                    />
                  {/if}
                {/if}
              {:else if block.blockType === "file" && block.asset}
                {@const fileUrl = block.asset.storageKey ? assetUrl(block.asset.id) : block.asset.sourceUrl}
                {#if fileUrl}<a href={fileUrl} target="_blank" rel="noopener noreferrer" class="flex items-center justify-between rounded-2xl border border-[#E1E4EC] bg-[#FAFAFC] px-4 py-4"><span class="text-[11px] font-semibold text-[#303645]">{block.linkLabel || "Baixar arquivo"}</span><Download size={17} class="text-[#000A57]"/></a>{/if}
              {:else if block.blockType === "link" && block.linkUrl}
                <a href={block.linkUrl} target="_blank" rel="noopener noreferrer" class="application-text-caption inline-flex items-center gap-2 rounded-xl bg-[#EEF0FF] px-4 py-2.5 font-semibold text-[#000A57]">{block.linkLabel || "Abrir link"}<ExternalLink size={12}/></a>
              {/if}
            {/each}
          </div>
        </section>
      {/each}
    </div>
  </main>
</ApplicationContent>