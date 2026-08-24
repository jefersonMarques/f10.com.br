<script lang="ts">
  import { Download, ExternalLink, Eye, Info, PlayCircle, TriangleAlert } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
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

<svelte:head><title>Preview: {data.content.title} | F10 Operations</title></svelte:head>

<ApplicationContent width="standard">
  <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
    <ApplicationBackLink href={`/app/help/content/${data.content.id}`} label="Editor" />
    <span class="application-text-meta inline-flex items-center gap-2 rounded-full bg-[#FFF0E4] px-3 py-1.5 font-bold text-[#A9510D]"><Eye size={13}/>PREVIEW DO RASCUNHO</span>
  </div>

  <main data-help-content-id={data.content.id} data-help-content-slug={data.content.slug}>
    <header class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
      {#if data.content.categories.length > 0}
        <div class="flex flex-wrap gap-2">
          {#each data.content.categories as category}
            <span class="application-text-meta rounded-full bg-[#FFF3E9] px-3 py-1.5 font-bold uppercase tracking-[0.08em] text-[#B85408]">{category.icon ? `${category.icon} ` : ""}{category.name}</span>
          {/each}
        </div>
      {/if}
      <h2 class="mt-2 text-[24px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[30px]">{data.content.title}</h2>
      {#if data.content.summary}<p class="mt-2 max-w-[800px] text-[12px] leading-6 text-[#707788]">{data.content.summary}</p>{/if}
    </header>

    {#if data.content.featuredVideo}
      {@const featuredEmbed = youtubeEmbedUrl(data.content.featuredVideo.sourceUrl)}
      <section id="help-featured-video" data-help-featured-video-id={data.content.featuredVideo.id} class="mt-5 scroll-mt-24 overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
        {#if featuredEmbed}
          <div class="aspect-video overflow-hidden bg-black"><iframe src={featuredEmbed} title={data.content.featuredVideo.altText || `Vídeo: ${data.content.title}`} class="h-full w-full" allowfullscreen></iframe></div>
        {:else if data.content.featuredVideo.sourceUrl}
          <a href={data.content.featuredVideo.sourceUrl} target="_blank" rel="noopener noreferrer" class="flex min-h-20 items-center justify-between gap-3 px-5 py-4 text-[11px] font-semibold text-[#000A57]"><span class="inline-flex items-center gap-2"><PlayCircle size={18}/>Assistir ao vídeo principal</span><ExternalLink size={13}/></a>
        {/if}
      </section>
    {/if}

    <div class="mt-5 space-y-5">
      {#each data.content.steps as step, index}
        <section id={`help-step-${step.id}`} data-help-step-id={step.id} class="scroll-mt-24 overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
          <header class="flex items-start gap-4 border-b border-[#EEF0F5] px-5 py-5 sm:px-6"><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#000A57] text-[12px] font-bold text-white">{index + 1}</span><div><h2 class="text-[17px] font-semibold text-[#252B3B]">{step.title}</h2>{#if step.description}<p class="mt-1 text-[11px] leading-5 text-[#7A8190]">{step.description}</p>{/if}</div></header>
          <div class="space-y-5 px-5 py-6 sm:px-6">
            {#each step.blocks as block}
              <div id={`help-block-${block.id}`} data-help-block-id={block.id} data-help-block-type={block.blockType} class="scroll-mt-24">
                {#if block.blockType === "text"}<p class="whitespace-pre-wrap text-[13px] leading-7 text-[#505767]">{block.textContent}</p>
                {:else if block.blockType === "notice"}<div class={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${block.noticeVariant === "warning" || block.noticeVariant === "danger" ? "border-[#F0D0C8] bg-[#FFF8F5]" : "border-[#D8DEF2] bg-[#F8F9FF]"}`}>{#if block.noticeVariant === "warning" || block.noticeVariant === "danger"}<TriangleAlert size={16}/>{:else}<Info size={16}/>{/if}<p class="text-[11px] leading-6">{block.textContent}</p></div>
                {:else if block.blockType === "image" && block.asset}{@const imageUrl = block.asset.storageKey ? assetUrl(block.asset.id) : block.asset.sourceUrl}{#if imageUrl}<img src={imageUrl} alt={block.asset.altText || "Imagem do passo"} class="w-full rounded-2xl border border-[#E6E8EE] object-contain" />{/if}
                {:else if block.blockType === "file" && block.asset}{@const fileUrl = block.asset.storageKey ? assetUrl(block.asset.id) : block.asset.sourceUrl}{#if fileUrl}<a href={fileUrl} target="_blank" rel="noopener noreferrer" class="flex items-center justify-between rounded-2xl border border-[#E1E4EC] bg-[#FAFAFC] px-4 py-4"><span class="text-[11px] font-semibold text-[#303645]">{block.linkLabel || "Baixar arquivo"}</span><Download size={17} class="text-[#000A57]"/></a>{/if}
                {:else if block.blockType === "link" && block.linkUrl}<a href={block.linkUrl} target="_blank" rel="noopener noreferrer" class="application-text-caption inline-flex items-center gap-2 rounded-xl bg-[#EEF0FF] px-4 py-2.5 font-semibold text-[#000A57]">{block.linkLabel || "Abrir link"}<ExternalLink size={12}/></a>{/if}
              </div>
            {/each}
          </div>
        </section>
      {/each}
    </div>
  </main>
</ApplicationContent>
