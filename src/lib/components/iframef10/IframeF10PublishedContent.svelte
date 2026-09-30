<script lang="ts">
  import { ArrowLeft, Download, ExternalLink, Info, PlayCircle, TriangleAlert } from "lucide-svelte";
  import HelpRichText from "$lib/components/help/HelpRichText.svelte";

  type Asset = {
    id: string;
    assetType: "image" | "video" | "file";
    sourceUrl: string | null;
    storageKey: string | null;
    altText: string;
  };
  type Block = {
    id: string;
    blockType: "text" | "image" | "notice" | "link" | "file";
    textContent: string;
    linkUrl: string | null;
    linkLabel: string | null;
    noticeVariant: string | null;
    asset: Asset | null;
  };
  type Step = { id: string; title: string; description: string; blocks: Block[] };
  type Content = {
    slug: string;
    title: string;
    summary: string;
    quickGuide: string;
    categories: Array<{ id: string; name: string }>;
    featuredVideo: Asset | null;
    steps: Step[];
    publishedAt: string | Date;
  };

  export let content: Content;
  export let backHref: string;
  export let eyebrow = "F10";

  function assetUrl(asset: Asset): string | null {
    if (asset.storageKey) return `/api/help/content/${encodeURIComponent(content.slug)}/assets/${asset.id}`;
    return asset.sourceUrl;
  }

  function youtubeEmbedUrl(value: string | null): string | null {
    if (!value) return null;
    try {
      const url = new URL(value);
      let id = "";
      if (url.hostname === "youtu.be") id = url.pathname.slice(1).split("/")[0] ?? "";
      if (url.hostname.includes("youtube.com")) {
        id = url.searchParams.get("v") ?? (url.pathname.startsWith("/embed/") || url.pathname.startsWith("/shorts/") ? url.pathname.split("/")[2] ?? "" : "");
      }
      return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    } catch {
      return null;
    }
  }
</script>

<div class="px-4 py-5 sm:px-6 sm:py-7">
  <div class="mx-auto max-w-[1280px]">
    <a href={backHref} class="inline-flex h-9 items-center gap-2 rounded-xl px-2 text-[11px] font-semibold text-[#666D7D] hover:bg-white hover:text-[#000A57]"><ArrowLeft size={15}/>Voltar</a>

    <header class="mt-3 rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-7">
      <p class="text-[9px] font-bold uppercase tracking-[0.14em] text-[#EA6D0B]">{eyebrow}</p>
      <h1 class="mt-2 text-[24px] font-semibold tracking-[-0.035em] text-[#202637] sm:text-[32px]">{content.title}</h1>
      {#if content.summary}<HelpRichText text={content.summary} className="mt-3 space-y-1 text-[12px] leading-6 text-[#697080]"/>{/if}
      <div class="mt-4 flex flex-wrap gap-2 text-[9px] font-semibold text-[#858B99]">
        {#each content.categories as category}<span class="rounded-full bg-[#F3F4F7] px-2.5 py-1">{category.name}</span>{/each}
        <span class="rounded-full bg-[#F3F4F7] px-2.5 py-1">{new Intl.DateTimeFormat("pt-BR").format(new Date(content.publishedAt))}</span>
      </div>
    </header>

    {#if content.featuredVideo}
      {@const videoUrl = assetUrl(content.featuredVideo)}
      {@const embedUrl = youtubeEmbedUrl(content.featuredVideo.sourceUrl)}
      <section class="mt-4 overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
        {#if embedUrl}<iframe src={embedUrl} title={content.featuredVideo.altText || content.title} class="aspect-video w-full" allowfullscreen></iframe>
        {:else if videoUrl}<video controls preload="metadata" class="aspect-video w-full bg-black" src={videoUrl}></video>
        {:else}<div class="flex items-center gap-2 p-5 text-[11px] text-[#697080]"><PlayCircle size={17}/>Vídeo indisponível.</div>{/if}
      </section>
    {/if}

    {#if content.quickGuide}
      <section class="mt-4 rounded-[20px] border border-[#D8DDF4] bg-[#F8F9FF] p-5"><div class="flex items-center gap-2 text-[#000A57]"><Info size={15}/><strong class="text-[12px]">Resumo rápido</strong></div><HelpRichText text={content.quickGuide} className="mt-3 space-y-1 text-[12px] leading-6 text-[#555D6C]"/></section>
    {/if}

    <div class="mt-4 space-y-3">
      {#each content.steps as step, index}
        <section class="overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
          <header class="flex items-start gap-3 border-b border-[#EEF0F5] px-5 py-4"><span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#000A57] text-[10px] font-bold text-white">{index + 1}</span><div><h2 class="text-[15px] font-semibold text-[#303746]">{step.title}</h2>{#if step.description}<HelpRichText text={step.description} className="mt-1 text-[11px] leading-5 text-[#777E8D]"/>{/if}</div></header>
          <div class="space-y-4 p-5">
            {#each step.blocks as block}
              {#if block.blockType === "text"}<HelpRichText text={block.textContent} className="space-y-1 text-[13px] leading-7 text-[#4E5565]"/>
              {:else if block.blockType === "notice"}<div class={`flex items-start gap-2 rounded-xl border px-4 py-3 text-[11px] leading-5 ${block.noticeVariant === "warning" || block.noticeVariant === "danger" ? "border-[#F0D0C8] bg-[#FFF8F5] text-[#7D493D]" : "border-[#D8DEF2] bg-[#F8F9FF] text-[#4D587A]"}`}>{#if block.noticeVariant === "warning" || block.noticeVariant === "danger"}<TriangleAlert size={15}/>{:else}<Info size={15}/>{/if}<HelpRichText text={block.textContent}/></div>
              {:else if block.blockType === "image" && block.asset}{@const url = assetUrl(block.asset)}{#if url}<figure class="overflow-hidden rounded-xl border border-[#E6E8EE] bg-[#FAFAFC]"><img src={url} alt={block.asset.altText || "Imagem"} class="h-auto w-full"/>{#if block.asset.altText}<figcaption class="border-t border-[#ECEEF3] px-3 py-2 text-[9px] text-[#858B99]">{block.asset.altText}</figcaption>{/if}</figure>{/if}
              {:else if block.blockType === "file" && block.asset}{@const url = assetUrl(block.asset)}{#if url}<a href={url} target="_blank" rel="noreferrer" class="flex items-center justify-between rounded-xl border border-[#E1E4EC] bg-[#FAFAFC] px-4 py-3 text-[11px] font-semibold text-[#303746]"><span>{block.linkLabel || "Baixar arquivo"}</span><Download size={16}/></a>{/if}
              {:else if block.blockType === "link" && block.linkUrl}<a href={block.linkUrl} target="_blank" rel="noreferrer" class="inline-flex h-10 items-center gap-2 rounded-xl bg-[#EEF0FF] px-4 text-[11px] font-semibold text-[#000A57]">{block.linkLabel || "Abrir link"}<ExternalLink size={13}/></a>{/if}
            {/each}
          </div>
        </section>
      {/each}
    </div>
  </div>
</div>
