<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { BellRing, BookOpen, Boxes, MessageCircleMore, Megaphone, X } from "lucide-svelte";
  import SupportAssistantDialog from "$lib/components/onboarding/SupportAssistantDialog.svelte";
  import type { LayoutData } from "./$types";

  export let data: LayoutData;

  let chatOpen = false;
  let dismissedIds: string[] = [];
  let notices = data.notices;
  let mounted = false;

  const navigation = [
    { label: "Suporte", href: "/iframef10/suporte", icon: BookOpen },
    { label: "Atualizações", href: "/iframef10/novidades", icon: Megaphone },
    { label: "Recursos", href: "/iframef10/recursos", icon: Boxes },
    { label: "Avisos", href: "/iframef10/avisos", icon: BellRing },
  ];

  $: pathname = $page.url.pathname;
  $: visibleNotice = notices.find((notice) => !dismissedIds.includes(notice.id)) ?? null;

  function active(href: string): boolean {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function dismissNotice(id: string): void {
    window.localStorage.setItem(`f10-iframe-notice:${id}`, "1");
    dismissedIds = [...dismissedIds, id];
  }

  async function refreshNotices(): Promise<void> {
    try {
      const response = await fetch("/api/iframef10/notices", { cache: "no-store" });
      if (response.ok) notices = await response.json() as typeof notices;
    } catch {
      // A próxima consulta tenta novamente sem interromper o WebView.
    }
  }

  onMount(() => {
    mounted = true;
    dismissedIds = notices
      .filter((notice) => window.localStorage.getItem(`f10-iframe-notice:${notice.id}`) === "1")
      .map((notice) => notice.id);

    void refreshNotices();
    const timer = window.setInterval(() => void refreshNotices(), 60_000);
    return () => window.clearInterval(timer);
  });
</script>

<svelte:head>
  <meta name="robots" content="noindex,nofollow"/>
  <meta name="googlebot" content="noindex,nofollow"/>
</svelte:head>

<div class="min-h-[100dvh] bg-[#F5F6FA] text-[#202637]">
  <header class="sticky top-0 z-40 border-b border-[#E2E5ED] bg-white/95 backdrop-blur">
    <div class="mx-auto flex min-h-[62px] max-w-[1440px] items-center gap-3 px-3 sm:px-5">
      <a href="/iframef10/suporte" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#000A57] text-[11px] font-bold text-white">F10</a>

      <nav class="flex min-w-0 flex-1 gap-1 overflow-x-auto" aria-label="F10">
        {#each navigation as item}
          <a
            href={item.href}
            class={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-[11px] font-semibold transition ${active(item.href) ? "bg-[#EEF0FF] text-[#000A57]" : "text-[#697080] hover:bg-[#F3F4F7]"}`}
          >
            <svelte:component this={item.icon} size={15}/>
            <span>{item.label}</span>
            {#if item.href === "/iframef10/avisos" && notices.length > 0}
              <span class="rounded-full bg-[#D92D20] px-1.5 py-0.5 text-[8px] font-bold text-white">{notices.length}</span>
            {/if}
          </a>
        {/each}
      </nav>

      <button type="button" on:click={() => (chatOpen = true)} class="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[#000A57] px-3 text-[10px] font-semibold text-white" aria-label="Abrir suporte">
        <MessageCircleMore size={15}/><span class="hidden sm:inline">Chat</span>
      </button>
    </div>
  </header>

  <main class="mx-auto max-w-[1440px]">
    <slot/>
  </main>

  {#if mounted && visibleNotice}
    <div class="fixed inset-0 z-[10020] flex items-center justify-center bg-[#010D28]/45 p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="iframe-notice-title" class="w-full max-w-[460px] overflow-hidden rounded-[24px] bg-white shadow-2xl">
        <div class={`h-1.5 ${visibleNotice.severity === "critical" ? "bg-[#D92D20]" : visibleNotice.severity === "warning" ? "bg-[#EA6D0B]" : "bg-[#000A57]"}`}></div>
        <div class="p-5 sm:p-6">
          <div class="flex items-start gap-3">
            <span class={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${visibleNotice.severity === "critical" ? "bg-[#FFF0F0] text-[#9B2C2C]" : visibleNotice.severity === "warning" ? "bg-[#FFF4E8] text-[#9B530F]" : "bg-[#EEF0FF] text-[#000A57]"}`}><BellRing size={18}/></span>
            <div class="min-w-0 flex-1">
              <h2 id="iframe-notice-title" class="text-[15px] font-semibold text-[#202637]">{visibleNotice.title}</h2>
              <p class="mt-2 whitespace-pre-wrap text-[12px] leading-6 text-[#676D7D]">{visibleNotice.message}</p>
            </div>
            {#if !visibleNotice.requiresAcknowledgement}
              <button type="button" on:click={() => dismissNotice(visibleNotice.id)} class="flex h-8 w-8 items-center justify-center rounded-lg text-[#858B99] hover:bg-[#F3F4F7]" aria-label="Fechar"><X size={15}/></button>
            {/if}
          </div>
          <button type="button" on:click={() => dismissNotice(visibleNotice.id)} class="mt-5 h-10 w-full rounded-xl bg-[#000A57] text-[11px] font-semibold text-white">{visibleNotice.requiresAcknowledgement ? "Entendi" : "Fechar"}</button>
        </div>
      </section>
    </div>
  {/if}

  <SupportAssistantDialog isOpen={chatOpen} onClose={() => (chatOpen = false)} customerSupport={data.customerSupport}/>
</div>
