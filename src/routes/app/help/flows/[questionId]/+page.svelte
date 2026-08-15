<script lang="ts">
  import {
    ArrowLeft,
    CheckCircle2,
    CircleAlert,
    CloudUpload,
    GitBranch,
    Plus,
    Save,
    Trash2,
  } from "lucide-svelte";
  import type { ActionData, PageData } from "./$types";

  type EditableOption = {
    key: string;
    label: string;
    description: string;
    icon: string;
    target: string;
  };

  export let data: PageData;
  export let form: ActionData;

  const iconOptions = [
    { value: "access", label: "Acesso" },
    { value: "book", label: "Livro / matrícula" },
    { value: "classes", label: "Turmas" },
    { value: "download", label: "Download" },
    { value: "finance", label: "Financeiro" },
    { value: "help", label: "Ajuda" },
    { value: "operations", label: "Operações" },
    { value: "sales", label: "Vendas" },
    { value: "support", label: "Suporte" },
    { value: "team", label: "Equipe" },
  ];

  $: failedValues =
    form && "values" in form && form.values ? form.values : null;
  $: initialValues = failedValues ?? data.question;

  let options: EditableOption[] = data.question.options.map((option) => ({
    ...option,
  }));
  let previousQuestionId = data.question.id;
  let previousFailedValues = failedValues;

  $: if (
    data.question.id !== previousQuestionId ||
    failedValues !== previousFailedValues
  ) {
    options = initialValues.options.map((option) => ({ ...option }));
    previousQuestionId = data.question.id;
    previousFailedValues = failedValues;
  }

  function createEmptyOption(): EditableOption {
    return {
      key: "",
      label: "",
      description: "",
      icon: "help",
      target: "search",
    };
  }

  function addOption(): void {
    if (options.length >= 12) return;
    options = [...options, createEmptyOption()];
  }

  function removeOption(index: number): void {
    options = options.filter((_, optionIndex) => optionIndex !== index);
  }
</script>

<svelte:head>
  <title>{data.question.title} | Fluxos interativos | F10 Operations</title>
</svelte:head>

