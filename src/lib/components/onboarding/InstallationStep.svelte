<script lang="ts">
  import {
    ArrowLeft,
    FolderOpen,
    LifeBuoy,
    Monitor,
    PackageCheck,
    RotateCcw,
    TriangleAlert,
  } from "lucide-svelte";
  import CenteredChoice from "$lib/components/onboarding/CenteredChoice.svelte";

  export let onComplete: () => void = () => undefined;
  export let onRequestSupport: () => void = () => undefined;

  type InstallationStage =
    | "status"
    | "platform"
    | "windows-required"
    | "downloads"
    | "download-missing"
    | "download-retry"
    | "open-installer"
    | "error-question"
    | "retry"
    | "support";

  const previousStages: Partial<Record<InstallationStage, InstallationStage>> = {
    platform: "status",
    "windows-required": "platform",
    downloads: "platform",
    "download-missing": "downloads",
    "download-retry": "download-missing",
    "open-installer": "downloads",
    "error-question": "open-installer",
    retry: "error-question",
  };

  let stage: InstallationStage = "status";
  let supportReturnStage: InstallationStage = "error-question";

  function showPlatformQuestion(): void {
    stage = "platform";
  }

  function showWindowsWarning(): void {
    stage = "windows-required";
  }

  function showDownloadsQuestion(): void {
    stage = "downloads";
  }

  function showDownloadCheck(): void {
    stage = "download-missing";
  }

  function showInstallerInstruction(): void {
    stage = "open-installer";
  }

  function showDownloadRetry(): void {
    stage = "download-retry";
  }

  function showErrorQuestion(): void {
    stage = "error-question";
  }

  function showRetryInstruction(): void {
    stage = "retry";
  }

  function showSupportInstruction(): void {
    supportReturnStage = stage;
    stage = "support";
  }

  function returnToPreviousStage(): void {
    if (stage === "support") {
      stage = supportReturnStage;
      return;
    }

    stage = previousStages[stage] ?? "status";
  }

  function downloadInstallerAgain(): void {
    const link = document.createElement("a");
    link.href = "/download/installer";
    document.body.appendChild(link);
    link.click();
    link.remove();
    stage = "downloads";
  }

  function retryAfterSupport(): void {
    if (supportReturnStage === "download-retry") {
      downloadInstallerAgain();
      return;
    }

    showInstallerInstruction();
  }
</script>

