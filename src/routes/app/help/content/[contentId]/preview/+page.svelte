<script lang="ts">
  import { ArrowLeft, Download, ExternalLink, Eye, Info, PlayCircle, TriangleAlert } from "lucide-svelte";
  import type { PageData } from "./$types";
  export let data: PageData;

  function assetUrl(assetId: string): string { return `/api/app/help/assets/${assetId}`; }
  function youtubeEmbedUrl(value: string | null): string | null {
    if (!value) return null;
    try {
      const url = new URL(value); let id = "";
      if (url.hostname === "youtu.be") id = url.pathname.slice(1).split("/")[0] ?? "";
      if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) {
        if (url.pathname === "/watch") id = url.searchParams.get("v") ?? "";
        else if (url.pathname.startsWith("/embed/") || url.pathname.startsWith("/shorts/")) id = url.pathname.split("/")[2] ?? "";
      }
      return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    } catch { return null; }
  }
</script>

<svelte:head><title>Preview: {data.content.title} | F10 Operations</title></svelte:head>

<div class="mx-auto max-w-[1080px] px-5 py-7 sm:px-8 sm:py-9">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <a href={`/app/help/content/${data.content.id}`} class="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-[11px] font-semibold text-[#5F6575]"><ArrowLeft size={16}/>Voltar ao editor</a>
    <span class="inline-flex items-center gap-2 rounded-full bg-[#FFF0E4] px-3 py-1.5 text-[9px] font-bold text-[#A9510D]"><Eye size={13}/>PREVIEW DO RASCUNHO</span>
  </div>

  <header class="mt-5 rounded-[26px] border border-[#E2E5ED] bg-white p-6 sm:p-8">
    {#if data.content.category}<p class="text-[9px] font-bold uppercase tracking-[0.13em] text-[#EA6D0B]">{data.content.category}</p>{/if}
    <h1 class="mt-2 text-[30px] font-semibold tracking-[-0.04em] text-[#010D28] sm:text-[40px]">{data.content.title}</h1>
    {#if data.content.summary}<p class="mt-3 max-w-[800px] text-[13px] leading-7 text-[#707788]">{data.content.summary}</p>{/if}
  </header>

  <div class="mt-6 space-y-5">
    {#each data.content.steps as step, index}
      <section class="overflow-hidden rounded-[24px] border border-[#E2E5ED] bg-white">
        <header class="flex items-start gap-4 border-b border-[#EEF0F5] px-5 py-5 sm:px-7"><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#000A57] text-[12px] font-bold text-white">{index + 1}</span><div><h2 class="text-[17px] font-semibold text-[#252B3B]">{step.title}</h2>{#if step.description}<p class="mt-1 text-[11px] leading-5 text-[#7A8190]">{step.description}</p>{/if}</div></header>
        <div class="space-y-5 px-5 py-6 sm:px-7">
          {#each step.blocks as block}
            {#if block.blockType === "text"}<p class="whitespace-pre-wrap text-[13px] leading-7 text-[#505767]">{block.textContent}</p>
            {:else if block.blockType === "notice"}<div class={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${block.noticeVariant === "warning" || block.noticeVariant === "danger" ? "border-[#F0D0C8] bg-[#FFF8F5]" : "border-[#D8DEF2] bg-[#F8F9FF]"}`}>{#if block.noticeVariant === "warning" || block.noticeVariant === "danger"}<TriangleAlert size={16}/>{:else}<Info size={16}/>{/if}<p class="text-[11px] leading-6">{block.textContent}</p></div>
            {:else if block.blockType === "image" && block.asset}{@const imageUrl = block.asset.storageKey ? assetUrl(block.asset.id) : block.asset.sourceUrl}{#if imageUrl}<img src={imageUrl} alt={block.asset.altText || "Imagem do passo"} class="w-full rounded-2xl border border-[#E6E8EE] object-contain" />{/if}
            {:else if block.blockType === "video" && block.asset}{@const embed = youtubeEmbedUrl(block.asset.sourceUrl)}{#if embed}<div class="aspect-video overflow-hidden rounded-2xl bg-black"><iframe src={embed} title={block.asset.altText || step.title} class="h-full w-full" allowfullscreen></iframe></div>{:else if block.asset.sourceUrl}<a href={block.asset.sourceUrl} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 text-[11px] font-semibold text-[#000A57]"><PlayCircle size={16}/>Abrir vídeo<ExternalLink size={12}/></a>{/if}
            {:else if block.blockType === "file" && block.asset}{@const fileUrl = block.asset.storageKey ? assetUrl(block.asset.id) : block.asset.sourceUrl}{#if fileUrl}<a href={fileUrl} target="_blank" class="flex items-center justify-between rounded-2xl border border-[#E1E4EC] bg-[#FAFAFC] px-4 py-4"><span class="text-[11px] font-semibold text-[#303645]">{block.linkLabel || "Baixar arquivo"}</span><Download size={17} class="text-[#000A57]"/></a>{/if}
            {:else if block.blockType === "link" && block.linkUrl}<a href={block.linkUrl} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 rounded-xl bg-[#EEF0FF] px-4 py-2.5 text-[10px] font-semibold text-[#000A57]">{block.linkLabel || "Abrir link"}<ExternalLink size={12}/></a>{/if}
          {/each}
        </div>
      </section>
    {/each}
  </div>
</div>
