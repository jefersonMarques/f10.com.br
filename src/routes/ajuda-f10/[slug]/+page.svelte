<script lang="ts">
  import { onMount } from "svelte";
  import {
    ArrowLeft,
    CheckCircle2,
    Download,
    ExternalLink,
    Info,
    PlayCircle,
    TriangleAlert,
  } from "lucide-svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  function managedAssetUrl(assetId: string): string {
    return `/api/help/content/${encodeURIComponent(data.content.slug)}/assets/${assetId}`;
  }

  function youtubeEmbedUrl(value: string | null): string | null {
    if (!value) return null;
    try {
      const url = new URL(value);
      let videoId = "";
      if (url.hostname === "youtu.be") videoId = url.pathname.slice(1).split("/")[0] ?? "";
      if (
        url.hostname === "www.youtube.com" ||
        url.hostname === "youtube.com" ||
        url.hostname === "m.youtube.com"
      ) {
        if (url.pathname === "/watch") videoId = url.searchParams.get("v") ?? "";
        else if (url.pathname.startsWith("/embed/")) videoId = url.pathname.split("/")[2] ?? "";
        else if (url.pathname.startsWith("/shorts/")) videoId = url.pathname.split("/")[2] ?? "";
      }
      return /^[A-Za-z0-9_-]{6,20}$/.test(videoId)
        ? `https://www.youtube-nocookie.com/embed/${videoId}`
        : null;
    } catch {
      return null;
    }
  }

  function externalUrl(value: string): boolean {
    return /^https?:\/\//i.test(value);
  }

  onMount(() => {
    const anchor = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (!anchor.startsWith("help-")) return;
    window.setTimeout(() => {
      const element = document.getElementById(anchor);
      if (!element) return;
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("help-ai-target-highlight");
      window.setTimeout(() => element.classList.remove("help-ai-target-highlight"), 4_500);
    }, 160);
  });
</script>

<svelte:head>
  <title>{data.content.title} | Ajuda F10</title>
  <meta name="description" content={data.content.summary || `Passo a passo: ${data.content.title}`} />
</svelte:head>

<main
  class="min-h-screen bg-[#F7F8FB] text-[#10172A]"
  data-help-content-id={data.content.contentId}
  data-help-content-slug={data.content.slug}
