<script lang="ts">
  import { Download, ExternalLink, Info, PlayCircle, Sparkles, TriangleAlert } from "lucide-svelte";
  import HelpRichText from "$lib/components/help/HelpRichText.svelte";

  type Asset = {
    id: string;
    assetType: "image" | "video" | "file";
    sourceUrl: string | null;
    storageKey: string | null;
    altText: string;
  };

  type SourceContent = {
    contentId: string;
    slug: string;
    title: string;
    summary: string;
    quickGuide: string;
    featuredVideo: Asset | null;
    steps: Array<{
      id: string;
      title: string;
      description: string;
      blocks: Array<{
        id: string;
        blockType: "text" | "image" | "notice" | "link" | "file";
        textContent: string;
        linkUrl: string | null;
        linkLabel: string | null;
        noticeVariant: string | null;
        asset: Asset | null;
      }>;
    }>;
  };

  export let sourceContent: SourceContent;
  export let assetBasePath: string;

  function assetUrl(asset: Asset): string | null {
    if (asset.storageKey) return `${assetBasePath}/${asset.id}`;
    return asset.sourceUrl;
  }

  function youtubeEmbedUrl(value: string | null): string | null {
    if (!value) return null;
    try {
      const url = new URL(value);
      let videoId = "";
      if (url.hostname === "youtu.be") videoId = url.pathname.slice(1).split("/")[0] ?? "";
      if (url.hostname.endsWith("youtube.com")) {
        if (url.pathname === "/watch") videoId = url.searchParams.get("v") ?? "";
        else if (url.pathname.startsWith("/embed/") || url.pathname.startsWith("/shorts/")) {
          videoId = url.pathname.split("/")[2] ?? "";
        }
      }
      return /^[A-Za-z0-9_-]{6,20}$/.test(videoId)
        ? `https://www.youtube-nocookie.com/embed/${videoId}`
        : null;
    } catch {
      return null;
    }
  }
</script>

