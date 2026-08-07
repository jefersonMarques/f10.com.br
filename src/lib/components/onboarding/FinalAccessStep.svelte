<script lang="ts">
  import { ArrowLeft, KeyRound, LifeBuoy, LogIn } from "lucide-svelte";
  import CenteredChoice from "$lib/components/onboarding/CenteredChoice.svelte";

  export let onComplete: () => void = () => undefined;
  export let onRequestSupport: () => void = () => undefined;

  type FinalAccessStage = "status" | "password" | "retry" | "support";

  const previousStages: Partial<Record<FinalAccessStage, FinalAccessStage>> = {
    password: "status",
    retry: "password",
    support: "password",
  };

  let stage: FinalAccessStage = "status";

  function showPasswordQuestion(): void {
    stage = "password";
  }

  function showRetryInstruction(): void {
    stage = "retry";
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
          titleId="final-access-status-title"
          eyebrow="Segundo login"
          title="Conseguiu entrar com a nova senha?"
          description="Use o mesmo login e a senha que acabou de criar."
          primaryLabel="Sim, entrei"
          secondaryLabel="Não consegui entrar"
          onPrimary={onComplete}
          onSecondary={showPasswordQuestion}
        >
          <img
            src="/onboarding/f10-access-company.webp"
            alt="Tela de acesso do F10 com o campo Empresa"
            class="mx-auto max-h-[180px] w-full max-w-md rounded-[18px] object-contain shadow-[0_16px_38px_rgba(1,13,40,0.15)]"
          />
        </CenteredChoice>
      {:else if stage === "password"}
        <CenteredChoice
          titleId="final-password-question-title"
          title="Você usou a nova senha?"
          description="A senha provisória do e-mail não funciona mais."
          primaryLabel="Sim"
          secondaryLabel="Não"
          onPrimary={showSupport}
          onSecondary={showRetryInstruction}
        >
          <span class="inline-flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#FFF0E4] text-[#EA6D0B]">
            <KeyRound size={30} aria-hidden="true" />
          </span>
        </CenteredChoice>
      {:else if stage === "retry"}
        <CenteredChoice
          titleId="final-access-retry-title"
          title="Entre novamente com a nova senha"
          description="Depois selecione sua escola e clique em Acessar."
          primaryLabel="Tentar novamente"
          secondaryLabel="Ainda não consegui"
          onPrimary={returnToStatus}
          onSecondary={showSupport}
        >
          <span class="inline-flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#EDF0FF] text-[#000A57]">
            <LogIn size={30} aria-hidden="true" />
          </span>
        </CenteredChoice>
      {:else}
        <CenteredChoice
          titleId="final-access-support-title"
          eyebrow="Ajuda necessária"
          title="Fale com o suporte F10"
          description="Informe que não conseguiu fazer o segundo login."
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
