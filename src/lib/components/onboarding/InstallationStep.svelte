<script lang="ts">
  import { Download, FileCheck2, MonitorDown } from "lucide-svelte";

  const instructions = [
    {
      title: "Baixe o instalador",
      description: "Clique no botão abaixo e aguarde o download terminar.",
      icon: "download",
    },
    {
      title: "Abra o arquivo",
      description: "Procure por InstaladorF10.exe na pasta Downloads.",
      icon: "file",
    },
    {
      title: "Conclua a instalação",
      description: "Siga as instruções da tela até o F10 ser instalado.",
      icon: "monitor",
    },
  ];
</script>

<section class="mx-auto w-full max-w-5xl" aria-labelledby="installation-title">
  <div class="text-center">
    <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-[#EA6D0B]">
      Faça agora
    </p>
    <h1
      id="installation-title"
      class="mt-2 text-[27px] font-semibold leading-tight tracking-[-0.035em] text-[#010D28] sm:text-[34px] lg:text-[40px]"
    >
      Vamos instalar o F10 neste computador
    </h1>
    <p class="mx-auto mt-3 max-w-2xl text-[14px] leading-relaxed text-[#5F6475] sm:text-[15px]">
      Esta etapa deve ser feita em um computador com Windows.
    </p>
  </div>

  <ol class="mx-auto mt-6 grid max-w-4xl gap-3 sm:grid-cols-3 lg:mt-8">
    {#each instructions as instruction, index}
      <li class="relative rounded-[20px] border border-[#E2E5EF] bg-white p-4 text-left shadow-[0_10px_30px_rgba(1,13,40,0.05)] sm:p-5">
        <span class="absolute right-4 top-4 text-[11px] font-bold text-[#000A57]/30">
          0{index + 1}
        </span>
        <span class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F1F3FA] text-[#000A57]">
          {#if instruction.icon === "download"}
            <Download size={20} aria-hidden="true" />
          {:else if instruction.icon === "file"}
            <FileCheck2 size={20} aria-hidden="true" />
          {:else}
            <MonitorDown size={20} aria-hidden="true" />
          {/if}
        </span>
        <h2 class="mt-4 text-[16px] font-semibold text-[#010D28]">
          {instruction.title}
        </h2>
        <p class="mt-1.5 text-[13px] leading-[1.55] text-[#5F6475]">
          {instruction.description}
        </p>
      </li>
    {/each}
  </ol>

  <div class="mt-6 text-center lg:mt-8">
    <a
      href="/download/installer"
      class="attention-action inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#EA6D0B] px-7 py-3.5 text-[16px] font-semibold text-white shadow-[0_16px_38px_rgba(234,109,11,0.32)] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/45 focus:ring-offset-2 sm:w-auto"
    >
      <Download size={20} aria-hidden="true" />
      Baixar o F10
    </a>
    <p class="mt-3 text-[12px] leading-relaxed text-[#777C8C]">
      Se precisar baixar novamente, acesse
      <a href="/download" class="font-semibold text-[#000A57] underline decoration-[#EA6D0B]/60 underline-offset-4">
        f10.com.br/download
      </a>.
    </p>
  </div>
</section>

<style>
  .attention-action {
    animation: onboarding-float 2.8s ease-in-out infinite;
  }

  @keyframes onboarding-float {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-5px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .attention-action {
      animation: none;
    }
  }
</style>
