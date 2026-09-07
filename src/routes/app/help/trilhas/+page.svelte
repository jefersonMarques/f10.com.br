<script lang="ts">
  import { enhance } from "$app/forms";
  import type { SubmitFunction } from "@sveltejs/kit";
  import {
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    BookOpenCheck,
    Check,
    CircleAlert,
    GraduationCap,
    Layers3,
    LoaderCircle,
    Search,
    Sparkles,
  } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  let generating = false;
  let selectedIds: string[] = [];
  let orderedIds: string[] = [];
  let builderOpen = false;
  let trailTitle = "";
  let searchQuery = "";

  $: normalizedSearch = searchQuery.trim().toLocaleLowerCase("pt-BR");
  $: visibleContents = data.publishedContents.filter((content) =>
    !normalizedSearch || content.title.toLocaleLowerCase("pt-BR").includes(normalizedSearch)
  );
  $: selectedContents = selectedIds
    .map((id) => data.publishedContents.find((content) => content.contentId === id))
    .filter((content): content is PageData["publishedContents"][number] => Boolean(content));
  $: orderedContents = orderedIds
    .map((id) => data.publishedContents.find((content) => content.contentId === id))
    .filter((content): content is PageData["publishedContents"][number] => Boolean(content));

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

  function toggleContent(contentId: string): void {
    selectedIds = selectedIds.includes(contentId)
      ? selectedIds.filter((id) => id !== contentId)
      : [...selectedIds, contentId];
  }

  function openBuilder(): void {
    orderedIds = [...selectedIds];
    if (!trailTitle.trim()) {
      const first = selectedContents[0]?.title ?? "";
      trailTitle = first ? `Trilha: ${first}` : "Nova trilha F10";
    }
    builderOpen = true;
  }

  function closeBuilder(): void {
    builderOpen = false;
  }

  function moveContent(index: number, direction: "up" | "down"): void {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= orderedIds.length) return;
    const next = [...orderedIds];
    const current = next[index];
    const target = next[targetIndex];
    if (!current || !target) return;
    next[index] = target;
    next[targetIndex] = current;
    orderedIds = next;
  }

  function statusLabel(status: string, currentVersion: number): string {
    if (status === "published") return "Publicada";
    if (status === "archived") return "Arquivada";
    if (currentVersion > 0) return "Alterações não publicadas";
    return "Rascunho";
  }
</script>

<svelte:head><title>Trilhas | F10 Operations</title></svelte:head>

