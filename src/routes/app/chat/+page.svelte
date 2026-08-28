<script lang="ts">
  import { ArrowRight, BookOpen, MessageCircleMore, Sparkles } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import ChatInbox from "$lib/components/support/ChatInbox.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;
</script>

<svelte:head>
  <title>Chat | F10 Operations</title>
</svelte:head>

<ApplicationContent
  width="full"
  padding="none"
  className="h-[calc(100dvh-var(--application-header-height))] min-h-[620px] overflow-hidden bg-[#F5F6FA]"
>
  <div class="grid h-full min-h-0 grid-cols-1 gap-4 p-3 lg:grid-cols-[320px_minmax(0,1fr)] lg:p-4">
    <aside class="min-h-0 overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white shadow-[0_12px_32px_rgba(1,13,40,0.05)]">
      <ChatInbox chats={data.chatInbox} currentUserId={data.chatCurrentUserId} />
    </aside>

    <main class="hidden min-h-0 items-center justify-center overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white p-8 shadow-[0_12px_32px_rgba(1,13,40,0.04)] lg:flex">
      <div class="max-w-[560px] text-center">
        <span class="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#000A57] text-white shadow-[0_12px_26px_rgba(0,10,87,0.18)]">
          <MessageCircleMore size={27} aria-hidden="true" />
          <span class="absolute -right-1 -top-1 h-4 w-4 rounded-full border-[3px] border-white bg-[#EA6D0B]"></span>
        </span>
        <h1 class="mt-5 text-[19px] font-semibold text-[#202637]">Central de conversas</h1>
        <p class="mx-auto mt-2 max-w-[440px] text-[11px] leading-5 text-[#7C8392]">
          Selecione um atendimento ao lado. A conversa, o contexto do cliente e as ações operacionais permanecem juntos sem transformar todo chat em chamado.
        </p>

        <div class="mt-7 grid gap-3 sm:grid-cols-2">
          <a href="/app/chat/preview" class="group flex items-center justify-between rounded-2xl border border-[#E2E5ED] bg-[#FAFAFC] px-4 py-4 text-left transition hover:border-[#BCC3D5] hover:bg-white hover:shadow-sm">
            <span>
              <strong class="block text-[11px] font-semibold text-[#343A49]">Preview do chat</strong>
              <span class="mt-1 block text-[9.5px] leading-4 text-[#8D93A0]">Validar a experiência apresentada ao cliente.</span>
            </span>
            <span class="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EEF0FF] text-[#000A57] transition group-hover:bg-[#000A57] group-hover:text-white"><ArrowRight size={14} /></span>
          </a>
          <a href="/app/chat/lab" class="group flex items-center justify-between rounded-2xl border border-[#E2E5ED] bg-[#FAFAFC] px-4 py-4 text-left transition hover:border-[#BCC3D5] hover:bg-white hover:shadow-sm">
            <span>
              <strong class="flex items-center gap-1.5 text-[11px] font-semibold text-[#343A49]"><Sparkles size={13} class="text-[#EA6D0B]" />Testar Assistente F10</strong>
              <span class="mt-1 block text-[9.5px] leading-4 text-[#8D93A0]">Abrir o laboratório para validar respostas da IA.</span>
            </span>
            <span class="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EEF0FF] text-[#000A57] transition group-hover:bg-[#000A57] group-hover:text-white"><ArrowRight size={14} /></span>
          </a>
        </div>

        <a href="/app/help" class="mt-5 inline-flex items-center gap-2 rounded-full bg-[#F4F5F8] px-3 py-2 text-[10px] font-semibold text-[#000A57] transition hover:bg-[#EEF0FF]">
          <BookOpen size={13} /> Abrir base de conhecimento
        </a>
      </div>
    </main>
  </div>
</ApplicationContent>
