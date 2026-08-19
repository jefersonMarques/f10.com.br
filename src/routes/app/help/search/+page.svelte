<script lang="ts">
  import {
    BrainCircuit,
    CircleAlert,
    Search,
    SearchX,
    Sparkles,
  } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData } from "./$types";

  export let form: ActionData;
</script>

<svelte:head>
  <title>Pesquisa de Suporte | F10 Operations</title>
</svelte:head>

<ApplicationContent width="narrow">
  <ApplicationBackLink href="/app/help/content" label="Base de Conhecimento" className="mb-3" />

  <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 shadow-[0_10px_32px_rgba(1,13,40,0.04)] sm:p-6">
    <form method="POST" action="?/search">
      <label class="block">
        <span class="mb-2 block text-[12px] font-semibold text-[#303645]">O que o usuário está tentando resolver?</span>
        <div class="flex flex-col gap-3 sm:flex-row">
          <div class="relative flex-1">
            <Search size={18} class="absolute left-4 top-3.5 text-[#9297A5]" aria-hidden="true" />
            <input name="query" required maxlength="500" value={form && "query" in form ? form.query : ""} placeholder="Ex.: o aluno mudou de turma, como faço?" class="h-12 w-full rounded-xl border border-[#DDE1EA] pl-11 pr-4 text-[13px] outline-none transition focus:border-[#000A57] focus:ring-4 focus:ring-[#000A57]/10" />
          </div>
          <button type="submit" class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#000A57] px-6 text-[12px] font-semibold text-white transition hover:bg-[#111B71]"><Sparkles size={16} aria-hidden="true" />Pesquisar</button>
        </div>
      </label>
    </form>

    <div class="mt-4 flex items-start gap-2 rounded-xl bg-[#F8F9FF] px-4 py-3 text-[10px] leading-5 text-[#687087]">
      <BrainCircuit size={15} class="mt-0.5 shrink-0 text-[#000A57]" aria-hidden="true" />
      <span>Neste laboratório interno a pesquisa também considera o conhecimento exclusivo da IA. A futura busca pública usará apenas o conteúdo público publicado.</span>
    </div>
  </section>

  {#if form?.message}
    <div class={`mt-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-[11px] font-medium ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>
      {#if form.success}<Sparkles size={17} class="mt-0.5 shrink-0" aria-hidden="true" />{:else}<CircleAlert size={17} class="mt-0.5 shrink-0" aria-hidden="true" />{/if}
      <span>{form.message}</span>
    </div>
  {/if}

  {#if form && "results" in form && form.results.length > 0}
    <section class="mt-4 overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
      <header class="border-b border-[#EEF0F5] px-5 py-4 sm:px-6">
        <h2 class="text-[14px] font-semibold text-[#222839]">Resultados publicados</h2>
        <p class="mt-1 text-[10px] text-[#8A909E]">Ordenados por relevância textual, similaridade e conhecimento disponível.</p>
      </header>

      <div class="divide-y divide-[#EEF0F5]">
        {#each form.results as result}
          <article class="px-5 py-5 sm:px-6">
            <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EEF0FF] text-[10px] font-bold text-[#000A57]">{result.rank}</span>
                  <strong class="text-[13px] font-semibold text-[#202637]">{result.title}</strong>
                  {#if result.category}<span class="rounded-full bg-[#F3F4F7] px-2 py-1 text-[8px] font-semibold text-[#777D8D]">{result.category}</span>{/if}
                </div>
                {#if result.summary}<p class="mt-2 max-w-[760px] text-[11px] leading-5 text-[#747A8A]">{result.summary}</p>{/if}
                <p class="mt-2 text-[9px] text-[#A0A5B0]">/{result.slug}</p>
              </div>

              <form method="POST" action="?/select" class="shrink-0">
                <input type="hidden" name="searchEventId" value={"searchEventId" in form ? form.searchEventId ?? "" : ""} />
                <input type="hidden" name="contentId" value={result.contentId} />
                <button type="submit" class="min-h-10 rounded-xl border border-[#DDE1EA] bg-white px-4 text-[10px] font-semibold text-[#000A57] transition hover:bg-[#F8F9FF]">Abrir conteúdo</button>
              </form>
            </div>
          </article>
        {/each}
      </div>
    </section>
  {:else if form?.success && form && "results" in form}
    <section class="mt-4 rounded-[22px] border border-dashed border-[#CBD0DC] bg-white px-6 py-14 text-center">
      <SearchX size={32} class="mx-auto text-[#AEB4C1]" aria-hidden="true" />
      <h2 class="mt-4 text-[14px] font-semibold text-[#303645]">Nenhuma resposta publicada</h2>
      <p class="mx-auto mt-2 max-w-[560px] text-[11px] leading-6 text-[#818795]">Esta dúvida já entrou na telemetria. Depois ela poderá aparecer em “lacunas de conhecimento” para a equipe criar ou melhorar um conteúdo.</p>
    </section>
  {/if}
</ApplicationContent>
