<script lang="ts">
  import { enhance } from "$app/forms";
  import type { SubmitFunction } from "@sveltejs/kit";
  import { ArrowRight, BookOpenCheck, CircleAlert, GraduationCap, LoaderCircle, Sparkles } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  let generating = false;

  const enhanceCreate: SubmitFunction = () => {
    generating = true;
    return async ({ update }) => {
      try {
        await update({ reset: false });
      } finally {
        generating = false;
      }
    };
  };

  function statusLabel(status: string, currentVersion: number): string {
    if (status === "published") return "Publicada";
    if (status === "archived") return "Arquivada";
    if (currentVersion > 0) return "Alterações não publicadas";
    return "Rascunho";
  }
</script>

<svelte:head><title>Trilhas | F10 Operations</title></svelte:head>

<ApplicationContent width="wide">
  <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <ApplicationBackLink href="/app/help/content" label="Base de Conhecimento" />
      <h1 class="mt-3 text-[20px] font-semibold text-[#11182C]">Trilhas</h1>
      <p class="mt-1 max-w-[760px] text-[14px] leading-5 text-[#7B8291]">A trilha não mantém um segundo conteúdo. Ela transforma um conteúdo já publicado em uma orientação prática e reutiliza o mesmo vídeo e as mesmas imagens.</p>
    </div>
    <a href="/app/settings/ai" class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-4 text-[12px] font-semibold text-[#000A57]"><Sparkles size={14}/>Configurar IA</a>
  </div>

  {#if form?.message}
    <div class="mb-4 flex items-start gap-3 rounded-2xl border border-[#F0C8C8] bg-[#FFF5F5] px-4 py-3 text-[14px] font-medium text-[#9B2C2C]"><CircleAlert size={17}/>{form.message}</div>
  {/if}

  <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
    <section class="overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
      <header class="border-b border-[#EEF0F5] px-5 py-4 sm:px-6">
        <h2 class="text-[15px] font-semibold text-[#11182C]">Trilhas cadastradas</h2>
        <p class="mt-1 text-[12px] text-[#858A98]">{data.paths.length} {data.paths.length === 1 ? "trilha" : "trilhas"}</p>
      </header>

      {#if data.paths.length === 0}
        <div class="px-6 py-16 text-center">
          <GraduationCap size={36} class="mx-auto text-[#B6BBC7]"/>
          <p class="mt-4 text-[14px] font-semibold text-[#4B5160]">Nenhuma trilha criada</p>
          <p class="mt-1 text-[14px] text-[#9297A5]">Publique um conteúdo e gere a primeira orientação ao lado.</p>
        </div>
      {:else}
        <div class="divide-y divide-[#EEF0F5]">
          {#each data.paths as path}
            <a href={`/app/help/trilhas/${path.id}`} class="block px-5 py-4 transition hover:bg-[#FAFAFC] sm:px-6">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <strong class="text-[14px] font-semibold text-[#252B3B]">{path.title}</strong>
                    <span class={`rounded-full px-2 py-1 text-[12px] font-bold uppercase tracking-[0.05em] ${path.status === "published" ? "bg-[#EEF8F1] text-[#2F7045]" : path.status === "archived" ? "bg-[#F1F1F3] text-[#676D7D]" : "bg-[#EEF0FF] text-[#000A57]"}`}>{statusLabel(path.status, path.currentVersion)}</span>
                  </div>
                  <p class="mt-1 text-[12px] text-[#858B99]">{path.sourcePublicationSnapshot?.title ?? "Conteúdo publicado"} · {path.stepCount} orientações</p>
                  {#if path.description}<p class="mt-2 line-clamp-2 text-[12px] leading-5 text-[#747B8A]">{path.description}</p>{/if}
                </div>
                <div class="flex shrink-0 items-center gap-4">
                  <span class="text-right"><strong class="block text-[14px] text-[#11182C]">{path.completedCount}</strong><small class="text-[12px] text-[#8B909D]">concluíram</small></span>
                  <ArrowRight size={16} class="text-[#000A57]"/>
                </div>
              </div>
            </a>
          {/each}
        </div>
      {/if}
    </section>

    <aside>
      <section class="rounded-[22px] border border-[#D8DDF4] bg-[#F8F9FF] p-5">
        <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#EA6D0B] shadow-sm"><BookOpenCheck size={19}/></span>
        <h2 class="mt-4 text-[15px] font-semibold text-[#11182C]">Nova trilha</h2>
        <p class="mt-1 text-[12px] leading-5 text-[#747B8A]">Selecione a publicação que será a fonte. A IA cria as orientações e identifica em que ponto o vídeo deve começar em cada etapa.</p>

        {#if data.publishedContents.length === 0}
          <div class="mt-4 rounded-xl border border-dashed border-[#CDD2DD] bg-white px-4 py-4 text-[12px] leading-5 text-[#777D8C]">
            Nenhum conteúdo publicado está disponível. Finalize a revisão na Base de Conhecimento e publique antes de criar uma trilha.
          </div>
          <a href="/app/help/content" class="mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#000A57] px-3 text-[14px] font-semibold text-white">Ir para conteúdos<ArrowRight size={12}/></a>
        {:else if data.canEdit}
          <form method="POST" action="?/create" use:enhance={enhanceCreate} class="mt-4 space-y-3">
            <label class="block">
              <span class="mb-1.5 block text-[14px] font-semibold text-[#555B6A]">Conteúdo publicado</span>
              <select name="contentId" required class="h-11 w-full rounded-xl border border-[#D5D9E3] bg-white px-3 text-[12px] text-[#3F4656]">
                <option value="">Selecione...</option>
                {#each data.publishedContents as content}
                  <option value={content.contentId}>{content.title}</option>
                {/each}
              </select>
            </label>
            <button type="submit" disabled={generating} class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#EA6D0B] px-4 text-[12px] font-semibold text-white disabled:cursor-wait disabled:opacity-60">
              {#if generating}<LoaderCircle size={14} class="animate-spin"/>Gerando trilha...{:else}<Sparkles size={14}/>Gerar com IA{/if}
            </button>
            <p class="text-[12px] leading-4 text-[#8A90A0]">O conteúdo original não é alterado. A trilha guarda uma cópia da publicação usada como fonte e referencia os mesmos assets.</p>
          </form>
        {/if}
      </section>
    </aside>
  </div>
</ApplicationContent>