<div class="mx-auto w-full max-w-4xl">
  {#if stage !== "status"}
    <button
      type="button"
      class="mx-auto mb-4 flex min-h-10 items-center justify-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold text-[#5F6475] transition hover:bg-white hover:text-[#000A57] focus:outline-none focus:ring-2 focus:ring-[#000A57]/20"
      on:click={returnToPreviousStage}
    >
      <ArrowLeft size={16} aria-hidden="true" />
      Voltar
    </button>
  {/if}

  {#key stage}
    <div class="question-transition">
      {#if stage === "status"}
        <CenteredChoice
          titleId="installation-status-title"
          eyebrow="Instalação"
          title="Você já instalou o F10?"
          primaryLabel="Fiz a instalação"
          secondaryLabel="Não consegui instalar"
          onPrimary={onComplete}
          onSecondary={showPlatformQuestion}
        >
          <span class="inline-flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#FFF0E4] text-[#EA6D0B] ring-8 ring-white">
            <PackageCheck size={30} aria-hidden="true" />
          </span>
        </CenteredChoice>
      {:else if stage === "platform"}
        <CenteredChoice
          titleId="installation-platform-title"
          title="Este computador usa Windows?"
          primaryLabel="Sim"
          secondaryLabel="Não"
          onPrimary={showDownloadsQuestion}
          onSecondary={showWindowsWarning}
        >
          <span class="inline-flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#EDF0FF] text-[#000A57]">
            <Monitor size={30} aria-hidden="true" />
          </span>
        </CenteredChoice>
      {:else if stage === "windows-required"}
        <CenteredChoice
          titleId="windows-required-title"
          eyebrow="Requisito obrigatório"
          title="O F10 precisa de Windows"
          description="Abra esta página em um computador com Windows para continuar."
          primaryLabel="Entendi"
          onPrimary={showPlatformQuestion}
        >
          <span class="inline-flex h-16 w-16 items-center justify-center rounded-[22px] bg-amber-100 text-amber-800">
            <TriangleAlert size={30} aria-hidden="true" />
          </span>
        </CenteredChoice>
      {:else if stage === "downloads"}
        <CenteredChoice
          titleId="downloads-folder-title"
          title="Achou a pasta Downloads?"
          description="Abra o Explorador de Arquivos e procure Downloads no lado esquerdo."
          primaryLabel="Sim, achei"
          secondaryLabel="Não achei"
          onPrimary={showInstallerInstruction}
          onSecondary={showDownloadCheck}
        >
          <span class="inline-flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#EDF0FF] text-[#000A57]">
            <FolderOpen size={30} aria-hidden="true" />
          </span>
        </CenteredChoice>
      {:else if stage === "download-missing"}
        <CenteredChoice
          titleId="download-check-title"
          title="O arquivo InstaladorF10.exe foi baixado?"
          description="Confira também o histórico de downloads do navegador."
          primaryLabel="Sim, foi baixado"
          secondaryLabel="Não, ou deu erro"
          onPrimary={showInstallerInstruction}
          onSecondary={showDownloadRetry}
        >
          <span class="inline-flex h-16 w-16 items-center justify-center rounded-[22px] bg-amber-100 text-amber-800">
            <TriangleAlert size={30} aria-hidden="true" />
          </span>
        </CenteredChoice>
      {:else if stage === "download-retry"}
        <CenteredChoice
          titleId="download-retry-title"
          title="Tente baixar o arquivo novamente"
          description="Se o navegador mostrar um erro, fale com o suporte."
          primaryLabel="Baixar novamente"
          secondaryLabel="Apareceu um erro"
          onPrimary={downloadInstallerAgain}
          onSecondary={showSupportInstruction}
        >
          <span class="inline-flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#EDF0FF] text-[#000A57]">
            <RotateCcw size={30} aria-hidden="true" />
          </span>
        </CenteredChoice>
      {:else if stage === "open-installer"}
        <CenteredChoice
          titleId="open-installer-title"
          title="Dê dois cliques neste ícone"
          description="Depois, clique em Avançar até aparecer o botão Concluir."
          primaryLabel="Consegui instalar"
          secondaryLabel="Não consegui"
          onPrimary={onComplete}
          onSecondary={showErrorQuestion}
        >
          <img
            src="/onboarding/f10-installer-icon.webp"
            alt="Ícone do instalador do F10"
            class="mx-auto h-24 w-24 rounded-[22px] shadow-[0_14px_32px_rgba(1,13,40,0.18)]"
          />
        </CenteredChoice>
      {:else if stage === "error-question"}
        <CenteredChoice
          titleId="installation-error-title"
          title="Apareceu uma mensagem de erro?"
          primaryLabel="Sim, apareceu"
          secondaryLabel="Não apareceu"
          onPrimary={showSupportInstruction}
          onSecondary={showRetryInstruction}
        >
          <span class="inline-flex h-16 w-16 items-center justify-center rounded-[22px] bg-amber-100 text-amber-800">
            <TriangleAlert size={30} aria-hidden="true" />
          </span>
        </CenteredChoice>
      {:else if stage === "retry"}
        <CenteredChoice
          titleId="installation-retry-title"
          title="Tente instalar novamente"
          description="Feche outros programas e dê dois cliques no instalador."
          primaryLabel="Tentar novamente"
          secondaryLabel="Ainda não consegui"
          onPrimary={showInstallerInstruction}
          onSecondary={showErrorQuestion}
        >
          <span class="inline-flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#EDF0FF] text-[#000A57]">
            <RotateCcw size={30} aria-hidden="true" />
          </span>
        </CenteredChoice>
      {:else}
        <CenteredChoice
          titleId="installation-support-title"
          eyebrow="Ajuda necessária"
          title="Fale com o suporte F10"
          description="Se puder, envie uma foto da mensagem de erro."
          primaryLabel="Abrir suporte"
          secondaryLabel="Tentar novamente"
          onPrimary={onRequestSupport}
          onSecondary={retryAfterSupport}
        >
          <span class="inline-flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#EDF0FF] text-[#000A57]">
            <LifeBuoy size={30} aria-hidden="true" />
          </span>
        </CenteredChoice>
      {/if}
    </div>
  {/key}
</div>

<style>
  .question-transition {
    animation: question-enter 180ms ease-out;
  }

  @keyframes question-enter {
    from {
      opacity: 0;
      transform: translateX(8px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .question-transition {
      animation: none;
    }
  }
</style>
