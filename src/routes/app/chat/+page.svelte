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
  className="h-[calc(100dvh-var(--application-header-height))] min-h-[620px] overflow-hidden bg-white"
>
  <div class="grid h-full min-h-0 grid-cols-1 bg-white lg:grid-cols-[330px_minmax(0,1fr)]">
    <aside class="min-h-0 border-r border-[#E4E6EC]">
      <ChatInbox chats={data.chatInbox} currentUserId={data.chatCurrentUserId} />
    </aside>

    <main class="hidden min-h-0 items-center justify-center bg-[#FAFAFC] p-8 lg:flex">
      <div class="max-w-[520px] text-center">
        <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E1E4EC] bg-white text-[#000A57] shadow-sm">
          <MessageCircleMore size={25} aria-hidden="true" />
        </span>
        <h1 class="mt-5 text-[18px] font-semibold text-[#252B3A]">Selecione uma conversa</h1>
        <p class="mx-auto mt-2 max-w-[420px] text-[11px] leading-5 text-[#858B99]">
          A caixa de entrada permanece ao lado do atendimento para você navegar entre clientes sem perder o contexto da operação.
        </p>

        <div class="mt-6 grid gap-2 sm:grid-cols-2">
          <a href="/app/chat/preview" class="flex items-center justify-between rounded-xl border border-[#E0E3EA] bg-white px-4 py-3 text-left transition hover:border-[#C9CDDA] hover:shadow-sm">
            <span>
              <strong class="block text-[10px] font-semibold text-[#343A49]">Preview do chat</strong>
              <span class="mt-0.5 block text-[9px] text-[#959AA6]">Validar experiência do cliente</span>
            </span>
            <ArrowRight size={14} class="text-[#000A57]" />
          </a>
          <a href="/app/chat/lab" class="flex items-center justify-between rounded-xl border border-[#E0E3EA] bg-white px-4 py-3 text-left transition hover:border-[#C9CDDA] hover:shadow-sm">
            <span>
              <strong class="flex items-center gap-1.5 text-[10px] font-semibold text-[#343A49]"><Sparkles size={12} class="text-[#000A57]" />Testar IA</strong>
              <span class="mt-0.5 block text-[9px] text-[#959AA6]">Laboratório do Assistente F10</span>
            </span>
            <ArrowRight size={14} class="text-[#000A57]" />
          </a>
        </div>

        <a href="/app/help" class="mt-4 inline-flex items-center gap-2 text-[9px] font-semibold text-[#000A57] hover:underline">
          <BookOpen size={12} /> Abrir base de conhecimento
        </a>
      </div>
    </main>
  </div>
</ApplicationContent>