>
  <div class="mx-auto max-w-[1080px] px-5 py-8 sm:px-8 sm:py-12">
    <a href="/ajuda-f10" class="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-[12px] font-semibold text-[#606777] transition hover:bg-white hover:text-[#000A57]">
      <ArrowLeft size={17} />Central de Ajuda
    </a>

    <header class="mt-6 rounded-[28px] border border-[#E3E6EE] bg-white px-6 py-7 shadow-[0_14px_44px_rgba(1,13,40,0.05)] sm:px-9 sm:py-9">
      {#if data.content.categories.length > 0}
        <div class="flex flex-wrap gap-2">
          {#each data.content.categories as category}
            {#if category.destinationUrl}
              <a
                href={category.destinationUrl}
                target={externalUrl(category.destinationUrl) ? "_blank" : undefined}
                rel={externalUrl(category.destinationUrl) ? "noopener noreferrer" : undefined}
                class="inline-flex items-center gap-1.5 rounded-full bg-[#FFF3E9] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#B85408] transition hover:bg-[#FFE8D6]"
              >
                {category.icon ? `${category.icon} ` : ""}{category.name}
                <ExternalLink size={10}/>
              </a>
            {:else}
              <span class="rounded-full bg-[#FFF3E9] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#B85408]">{category.icon ? `${category.icon} ` : ""}{category.name}</span>
            {/if}
          {/each}
        </div>
      {/if}
      <h1 class="mt-3 max-w-[860px] text-[30px] font-semibold tracking-[-0.04em] text-[#010D28] sm:text-[44px]">{data.content.title}</h1>
      {#if data.content.summary}<p class="mt-4 max-w-[820px] text-[14px] leading-7 text-[#6C7383] sm:text-[15px]">{data.content.summary}</p>{/if}
      <div class="mt-6 flex flex-wrap gap-2 text-[9px] font-semibold text-[#777E8E]">
        <span class="rounded-full bg-[#F4F5F8] px-3 py-1.5">{data.content.steps.length} {data.content.steps.length === 1 ? "passo" : "passos"}</span>
        <span class="rounded-full bg-[#F4F5F8] px-3 py-1.5">Atualizado {new Intl.DateTimeFormat("pt-BR").format(new Date(data.content.publishedAt))}</span>
      </div>
    </header>

    {#if data.content.featuredVideo}
      {@const videoEmbed = youtubeEmbedUrl(data.content.featuredVideo.sourceUrl)}
      <section id="help-featured-video" data-help-featured-video-id={data.content.featuredVideo.id} class="mt-7 scroll-mt-24 overflow-hidden rounded-[26px] border border-[#E3E6EE] bg-white shadow-[0_14px_44px_rgba(1,13,40,0.05)]">
        {#if videoEmbed}
          <div class="aspect-video overflow-hidden bg-black"><iframe src={videoEmbed} title={data.content.featuredVideo.altText || `Vídeo: ${data.content.title}`} class="h-full w-full" loading="eager" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>
        {:else if data.content.featuredVideo.sourceUrl}
          <a href={data.content.featuredVideo.sourceUrl} target="_blank" rel="noopener noreferrer" class="flex min-h-24 items-center justify-between gap-4 px-6 py-5 text-[#000A57] transition hover:bg-[#FAFAFC]"><span class="flex items-center gap-3"><PlayCircle size={24}/><span><strong class="block text-[13px]">Assistir ao vídeo deste conteúdo</strong><small class="mt-1 block text-[10px] text-[#7E8493]">O vídeo abre em uma nova guia.</small></span></span><ExternalLink size={16}/></a>
        {/if}
      </section>
    {/if}

    <div class="mt-7 space-y-5">
      {#each data.content.steps as step, index}
        <section id={`help-step-${step.id}`} data-help-step-id={step.id} class="scroll-mt-24 overflow-hidden rounded-[26px] border border-[#E3E6EE] bg-white transition-[box-shadow,border-color,background-color] duration-300">
          <header class="flex items-start gap-4 border-b border-[#EEF0F5] px-5 py-5 sm:px-7"><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#000A57] text-[12px] font-bold text-white">{index + 1}</span><div><h2 class="text-[18px] font-semibold tracking-[-0.02em] text-[#1F2638]">{step.title}</h2>{#if step.description}<p class="mt-1.5 text-[12px] leading-6 text-[#757C8D]">{step.description}</p>{/if}</div></header>

          <div class="space-y-5 px-5 py-6 sm:px-7">
            {#each step.blocks as block}
              <div id={`help-block-${block.id}`} data-help-block-id={block.id} data-help-block-type={block.blockType} class="scroll-mt-24 transition-[box-shadow,background-color] duration-300">
                {#if block.blockType === "text"}
                  <div class="whitespace-pre-wrap text-[14px] leading-7 text-[#4E5565]">{block.textContent}</div>
                {:else if block.blockType === "notice"}
                  <div class={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${block.noticeVariant === "warning" || block.noticeVariant === "danger" ? "border-[#F0D0C8] bg-[#FFF8F5] text-[#7D493D]" : "border-[#D8DEF2] bg-[#F8F9FF] text-[#4D587A]"}`}>{#if block.noticeVariant === "warning" || block.noticeVariant === "danger"}<TriangleAlert size={17} class="mt-0.5 shrink-0"/>{:else}<Info size={17} class="mt-0.5 shrink-0"/>{/if}<p class="text-[12px] leading-6">{block.textContent}</p></div>
                {:else if block.blockType === "image" && block.asset}
                  {@const imageUrl = block.asset.storageKey ? managedAssetUrl(block.asset.id) : block.asset.sourceUrl}
                  {#if imageUrl}<figure class="overflow-hidden rounded-2xl border border-[#E6E8EE] bg-[#FAFAFC]"><img src={imageUrl} alt={block.asset.altText || "Imagem do passo"} loading="lazy" class="h-auto w-full object-contain" />{#if block.asset.altText}<figcaption class="border-t border-[#ECEEF3] px-4 py-2.5 text-[9px] text-[#848A99]">{block.asset.altText}</figcaption>{/if}</figure>{/if}
                {:else if block.blockType === "file" && block.asset}
                  {@const fileUrl = block.asset.storageKey ? managedAssetUrl(block.asset.id) : block.asset.sourceUrl}
                  {#if fileUrl}<a href={fileUrl} target="_blank" rel="noopener noreferrer" class="flex items-center justify-between gap-3 rounded-2xl border border-[#E1E4EC] bg-[#FAFAFC] px-4 py-4 transition hover:border-[#C8CEE0]"><span><strong class="block text-[11px] text-[#303645]">{block.linkLabel || "Baixar arquivo"}</strong><small class="mt-1 block text-[9px] text-[#8A909E]">Material complementar</small></span><Download size={18} class="text-[#000A57]"/></a>{/if}
                {:else if block.blockType === "link" && block.linkUrl}
                  <a href={block.linkUrl} target="_blank" rel="noopener noreferrer" class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#EEF0FF] px-4 text-[11px] font-semibold text-[#000A57]">{block.linkLabel || "Abrir link"}<ExternalLink size={13}/></a>
                {/if}
              </div>
            {/each}
          </div>
        </section>
      {/each}
    </div>

    <section class="mt-7 flex items-center gap-3 rounded-[22px] border border-[#D8E9DE] bg-[#F4FBF6] px-5 py-4 text-[#356347]"><CheckCircle2 size={19}/><div><strong class="block text-[11px]">Conteúdo concluído</strong><span class="mt-1 block text-[9px] text-[#6E8C78]">Use o assistente deste artigo se quiser esclarecer algum ponto deste procedimento.</span></div></section>
  </div>
</main>

<style>
  :global(.help-ai-target-highlight) {
    animation: help-ai-target-pulse 1.2s ease-out 2;
    outline: 3px solid rgba(234, 109, 11, 0.7);
    outline-offset: 4px;
    border-radius: 18px;
  }
  @keyframes help-ai-target-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(234, 109, 11, 0); }
    45% { box-shadow: 0 0 0 10px rgba(234, 109, 11, 0.16); }
  }
</style>
