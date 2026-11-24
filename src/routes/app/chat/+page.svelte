<script lang="ts">
  import { BookOpen, MessageCircleMore, Sparkles } from "lucide-svelte";
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
  className="bg-[var(--app-surface)] lg:h-[calc(100dvh-var(--application-header-height))] lg:min-h-[540px] lg:overflow-hidden"
>
  <ChatInbox chats={data.chatInbox} currentUserId={data.chatCurrentUserId}>
    <main class="flex min-h-[240px] min-w-0 items-center justify-center overflow-hidden bg-white p-6 lg:min-h-0">
      <div class="space-y-4 text-center">
        <p class="text-[12px] text-[#9297A4]">Selecione uma conversa para abrir os detalhes.</p>
        <div class="flex flex-wrap items-center justify-center gap-2">
          <a href="/app/chat/preview" class="application-text-caption inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--app-border-control)] px-3 font-semibold text-[var(--app-primary)]"><MessageCircleMore size={14}/>Preview do chat</a>
          <a href="/app/chat/lab" class="application-text-caption inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--app-border-control)] px-3 font-semibold text-[var(--app-primary)]"><Sparkles size={14}/>Laboratório</a>
          <a href="/app/help" class="application-text-caption inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--app-border-control)] px-3 font-semibold text-[var(--app-primary)]"><BookOpen size={14}/>Base de conhecimento</a>
        </div>
      </div>
    </main>
  </ChatInbox>
</ApplicationContent>
