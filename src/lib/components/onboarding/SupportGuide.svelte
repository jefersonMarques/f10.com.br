<script lang="ts">
  import {
    ArrowUpRight,
    Camera,
    LifeBuoy,
    ListChecks,
    ShieldCheck,
  } from "lucide-svelte";

  const supportTips = [
    {
      title: "Identifique sua escola",
      description: "Informe seu nome e o nome da escola ou unidade.",
      icon: ListChecks,
    },
    {
      title: "Explique a rotina",
      description: "Diga qual menu acessou, o que tentou fazer e o que aconteceu.",
      icon: LifeBuoy,
    },
    {
      title: "Envie uma imagem",
      description: "Uma captura da tela ajuda a equipe a entender o problema mais rápido.",
      icon: Camera,
    },
  ];
</script>

<section id="support" class="scroll-mt-28 bg-white py-16 md:py-24">
  <div class="container">
    <div class="mx-auto max-w-3xl text-center">
      <div
        class="mx-auto inline-flex items-center gap-2 rounded-full bg-[#000A57]/5 px-4 py-2 text-[13px] font-semibold text-[#000A57]"
      >
        <LifeBuoy size={18} aria-hidden="true" />
        Terceiro passo
      </div>

      <h2
        class="mt-5 text-[32px] font-semibold leading-[1.12] tracking-[-0.03em] text-[#010D28] sm:text-[40px]"
      >
        Quando precisar, fale com o suporte F10
      </h2>

      <p class="mt-5 text-[16px] leading-[1.8] text-[#5F6475]">
        Nesta página, o botão azul no canto inferior direito abre diretamente o
        atendimento do suporte. Você também pode consultar a Central de Ajuda
        para encontrar respostas rápidas.
      </p>
    </div>

    <div class="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
      {#each supportTips as tip}
        <article class="rounded-[24px] border border-[#E7EAF8] bg-white p-6 shadow-[0_16px_40px_rgba(1,13,40,0.06)]">
          <span class="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F3F4FD] text-[#000A57]">
            <svelte:component this={tip.icon} size={22} aria-hidden="true" />
          </span>
          <h3 class="mt-5 text-[18px] font-semibold text-[#010D28]">{tip.title}</h3>
          <p class="mt-2 text-[14px] leading-[1.7] text-[#5F6475]">{tip.description}</p>
        </article>
      {/each}
    </div>

    <div class="mx-auto mt-8 flex max-w-5xl flex-col items-start justify-between gap-5 rounded-[24px] bg-[#000A57] px-6 py-6 text-white sm:flex-row sm:items-center sm:px-8">
      <div class="flex items-start gap-4">
        <span class="mt-0.5 inline-flex h-10 min-w-10 items-center justify-center rounded-2xl bg-white/10">
          <ShieldCheck size={22} aria-hidden="true" />
        </span>
        <div>
          <h3 class="text-[17px] font-semibold">Proteja seus dados de acesso</h3>
          <p class="mt-1 max-w-2xl text-[13px] leading-[1.65] text-white/75">
            Nunca envie sua senha. Compartilhe apenas as informações necessárias
            para a equipe localizar e compreender sua solicitação.
          </p>
        </div>
      </div>

      <a
        href="https://f10.movidesk.com/kb"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex min-w-fit items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-[14px] font-semibold text-[#000A57] transition hover:bg-[#F3F4FD] focus:outline-none focus:ring-2 focus:ring-white/60"
      >
        Abrir Central de Ajuda
        <ArrowUpRight size={17} aria-hidden="true" />
      </a>
    </div>
  </div>
</section>
