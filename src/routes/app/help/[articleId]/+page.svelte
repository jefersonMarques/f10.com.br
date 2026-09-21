<script lang="ts">
  import {
    CheckCircle2,
    CircleAlert,
    CloudUpload,
    Save,
  } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";
  import type { HelpArticleFormValues } from "$lib/server/help/helpArticleForm";

  export let data: PageData;
  export let form: ActionData;

  $: failedValues =
    form && "values" in form
      ? ((form.values as HelpArticleFormValues | undefined) ?? null)
      : null;
  $: values = failedValues ?? data.article;
</script>

<svelte:head>
  <title>{data.article.title} | Central de Ajuda | F10 Operations</title>
</svelte:head>

<ApplicationContent width="standard">
  <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <ApplicationBackLink href="/app/help" label="Central de Ajuda" />
    <div class="flex flex-wrap items-center gap-2">
      <span class="application-text-caption rounded-full bg-[#EEF0FF] px-3 py-1.5 font-bold uppercase tracking-[0.08em] text-[#000A57]">
        {data.article.status === "published" ? "Publicado" : "Rascunho"}
      </span>
      {#if data.article.hasPublishedVersion && data.article.status !== "published"}
        <span class="application-text-caption rounded-full bg-[#FFF4E9] px-3 py-1.5 font-bold text-[#B85408]">
          Alterações ainda não publicadas
        </span>
      {/if}
    </div>
  </div>

  <section class="mb-4 rounded-[22px] border border-[#E2E5ED] bg-white px-5 py-4 sm:px-6">
    <div class="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
      <div class="min-w-0">
        <h2 class="truncate text-[18px] font-semibold text-[#11182C]">{data.article.title}</h2>
        <p class="mt-1 truncate text-[11px] text-[#838897]">/{data.article.slug}</p>
      </div>
      {#if data.canPublish && data.article.status !== "published"}
        <form method="POST" action="?/publish" class="shrink-0">
          <button
            type="submit"
            class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#EA6D0B] px-4 text-[11px] font-semibold text-white shadow-[0_10px_24px_rgba(234,109,11,0.16)] transition hover:brightness-105"
          >
            <CloudUpload size={15} aria-hidden="true" />
            Publicar versão salva
          </button>
        </form>
      {/if}
    </div>
  </section>

  {#if form?.message}
    <div
      class={`mb-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-[12px] font-medium ${
        form.success
          ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]"
          : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"
      }`}
    >
      {#if form.success}
        <CheckCircle2 size={18} class="mt-0.5 shrink-0" aria-hidden="true" />
      {:else}
        <CircleAlert size={18} class="mt-0.5 shrink-0" aria-hidden="true" />
      {/if}
      <span>{form.message}</span>
    </div>
  {/if}

  {#if data.article.hasPublishedVersion && data.article.status !== "published"}
    <section class="mb-4 rounded-2xl border border-[#F1D7BD] bg-[#FFF9F3] px-5 py-4">
      <p class="text-[12px] font-semibold text-[#7A3B08]">
        O site continuará exibindo a última versão publicada.
      </p>
      <p class="mt-1 text-[11px] leading-5 text-[#91603A]">
        Estas alterações só substituirão a versão pública depois de usar “Publicar versão salva”.
      </p>
    </section>
  {/if}

  <form method="POST" action="?/save">
    <fieldset disabled={!data.canEdit} class="space-y-5 disabled:opacity-70">
      <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
        <div class="grid gap-5 lg:grid-cols-2">
          <label class="block lg:col-span-2">
            <span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Título</span>
            <input
              name="title"
              required
              maxlength="160"
              value={values.title}
              class="h-12 w-full rounded-xl border border-[#DDE1EA] px-4 text-[14px] font-medium text-[#11182C] outline-none transition focus:border-[#000A57] focus:ring-2 focus:ring-[#000A57]/10"
            />
          </label>

          <label class="block">
            <span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Endereço</span>
            <input
              name="slug"
              maxlength="120"
              value={values.slug}
              class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[13px] outline-none transition focus:border-[#000A57] focus:ring-2 focus:ring-[#000A57]/10"
            />
          </label>

          <label class="block">
            <span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Resumo</span>
            <input
              name="summary"
              maxlength="320"
              value={values.summary}
              class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[13px] outline-none transition focus:border-[#000A57] focus:ring-2 focus:ring-[#000A57]/10"
            />
          </label>
        </div>
      </section>

      <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
        <div class="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 class="text-[15px] font-semibold text-[#11182C]">Conteúdo</h2>
            <p class="mt-1 text-[11px] text-[#858A98]">
              Nesta primeira versão, cada parágrafo é armazenado como um bloco independente.
            </p>
          </div>
          <span class="application-text-caption font-medium text-[#9A9FAD]">máximo 50.000 caracteres</span>
        </div>

        <textarea
          name="bodyText"
          required
          maxlength="50000"
          rows="20"
          value={values.bodyText}
          class="mt-5 w-full resize-y rounded-2xl border border-[#DDE1EA] px-4 py-4 text-[14px] leading-7 text-[#242A39] outline-none transition focus:border-[#000A57] focus:ring-2 focus:ring-[#000A57]/10"
        ></textarea>
      </section>

      {#if data.canEdit}
        <div class="flex justify-end">
          <button
            type="submit"
            class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#000A57] px-5 text-[12px] font-semibold text-white transition hover:bg-[#111B71]"
          >
            <Save size={17} aria-hidden="true" />
            Salvar rascunho
          </button>
        </div>
      {/if}
    </fieldset>
  </form>
</ApplicationContent>
