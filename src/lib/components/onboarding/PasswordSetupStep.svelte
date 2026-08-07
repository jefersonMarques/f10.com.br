<script lang="ts">
  import { ArrowLeft, KeyRound, LifeBuoy } from "lucide-svelte";
  import CenteredChoice from "$lib/components/onboarding/CenteredChoice.svelte";

  export let onComplete: () => void = () => undefined;
  export let onRequestSupport: () => void = () => undefined;

  type PasswordStage = "status" | "window" | "instruction" | "support";

  const previousStages: Partial<Record<PasswordStage, PasswordStage>> = {
    window: "status",
    instruction: "window",
    support: "window",
  };

  let stage: PasswordStage = "status";

  function showWindowQuestion(): void {
    stage = "window";
  }

  function showInstruction(): void {
    stage = "instruction";
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
          titleId="password-status-title"
          eyebrow="Nova senha"
          title="Você criou sua nova senha?"
          description="Digite uma senha pessoal e clique em OK. O F10 voltará para o login."
          primaryLabel="Sim, criei"
          secondaryLabel="Não consegui"
          onPrimary={onComplete}
          onSecondary={showWindowQuestion}
        >
          <img
            src="/onboarding/f10-password-change.webp"
            alt="Janela para criar a nova senha do F10"
            class="mx-auto max-h-[180px] w-full max-w-md rounded-[18px] object-contain shadow-[0_16px_38px_rgba(1,13,40,0.15)]"
          />
        </CenteredChoice>
      {:else if stage === "window"}
        <CenteredChoice
          titleId="password-window-title"
          title="A janela para criar senha apareceu?"
          primaryLabel="Sim"
          secondaryLabel="Não"
          onPrimary={showInstruction}
          onSecondary={showSupport}
        >
          <span class="inline-flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#FFF0E4] text-[#EA6D0B]">
            <KeyRound size={30} aria-hidden="true" />
          </span>
        </CenteredChoice>
      {:else if stage === "instruction"}
        <CenteredChoice
          titleId="password-instruction-title"
          title="Digite uma nova senha e clique em OK"
          description="A tela voltar para o login é normal."
          primaryLabel="Consegui"
          secondaryLabel="Apareceu um erro"
          onPrimary={onComplete}
          onSecondary={showSupport}
        >
          <span class="inline-flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#EDF0FF] text-[#000A57]">
            <KeyRound size={30} aria-hidden="true" />
          </span>
        </CenteredChoice>
      {:else}
        <CenteredChoice
          titleId="password-support-title"
          eyebrow="Ajuda necessária"
          title="Fale com o suporte F10"
          description="Informe que não conseguiu criar a nova senha."
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
