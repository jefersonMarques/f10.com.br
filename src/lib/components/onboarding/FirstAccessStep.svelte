<script lang="ts">
  import { KeyRound, Mail, MonitorCheck, ShieldCheck } from "lucide-svelte";

  const instructions = [
    {
      title: "Encontre o e-mail do F10",
      description: "Veja também as pastas Spam, Lixo eletrônico ou Promoções.",
      icon: "mail",
    },
    {
      title: "Abra o F10",
      description: "Clique duas vezes no atalho criado no computador.",
      icon: "monitor",
    },
    {
      title: "Digite seus dados",
      description: "Use o usuário e a senha que chegaram no e-mail.",
      icon: "key",
    },
  ];
</script>

<section class="mx-auto w-full max-w-5xl" aria-labelledby="first-access-title">
  <div class="text-center">
    <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-[#EA6D0B]">
      Seu objetivo
    </p>
    <h1
      id="first-access-title"
      class="mt-2 text-[27px] font-semibold leading-tight tracking-[-0.035em] text-[#010D28] sm:text-[34px] lg:text-[40px]"
    >
      Agora vamos entrar no F10 pela primeira vez
    </h1>
    <p class="mx-auto mt-3 max-w-2xl text-[14px] leading-relaxed text-[#5F6475] sm:text-[15px]">
      Tenha aberto o e-mail de boas-vindas enviado para sua escola.
    </p>
  </div>

  <ol class="mx-auto mt-6 grid max-w-4xl gap-3 sm:grid-cols-3 lg:mt-8">
    {#each instructions as instruction, index}
      <li class="rounded-[20px] border border-[#E2E5EF] bg-white p-4 text-left shadow-[0_10px_30px_rgba(1,13,40,0.05)] sm:p-5">
        <div class="flex items-center justify-between gap-3">
          <span class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F1F3FA] text-[#000A57]">
            {#if instruction.icon === "mail"}
              <Mail size={20} aria-hidden="true" />
            {:else if instruction.icon === "monitor"}
              <MonitorCheck size={20} aria-hidden="true" />
            {:else}
              <KeyRound size={20} aria-hidden="true" />
            {/if}
          </span>
          <span class="text-[11px] font-bold text-[#000A57]/30">0{index + 1}</span>
        </div>
        <h2 class="mt-4 text-[16px] font-semibold text-[#010D28]">
          {instruction.title}
        </h2>
        <p class="mt-1.5 text-[13px] leading-[1.55] text-[#5F6475]">
          {instruction.description}
        </p>
      </li>
    {/each}
  </ol>

  <div class="mx-auto mt-5 flex max-w-3xl items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-left text-amber-950 ring-1 ring-amber-200">
    <ShieldCheck class="mt-0.5 min-w-5" size={19} aria-hidden="true" />
    <p class="text-[12px] leading-[1.6] sm:text-[13px]">
      Sua senha é pessoal. Digite-a somente na tela de entrada do F10; esta página nunca solicitará esse dado.
    </p>
  </div>
</section>