<main class="min-h-[100dvh] bg-[#F7F8FB] pb-28 text-[#10172A]">
  <div class="mx-auto max-w-[1080px] px-5 py-8 sm:px-8 sm:py-10">
    <header class="rounded-[28px] border border-[#E3E6EE] bg-white px-6 py-7 shadow-[0_14px_44px_rgba(1,13,40,0.05)] sm:px-9 sm:py-9">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <span class="text-[9px] font-bold uppercase tracking-[0.12em] text-[#EA6D0B]">Conteúdo da trilha</span>
        <a href={`/ajuda-f10/${sourceContent.slug}`} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-[9px] font-semibold text-[#000A57]">Abrir conteúdo original<ExternalLink size={11}/></a>
      </div>
      <h1 class="mt-3 max-w-[860px] text-[30px] font-semibold tracking-[-0.04em] text-[#010D28] sm:text-[42px]">{sourceContent.title}</h1>
      {#if sourceContent.summary}<HelpRichText text={sourceContent.summary} className="mt-4 max-w-[820px] space-y-1 text-[13px] leading-7 text-[#6C7383]"/>{/if}
    </header>

    {#if sourceContent.featuredVideo}
      {@const videoUrl = assetUrl(sourceContent.featuredVideo)}
      {@const videoEmbed = youtubeEmbedUrl(sourceContent.featuredVideo.sourceUrl)}
      <section class="mt-6 overflow-hidden rounded-[26px] border border-[#E3E6EE] bg-white shadow-[0_14px_44px_rgba(1,13,40,0.05)]">
        {#if videoEmbed}
          <div class="aspect-video overflow-hidden bg-black"><iframe src={videoEmbed} title={sourceContent.featuredVideo.altText || sourceContent.title} class="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>
        {:else if videoUrl && sourceContent.featuredVideo.storageKey}
          <video controls preload="metadata" class="aspect-video h-auto w-full bg-black" src={videoUrl}><track kind="captions" /></video>
        {:else if videoUrl}
          <a href={videoUrl} target="_blank" rel="noopener noreferrer" class="flex min-h-24 items-center justify-between gap-4 px-6 py-5 text-[#000A57]"><span class="flex items-center gap-3"><PlayCircle size={23}/><span><strong class="block text-[12px]">Assistir ao vídeo</strong><small class="mt-1 block text-[9px] text-[#7E8493]">Abre em uma nova guia.</small></span></span><ExternalLink size={15}/></a>
        {/if}
      </section>
    {/if}

    {#if sourceContent.quickGuide}
      <section class="mt-4 rounded-[24px] border border-[#D8DDF4] bg-[#F8F9FF] px-5 py-5 sm:px-7">
        <div class="flex items-center gap-2"><Sparkles size={16} class="text-[#EA6D0B]"/><h2 class="text-[14px] font-semibold text-[#000A57]">Resumo rápido</h2></div>
        <HelpRichText text={sourceContent.quickGuide} className="mt-4 space-y-1.5 text-[12px] leading-6 text-[#454D62]"/>
      </section>
    {/if}

    <div class="mt-6 space-y-4">
      {#each sourceContent.steps as step, index}
        <section class="overflow-hidden rounded-[24px] border border-[#E3E6EE] bg-white">
          <header class="flex items-start gap-4 border-b border-[#EEF0F5] px-5 py-5 sm:px-7">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#000A57] text-[11px] font-bold text-white">{index + 1}</span>
            <div><h2 class="text-[16px] font-semibold text-[#1F2638]">{step.title}</h2>{#if step.description}<HelpRichText text={step.description} className="mt-1.5 space-y-1 text-[11px] leading-5 text-[#757C8D]"/>{/if}</div>
          </header>
          <div class="space-y-4 px-5 py-5 sm:px-7">
            {#each step.blocks as block}
              {#if block.blockType === "text"}
                <HelpRichText text={block.textContent} className="space-y-1.5 text-[13px] leading-7 text-[#4E5565]"/>
              {:else if block.blockType === "notice"}
                <div class={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${block.noticeVariant === "warning" || block.noticeVariant === "danger" ? "border-[#F0D0C8] bg-[#FFF8F5] text-[#7D493D]" : "border-[#D8DEF2] bg-[#F8F9FF] text-[#4D587A]"}`}>{#if block.noticeVariant === "warning" || block.noticeVariant === "danger"}<TriangleAlert size={16} class="mt-0.5 shrink-0"/>{:else}<Info size={16} class="mt-0.5 shrink-0"/>{/if}<HelpRichText text={block.textContent} className="min-w-0 space-y-1 text-[11px] leading-5"/></div>
              {:else if block.blockType === "image" && block.asset}
                {@const imageUrl = assetUrl(block.asset)}
                {#if imageUrl}<figure class="overflow-hidden rounded-2xl border border-[#E6E8EE] bg-[#FAFAFC]"><img src={imageUrl} alt={block.asset.altText || "Imagem do passo"} class="max-h-[620px] w-full object-contain"/>{#if block.asset.altText}<figcaption class="border-t border-[#ECEEF3] px-4 py-2 text-[8px] text-[#848A99]">{block.asset.altText}</figcaption>{/if}</figure>{/if}
              {:else if block.blockType === "file" && block.asset}
                {@const fileUrl = assetUrl(block.asset)}
                {#if fileUrl}<a href={fileUrl} target="_blank" rel="noopener noreferrer" class="flex items-center justify-between rounded-2xl border border-[#E1E4EC] bg-[#FAFAFC] px-4 py-4"><span><strong class="block text-[10px] text-[#303645]">{block.linkLabel || "Baixar arquivo"}</strong><small class="mt-1 block text-[8px] text-[#8A909E]">Material complementar</small></span><Download size={17} class="text-[#000A57]"/></a>{/if}
              {:else if block.blockType === "link" && block.linkUrl}
                <a href={block.linkUrl} target="_blank" rel="noopener noreferrer" class="inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#EEF0FF] px-4 text-[10px] font-semibold text-[#000A57]">{block.linkLabel || "Abrir link"}<ExternalLink size={12}/></a>
              {/if}
            {/each}
          </div>
        </section>
      {/each}
    </div>
  </div>
</main>
