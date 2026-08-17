<script lang="ts">
  import { ArrowLeft, ArrowRight, BookOpenCheck, CircleAlert, GraduationCap, Plus, Users } from "lucide-svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  $: values = form && "values" in form ? form.values : null;

  function statusLabel(status: string): string {
    if (status === "published") return "Publicada";
    if (status === "archived") return "Arquivada";
    return "Rascunho";
  }
</script>

<svelte:head><title>Trilhas F10 | Base de Conhecimento</title></svelte:head>

<div class="mx-auto max-w-[1480px] px-5 py-7 sm:px-8 sm:py-9">
  <a href="/app/help/content" class="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-[12px] font-semibold text-[#5F6575] transition hover:bg-white hover:text-[#000A57]"><ArrowLeft size={17}/>Base de Conhecimento</a>

  <div class="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
    <div>
      <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#EA6D0B]">Aprender fazendo</p>
      <h1 class="mt-2 text-[30px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[38px]">Trilhas F10</h1>
      <p class="mt-2 max-w-[820px] text-[14px] leading-6 text-[#6F7585]">Microações progressivas para ensinar novos usuários sem transformar o treinamento em um curso longo. O participante vê somente a próxima ação.</p>
    </div>
  </div>

  {#if form?.message}
    <div class="mt-6 flex items-start gap-3 rounded-2xl border border-[#F0C8C8] bg-[#FFF5F5] px-4 py-3 text-[12px] font-medium text-[#9B2C2C]"><CircleAlert size={18}/><span>{form.message}</span></div>
  {/if}

  <section class="mt-7 grid gap-3 md:grid-cols-3">
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><GraduationCap size={21} class="text-[#000A57]"/><strong class="mt-4 block text-[26px] font-semibold">{data.paths.length}</strong><span class="text-[11px] text-[#858A98]">trilhas cadastradas</span></div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><Users size={21} class="text-[#000A57]"/><strong class="mt-4 block text-[26px] font-semibold">{data.paths.reduce((total, path) => total + path.participantCount, 0)}</strong><span class="text-[11px] text-[#858A98]">convites enviados</span></div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><BookOpenCheck size={21} class="text-[#EA6D0B]"/><strong class="mt-4 block text-[26px] font-semibold">{data.paths.reduce((total, path) => total + path.completedCount, 0)}</strong><span class="text-[11px] text-[#858A98]">treinamentos concluídos</span></div>
  </section>

  <div class="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_410px]">
    <section class="overflow-hidden rounded-[24px] border border-[#E2E5ED] bg-white">
      <header class="border-b border-[#EEF0F5] px-5 py-4 sm:px-6"><h2 class="text-[16px] font-semibold text-[#11182C]">Trilhas</h2><p class="mt-1 text-[11px] text-[#858A98]">Quantidade total de microações e progresso completo ficam somente no Operations; o participante não vê esses números.</p></header>
      {#if data.paths.length === 0}
        <div class="px-6 py-16 text-center"><GraduationCap size={36} class="mx-auto text-[#B6BBC7]"/><p class="mt-4 text-[13px] font-semibold text-[#4B5160]">Nenhuma trilha criada</p><p class="mt-1 text-[11px] text-[#9297A5]">Comece por uma função específica, como Comercial, Secretaria ou Financeiro.</p></div>
      {:else}
        <div class="divide-y divide-[#EEF0F5]">
          {#each data.paths as path}
            <a href={`/app/help/trilhas/${path.id}`} class={`block px-5 py-4 transition sm:px-6 ${path.status === "archived" ? "bg-[#FAFAFC] opacity-75" : "hover:bg-[#FAFAFC]"}`}>
              <div class="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2"><strong class="text-[13px] font-semibold text-[#252B3B]">{path.title}</strong><span class={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[0.05em] ${path.status === "published" ? "bg-[#EEF8F1] text-[#2F7045]" : path.status === "archived" ? "bg-[#F1F1F3] text-[#676D7D]" : "bg-[#EEF0FF] text-[#000A57]"}`}>{statusLabel(path.status)}</span>{#if path.currentVersion > 0}<span class="rounded-full bg-[#F4F5F8] px-2 py-1 text-[9px] font-semibold text-[#747A8A]">v{path.currentVersion}</span>{/if}</div>
                  <p class="mt-1 text-[10px] text-[#858B99]">{path.audience || "Público não informado"} · {path.stepCount} microações</p>
                  {#if path.description}<p class="mt-2 line-clamp-2 max-w-[780px] text-[11px] leading-5 text-[#737989]">{path.description}</p>{/if}
                </div>
                <div class="flex shrink-0 items-center gap-5 text-right">
                  <div><strong class="block text-[15px] font-semibold text-[#11182C]">{path.startedCount}/{path.participantCount}</strong><span class="text-[9px] text-[#8B909D]">iniciaram</span></div>
                  <div><strong class="block text-[15px] font-semibold text-[#2F7045]">{path.completedCount}</strong><span class="text-[9px] text-[#8B909D]">concluíram</span></div>
                  <ArrowRight size={17} class="text-[#8A909E]"/>
                </div>
              </div>
            </a>
          {/each}
        </div>
      {/if}
    </section>

    {#if data.canEdit}
      <section class="h-fit rounded-[24px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
        <div class="flex items-start gap-3"><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF0E4] text-[#EA6D0B]"><Plus size={19}/></span><div><h2 class="text-[16px] font-semibold text-[#11182C]">Nova trilha</h2><p class="mt-1 text-[11px] leading-5 text-[#858A98]">Crie para uma função ou rotina específica.</p></div></div>
        <form method="POST" action="?/create" class="mt-6 space-y-4">
          <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Nome</span><input name="title" required maxlength="160" value={values?.title ?? ""} placeholder="Ex.: Comercial — primeiros passos" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px] outline-none focus:border-[#000A57]" /></label>
          <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Público</span><input name="audience" maxlength="160" value={values?.audience ?? ""} placeholder="Ex.: novos colaboradores do Comercial" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px]" /></label>
          <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Endereço</span><input name="slug" maxlength="100" value={values?.slug ?? ""} placeholder="Gerado automaticamente" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px]" /></label>
          <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Descrição interna</span><textarea name="description" maxlength="1200" rows="4" class="w-full rounded-xl border border-[#DDE1EA] px-3 py-2.5 text-[12px]">{values?.description ?? ""}</textarea></label>
          <button type="submit" class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 text-[12px] font-semibold text-white"><Plus size={16}/>Criar trilha</button>
        </form>
      </section>
    {/if}
  </div>
</div>
