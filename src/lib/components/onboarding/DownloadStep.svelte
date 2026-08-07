<script lang="ts">
  import { onMount } from "svelte";
  import {
    Check,
    CheckCircle2,
    Download,
    Monitor,
    TriangleAlert,
  } from "lucide-svelte";

  export let downloadStarted = false;
  export let onDownloadStarted: () => void = () => undefined;
  export let onComplete: () => void = () => undefined;
  export let onAlreadyInstalled: () => void = () => undefined;

  type NavigatorWithUserAgentData = Navigator & {
    userAgentData?: {
      platform?: string;
    };
  };

  let isWindows: boolean | null = null;

  onMount(() => {
    const browserNavigator = navigator as NavigatorWithUserAgentData;
    const platformDetails = [
      browserNavigator.userAgentData?.platform,
      browserNavigator.platform,
      browserNavigator.userAgent,
    ]
      .filter(Boolean)
      .join(" ");

    isWindows = /windows|win32|win64/i.test(platformDetails);
  });

  function handleDownload(event: MouseEvent): void {
    if (isWindows !== true) {
      event.preventDefault();
      return;
    }

    onDownloadStarted();
  }
</script>

<section class="mx-auto w-full max-w-3xl text-center" aria-labelledby="download-title">
  {#if downloadStarted}
    <span class="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-8 ring-emerald-50">
      <CheckCircle2 size={30} aria-hidden="true" />
    </span>
    <p class="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">
      Download solicitado
    </p>
    <h1
      id="download-title"
      class="mx-auto mt-2 max-w-2xl text-[30px] font-semibold leading-tight tracking-[-0.04em] text-[#010D28] sm:text-[40px]"
    >
      O arquivo apareceu na pasta Downloads?
    </h1>
    <p class="mx-auto mt-3 max-w-xl text-[14px] leading-[1.65] text-[#5F6475] sm:text-[16px]">
      Procure pelo arquivo InstaladorF10.exe.
    </p>

    <div class="mx-auto mt-7 grid max-w-xl gap-3 sm:grid-cols-2">
      <button
        type="button"
        class="download-action inline-flex min-h-16 items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-4 text-[16px] font-semibold text-white shadow-[0_14px_32px_rgba(5,150,105,0.24)] transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
        on:click={onComplete}
      >
        <Check size={21} strokeWidth={2.5} aria-hidden="true" />
        Sim, continuar
      </button>
      <a
        href="/download/installer"
        class="inline-flex min-h-16 items-center justify-center gap-2 rounded-full border-2 border-[#EA6D0B] bg-white px-6 py-4 text-[16px] font-semibold text-[#C95717] transition hover:bg-[#FFF5EC] focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/35 focus:ring-offset-2"
        on:click={handleDownload}
      >
        <Download size={20} aria-hidden="true" />
        Não apareceu, baixar novamente
      </a>
    </div>
  {:else}
    <span class="inline-flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#FFF0E4] text-[#EA6D0B] ring-8 ring-white">
      <Download size={30} aria-hidden="true" />
    </span>

    <p class="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-[#EA6D0B]">
      Primeira ação
    </p>
    <h1
      id="download-title"
      class="mx-auto mt-2 max-w-2xl text-[30px] font-semibold leading-tight tracking-[-0.04em] text-[#010D28] sm:text-[40px]"
    >
      Baixe o instalador do F10
    </h1>

    <div class="mx-auto mt-5 flex max-w-md items-center justify-center gap-3 rounded-2xl bg-white px-4 py-3 text-left ring-1 ring-[#DEE2ED]">
      <Monitor class="min-w-6 text-[#000A57]" size={24} aria-hidden="true" />
      <p class="text-[13px] font-semibold text-[#010D28]">
        Use um computador com Windows.
      </p>
    </div>

    {#if isWindows === false}
      <div class="mx-auto mt-5 flex max-w-xl items-start gap-3 rounded-2xl bg-amber-50 p-4 text-left text-amber-950 ring-1 ring-amber-200">
        <TriangleAlert class="mt-0.5 min-w-5" size={20} aria-hidden="true" />
        <p class="text-[13px] leading-[1.6]">
          O F10 precisa de Windows. Abra esta página no computador em que será instalado.
        </p>
      </div>
    {:else}
      <a
        href="/download/installer"
        class={`download-action mt-7 inline-flex min-h-16 w-full items-center justify-center gap-3 rounded-full px-8 py-4 text-[17px] font-semibold text-white shadow-[0_18px_42px_rgba(234,109,11,0.34)] transition focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/45 focus:ring-offset-2 sm:w-auto ${isWindows === null ? "pointer-events-none bg-[#B8BBC5]" : "bg-[#EA6D0B] hover:brightness-105"}`}
        aria-disabled={isWindows !== true}
        on:click={handleDownload}
      >
        <Download size={22} aria-hidden="true" />
        Baixar o F10 agora
      </a>
    {/if}
  {/if}

  <button
    type="button"
    class="mx-auto mt-5 flex min-h-11 items-center justify-center rounded-full px-5 py-2.5 text-[13px] font-semibold text-[#000A57] underline decoration-[#000A57]/30 underline-offset-4 transition hover:bg-white hover:decoration-[#000A57] focus:outline-none focus:ring-2 focus:ring-[#000A57]/20"
    on:click={onAlreadyInstalled}
  >
    Já tenho o F10 instalado
  </button>
</section>

<style>
  .download-action {
    animation: download-float 2.8s ease-in-out infinite;
  }

  @keyframes download-float {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-5px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .download-action {
      animation: none;
    }
  }
</style>
