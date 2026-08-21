<script lang="ts">
  import { enhance } from "$app/forms";
  import type { SubmitFunction } from "@sveltejs/kit";
  import { ArrowRight, BookOpenCheck, CircleAlert, Download, FileArchive, GraduationCap, LoaderCircle, Plus, Upload, Users } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  let isImporting = false;

  $: values = form && "values" in form ? form.values : null;

  const enhancePackageImport: SubmitFunction = () => {
    isImporting = true;

    return async ({ update }) => {
      try {
        await update({ reset: false });
      } finally {
        isImporting = false;
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

<svelte:head><title>Trilhas F10 | Base de Conhecimento</title></svelte:head>

<ApplicationContent width="wide">
  <ApplicationBackLink href="/app/help/content" label="Base de Conhecimento" className="mb-3" />

  {#if form?.message}
    <div class="mb-3 flex items-start gap-3 rounded-2xl border border-[#F0C8C8] bg-[#FFF5F5] px-4 py-3 text-[12px] font-medium text-[#9B2C2C]"><CircleAlert size={18}/><span>{form.message}</span></div>
  {/if}

  <section class="grid gap-3 md:grid-cols-3">
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><GraduationCap size={21} class="text-[#000A57]"/><strong class="mt-4 block text-[26px] font-semibold">{data.paths.length}</strong><span class="text-[11px] text-[#858A98]">trilhas cadastradas</span></div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><Users size={21} class="text-[#000A57]"/><strong class="mt-4 block text-[26px] font-semibold">{data.paths.reduce((total, path) => total + path.participantCount, 0)}</strong><span class="text-[11px] text-[#858A98]">convites enviados</span></div>
    <div class="rounded-2xl border border-[#E2E5ED] bg-white p-5"><BookOpenCheck size={21} class="text-[#EA6D0B]"/><strong class="mt-4 block text-[26px] font-semibold">{data.paths.reduce((total, path) => total + path.completedCount, 0)}</strong><span class="text-[11px] text-[#858A98]">treinamentos concluídos</span></div>
  </section>

  <div class="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_410px]">
    <section class="overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
      <header class="border-b border-[#EEF0F5] px-5 py-4 sm:px-6"><h2 class="text-[16px] font-semibold text-[#11182C]">Trilhas</h2><p class="mt-1 text-[11px] text-[#858A98]">O participante recebe somente o conteúdo atual; quantidade de passos e estimativas ficam restritas ao Operations.</p></header>
      {#if data.paths.length === 0}
        <div class="px-6 py-16 text-center"><GraduationCap size={36} class="mx-auto text-[#B6BBC7]"/><p class="mt-4 text-[13px] font-semibold text-[#4B5160]">Nenhuma trilha criada</p><p class="mt-1 text-[11px] text-[#9297A5]">Comece por uma função específica, como Comercial, Secretaria ou Financeiro.</p></div>
      {:else}
        <div class="divide-y divide-[#EEF0F5]">
          {#each data.paths as path}
            <a href={`/app/help/trilhas/${path.id}`} class={`block px-5 py-4 transition sm:px-6 ${path.status === "archived" ? "bg-[#FAFAFC] opacity-75" : "hover:bg-[#FAFAFC]"}`}>
              <div class="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2"><strong class="text-[13px] font-semibold text-[#252B3B]">{path.title}</strong><span class={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[0.05em] ${path.status === "published" ? "bg-[#EEF8F1] text-[#2F7045]" : path.status === "archived" ? "bg-[#F1F1F3] text-[#676D7D]" : "bg-[#EEF0FF] text-[#000A57]"}`}>{statusLabel(path.status, path.currentVersion)}</span>{#if path.currentVersion > 0}<span class="rounded-full bg-[#F4F5F8] px-2 py-1 text-[9px] font-semibold text-[#747A8A]">v{path.currentVersion}</span>{/if}{#if path.accessMode === "public"}<span class="rounded-full bg-[#EEF8F1] px-2 py-1 text-[9px] font-semibold text-[#2F7045]">link público</span>{/if}</div>
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
      <aside class="space-y-5">
        <section class="h-fit rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
          <div class="flex items-start gap-3"><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF0E4] text-[#EA6D0B]"><Plus size={19}/></span><div><h2 class="text-[16px] font-semibold text-[#11182C]">Nova trilha</h2><p class="mt-1 text-[11px] leading-5 text-[#858A98]">Crie para uma função ou rotina específica.</p></div></div>
          <form method="POST" action="?/create" class="mt-6 space-y-4">
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Nome</span><input name="title" required maxlength="160" value={values?.title ?? ""} placeholder="Ex.: Comercial — primeiros passos" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px] outline-none focus:border-[#000A57]" /></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Público</span><input name="audience" maxlength="160" value={values?.audience ?? ""} placeholder="Ex.: novos colaboradores do Comercial" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px]" /></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Endereço</span><input name="slug" maxlength="100" value={values?.slug ?? ""} placeholder="Gerado automaticamente" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px]" /></label>
            <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Descrição interna</span><textarea name="description" maxlength="1200" rows="4" class="w-full rounded-xl border border-[#DDE1EA] px-3 py-2.5 text-[12px]">{values?.description ?? ""}</textarea></label>
            <button type="submit" class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 text-[12px] font-semibold text-white"><Plus size={16}/>Criar trilha</button>
          </form>
        </section>

        <section class="h-fit rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
          <div class="flex items-start gap-3"><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><FileArchive size={19}/></span><div><h2 class="text-[16px] font-semibold text-[#11182C]">Importar pacote .zip</h2><p class="mt-1 text-[11px] leading-5 text-[#858A98]">Cria uma nova trilha em rascunho usando textos, imagens e vídeos do pacote.</p></div></div>
          <form method="POST" action="?/importPackage" enctype="multipart/form-data" class="mt-5 space-y-3" use:enhance={enhancePackageImport} aria-busy={isImporting ? "true" : "false"}>
            <label class="block rounded-xl border border-dashed border-[#CDD2DD] bg-[#FAFAFC] p-4"><span class="text-[10px] font-semibold text-[#4A5060]">Arquivo .zip</span><input name="package" type="file" accept="application/zip,.zip" required disabled={isImporting} class="mt-2 block w-full text-[10px] text-[#6E7483] file:mr-3 file:rounded-lg file:border-0 file:bg-[#000A57] file:px-3 file:py-2 file:text-[10px] file:font-semibold file:text-white disabled:opacity-60"/><span class="mt-2 block text-[9px] leading-4 text-[#8B909D]">Até 120 MB. O JSON deve estar na raiz como <strong>training.json</strong> ou <strong>manifest.json</strong>.</span></label>
            <button type="submit" disabled={isImporting} class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#EA6D0B] px-4 text-[12px] font-semibold text-white disabled:cursor-wait disabled:opacity-70">
              {#if isImporting}<LoaderCircle size={16} class="animate-spin"/>Importando pacote...{:else}<Upload size={15}/>Importar trilha{/if}
            </button>
            {#if isImporting}
              <div class="rounded-xl border border-[#D8DDF4] bg-[#F8F9FF] px-4 py-3" role="status" aria-live="polite">
                <div class="flex items-start gap-3">
                  <LoaderCircle size={17} class="mt-0.5 shrink-0 animate-spin text-[#000A57]"/>
                  <div class="min-w-0"><strong class="block text-[11px] font-semibold text-[#000A57]">Importando o pacote</strong><span class="mt-1 block text-[9px] leading-4 text-[#697084]">Enviando o ZIP, validando o JSON e os arquivos e criando a trilha. Aguarde a conclusão antes de sair desta página.</span></div>
                </div>
                <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-[#E1E4F1]"><div class="h-full w-1/2 animate-pulse rounded-full bg-[#000A57]"></div></div>
              </div>
            {/if}
          </form>
          <div class="mt-3 flex flex-col items-start gap-2">
            <a href="/help-training-package/training.example.json" download class="inline-flex items-center gap-2 text-[10px] font-semibold text-[#000A57]"><Download size={13}/>Baixar modelo de training.json</a>
            <a href="/help-training-package/AI-INSTRUCTIONS.md" download class="inline-flex items-center gap-2 text-[10px] font-semibold text-[#000A57]"><Download size={13}/>Baixar prompt para IA (.md)</a>
          </div>
          <p class="mt-3 rounded-xl bg-[#F7F8FB] px-3 py-3 text-[9px] leading-4 text-[#707686]">Para criar uma trilha com IA, envie o arquivo <strong>AI-INSTRUCTIONS.md</strong> junto com seu manual, procedimento, prints ou vídeos. A IA recebe as regras do formato e devolve o <strong>training.json</strong>, a estrutura do ZIP e as legendas quando possível.</p>
          <details class="mt-4 rounded-xl bg-[#F7F8FB] p-3"><summary class="cursor-pointer text-[10px] font-semibold text-[#4D5464]">Estrutura esperada do .zip</summary><pre class="mt-3 overflow-x-auto whitespace-pre text-[9px] leading-4 text-[#707686]">training.json
images/
  boas-vindas.png
  clientes.png
videos/
  clientes.mp4
  clientes.vtt</pre></details>
        </section>
      </aside>
    {/if}
  </div>
</ApplicationContent>
