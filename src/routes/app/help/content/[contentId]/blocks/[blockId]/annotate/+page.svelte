<script lang="ts">
  import { CheckCircle2, CircleAlert, Save } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import HelpImageAnnotationEditor from "$lib/components/help/HelpImageAnnotationEditor.svelte";
  import type { HelpImageAnnotation } from "$lib/help/helpImageAnnotations";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  let annotations: HelpImageAnnotation[] = data.block.annotations;
</script>

<svelte:head><title>Marcar imagem | {data.content.title} | F10 Operations</title></svelte:head>

<ApplicationContent width="wide">
  <ApplicationBackLink href={`/app/help/content/${data.content.id}`} label="Voltar ao editor" className="mb-4" />

  <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
    <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
      <div>
        <h1 class="text-[20px] font-semibold tracking-[-0.03em] text-[#11182C]">Marcar screenshot</h1>
        <p class="mt-1 text-[11px] leading-5 text-[#858A98]">{data.block.stepTitle} · {data.content.title}</p>
        <p class="mt-2 max-w-[820px] text-[10px] leading-5 text-[#777E8E]">A imagem original não é alterada. Número, destaque, seta e texto são salvos como uma camada proporcional e acompanham o screenshot em qualquer tamanho de tela.</p>
      </div>
      <span class={`rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.08em] ${data.canEdit ? "bg-[#EEF0FF] text-[#000A57]" : "bg-[#F2F3F5] text-[#777D8C]"}`}>{data.canEdit ? "Edição liberada" : "Somente leitura"}</span>
    </div>
  </section>

  {#if data.content.hasPublishedVersion && data.content.status !== "archived"}
    <section class="mt-3 rounded-2xl border border-[#F1D7BD] bg-[#FFF9F3] px-4 py-3 text-[10px] leading-5 text-[#7A3B08]">Salvar marcações coloca o conteúdo em rascunho. A versão pública anterior continua igual até uma nova publicação.</section>
  {/if}

  {#if form?.message}
    <div class={`mt-3 flex items-start gap-2 rounded-xl px-4 py-3 text-[10px] font-semibold ${form.success ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#FFF0F0] text-[#9B3C3C]"}`}>
      {#if form.success}<CheckCircle2 size={15}/>{:else}<CircleAlert size={15}/>{/if}{form.message}
    </div>
  {/if}

  {#if data.block.imageUrl}
    <form method="POST" action="?/save" class="mt-4">
      <HelpImageAnnotationEditor
        imageUrl={data.block.imageUrl}
        altText={data.block.altText}
        bind:annotations
        disabled={!data.canEdit}
      />
      <input type="hidden" name="annotations" value={JSON.stringify(annotations)} />
      {#if data.canEdit}
        <div class="mt-4 flex justify-end">
          <button type="submit" class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#000A57] px-5 text-[11px] font-semibold text-white"><Save size={15}/>Salvar marcações</button>
        </div>
      {/if}
    </form>
  {:else}
    <section class="mt-4 rounded-2xl border border-[#F0C8C8] bg-[#FFF5F5] px-4 py-4 text-[11px] text-[#9B2C2C]">A imagem não possui uma origem disponível para marcação.</section>
  {/if}
</ApplicationContent>
