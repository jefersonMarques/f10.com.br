<!-- src/routes/nota-fiscal/+page.svelte -->
<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import {
    ArrowRight,
    Landmark,
    Building2,
    FileText,
    Workflow,
    PlugZap,
    ShieldCheck,
    Clock,
    AlertTriangle,
    BadgeCheck,
    HelpCircle,
  } from "lucide-svelte";

  type TimelineStep = {
    title: string;
    description: string;
    icon: typeof Landmark;
  };

  const ctaHref = "/nota-fiscal/cadastro-de-escolas";

  const timelineSteps: TimelineStep[] = [
    {
      title: "Quem emite a nota de verdade",
      description:
        "A emissão não acontece “dentro do F10”. O emissor oficial é sempre um órgão público: a prefeitura (NFS-e) ou o governo federal (NF-e), dependendo do tipo de nota e da regra do seu município.",
      icon: Landmark,
    },
    {
      title: "O que o F10 faz no meio do caminho",
      description:
        "O F10 organiza o processo e faz a ponte com o emissor oficial. Em vez de você operar portal, login, etapas repetidas e telas confusas, o sistema guia e centraliza o fluxo — para reduzir esforço manual e erro.",
      icon: Workflow,
    },
    {
      title: "Por que existe mais de um tipo de integração",
      description:
        "Nem todo órgão oferece o mesmo nível de automação. Dependendo do município e do seu cenário fiscal, pode existir mais de um caminho de integração (ou etapas adicionais) para habilitar emissão. O F10 identifica o que está disponível e aplica o melhor caminho possível.",
      icon: PlugZap,
    },
    {
      title: "O que você precisa fornecer",
      description:
        "Você informa os dados da escola e, quando necessário, dados de acesso/parametrização exigidos pelo órgão. O objetivo é configurar uma vez e depois emitir com previsibilidade — sem retrabalho.",
      icon: Building2,
    },
    {
      title: "Emissão e acompanhamento de status",
      description:
        "Quando você emite pelo F10, o sistema envia a solicitação ao órgão oficial e acompanha o retorno. Isso dá rastreabilidade do processo e visibilidade do que foi solicitado e do que foi confirmado.",
      icon: FileText,
    },
    {
      title: "Quando algo “para”: indisponibilidade do órgão",
      description:
        "Prefeituras e ambientes federais podem ficar instáveis ou fora do ar. Nesses casos, a emissão pode pausar temporariamente por indisponibilidade do emissor oficial — não por falha do F10. O sistema deixa isso claro para reduzir ruído e suporte desnecessário.",
      icon: AlertTriangle,
    },
  ];

  const notes = [
    {
      title: "Ponto chave",
      description:
        "O F10 não substitui a prefeitura ou o governo federal. Ele reduz o manual e facilita o caminho até o emissor oficial.",
      icon: BadgeCheck,
    },
    {
      title: "O que muda para sua rotina",
      description:
        "Menos etapas soltas, menos chance de erro e uma emissão mais previsível. Você entende rapidamente o que depende do F10 e o que depende do órgão emissor.",
      icon: ShieldCheck,
    },
    {
      title: "Expectativa realista",
      description:
        "O nível de automação varia conforme a cidade e o órgão. Onde existe integração completa, o processo fica muito mais simples. Onde há limitação, o F10 aplica o melhor fluxo disponível e mantém clareza do status.",
      icon: HelpCircle,
    },
    {
      title: "Resiliência",
      description:
        "Se o órgão sair do ar, o F10 não “inventa” emissão. Ele registra, informa e aguarda o retorno do serviço oficial para concluir.",
      icon: Clock,
    },
  ];
</script>

<svelte:head>
  <title>Nota Fiscal — Como funciona (NFS-e / NF-e) | F10</title>
  <meta
    name="description"
    content="Entenda como funciona a emissão de nota fiscal no F10: prefeitura e governo federal são emissores oficiais; o F10 integra, organiza e reduz etapas manuais, com clareza em casos de indisponibilidade."
  />
  <meta property="og:title" content="Nota Fiscal — Como funciona (NFS-e / NF-e) | F10" />
  <meta
    property="og:description"
    content="Passo a passo claro sobre emissão: o órgão público emite, o F10 facilita e centraliza o fluxo, com transparência quando houver instabilidade do emissor."
  />
  <link rel="canonical" href="https://f10.com.br/nota-fiscal" />
</svelte:head>

<!-- Seção principal com fundo suave e padrão geométrico sutil -->
<section
  class="relative isolate overflow-hidden bg-gradient-to-b from-white via-[#F9FAFF] to-white/90"
