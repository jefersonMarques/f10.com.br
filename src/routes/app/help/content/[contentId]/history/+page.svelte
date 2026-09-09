<script lang="ts">
  import { ArrowUpRight, CheckCircle2, History, RotateCcw } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
</script>

<svelte:head><title>Histórico | {data.content.title} | F10 Operations</title></svelte:head>

<ApplicationContent width="standard">
  <div class="mb-4 flex items-center justify-between gap-3">
    <ApplicationBackLink href={`/app/help/content/${data.content.id}/images`} label="Revisar conteúdo" />
  </div>

  <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
    <div class="flex items-start gap-3">
      <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><History size={19}/></span>
      <div>
        <h1 class="text-[18px] font-semibold text-[#11182C]">Histórico</h1>
        <p class="mt-1 text-[10px] text-[#858A98]">{data.content.title}</p>
      </div>
    </div>

    {#if form?.message}
      <div class="mt-4 rounded-xl border border-[#F0C8C8] bg-[#FFF5F5] px-4 py-3 text-[10px] font-medium text-[#9B2C2C]">{form.message}</div>
    {/if}

    <div class="mt-5 overflow-hidden rounded-2xl border border-[#E2E5ED]">
      {#if data.releases.length === 0}
        <div class="px-5 py-10 text-center text-[10px] text-[#9297A5]">Ainda não há versões publicadas.</div>
      {:else}
        <div class="divide-y divide-[#EEF0F5]">
          {#each data.releases as release}
            <article class="flex flex-col gap-3 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div class="flex items-center gap-3">
                <span class={`flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-[10px] font-bold ${release.releaseNumber === data.currentReleaseNumber ? "bg-[#000A57] text-white" : "bg-[#F3F4F7] text-[#555D6C]"}`}>v{release.releaseNumber}</span>
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <strong class="text-[11px] text-[#303645]">{dateFormatter.format(new Date(release.publishedAt))}</strong>
                    {#if release.releaseNumber === data.currentReleaseNumber}
                      <span class="inline-flex items-center gap-1 rounded-full bg-[#EAF7EE] px-2 py-1 text-[8px] font-bold text-[#2D7143]"><CheckCircle2 size={10}/>Atual</span>
                    {/if}
                  </div>
                  {#if release.changeSummary}<p class="mt-1 text-[9px] text-[#858A98]">{release.changeSummary}</p>{/if}
                </div>
              </div>

              <div class="flex flex-wrap gap-2">
                <a
                  href={release.releaseNumber === data.currentReleaseNumber ? `/ajuda-f10/${data.content.slug}` : `/ajuda-f10/${data.content.slug}?versao=${release.releaseNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[9px] font-semibold text-[#000A57]"
                ><ArrowUpRight size={12}/>Ver</a>
                {#if data.canEdit && release.canRestore}
                  <form method="POST" action="?/restore">
                    <input type="hidden" name="releaseNumber" value={release.releaseNumber}/>
                    <button type="submit" class="inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#EEF0FF] px-3 text-[9px] font-semibold text-[#000A57]"><RotateCcw size={12}/>Restaurar rascunho</button>
                  </form>
                {/if}
              </div>
            </article>
          {/each}
        </div>
      {/if}
    </div>
  </section>
</ApplicationContent>