<ApplicationContent width="wide">
  {#if builderOpen}
    <div class="mx-auto max-w-[980px] pb-8">
      <button type="button" on:click={closeBuilder} class="inline-flex min-h-9 items-center gap-2 rounded-lg px-1 text-[12px] font-semibold text-[#5F6676] hover:text-[#000A57]">
        <ArrowLeft size={14}/>Voltar aos conteúdos
      </button>

      <div class="mt-5 overflow-hidden rounded-[28px] border border-[#DDE1EA] bg-white shadow-[0_24px_70px_rgba(17,24,44,0.08)]">
        <div class="border-b border-[#EEF0F5] bg-[linear-gradient(135deg,#F8F9FF_0%,#FFF8F2_100%)] px-6 py-7 sm:px-8">
          <span class="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#EA6D0B] shadow-sm">
            <Layers3 size={13}/>Monte a jornada
          </span>
          <h1 class="mt-4 text-[26px] font-semibold tracking-[-0.035em] text-[#11182C] sm:text-[34px]">Defina a ordem da trilha</h1>
          <p class="mt-2 max-w-[680px] text-[13px] leading-6 text-[#747B8A]">Cada conteúdo será um módulo independente. O participante conclui um módulo, volta ao mapa da jornada e então segue para o próximo.</p>
        </div>

        <form method="POST" action="?/create" use:enhance={enhanceCreate} class="grid gap-0 lg:grid-cols-[minmax(0,1fr)_310px]">
          <section class="px-6 py-7 sm:px-8">
            <label class="block">
              <span class="mb-2 block text-[12px] font-semibold text-[#4F5667]">Nome da trilha</span>
              <input
                name="title"
                bind:value={trailTitle}
                minlength="4"
                maxlength="160"
                required
                class="h-12 w-full rounded-2xl border border-[#D7DBE5] bg-white px-4 text-[14px] font-semibold text-[#252B3B] outline-none transition focus:border-[#000A57] focus:ring-4 focus:ring-[#000A57]/[0.06]"
              />
            </label>

            {#each orderedIds as contentId}
              <input type="hidden" name="contentIds" value={contentId}/>
            {/each}

            <div class="mt-7">
              <div class="mb-4 flex items-end justify-between gap-4">
                <div>
                  <h2 class="text-[14px] font-semibold text-[#11182C]">Sequência dos módulos</h2>
                  <p class="mt-1 text-[11px] text-[#858B99]">Use as setas para definir primeiro, segundo, terceiro e assim por diante.</p>
                </div>
                <span class="shrink-0 rounded-full bg-[#F2F3F8] px-3 py-1.5 text-[10px] font-bold text-[#666D7D]">{orderedContents.length} módulos</span>
              </div>

              <div class="relative">
                <div class="absolute bottom-6 left-[19px] top-6 w-px bg-[linear-gradient(to_bottom,#EA6D0B,#D8DDF4)]"></div>
                <div class="relative space-y-3">
                  {#each orderedContents as content, index (content.contentId)}
                    <article class="relative flex gap-4 rounded-2xl border border-[#E3E6ED] bg-[#FCFCFD] p-4 transition hover:border-[#CDD2E1] hover:bg-white">
                      <span class="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white bg-[#000A57] text-[11px] font-bold text-white shadow-sm">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div class="min-w-0 flex-1 pt-1">
                        <strong class="block text-[13px] font-semibold leading-5 text-[#252B3B]">{content.title}</strong>
                        <span class="mt-1 inline-flex items-center gap-1.5 text-[10px] font-medium text-[#8B909D]"><BookOpenCheck size={11}/>Conteúdo publicado</span>
                      </div>
                      <div class="flex shrink-0 flex-col gap-1">
                        <button type="button" on:click={() => moveContent(index, "up")} disabled={index === 0} class="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DDE1EA] bg-white text-[#50586A] disabled:opacity-25" aria-label="Mover módulo para cima"><ArrowUp size={13}/></button>
                        <button type="button" on:click={() => moveContent(index, "down")} disabled={index === orderedContents.length - 1} class="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DDE1EA] bg-white text-[#50586A] disabled:opacity-25" aria-label="Mover módulo para baixo"><ArrowDown size={13}/></button>
                      </div>
                    </article>
                  {/each}
                </div>
              </div>
            </div>
          </section>

          <aside class="border-t border-[#EEF0F5] bg-[#FAFAFC] p-6 lg:border-l lg:border-t-0">
            <div class="sticky top-5">
              <span class="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF0E5] text-[#EA6D0B]"><Sparkles size={19}/></span>
              <h2 class="mt-4 text-[14px] font-semibold text-[#11182C]">Pronta para gerar</h2>
              <p class="mt-2 text-[11px] leading-5 text-[#747B8A]">A IA processará cada módulo separadamente, mantendo vídeo, imagens e orientações ligados ao artigo correto.</p>

              <div class="mt-5 space-y-2 rounded-2xl border border-[#E4E6ED] bg-white p-4">
                <div class="flex items-center justify-between text-[11px]"><span class="text-[#858B99]">Módulos</span><strong class="text-[#252B3B]">{orderedContents.length}</strong></div>
                <div class="flex items-center justify-between text-[11px]"><span class="text-[#858B99]">Ordem</span><strong class="text-[#2F7045]">Definida <Check size={11} class="ml-1 inline"/></strong></div>
              </div>

              <button type="submit" disabled={generating || trailTitle.trim().length < 4} class="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#EA6D0B] px-4 text-[12px] font-semibold text-white shadow-[0_12px_28px_rgba(234,109,11,0.18)] disabled:cursor-wait disabled:opacity-50">
                {#if generating}<LoaderCircle size={15} class="animate-spin"/>Gerando módulos...{:else}<Sparkles size={15}/>Salvar e gerar trilha{/if}
              </button>
              <p class="mt-3 text-center text-[9px] leading-4 text-[#979CA8]">A trilha só é criada depois desta confirmação.</p>
            </div>
          </aside>
        </form>
      </div>
    </div>
  {:else}
    <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <ApplicationBackLink href="/app/help/content" label="Base de Conhecimento" />
        <h1 class="mt-3 text-[20px] font-semibold text-[#11182C]">Trilhas</h1>
        <p class="mt-1 max-w-[760px] text-[14px] leading-5 text-[#7B8291]">Transforme um artigo em orientação direta ou combine vários conteúdos em uma jornada guiada, com ordem e progresso entre módulos.</p>
      </div>
      <a href="/app/settings/ai" class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-4 text-[12px] font-semibold text-[#000A57]"><Sparkles size={14}/>Configurar IA</a>
    </div>

    {#if form?.message}
      <div class="mb-4 flex items-start gap-3 rounded-2xl border border-[#F0C8C8] bg-[#FFF5F5] px-4 py-3 text-[14px] font-medium text-[#9B2C2C]"><CircleAlert size={17}/>{form.message}</div>
    {/if}

    <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section class="overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
        <header class="border-b border-[#EEF0F5] px-5 py-4 sm:px-6">
          <h2 class="text-[15px] font-semibold text-[#11182C]">Trilhas cadastradas</h2>
          <p class="mt-1 text-[12px] text-[#858A98]">{data.paths.length} {data.paths.length === 1 ? "trilha" : "trilhas"}</p>
        </header>

        {#if data.paths.length === 0}
          <div class="px-6 py-16 text-center">
            <GraduationCap size={36} class="mx-auto text-[#B6BBC7]"/>
            <p class="mt-4 text-[14px] font-semibold text-[#4B5160]">Nenhuma trilha criada</p>
            <p class="mt-1 text-[14px] text-[#9297A5]">Selecione um ou mais conteúdos publicados para criar a primeira jornada.</p>
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
                    <p class="mt-1 text-[12px] text-[#858B99]">
                      {#if path.moduleCount > 1}
                        {path.moduleCount} módulos · {path.stepCount} orientações
                      {:else}
                        {path.modules[0]?.title ?? path.sourcePublicationSnapshot?.title ?? "Conteúdo publicado"} · {path.stepCount} orientações
                      {/if}
                    </p>
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
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#EA6D0B] shadow-sm"><Layers3 size={19}/></span>
          <h2 class="mt-4 text-[15px] font-semibold text-[#11182C]">Nova trilha</h2>
          <p class="mt-1 text-[12px] leading-5 text-[#747B8A]">Selecione um artigo para manter o fluxo atual ou marque vários para montar uma jornada com módulos ordenados.</p>

          {#if data.publishedContents.length === 0}
            <div class="mt-4 rounded-xl border border-dashed border-[#CDD2DD] bg-white px-4 py-4 text-[12px] leading-5 text-[#777D8C]">
              Nenhum conteúdo publicado está disponível. Finalize a revisão na Base de Conhecimento e publique antes de criar uma trilha.
            </div>
            <a href="/app/help/content" class="mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#000A57] px-3 text-[14px] font-semibold text-white">Ir para conteúdos<ArrowRight size={12}/></a>
          {:else if data.canEdit}
            <div class="mt-4">
              <label class="relative block">
                <Search size={14} class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA0AD]"/>
                <input bind:value={searchQuery} placeholder="Buscar conteúdo publicado..." class="h-10 w-full rounded-xl border border-[#D5D9E3] bg-white pl-9 pr-3 text-[11px] text-[#3F4656] outline-none focus:border-[#000A57]"/>
              </label>

              <div class="mt-3 max-h-[360px] space-y-2 overflow-y-auto pr-1">
                {#each visibleContents as content (content.contentId)}
                  <label class={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${selectedIds.includes(content.contentId) ? "border-[#AEB6E8] bg-white shadow-sm" : "border-transparent bg-white/60 hover:border-[#D9DDEA]"}`}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(content.contentId)}
                      on:change={() => toggleContent(content.contentId)}
                      class="mt-0.5 h-4 w-4 rounded border-[#BEC4D0] text-[#000A57]"
                    />
                    <span class="min-w-0 flex-1">
                      <strong class="block text-[11px] font-semibold leading-5 text-[#303748]">{content.title}</strong>
                    </span>
                  </label>
                {/each}
              </div>

              <div class="mt-4 rounded-xl border border-[#E0E3EC] bg-white p-3">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-[10px] font-medium text-[#777E8D]">{selectedIds.length === 0 ? "Nenhum conteúdo selecionado" : selectedIds.length === 1 ? "1 conteúdo selecionado" : `${selectedIds.length} conteúdos selecionados`}</span>
                  {#if selectedIds.length > 1}<span class="rounded-full bg-[#FFF0E5] px-2 py-1 text-[9px] font-bold text-[#A9510D]">JORNADA</span>{/if}
                </div>
              </div>

              {#if selectedIds.length === 1}
                <form method="POST" action="?/create" use:enhance={enhanceCreate} class="mt-3">
                  <input type="hidden" name="contentIds" value={selectedIds[0]}/>
                  <button type="submit" disabled={generating} class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#EA6D0B] px-4 text-[12px] font-semibold text-white disabled:cursor-wait disabled:opacity-60">
                    {#if generating}<LoaderCircle size={14} class="animate-spin"/>Gerando trilha...{:else}<Sparkles size={14}/>Gerar com IA{/if}
                  </button>
                </form>
              {:else}
                <button type="button" on:click={openBuilder} disabled={selectedIds.length < 2} class="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#EA6D0B] px-4 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
                  Montar trilha <ArrowRight size={14}/>
                </button>
              {/if}

              <p class="mt-3 text-[10px] leading-4 text-[#8A90A0]">Com vários artigos, nada é salvo antes de você definir o nome e a ordem dos módulos.</p>
            </div>
          {/if}
        </section>
      </aside>
    </div>
  {/if}
</ApplicationContent>
