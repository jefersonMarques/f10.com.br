<script lang="ts">
  import { ArrowRight, Download } from "lucide-svelte";

  export let onComplete: () => void = () => undefined;

  const instructions = [
    "Clique em Baixar F10 e aguarde o download terminar.",
    "Abra o arquivo InstaladorF10.exe no computador Windows.",
    "Siga as instruções apresentadas até concluir a instalação.",
    "Volte para esta página e avance para o primeiro acesso.",
  ];
</script>

<section aria-labelledby="installation-title">
  <div class="grid gap-9 lg:grid-cols-12 lg:items-center">
    <div class="lg:col-span-5">
      <span class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EA6D0B]/10 text-[#EA6D0B]">
        <Download size={28} aria-hidden="true" />
      </span>
      <p class="mt-5 text-[12px] font-bold uppercase tracking-[0.15em] text-[#EA6D0B]">
        Primeiro passo
      </p>
      <h2
        id="installation-title"
        class="mt-3 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-[#010D28] sm:text-[38px]"
      >
        Baixe e instale o F10
      </h2>
      <p class="mt-4 text-[16px] leading-[1.75] text-[#5F6475]">
        Faça esta etapa no computador Windows em que o F10 será utilizado.
      </p>

      <a
        href="/download/installer"
        class="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#EA6D0B] px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_14px_34px_rgba(234,109,11,0.28)] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40 sm:w-auto"
      >
        <Download size={19} aria-hidden="true" />
        Baixar F10 agora
      </a>

      <p class="mt-4 text-[13px] leading-relaxed text-[#5F6475]">
        Para baixar novamente no futuro, acesse
        <a href="/download" class="font-semibold text-[#000A57] underline decoration-[#EA6D0B]/50 underline-offset-4">
          f10.com.br/download
        </a>.
      </p>
    </div>

    <div class="lg:col-span-7 lg:pl-8">
      <div class="rounded-[24px] bg-[#F7F8FE] p-5 ring-1 ring-[#E4E7F1] sm:p-7">
        <h3 class="text-[19px] font-semibold text-[#010D28]">Faça assim:</h3>
        <ol class="mt-5 space-y-4">
          {#each instructions as instruction, index}
            <li class="flex items-start gap-4">
              <span class="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-white text-[13px] font-bold text-[#EA6D0B] ring-1 ring-[#EA6D0B]/20">
                {index + 1}
              </span>
              <p class="pt-1 text-[15px] leading-[1.6] text-[#41475A]">
                {instruction}
              </p>
            </li>
          {/each}
        </ol>
      </div>
    </div>
  </div>

  <div class="mt-9 flex justify-end border-t border-[#EDF0F7] pt-6">
    <button
      type="button"
      class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#000A57] px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-[#111B71] focus:outline-none focus:ring-2 focus:ring-[#000A57]/40 sm:w-auto"
      on:click={onComplete}
    >
      Concluí a instalação
      <ArrowRight size={18} aria-hidden="true" />
    </button>
  </div>
</section>
