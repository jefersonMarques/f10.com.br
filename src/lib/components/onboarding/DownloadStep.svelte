<script lang="ts">
  import { onMount } from "svelte";
  import { CheckCircle2, Download, Monitor, TriangleAlert } from "lucide-svelte";

  export let downloadStarted = false;
  export let onDownloadStarted: () => void = () => undefined;

  type NavigatorWithUserAgentData = Navigator & {
    userAgentData?: {
      platform?: string;
    };
  };

  let isWindows: boolean | null = null;

  onMount(() => {
    const browserNavigator = navigator as NavigatorWithUserAgentData;
    const platform =
      browserNavigator.userAgentData?.platform ??
      browserNavigator.platform ??
      browserNavigator.userAgent;

    isWindows = /windows|win32|win64/i.test(platform);
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
  <p class="mx-auto mt-4 max-w-xl text-[14px] leading-[1.7] text-[#5F6475] sm:text-[16px]">
    O F10 deve ser instalado em um computador com Windows.
  </p>

  <div class="mx-auto mt-6 flex max-w-md items-center justify-center gap-3 rounded-2xl bg-white px-4 py-3 text-left ring-1 ring-[#DEE2ED]">
    <Monitor class="min-w-6 text-[#000A57]" size={24} aria-hidden="true" />
    <div>
      <p class="text-[13px] font-semibold text-[#010D28]">Requisito obrigatório</p>
      <p class="mt-0.5 text-[12px] text-[#5F6475]">Computador com sistema operacional Windows.</p>
    </div>
  </div>

  {#if isWindows === false}
    <div class="mx-auto mt-6 flex max-w-xl items-start gap-3 rounded-2xl bg-amber-50 p-4 text-left text-amber-950 ring-1 ring-amber-200">
      <TriangleAlert class="mt-0.5 min-w-5" size={20} aria-hidden="true" />
      <p class="text-[13px] leading-[1.6]">
        Este dispositivo não parece utilizar Windows. Abra esta página no computador em que o F10 será instalado.
      </p>
    </div>
  {:else}
    <a
      href="/download/installer"
      class={`${downloadStarted ? "" : "download-action"} mt-7 inline-flex min-h-16 w-full items-center justify-center gap-3 rounded-full px-8 py-4 text-[17px] font-semibold text-white shadow-[0_18px_42px_rgba(234,109,11,0.34)] transition focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/45 focus:ring-offset-2 sm:w-auto ${isWindows === null ? "pointer-events-none bg-[#B8BBC5]" : "bg-[#EA6D0B] hover:brightness-105"}`}
      aria-disabled={isWindows !== true}
      on:click={handleDownload}
    >
      <Download size={22} aria-hidden="true" />
      Baixar o F10 agora
    </a>
  {/if}

  {#if downloadStarted}
    <p class="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-[12px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
      <CheckCircle2 size={17} aria-hidden="true" />
      Download iniciado. Aguarde o arquivo terminar de baixar.
    </p>
  {/if}
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
      transform: translateY(-6px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .download-action {
      animation: none;
    }
  }
</style>
