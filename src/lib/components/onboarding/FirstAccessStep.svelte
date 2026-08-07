<script lang="ts">
  import {
    ArrowLeft,
    ArrowRight,
    KeyRound,
    Mail,
    MonitorCheck,
    ShieldCheck,
  } from "lucide-svelte";

  export let onBack: () => void = () => undefined;
  export let onComplete: () => void = () => undefined;

  const instructions = [
    {
      title: "Localize o e-mail de boas-vindas",
      description: "Procure também nas pastas Spam, Lixo eletrônico ou Promoções.",
      icon: "mail",
    },
    {
      title: "Abra o F10 no computador",
      description: "Utilize o atalho criado depois da instalação.",
      icon: "monitor",
    },
    {
      title: "Digite o usuário e a senha recebidos",
      description: "Preencha os dados diretamente na tela de entrada do F10.",
      icon: "key",
    },
  ];
</script>

<section aria-labelledby="first-access-title">
  <div class="mx-auto max-w-4xl">
    <div class="text-center">
      <span class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#000A57]/5 text-[#000A57]">
        <KeyRound size={28} aria-hidden="true" />
      </span>
      <p class="mt-5 text-[12px] font-bold uppercase tracking-[0.15em] text-[#EA6D0B]">
        Primeiro acesso
      </p>
      <h2
        id="first-access-title"
        class="mt-3 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-[#010D28] sm:text-[38px]"
      >
        Entre com o usuário e a senha recebidos por e-mail
      </h2>
      <p class="mx-auto mt-4 max-w-2xl text-[16px] leading-[1.75] text-[#5F6475]">
        Os dados são enviados pela equipe responsável pela implantação da sua escola.
      </p>
    </div>

    <ol class="mt-8 grid gap-4 md:grid-cols-3">
      {#each instructions as instruction, index}
        <li class="rounded-[22px] border border-[#E4E7F1] bg-[#F9FAFD] p-5">
          <div class="flex items-center justify-between gap-3">
            <span class="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#000A57] shadow-sm ring-1 ring-black/5">
              {#if instruction.icon === "mail"}
                <Mail size={22} aria-hidden="true" />
              {:else if instruction.icon === "monitor"}
                <MonitorCheck size={22} aria-hidden="true" />
              {:else}
                <KeyRound size={22} aria-hidden="true" />
              {/if}
            </span>
            <span class="text-[12px] font-bold text-[#000A57]/35">0{index + 1}</span>
          </div>
          <h3 class="mt-5 text-[17px] font-semibold leading-snug text-[#010D28]">
            {instruction.title}
          </h3>
          <p class="mt-2 text-[13px] leading-[1.65] text-[#5F6475]">
            {instruction.description}
          </p>
        </li>
      {/each}
    </ol>

    <div class="mt-6 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-amber-950 ring-1 ring-amber-200">
      <ShieldCheck class="mt-0.5 min-w-5" size={20} aria-hidden="true" />
      <p class="text-[13px] leading-[1.65]">
        Esta página nunca solicita sua senha. Digite seus dados somente na tela de acesso do F10.
      </p>
    </div>
  </div>

  <div class="mt-9 flex flex-col-reverse justify-between gap-3 border-t border-[#EDF0F7] pt-6 sm:flex-row">
    <button
      type="button"
      class="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-[15px] font-semibold text-[#000A57] transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
      on:click={onBack}
    >
      <ArrowLeft size={18} aria-hidden="true" />
      Voltar
    </button>
    <button
      type="button"
      class="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#000A57] px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-[#111B71] focus:outline-none focus:ring-2 focus:ring-[#000A57]/40"
      on:click={onComplete}
    >
      Consegui entrar no F10
      <ArrowRight size={18} aria-hidden="true" />
    </button>
  </div>
</section>
