<script lang="ts">
  import {
    Bot,
    CheckCircle2,
    CircleAlert,
    Clock3,
    ExternalLink,
    MessageCircleMore,
    ShieldAlert,
    Sparkles,
  } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  function formatDate(value: string | Date): string {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function resolutionLabel(value: string): string {
    if (value === "answered") return "Respondido pela IA";
    if (value === "escalate") return "Escalonado";
    return "Falha técnica";
  }
</script>

<svelte:head>
  <title>Laboratório IA | F10 Operations</title>
</svelte:head>

<ApplicationContent width="standard">
  <div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <ApplicationBackLink href="/app/chat" label="Chat" />
    <div class="rounded-xl border border-[#E2E5ED] bg-white px-4 py-2.5 sm:text-right">
      <span class="text-[9px] font-bold uppercase tracking-[0.08em] text-[#959AA8]">Modelo</span>
      <span class="ml-2 text-[11px] font-semibold text-[#202637]">{data.configuration.model}</span>
      <span class={`ml-2 inline-flex rounded-full px-2 py-1 text-[8px] font-bold ${data.configuration.configured ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#FFF4E9] text-[#A9510D]"}`}>
        {data.configuration.configured ? "OpenAI configurada" : "Configuração pendente"}
      </span>
    </div>
  </div>

  <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 shadow-[0_10px_32px_rgba(1,13,40,0.04)] sm:p-6">
    <div class="flex items-start gap-3">
      <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]">
        <Bot size={19} aria-hidden="true" />
      </span>
      <div>
        <h2 class="text-[15px] font-semibold text-[#202637]">Teste uma dúvida real</h2>
        <p class="mt-1 text-[10px] leading-5 text-[#858B99]">O laboratório usa conhecimento público e a camada privada destinada à IA, sempre derivados da última publicação.</p>
      </div>
    </div>

    {#if data.canAsk}
      <form method="POST" action="?/ask" class="mt-5">
        <textarea
          name="question"
          required
          minlength="3"
          maxlength="2000"
          rows="4"
          placeholder="Ex.: Um aluno mudou de turma. Como faço essa alteração corretamente no F10?"
          class="w-full resize-y rounded-2xl border border-[#DDE1EA] px-4 py-3 text-[13px] leading-6 outline-none transition focus:border-[#000A57] focus:ring-4 focus:ring-[#000A57]/10"
        >{form?.question ?? ""}</textarea>
        <div class="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div class="flex items-start gap-2 text-[9px] leading-5 text-[#8A909E]">
            <ShieldAlert size={14} class="mt-0.5 shrink-0" aria-hidden="true" />
            <span>O agente não deve completar procedimentos usando conhecimento externo à Base de Conhecimento publicada.</span>
          </div>
          <button type="submit" class="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#000A57] px-5 text-[11px] font-semibold text-white transition hover:bg-[#111B71]">
            <Sparkles size={16} aria-hidden="true" />
            Perguntar ao agente
          </button>
        </div>
      </form>
    {:else}
      <div class="mt-5 rounded-2xl border border-[#F0D3B8] bg-[#FFF9F3] px-4 py-3 text-[11px] text-[#8C4A16]">Seu perfil pode visualizar o laboratório, mas não possui permissão <strong>chat.respond</strong> para executar o agente.</div>
    {/if}
  </section>

  {#if form?.result}
    <section class={`mt-4 overflow-hidden rounded-[22px] border bg-white ${form.result.resolution === "answered" ? "border-[#B9E6C9]" : "border-[#F0C8C8]"}`}>
      <header class={`flex flex-col justify-between gap-4 border-b px-5 py-4 sm:flex-row sm:items-center sm:px-6 ${form.result.resolution === "answered" ? "border-[#DCEFE2] bg-[#F7FCF8]" : "border-[#F4DDDD] bg-[#FFF8F8]"}`}>
        <div class="flex items-center gap-3">
          {#if form.result.resolution === "answered"}
            <CheckCircle2 size={20} class="text-[#2F7045]" aria-hidden="true" />
          {:else}
            <CircleAlert size={20} class="text-[#A34242]" aria-hidden="true" />
          {/if}
          <div>
            <h2 class="text-[13px] font-semibold text-[#222839]">{resolutionLabel(form.result.resolution)}</h2>
            <p class="mt-1 text-[9px] text-[#858B99]">Execução {form.result.runId.slice(0, 8)} · {form.result.model}</p>
          </div>
        </div>
        <div class="flex flex-wrap gap-2 text-[8px] font-semibold text-[#727887]">
          <span class="rounded-full bg-white px-2.5 py-1 shadow-sm">{form.result.latencyMs} ms</span>
          {#if form.result.inputTokens !== null}<span class="rounded-full bg-white px-2.5 py-1 shadow-sm">{form.result.inputTokens} tokens entrada</span>{/if}
          {#if form.result.outputTokens !== null}<span class="rounded-full bg-white px-2.5 py-1 shadow-sm">{form.result.outputTokens} tokens saída</span>{/if}
        </div>
      </header>

      <div class="px-5 py-5 sm:px-6">
        <div class="flex items-start gap-3">
          <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><Bot size={16} aria-hidden="true" /></span>
          <p class="whitespace-pre-wrap text-[13px] leading-7 text-[#353B4B]">{form.result.answer}</p>
        </div>

        {#if form.result.escalationReason}
          <div class="mt-5 rounded-2xl border border-[#F0D0D0] bg-[#FFF8F8] px-4 py-3">
            <p class="text-[9px] font-bold uppercase tracking-[0.08em] text-[#A34242]">Motivo do escalonamento</p>
            <p class="mt-1 text-[11px] leading-5 text-[#6F5151]">{form.result.escalationReason}</p>
          </div>
        {/if}

        <div class="mt-6">
          <div class="flex items-center gap-2">
            <MessageCircleMore size={16} class="text-[#000A57]" aria-hidden="true" />
            <h3 class="text-[12px] font-semibold text-[#303645]">Fontes recuperadas</h3>
          </div>

          {#if form.result.sources.length === 0}
            <p class="mt-3 rounded-xl bg-[#F7F8FB] px-4 py-3 text-[10px] text-[#858B99]">Nenhuma fonte publicada correspondeu à pergunta.</p>
          {:else}
            <div class="mt-3 grid gap-3 md:grid-cols-2">
              {#each form.result.sources as source}
                <a href={`/app/help/content/${source.contentId}`} class="group rounded-2xl border border-[#E2E5ED] p-4 transition hover:border-[#C9CEE0] hover:bg-[#FAFAFC]">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <span class="text-[8px] font-bold uppercase tracking-[0.08em] text-[#EA6D0B]">Fonte {source.rank}</span>
                      <strong class="mt-1 block truncate text-[11px] font-semibold text-[#303645]">{source.title}</strong>
                      <span class="mt-1 block truncate text-[9px] text-[#9A9FAB]">/{source.slug}</span>
                    </div>
                    <ExternalLink size={14} class="shrink-0 text-[#A1A6B1] transition group-hover:text-[#000A57]" aria-hidden="true" />
                  </div>
                </a>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </section>
  {:else if form?.message}
    <div class="mt-4 rounded-2xl border border-[#F0C8C8] bg-[#FFF5F5] px-4 py-3 text-[11px] font-medium text-[#9B2C2C]">{form.message}</div>
  {/if}

  <section class="mt-5 overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
    <header class="flex items-center gap-3 border-b border-[#EEF0F5] px-5 py-4 sm:px-6">
      <Clock3 size={18} class="text-[#000A57]" aria-hidden="true" />
      <div>
        <h2 class="text-[14px] font-semibold text-[#222839]">Execuções recentes</h2>
        <p class="mt-1 text-[10px] text-[#8A909E]">Histórico persistido para auditoria e melhoria do agente.</p>
      </div>
    </header>

    {#if data.recentRuns.length === 0}
      <div class="px-6 py-12 text-center text-[11px] text-[#9297A5]">Nenhuma execução registrada ainda.</div>
    {:else}
      <div class="divide-y divide-[#EEF0F5]">
        {#each data.recentRuns as run}
          <div class="px-5 py-4 sm:px-6">
            <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class={`rounded-full px-2 py-1 text-[8px] font-bold ${run.resolution === "answered" ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#FFF0F0] text-[#9B3C3C]"}`}>{resolutionLabel(run.resolution)}</span>
                  <span class="text-[9px] text-[#A0A5B0]">{run.model}</span>
                </div>
                <strong class="mt-2 block text-[11px] font-semibold text-[#303645]">{run.question}</strong>
                {#if run.escalationReason}<p class="mt-1 text-[9px] leading-5 text-[#8B6666]">{run.escalationReason}</p>{/if}
              </div>
              <div class="shrink-0 text-[9px] text-[#A0A5B0] sm:text-right">
                <span>{formatDate(run.createdAt)}</span>
                {#if run.latencyMs !== null}<span class="mt-1 block">{run.latencyMs} ms</span>{/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>
</ApplicationContent>
