<script lang="ts">
  import {
    ArrowLeft,
    ArrowRight,
    CircleAlert,
    GitBranch,
    Plus,
  } from "lucide-svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  $: values = form && "values" in form ? form.values : null;
</script>

<svelte:head>
  <title>Fluxos interativos | Central de Ajuda | F10 Operations</title>
</svelte:head>

<div class="mx-auto max-w-[1280px] px-5 py-7 sm:px-8 sm:py-9">
  <a
    href="/app/help"
    class="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-[12px] font-semibold text-[#5F6575] transition hover:bg-white hover:text-[#000A57]"
  >
    <ArrowLeft size={17} aria-hidden="true" />
    Voltar para Central de Ajuda
  </a>

  <div class="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
    <div>
      <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#EA6D0B]">
        Navegação guiada
      </p>
      <h1 class="mt-2 text-[30px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[38px]">
        Fluxos interativos
      </h1>
      <p class="mt-2 max-w-[760px] text-[14px] leading-6 text-[#6F7585]">
        Edite as perguntas que conduzem o cliente até uma orientação, treinamento, busca ou atendimento.
      </p>
    </div>
  </div>

  {#if form?.message}
    <div class="mt-6 flex items-start gap-3 rounded-2xl border border-[#F0C8C8] bg-[#FFF5F5] px-4 py-3 text-[12px] font-medium text-[#9B2C2C]">
      <CircleAlert size={18} class="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{form.message}</span>
    </div>
  {/if}

  <div class="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
    <section class="overflow-hidden rounded-[24px] border border-[#E2E5ED] bg-white">
      <header class="border-b border-[#EEF0F5] px-5 py-4 sm:px-6">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]">
            <GitBranch size={19} aria-hidden="true" />
          </span>
          <div>
            <h2 class="text-[16px] font-semibold text-[#11182C]">Perguntas do fluxo</h2>
            <p class="mt-1 text-[11px] text-[#858A98]">
              {data.questions.length} etapas cadastradas
            </p>
          </div>
        </div>
      </header>

      {#if data.questions.length === 0}
        <div class="px-6 py-14 text-center">
          <GitBranch size={30} class="mx-auto text-[#B5BAC7]" aria-hidden="true" />
          <p class="mt-4 text-[13px] font-semibold text-[#4B5160]">
            Nenhum fluxo foi importado ainda
          </p>
          <p class="mt-1 text-[11px] text-[#9297A5]">
            Volte à Central de Ajuda e importe o conteúdo atual ou crie uma nova pergunta.
          </p>
        </div>
      {:else}
        <div class="divide-y divide-[#EEF0F5]">
          {#each data.questions as question}
            <a
              href={`/app/help/flows/${question.id}`}
              class="group flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-[#FAFAFC] sm:px-6"
            >
              <span class="min-w-0">
                <span class="flex flex-wrap items-center gap-2">
                  <strong class="truncate text-[13px] font-semibold text-[#202637]">
                    {question.title}
                  </strong>
                  <span class="rounded-full bg-[#F2F3F7] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.06em] text-[#707687]">
                    {question.status === "published" ? "Publicado" : "Rascunho"}
                  </span>
                </span>
                <span class="mt-1 block text-[11px] text-[#8B909E]">
                  {question.eyebrow} · {question.optionCount} {question.optionCount === 1 ? "opção" : "opções"} · {question.id}
                </span>
              </span>
              <ArrowRight
                size={17}
                class="shrink-0 text-[#A0A5B2] transition group-hover:translate-x-1 group-hover:text-[#EA6D0B]"
                aria-hidden="true"
              />
            </a>
          {/each}
        </div>
      {/if}
    </section>

    {#if data.canEdit}
      <section class="h-fit rounded-[24px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
        <div class="flex items-start gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF0E4] text-[#EA6D0B]">
            <Plus size={19} aria-hidden="true" />
          </span>
          <div>
            <h2 class="text-[16px] font-semibold text-[#11182C]">Nova pergunta</h2>
            <p class="mt-1 text-[11px] leading-5 text-[#858A98]">
              Crie a etapa e depois escolha as opções e os destinos.
            </p>
          </div>
        </div>

        <form method="POST" action="?/create" class="mt-6 space-y-4">
          <label class="block">
            <span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Pergunta</span>
            <input
              name="title"
              required
              maxlength="160"
              value={values?.title ?? ""}
              placeholder="Ex.: O que você quer fazer?"
              class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[13px] outline-none transition focus:border-[#000A57] focus:ring-2 focus:ring-[#000A57]/10"
            />
          </label>

          <label class="block">
            <span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Identificador</span>
            <input
              name="questionId"
              maxlength="80"
              value={values?.questionId ?? ""}
              placeholder="gerado a partir da pergunta"
              class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[13px] outline-none transition focus:border-[#000A57] focus:ring-2 focus:ring-[#000A57]/10"
            />
            <span class="mt-1.5 block text-[10px] leading-4 text-[#969BA8]">
              O identificador é técnico e não aparece para o cliente.
            </span>
          </label>

          <button
            type="submit"
            class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 text-[12px] font-semibold text-white transition hover:bg-[#111B71]"
          >
            <Plus size={17} aria-hidden="true" />
            Criar pergunta
          </button>
        </form>
      </section>
    {/if}
  </div>
</div>