<div class="mx-auto max-w-[1240px] px-5 py-7 sm:px-8 sm:py-9">
  <a
    href="/app/help/flows"
    class="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-[12px] font-semibold text-[#5F6575] transition hover:bg-white hover:text-[#000A57]"
  >
    <ArrowLeft size={17} aria-hidden="true" />
    Voltar para fluxos
  </a>

  <div class="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
    <div class="min-w-0">
      <div class="flex flex-wrap items-center gap-2">
        <span class="rounded-full bg-[#EEF0FF] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#000A57]">
          {data.question.status === "published" ? "Publicado" : "Rascunho"}
        </span>
        <span class="rounded-full bg-[#F3F4F7] px-3 py-1.5 text-[10px] font-semibold text-[#737989]">
          {data.question.id}
        </span>

        {#if data.question.hasPublishedVersion && data.question.status !== "published"}
          <span class="rounded-full bg-[#FFF4E9] px-3 py-1.5 text-[10px] font-bold text-[#B85408]">
            Alterações ainda não publicadas
          </span>
        {/if}
      </div>

      <h1 class="mt-3 text-[30px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[38px]">
        {data.question.title}
      </h1>
      <p class="mt-2 max-w-[760px] text-[13px] leading-6 text-[#747A8A]">
        Configure o texto da etapa e para onde cada resposta deve conduzir o cliente.
      </p>
    </div>

    {#if data.canPublish && data.question.status !== "published"}
      <form method="POST" action="?/publish">
        <button
          type="submit"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#EA6D0B] px-5 text-[12px] font-semibold text-white shadow-[0_12px_28px_rgba(234,109,11,0.2)] transition hover:brightness-105"
        >
          <CloudUpload size={17} aria-hidden="true" />
          Publicar fluxo salvo
        </button>
      </form>
    {/if}
  </div>

  {#if form?.message}
    <div
      class={`mt-6 flex items-start gap-3 rounded-2xl border px-4 py-3 text-[12px] font-medium ${
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

  {#if data.question.hasPublishedVersion && data.question.status !== "published"}
    <section class="mt-6 rounded-2xl border border-[#F1D7BD] bg-[#FFF9F3] px-5 py-4">
      <p class="text-[12px] font-semibold text-[#7A3B08]">
        O cliente continua usando a última versão publicada deste caminho.
      </p>
      <p class="mt-1 text-[11px] leading-5 text-[#91603A]">
        Salvar altera somente o rascunho. A versão pública só muda após uma nova publicação.
      </p>
    </section>
  {/if}

  <form method="POST" action="?/save" class="mt-6">
    <fieldset disabled={!data.canEdit} class="space-y-6 disabled:opacity-70">
      <section class="rounded-[24px] border border-[#E2E5ED] bg-white p-5 sm:p-7">
        <div class="flex items-start gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]">
            <GitBranch size={19} aria-hidden="true" />
          </span>
          <div>
            <h2 class="text-[15px] font-semibold text-[#11182C]">Texto da etapa</h2>
            <p class="mt-1 text-[11px] text-[#858A98]">
              É exatamente o contexto que o cliente verá antes das opções.
            </p>
          </div>
        </div>

        <div class="mt-6 grid gap-5 lg:grid-cols-2">
          <label class="block">
            <span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Identificação visual</span>
            <input
              name="eyebrow"
              required
              maxlength="80"
              value={initialValues.eyebrow}
              class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[13px] outline-none transition focus:border-[#000A57] focus:ring-2 focus:ring-[#000A57]/10"
            />
          </label>

          <label class="block">
            <span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Texto alternativo para busca</span>
            <input
              name="searchLabel"
              maxlength="120"
              value={initialValues.searchLabel}
              placeholder="Ex.: Não sei qual opção escolher"
              class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[13px] outline-none transition focus:border-[#000A57] focus:ring-2 focus:ring-[#000A57]/10"
            />
          </label>

          <label class="block lg:col-span-2">
            <span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Pergunta</span>
            <input
              name="title"
              required
              maxlength="160"
              value={initialValues.title}
              class="h-12 w-full rounded-xl border border-[#DDE1EA] px-4 text-[14px] font-medium text-[#11182C] outline-none transition focus:border-[#000A57] focus:ring-2 focus:ring-[#000A57]/10"
            />
          </label>

          <label class="block lg:col-span-2">
            <span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Descrição</span>
            <textarea
              name="description"
              maxlength="320"
              rows="3"
              value={initialValues.description}
              class="w-full resize-y rounded-xl border border-[#DDE1EA] px-3 py-2.5 text-[13px] leading-6 outline-none transition focus:border-[#000A57] focus:ring-2 focus:ring-[#000A57]/10"
            ></textarea>
          </label>

          <label class="inline-flex min-h-11 items-center gap-3 rounded-xl border border-[#E3E5EC] bg-[#F8F9FB] px-4 lg:col-span-2">
            <input
              type="checkbox"
              name="compact"
              checked={initialValues.compact}
              class="h-4 w-4 rounded border-[#BFC4CF] text-[#000A57] focus:ring-[#000A57]/20"
            />
            <span>
              <strong class="block text-[11px] font-semibold text-[#454B5A]">Exibir opções de forma compacta</strong>
              <small class="mt-0.5 block text-[10px] text-[#8B909D]">Útil quando a etapa possui muitas escolhas.</small>
            </span>
          </label>
        </div>
      </section>

      <section class="rounded-[24px] border border-[#E2E5ED] bg-white p-5 sm:p-7">
        <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 class="text-[15px] font-semibold text-[#11182C]">Opções e destinos</h2>
            <p class="mt-1 text-[11px] text-[#858A98]">
              O servidor impede caminhos que criem loops entre perguntas.
            </p>
          </div>

          {#if data.canEdit}
            <button
              type="button"
              on:click={addOption}
              disabled={options.length >= 12}
              class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-4 text-[11px] font-semibold text-[#000A57] transition hover:bg-[#F7F8FB] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={16} aria-hidden="true" />
              Adicionar opção
            </button>
          {/if}
        </div>

        {#if options.length === 0}
          <div class="mt-5 rounded-2xl border border-dashed border-[#D6DAE3] bg-[#FAFAFC] px-5 py-10 text-center">
            <p class="text-[12px] font-semibold text-[#5F6574]">Nenhuma opção cadastrada.</p>
            <p class="mt-1 text-[10px] text-[#9499A6]">Adicione pelo menos uma resposta antes de salvar.</p>
          </div>
        {:else}
          <div class="mt-5 space-y-4">
            {#each options as option, index}
              <article class="rounded-2xl border border-[#E3E6ED] bg-[#FAFAFC] p-4 sm:p-5">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <span class="text-[10px] font-bold uppercase tracking-[0.1em] text-[#EA6D0B]">
                      Opção {index + 1}
                    </span>
                    {#if option.key}
                      <span class="ml-2 text-[9px] text-[#A0A5B0]">{option.key}</span>
                    {/if}
                  </div>

                  {#if data.canEdit}
                    <button
                      type="button"
                      on:click={() => removeOption(index)}
                      class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#969BA7] transition hover:bg-[#FFF0F0] hover:text-[#A52A2A]"
                      aria-label={`Remover opção ${index + 1}`}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  {/if}
                </div>

                <input type="hidden" name="optionKey" value={option.key} />

                <div class="mt-4 grid gap-4 lg:grid-cols-2">
                  <label class="block">
                    <span class="mb-1.5 block text-[10px] font-semibold text-[#555B6A]">Título da opção</span>
                    <input
                      name="optionLabel"
                      required
                      maxlength="120"
                      bind:value={option.label}
                      class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[12px] outline-none transition focus:border-[#000A57] focus:ring-2 focus:ring-[#000A57]/10"
                    />
                  </label>

                  <label class="block">
                    <span class="mb-1.5 block text-[10px] font-semibold text-[#555B6A]">Ícone</span>
                    <select
                      name="optionIcon"
                      bind:value={option.icon}
                      class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[12px] outline-none transition focus:border-[#000A57] focus:ring-2 focus:ring-[#000A57]/10"
                    >
                      {#each iconOptions as iconOption}
                        <option value={iconOption.value}>{iconOption.label}</option>
                      {/each}
                    </select>
                  </label>

                  <label class="block lg:col-span-2">
                    <span class="mb-1.5 block text-[10px] font-semibold text-[#555B6A]">Descrição</span>
                    <input
                      name="optionDescription"
                      maxlength="240"
                      bind:value={option.description}
                      class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[12px] outline-none transition focus:border-[#000A57] focus:ring-2 focus:ring-[#000A57]/10"
                    />
                  </label>

                  <label class="block lg:col-span-2">
                    <span class="mb-1.5 block text-[10px] font-semibold text-[#555B6A]">Ao clicar, levar para</span>
                    <select
                      name="optionTarget"
                      required
                      bind:value={option.target}
                      class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[12px] outline-none transition focus:border-[#000A57] focus:ring-2 focus:ring-[#000A57]/10"
                    >
                      <option value="search">Abrir busca da Central de Ajuda</option>

                      <optgroup label="Outra pergunta">
                        {#each data.question.questionTargets as target}
                          {#if target.id !== data.question.id}
                            <option value={`question:${target.id}`}>{target.title}</option>
                          {/if}
                        {/each}
                      </optgroup>

                      <optgroup label="Orientação ou treinamento">
                        {#each data.question.destinationTargets as target}
                          <option value={`destination:${target.id}`}>{target.title}</option>
                        {/each}
                      </optgroup>
                    </select>
                  </label>
                </div>
              </article>
            {/each}
          </div>
        {/if}
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
</div>