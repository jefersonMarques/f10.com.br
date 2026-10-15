<script lang="ts">
  import { ArrowLeft, ArrowUpRight, CircleAlert, FileText } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { PageData } from "./$types";
  export let data: PageData;
</script>

<svelte:head><title>Original Movidesk | F10 Operations</title></svelte:head>

<ApplicationContent width="wide">
  <a href="/app/help/content/movidesk" class="mb-4 inline-flex items-center gap-2 text-[13px] font-semibold text-[#596274]"><ArrowLeft size={16}/>Voltar à migração</a>
  <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
    <div class="min-w-0">
      <h1 class="text-[19px] font-semibold text-[#252C3D]">{data.article.title}</h1>
      <p class="mt-1 text-[12px] text-[#7E8593]">Cópia integral do HTML obtido pela API · ID #{data.article.sourceId}</p>
    </div>
    <div class="flex items-center gap-2">
      <a href={data.article.sourceUrl} target="_blank" rel="noopener noreferrer" class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#DDE1EA] px-3 text-[12px] font-semibold text-[#000A57]">Movidesk<ArrowUpRight size={14}/></a>
      {#if data.article.contentId}<a href={`/app/help/content/${data.article.contentId}`} class="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#000A57] px-3 text-[12px] font-semibold text-white">Editor F10<ArrowUpRight size={14}/></a>{/if}
    </div>
  </header>
  {#if data.article.issue}
    <div class="mb-4 flex items-start gap-2 rounded-xl border border-[#F1D7BD] bg-[#FFF9F3] px-4 py-3 text-[12px] text-[#81501B]"><CircleAlert size={17} class="shrink-0"/>{data.article.issue}</div>
  {/if}
  {#if data.article.attachments.length > 0}
    <div class="mb-4 rounded-xl border border-[#F1D7BD] bg-[#FFF9F3] px-4 py-3">
      <h2 class="text-[13px] font-semibold text-[#81501B]">Anexos a conferir</h2>
      <p class="mt-1 text-[12px] text-[#966732]">A API informa os nomes, mas não fornece um endereço de download neste retorno. Copie os anexos manualmente antes de encerrar o Movidesk.</p>
      <div class="mt-2 flex flex-wrap gap-2">{#each data.article.attachments as file}<span class="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[12px] text-[#5A5F6B]"><FileText size={14}/>{file.name}</span>{/each}</div>
    </div>
  {/if}
  <section class="overflow-hidden rounded-2xl border border-[#E2E5ED] bg-white">
    <div class="border-b border-[#E2E5ED] px-4 py-3 text-[13px] font-semibold text-[#303645]">Original preservado (somente leitura)</div>
    {#if data.article.sourceHtml}
      <iframe title="HTML original do artigo Movidesk" sandbox="" referrerpolicy="no-referrer" srcdoc={data.article.sourceHtml} class="h-[72dvh] min-h-[480px] w-full border-0 bg-white"></iframe>
    {:else if data.article.sourceText}
      <div class="whitespace-pre-wrap p-5 text-[13px] leading-6 text-[#4E5665]">{data.article.sourceText}</div>
    {:else}
      <p class="p-7 text-[13px] text-[#818997]">O corpo original ainda não foi recuperado da API.</p>
    {/if}
  </section>
</ApplicationContent>
