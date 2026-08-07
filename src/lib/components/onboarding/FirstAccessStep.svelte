<script lang="ts">
  import { ArrowLeft, KeyRound, LifeBuoy, MonitorUp } from "lucide-svelte";
  import CenteredChoice from "$lib/components/onboarding/CenteredChoice.svelte";

  export let onComplete: () => void = () => undefined;
  export let onRequestSupport: () => void = () => undefined;

  type AccessStage =
    | "status"
    | "application"
    | "open-help"
    | "credentials"
    | "support";

  const previousStages: Partial<Record<AccessStage, AccessStage>> = {
    application: "status",
    "open-help": "application",
    credentials: "application",
    support: "credentials",
  };

  let stage: AccessStage = "status";

  function showApplicationQuestion(): void {
    stage = "application";
  }

  function showOpenHelp(): void {
    stage = "open-help";
  }

  function showCredentialsHelp(): void {
    stage = "credentials";
  }

  function showSupport(): void {
    stage = "support";
  }

  function returnToStatus(): void {
    stage = "status";
  }

  function returnToPreviousStage(): void {
    stage = previousStages[stage] ?? "status";
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
          titleId="provisional-access-status-title"
          eyebrow="Primeiro acesso"
          title="A tela para criar senha apareceu?"
          description="Entre com o login e a senha provisória recebidos por e-mail."
          primaryLabel="Sim, apareceu"
          secondaryLabel="Não consegui entrar"
          onPrimary={onComplete}
          onSecondary={showApplicationQuestion}
        >
          <img
            src="/onboarding/f10-access-credentials.webp"
            alt="Tela de login e senha do F10"
            class="mx-auto max-h-[210px] w-full max-w-2xl rounded-[18px] object-contain shadow-[0_16px_38px_rgba(1,13,40,0.15)] sm:max-h-[300px] lg:max-h-[340px]"
          />
        </CenteredChoice>
      {:else if stage === "application"}
        <CenteredChoice
          titleId="application-open-title"
          title="O F10 abriu?"
          primaryLabel="Sim"
          secondaryLabel="Não"
          onPrimary={showCredentialsHelp}
          onSecondary={showOpenHelp}
        >
          <span class="inline-flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#EDF0FF] text-[#000A57]">
            <MonitorUp size={30} aria-hidden="true" />
          </span>
        </CenteredChoice>
      {:else if stage === "open-help"}
        <CenteredChoice
          titleId="open-application-help-title"
          title="Abra o atalho do F10"
          description="Dê dois cliques no ícone do F10 na área de trabalho."
          primaryLabel="Abriu agora"
          secondaryLabel="Não abriu"
          onPrimary={showCredentialsHelp}
          onSecondary={showSupport}
        >
          <img
            src="/onboarding/f10-installer-icon.webp"
            alt="Ícone do F10"
            class="mx-auto h-24 w-24 rounded-[22px] shadow-[0_14px_32px_rgba(1,13,40,0.18)]"
          />
        </CenteredChoice>
      {:else if stage === "credentials"}
        <CenteredChoice
          titleId="credentials-help-title"
          title="Use os dados do e-mail"
          description="Digite o login e a senha provisória. Selecione sua escola e clique em Acessar."
          primaryLabel="Tentar novamente"
          secondaryLabel="Apareceu um erro"
          onPrimary={returnToStatus}
          onSecondary={showSupport}
        >
          <span class="inline-flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#FFF0E4] text-[#EA6D0B]">
            <KeyRound size={30} aria-hidden="true" />
          </span>
        </CenteredChoice>
      {:else}
        <CenteredChoice
          titleId="access-support-title"
          eyebrow="Ajuda necessária"
          title="Fale com o suporte F10"
          description="Informe que o problema aconteceu no primeiro acesso."
          primaryLabel="Abrir suporte"
          secondaryLabel="Tentar novamente"
          onPrimary={onRequestSupport}
          onSecondary={returnToStatus}
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