>


  <Breadcrumb
    baseUrl="https://f10.com.br"
    items={[{ label: "HOME", href: "/" }, { label: "NOTA FISCAL" }]}
  />

  <div class="container pb-14">
    <!-- Header com destaque sutil -->
    <header class="pt-6 md:pt-10">
      <h1
        class="mt-5 text-[#010D28] tracking-[-0.02em] leading-[1.08]
               text-[30px] sm:text-[38px] md:text-[44px] font-semibold max-w-[980px]
               [text-wrap:balance]"
      >
        Emissão de nota fiscal no F10 <span class="text-[#EA6D0B]">(NFS-e / NF-e)</span>
      </h1>

      <p
        class="mt-4 text-[#7E82A2] text-[16px] md:text-[18px] leading-relaxed max-w-[980px]"
      >
        Antes de iniciar o cadastro, é importante entender um ponto essencial:
        <strong class="text-[#010D28] font-semibold"
          >o emissor oficial da nota fiscal nunca é o sistema</strong
        >. Quem emite de verdade é a <strong>prefeitura</strong> (na NFS-e) ou o
        <strong>governo federal</strong> (na NF-e), dependendo do tipo de emissão. O F10 existe
        para <strong>facilitar</strong>, <strong>organizar</strong> e
        <strong>cortar etapas manuais</strong> do caminho até esse emissor.
      </p>
    </header>

    <!-- Timeline com design aprimorado -->
    <section
      class="mt-10 rounded-[32px] bg-white/80 backdrop-blur-sm ring-1 ring-black/5 shadow-xl p-6 md:p-8 transition-shadow hover:shadow-2xl"
    >
      <h2 class="text-[#000A57] font-semibold text-[18px] md:text-[22px]">
        Passo a passo (do jeito que acontece na prática)
      </h2>

      <div class="mt-6">
        {#each timelineSteps as s, idx}
          <div class="relative flex gap-4 pb-8 last:pb-0 group">
            <!-- Left: icon + linha pontilhada -->
            <div class="relative flex flex-col items-center">
              <div
                class="flex h-12 w-12 items-center justify-center rounded-full bg-[#F3F4FD] ring-1 ring-black/5 shadow-md transition-transform group-hover:scale-110 group-hover:shadow-lg"
                aria-hidden="true"
              >
                <svelte:component this={s.icon} size={20} class="text-[#EA6D0B]" />
              </div>

              {#if idx < timelineSteps.length - 1}
                <!-- Linha pontilhada mais elegante -->
                <div
                  class="mt-2 w-0.5 flex-1 bg-gradient-to-b from-[#EA6D0B]/30 to-transparent"
                  style="background-image: repeating-linear-gradient(to bottom, #EA6D0B 0 4px, transparent 4px 8px); background-size: 100% 8px;"
                ></div>
              {/if}
            </div>

            <!-- Right: conteúdo com fade-in -->
            <div class="min-w-0 pt-1 transition-all group-hover:translate-x-1">
              <p class="text-[#010D28] font-semibold text-[16px] md:text-[18px] leading-tight">
                {s.title}
              </p>
              <p class="mt-2 text-[#7E82A2] text-[14.5px] md:text-[16px] leading-relaxed">
                {s.description}
              </p>
            </div>
          </div>
        {/each}
      </div>
    </section>

    <!-- Grid de cards explicativos com interatividade -->
    <section class="mt-8 grid gap-6 md:grid-cols-2">
      {#each notes as n}
        <article
          class="rounded-[24px] bg-white/80 backdrop-blur-sm ring-1 ring-black/5 shadow-lg p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:bg-white"
        >
          <div class="flex items-start gap-4">
            <div
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F3F4FD] ring-1 ring-black/5 shadow-sm"
              aria-hidden="true"
            >
              <svelte:component this={n.icon} size={20} class="text-[#EA6D0B]" />
            </div>

            <div class="min-w-0">
              <h3 class="text-[#010D28] font-semibold text-[16px] md:text-[18px] leading-tight">
                {n.title}
              </h3>
              <p class="mt-2 text-[#7E82A2] text-[14.5px] md:text-[15.5px] leading-relaxed">
                {n.description}
              </p>
            </div>
          </div>
        </article>
      {/each}
    </section>

    <!-- CTA final com destaque e animação -->
    <section class="mt-12">
      <div
        class="rounded-[32px] bg-gradient-to-br from-white to-[#F8FAFF] ring-1 ring-black/5 shadow-xl p-6 md:p-10 transition-all hover:shadow-2xl"
      >
        <h2 class="text-[#000A57] font-semibold text-[20px] md:text-[24px]">
          Se você chegou até aqui, você já entendeu o essencial
        </h2>
        <p class="mt-3 text-[#7E82A2] text-[16px] md:text-[18px] leading-relaxed max-w-[980px]">
          Agora sim faz sentido iniciar o cadastro: você vai preencher os dados necessários para
          configurar o melhor caminho de emissão possível para a sua escola, de acordo com o órgão
          emissor. Depois disso, a emissão fica centralizada e com status claro dentro do F10.
        </p>

        <div class="mt-8">
          <a
            href={ctaHref}
            class="group inline-flex items-center justify-center gap-3 rounded-[70px]
                   bg-[#EA6D0B] px-8 md:px-12 py-4 md:py-5 text-white text-[16px] md:text-[18px] font-bold
                   shadow-lg transition-all duration-300 hover:shadow-xl hover:brightness-110
                   focus:outline-none focus:ring-4 focus:ring-[#EA6D0B]/40
                   active:scale-95"
            aria-label="Iniciar cadastro de nota fiscal"
          >
            <span>Quero iniciar o cadastro</span>
            <ArrowRight
              size={22}
              class="transition-transform duration-300 group-hover:translate-x-1"
            />
          </a>
        </div>
      </div>
    </section>
  </div>
</section>