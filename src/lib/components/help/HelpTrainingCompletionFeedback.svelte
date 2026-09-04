<script lang="ts">
  import { CheckCircle2, MessageCircleQuestion } from "lucide-svelte";
  import HelpTrainingTutor from "$lib/components/help/HelpTrainingTutor.svelte";

  export let mode: "preview" | "invite" | "public";
  export let sourceContentSlug: string;

  let answer: "yes" | "doubts" | null = null;
</script>

<section class="mx-auto mt-8 w-full max-w-[620px] rounded-[24px] border border-[#E1E5ED] bg-white p-5 text-left shadow-[0_16px_45px_rgba(1,13,40,0.07)] sm:p-6">
  <div class="text-center">
    <p class="text-[9px] font-bold uppercase tracking-[0.14em] text-[#8A91A0]">Antes de encerrar</p>
    <h2 class="mt-2 text-[20px] font-semibold tracking-[-0.025em] text-[#11182C]">Você conseguiu concluir o que precisava?</h2>
    <p class="mx-auto mt-2 max-w-[470px] text-[11px] leading-5 text-[#747A8A]">Se alguma parte ficou confusa, o tutor pode responder usando o conteúdo desta trilha.</p>
  </div>

  <div class="mt-5 grid gap-2 sm:grid-cols-2">
    <button
      type="button"
      on:click={() => (answer = "yes")}
      class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 text-[10px] font-bold transition"
      class:border-[#2F7D4C]={answer === "yes"}
      class:bg-[#2F7D4C]={answer === "yes"}
      class:text-white={answer === "yes"}
      class:border-[#D8E8DD]={answer !== "yes"}
      class:bg-[#F4FBF6]={answer !== "yes"}
      class:text-[#2F7045]={answer !== "yes"}
    >
      <CheckCircle2 size={15}/>
      Sim
    </button>

    <button
      type="button"
      on:click={() => (answer = "doubts")}
      class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 text-[10px] font-bold transition"
      class:border-[#C44336]={answer === "doubts"}
      class:bg-[#C44336]={answer === "doubts"}
      class:text-white={answer === "doubts"}
      class:border-[#E8D7D4]={answer !== "doubts"}
      class:bg-white={answer !== "doubts"}
      class:text-[#9B3F36]={answer !== "doubts"}
    >
      <MessageCircleQuestion size={15}/>
      Não, tive dúvidas
    </button>
  </div>

  {#if answer === "yes"}
    <div class="mt-5 rounded-2xl border border-[#D8E8DD] bg-[#F4FBF6] px-4 py-4 text-center">
      <strong class="text-[11px] text-[#2F7045]">Certo. Trilha concluída.</strong>
      <p class="mt-1 text-[9px] leading-4 text-[#64806D]">Você pode voltar a este conteúdo sempre que precisar revisar o procedimento.</p>
    </div>
  {:else if answer === "doubts"}
    <div class="mt-5">
      <HelpTrainingTutor
        {mode}
        {sourceContentSlug}
        embedded={true}
        introText="Conte o que não ficou claro. O tutor responde usando o conteúdo publicado que originou esta trilha."
        placeholder="O que ficou em dúvida?"
      />
    </div>
  {/if}
</section>
