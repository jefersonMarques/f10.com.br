<script lang="ts">
  import { ArrowLeft, ShieldCheck, UserPlus } from "lucide-svelte";
  import TrainingVideoPlayer from "$lib/components/onboarding/TrainingVideoPlayer.svelte";
  import type { TrainingVideo } from "$lib/onboarding/trainingCatalog";

  export let training: TrainingVideo;
  export let variant: "users" | "permissions";
  export let title: string;
  export let description: string;
  export let isCompleted = false;
  export let isActive = false;
  export let onBack: () => void = () => undefined;
  export let onComplete: () => void = () => undefined;
</script>

<section aria-labelledby={`essential-training-title-${training.id}`}>
  <div class="mx-auto max-w-4xl text-center">
    <span class={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${variant === "users" ? "bg-[#EA6D0B]/10 text-[#EA6D0B]" : "bg-[#000A57]/5 text-[#000A57]"}`}>
      {#if variant === "users"}
        <UserPlus size={28} aria-hidden="true" />
      {:else}
        <ShieldCheck size={28} aria-hidden="true" />
      {/if}
    </span>
    <p class="mt-5 text-[12px] font-bold uppercase tracking-[0.15em] text-[#EA6D0B]">
      Configuração essencial
    </p>
    <h2
      id={`essential-training-title-${training.id}`}
      class="mt-3 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-[#010D28] sm:text-[38px]"
    >
      {title}
    </h2>
    <p class="mx-auto mt-4 max-w-2xl text-[16px] leading-[1.75] text-[#5F6475]">
      {description}
    </p>
  </div>

  {#if isActive}
    <div class="mx-auto mt-8 max-w-4xl">
      <TrainingVideoPlayer
        {training}
        {isCompleted}
        {onComplete}
        completedActionLabel="Continuar"
        allowCompletedAction={true}
      />
    </div>
  {/if}

  <div class="mx-auto mt-6 max-w-4xl">
    <button
      type="button"
      class="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-[15px] font-semibold text-[#000A57] transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
      on:click={onBack}
    >
      <ArrowLeft size={18} aria-hidden="true" />
      Voltar
    </button>
  </div>
</section>
