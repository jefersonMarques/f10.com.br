<script lang="ts">
  import { CheckCircle2, Star } from "lucide-svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  let score = 0;
</script>

<svelte:head>
  <title>Avaliação de atendimento | F10</title>
  <meta name="robots" content="noindex,nofollow" />
</svelte:head>

<main class="min-h-screen bg-[#F5F6FA] px-5 py-10 text-[#11182C] sm:py-16">
  <section class="mx-auto max-w-[560px] overflow-hidden rounded-[26px] border border-[#E2E5ED] bg-white shadow-[0_18px_55px_rgba(1,13,40,0.07)]">
    <header class="bg-[#010D28] px-6 py-7 text-white sm:px-8">
      <p class="application-text-caption font-bold uppercase tracking-[0.12em] text-[#FF9A4B]">F10 Software</p>
      <h1 class="mt-2 text-[26px] font-semibold tracking-[-0.035em]">Pesquisa de satisfação</h1>
    </header>

    <div class="px-6 py-7 sm:px-8">
      {#if !data.survey}
        <p class="text-[13px] leading-6 text-[#6F7685]">Este link de avaliação não é válido.</p>
      {:else if form?.success || data.survey.answeredAt}
        <div class="flex items-start gap-3 rounded-2xl border border-[#CFE0D5] bg-[#F1F8F3] p-5">
          <CheckCircle2 size={22} class="mt-0.5 shrink-0 text-[#2F7045]" />
          <div>
            <h2 class="text-[15px] font-semibold text-[#245B38]">Avaliação registrada</h2>
            <p class="mt-1 text-[12px] leading-5 text-[#52705C]">{form?.message ?? "Obrigado por compartilhar sua experiência com a F10."}</p>
          </div>
        </div>
      {:else}
        <p class="application-text-meta font-bold uppercase tracking-[0.08em] text-[#EA6D0B]">Ticket #{data.survey.ticketNumber}</p>
        <h2 class="mt-2 text-[18px] font-semibold text-[#252C3D]">{data.survey.subject}</h2>
        <p class="mt-2 text-[12px] leading-5 text-[#747C8D]">Como você avalia o atendimento recebido?</p>

        {#if form?.message}
          <div class="application-text-caption mt-4 rounded-xl border border-[#F0C8C8] bg-[#FFF5F5] px-3 py-2 text-[#9B2C2C]">{form.message}</div>
        {/if}

        <form method="POST" class="mt-6">
          <input type="hidden" name="score" value={score} />
          <div class="flex gap-2" aria-label="Nota de 1 a 5">
            {#each [1, 2, 3, 4, 5] as value}
              <button
                type="button"
                on:click={() => (score = value)}
                class="flex h-12 w-12 items-center justify-center rounded-xl border transition {score >= value ? 'border-[#EA6D0B] bg-[#FFF4E8] text-[#EA6D0B]' : 'border-[#DDE1EA] bg-white text-[#A1A7B3] hover:border-[#C8CDD8]'}"
                aria-label={value + (value > 1 ? " estrelas" : " estrela")}
              >
                <Star size={22} fill={score >= value ? "currentColor" : "none"} />
              </button>
            {/each}
          </div>

          <label class="mt-6 block">
            <span class="application-text-caption font-semibold text-[#555B6B]">Comentário <span class="font-normal text-[#9AA0AC]">(opcional)</span></span>
            <textarea name="comment" maxlength="2000" rows="4" placeholder="Se quiser, conte um pouco mais..." class="mt-2 w-full resize-y rounded-2xl border border-[#DDE1EA] px-4 py-3 text-[12px] leading-5 outline-none focus:border-[#000A57] focus:ring-4 focus:ring-[#000A57]/10"></textarea>
          </label>

          <button disabled={score === 0} class="mt-5 min-h-11 w-full rounded-xl bg-[#000A57] px-5 text-[12px] font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40">Enviar avaliação</button>
        </form>
      {/if}
    </div>
  </section>
</main>
