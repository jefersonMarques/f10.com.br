<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import { Sparkles } from "lucide-svelte";
  import SupportAssistantDialog from "$lib/components/onboarding/SupportAssistantDialog.svelte";
  import type { LayoutData } from "./$types";

  export let data: LayoutData;

  let chatOpen = false;
  let mounted = false;
  let showHint = true;

  function articleSlugFromPath(pathname: string): string {
    const match = pathname.match(/^\/ajuda-f10\/([^/]+)\/?$/);
    if (!match?.[1]) return "";
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }

  $: articleSlug = articleSlugFromPath($page.url.pathname);

  function openChat(): void {
    chatOpen = true;
    showHint = false;
  }

  function closeChat(): void {
    chatOpen = false;
  }

  function highlightArticleTarget(element: HTMLElement): void {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    element.classList.add("help-ai-target-highlight");
    window.setTimeout(() => element.classList.remove("help-ai-target-highlight"), 4_500);
  }

  function handleAssistantLink(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest<HTMLAnchorElement>("a[href]");
    if (!anchor || !anchor.closest('[aria-label="Assistente F10"]')) return;

    let url: URL;
    try {
      url = new URL(anchor.href, window.location.href);
    } catch {
      return;
    }
    if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || !url.hash) return;

    let id = url.hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {
      // Mantém o fragmento original quando não for possível decodificar.
    }
    const element = document.getElementById(id);
    if (!element) return;

    event.preventDefault();
    closeChat();
    window.setTimeout(() => highlightArticleTarget(element), 100);
  }

  onMount(() => {
    mounted = true;
    document.addEventListener("click", handleAssistantLink, true);
    return () => document.removeEventListener("click", handleAssistantLink, true);
  });
</script>

<slot />

{#if mounted && !chatOpen}
  <div class="group fixed bottom-5 right-5 z-[10010] flex items-center gap-3 sm:bottom-6 sm:right-6">
    <div
      class={`relative hidden max-w-[230px] rounded-2xl border border-[#E3E6EF] bg-white px-3.5 py-2.5 text-[10px] font-semibold leading-4 text-[#000A57] shadow-[0_14px_36px_rgba(1,13,40,0.14)] transition sm:block ${showHint ? "opacity-100" : "pointer-events-none translate-x-1 opacity-0 group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-x-0 group-focus-within:opacity-100"}`}
    >
      {articleSlug ? "Estou aqui para tirar dúvidas sobre este artigo" : "Estou aqui para tirar dúvidas"}
      <span class="absolute right-[-5px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 border-r border-t border-[#E3E6EF] bg-white" aria-hidden="true"></span>
    </div>

    <button
      type="button"
      class="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-[#EA6D0B]/25"
      aria-label={articleSlug ? "Abrir Assistente deste artigo" : "Abrir Assistente F10"}
      title={articleSlug ? "Assistente deste artigo" : "Assistente F10"}
      on:click={openChat}
    >
      <span class="help-assistant-radar" aria-hidden="true"></span>
      <span class="help-assistant-radar help-assistant-radar-delayed" aria-hidden="true"></span>
      <span class="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-[#EA6D0B] text-white shadow-[0_10px_28px_rgba(234,109,11,0.35)] transition duration-200 group-hover:scale-105">
        <Sparkles size={20} aria-hidden="true" />
      </span>
    </button>
  </div>
{/if}

<SupportAssistantDialog
  isOpen={chatOpen}
  onClose={closeChat}
  customerSupport={data.customerSupport}
/>

<style>
  .help-assistant-radar {
    position: absolute;
    inset: 3px;
    border: 1px solid rgba(234, 109, 11, 0.48);
    border-radius: 9999px;
    animation: help-assistant-radar-pulse 2.6s ease-out infinite;
  }

  .help-assistant-radar-delayed {
    animation-delay: 1.3s;
  }

  :global(.help-ai-target-highlight) {
    animation: help-ai-target-pulse 1.2s ease-out 2;
    outline: 3px solid rgba(234, 109, 11, 0.7);
    outline-offset: 4px;
    border-radius: 18px;
  }

  @keyframes help-assistant-radar-pulse {
    0% { opacity: 0.75; transform: scale(0.82); }
    75%, 100% { opacity: 0; transform: scale(1.55); }
  }

  @keyframes help-ai-target-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(234, 109, 11, 0); }
    45% { box-shadow: 0 0 0 10px rgba(234, 109, 11, 0.16); }
  }

  @media (prefers-reduced-motion: reduce) {
    .help-assistant-radar,
    :global(.help-ai-target-highlight) {
      animation: none;
    }
  }
</style>
