<script lang="ts">
  import { CheckCircle2, CircleAlert } from "lucide-svelte";
  import type { PageData } from "./$types";
  export let data: PageData;
</script>

<svelte:head><title>Ativação de acesso | F10</title></svelte:head>

<main class="min-h-screen bg-[#F5F6FA] px-5 py-14">
  <section class="mx-auto max-w-[520px] rounded-[26px] border border-[#E2E5ED] bg-white p-7 shadow-[0_18px_55px_rgba(1,13,40,0.07)]">
    {#if data.activated}
      <CheckCircle2 size={28} class="text-[#2F7045]" />
      <h1 class="mt-4 text-[22px] font-semibold text-[#11182C]">Acesso ativado</h1>
      <p class="mt-2 text-[12px] leading-5 text-[#747C8D]">Seu e-mail foi confirmado. Agora você já pode entrar na Área do Cliente.</p>
      <a href="/cliente" class="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#000A57] px-5 text-[12px] font-semibold text-white">Entrar</a>
    {:else}
      <CircleAlert size={28} class="text-[#9B530F]" />
      <h1 class="mt-4 text-[22px] font-semibold text-[#11182C]">Link indisponível</h1>
      <p class="mt-2 text-[12px] leading-5 text-[#747C8D]">Este link já foi utilizado, expirou ou não é válido.</p>
      <a href="/cliente" class="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-[#DDE1EA] px-5 text-[12px] font-semibold text-[#000A57]">Voltar</a>
    {/if}
  </section>
</main>
