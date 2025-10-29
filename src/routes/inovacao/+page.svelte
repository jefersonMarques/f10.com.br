<!-- src/routes/inovacao/+page.svelte -->
<script lang="ts">
  // ===== Imports =====
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import IconChartLine from "$lib/icons/IconChartLine.svelte";
  import IconDevicesLine from "$lib/icons/IconDevicesLine.svelte";
  import IconMegaPhoneLine from "$lib/icons/IconMegaPhoneLine.svelte";
  import IconStudantLine from "$lib/icons/IconStudantLine.svelte";
  import IconArrowRight from "$lib/icons/IconArrowRight.svelte";

  // ===== Tipos =====
  type Item = {
    title: string; // permite <br> no título via {@html}
    description: string;
    href: string;
    icon: typeof IconChartLine; // qualquer componente Svelte de ícone
  };

  // ===== Conteúdo da sessão 2 =====
  const items: Item[] = [
    {
      title: "Atraia mais alunos com<br/>marketing educacional eficaz",
      description:
        "Utilize funis de vendas e estratégias digitais para aumentar suas matrículas com previsibilidade.",
      href: "/solucoes/marketing-educacional",
      icon: IconMegaPhoneLine,
    },
    {
      title: "Atualize-se com ensino<br/>digital e híbrido",
      description:
        "Ofereça uma experiência moderna com plataformas integradas de aulas online e comunicação escolar.",
      href: "/solucoes/ensino-digital",
      icon: IconStudantLine,
    },
    {
      title: "Tome decisões com base<br/>em dados reais",
      description:
        "Acompanhe indicadores gerenciais, desempenho e finanças em tempo real com nossos dashboards.",
      href: "/solucoes/gestao-e-analytics",
      icon: IconChartLine,
    },
    {
      title: "Fortaleça a comunicação<br/>com alunos e responsáveis",
      description:
        "Aproxime-se dos alunos com um canal moderno e direto. Um bom relacionamento reduz a evasão.",
      href: "/solucoes/comunicacao-escolar",
      icon: IconDevicesLine,
    },
  ];

  const kpis = [
    { value: "32%", label: "de economia na gestão total da escola*" },
    { value: "40%", label: "de aumento de matrículas*" },
    { value: "-42%", label: "redução da evasão de alunos em cursos livres*" },
  ];

  // ===== Assets =====
  const heroImage = "/inovacao_hero.webp";
  const specialistImage = "/brainstorm.webp";
</script>

<svelte:head>
  <title>Inovação — F10 Software</title>
  <meta
    name="description"
    content="Preparando sua escola para o futuro com soluções inovadoras em tecnologia e educação. Estratégia, produto e execução com foco em resultados."
  />
  <meta property="og:title" content="Inovação — F10 Software" />
  <meta
    property="og:description"
    content="Tecnologia e estratégia para impulsionar a gestão escolar no Brasil."
  />
</svelte:head>

<section class="relative isolate overflow-hidden bg-white/60">


  <!-- ===== Breadcrumb ===== -->
  <div class="lg:px-20 sm:px-2 pb-12">
    <Breadcrumb
      baseUrl="https://f10.com.br"
      items={[{ label: "HOME", href: "/" }, { label: "INOVAÇÃO" }]}
    />
  </div>

  <!-- ===== Primeira sessão ===== -->
  <div class="container pb-16">
    <!-- Título ocupa a largura toda -->
    <h1
      class="max-w-[1100px] text-[#010D28] tracking-[-0.02em] leading-[1.08] text-[36px] sm:text-[44px] md:text-[52px] font-semibold"
    >
      Preparando sua escola para o futuro com as soluções mais inovadoras em
      tecnologia e educação.
    </h1>

    <!-- Grid texto + imagem -->
    <div class="mt-12 grid gap-10 lg:grid-cols-12 items-start">
      <!-- Texto -->
      <div class="lg:col-span-5">
        <h2 class="text-[#7E82A2] text-[27px] leading-snug">
          Tecnologia e estratégia para <br />impulsionar a gestão escolar no
          Brasil
        </h2>

        <div class="mt-6 space-y-6 text-[#000A57]">
          <p class="text-[16px] leading-[1.8]">
            A pandemia acelerou um processo inevitável: a transformação digital
            nas instituições de ensino. Enquanto algumas escolas conseguiram se
            adaptar rapidamente, outras enfrentaram grandes perdas. A lição foi
            clara — o futuro da educação está na inovação tecnológica. E a F10
            está aqui para ser sua parceira nessa jornada.
          </p>
          <p class="text-[16px] leading-[1.8]">
            Modernizar sua escola não é mais uma opção — é uma necessidade
            estratégica para continuar crescendo, atrair novos alunos e manter a
            excelência na experiência educacional.
          </p>
          <p class="text-[16px] leading-[1.8]">
            Com a F10, você tem acesso a uma plataforma completa de gestão
            escolar desenvolvida especialmente para escolas livres e redes de
            franquias educacionais brasileiras. Unimos tecnologia, metodologia e
            suporte para ajudar sua instituição a prosperar mesmo em cenários
            desafiadores.
          </p>
        </div>
      </div>

      <!-- Imagem -->
      <div class="lg:col-span-7 mt-6 lg:mt-0">
        <div
          class="relative overflow-hidden rounded-[20px] md:rounded-[24px] ring-1 ring-black/5 shadow-[0_18px_50px_rgba(1,13,40,0.16)]"
        >
          <img
            src={heroImage}
            alt="Equipe colaborando em ambiente de inovação"
            class="block h-full w-full object-cover"
            loading="eager"
          />
          <!-- overlay suave para coesão -->
          <div class="absolute inset-0 bg-[#000A5747]"></div>
          <div
            class="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/10"
          ></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ===== SESSÃO 2 — Como sua escola pode evoluir ===== -->
<section class="relative py-12 md:py-16 bg-white/80">
  <div class="lg:container lg:px-20">
    <div
      class="relative overflow-hidden lg:rounded-[28px] bg-[#0A1533] text-white ring-1 ring-white/5"
    >
      <div class="px-6 md:px-10 lg:px-14 py-12 md:py-16">
        <!-- Preheading -->
        <p
          class="flex items-center justify-center gap-4 pb-6 text-[#AEB3D9] text-[17px]"
        >
          <span class="inline-block h-px w-12 bg-[#AEB3D9]"></span>
          <span>Vamos evoluir sua escola</span>
          <span class="inline-block h-px w-12 bg-[#AEB3D9]"></span>
        </p>

        <!-- Título -->
        <h2
          class="mt-3 text-center text-[28px] sm:text-[34px] md:text-[40px] leading-[1.15] font-semibold"
        >
          Como sua escola pode evoluir com
          <span class="text-[#EA6D0B]">tecnologia F10</span>?
        </h2>

        <!-- LINHA SUPERIOR: ícone à esquerda de cada coluna; linha cresce para a direita -->
        <div class="mt-12 hidden lg:grid grid-cols-4 gap-10 md:gap-12">
          {#each items as item, i}
            <div class="relative">
              <div class="flex items-center">
                <!-- Ícone alinhado à esquerda -->
                <div
                  class="flex h-[96px] w-[96px] items-center justify-center rounded-full bg-[#7E82A2]/55 ring-1 ring-white/15"
                >
                  <svelte:component this={item.icon} />
                </div>

                <!-- Linha conectando até a próxima coluna -->
                {#if i < items.length - 1}
                  <div class="ml-6 h-px flex-1 bg-white"></div>

                {/if}
              </div>
            </div>
          {/each}
        </div>

        <!-- cards com botões alinhados na base -->
        <div class="mt-10 grid items-stretch gap-10 md:gap-12 lg:grid-cols-4">
          {#each items as item}
            <article class="flex h-full flex-col">
              <!-- conteúdo cresce para ocupar o espaço -->
              <div class="flex-1">
                <h3
                  class="text-[21px] text-[#EA6D0B] font-semibold leading-snug"
                >
                  {@html item.title}
                </h3>
                <p class="mt-2 text-[18px] leading-relaxed text-white/80">
                  {item.description}
                </p>
              </div>

              <!-- botão fixa na base do card -->
              <a
                href={item.href}
                class="mt-6 inline-flex items-center rounded-full border border-[#EA6D0B] px-5 py-2.5 text-[16px] font-semibold text-white transition hover:bg-[#EA6D0B]/10 focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40 self-start"
              >
                Conheça nossa solução
              </a>
            </article>
          {/each}
        </div>

        <!-- Borda interna sutil -->
        <div
          class="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/10"
        ></div>
      </div>
    </div>
  </div>
</section>

<!-- ===== SESSÃO 3 — Resultados reais ===== -->
<section class="relative py-14 md:py-16 bg-white">
  <div class="container px-5 md:px-8 lg:px-20">
    <!-- Título -->
    <h2
      class="text-[32px] md:text-[40px] lg:text-[48px] font-medium leading-[1.13] tracking-[-0.015em] text-[#000A57]"
    >
      Resultados reais com <span class="text-[#EA6D0B]">inovação F10</span>
    </h2>

    <!-- Cards -->
    <div class="mt-10 grid gap-4 md:gap-6 lg:gap-8 md:grid-cols-3">
      {#each kpis as k}
        <article
          class="rounded-[40px] bg-[#F3F4FD] px-8 py-10 md:px-12 md:py-14 text-center"
        >
          <p class="text-[56px] md:text-[65px] leading-[1.26] text-[#EA6D0B]">
            {k.value}
          </p>
          <p
            class="mx-auto mt-3 max-w-[260px] text-[16px] md:text-[18px] leading-[1.33] text-[#000A57]/80"
          >
            {k.label}
          </p>
        </article>
      {/each}
    </div>

    <!-- Rodapé opcional com asterisco -->
    <p class="mt-4 text-[12px] text-[#000A57]/50">
      *Resultados estimados com base em cases reais; podem variar conforme o
      perfil da instituição.
    </p>
  </div>
</section>

<!-- ===== SESSÃO — Especialista em escolas livres ===== -->
<section class="relative py-12 md:py-16 bg-white/50">
  <div class="container px-5 md:px-8 lg:px-20">
    <div class="grid gap-10 lg:grid-cols-12 items-start">
      <!-- Coluna esquerda (texto) -->
      <div class="lg:col-span-5 flex flex-col justify-center gap-6">
        <h2
          class="text-[#7E82A2] font-medium leading-[1.1] tracking-[-0.01em]
                 text-[36px] md:text-[44px] lg:text-[48px]"
        >
          A F10 é especialista<br />
          na gestão de escolas<br />
          com ensino livres
        </h2>

        <p class="text-[#000A57] text-[16px] leading-[1.8] max-w-[508px]">
          Há mais de 20 anos, a F10 desenvolve soluções específicas para o setor
          educacional brasileiro. Atuamos lado a lado com gestores escolares,
          oferecendo tecnologia de ponta, atendimento consultivo e resultados
          comprovados.
        </p>

        <div class="pt-2">
          <a href="/novidades"
            class="inline-flex items-center justify-center gap-3 rounded-[70px]
            bg-[#EA6D0B] px-8 md:px-10 py-4 text-white text-[16px] font-bold
            transition hover:brightness-110 focus:outline-none focus:ring-2
            focus:ring-[#EA6D0B]/40" >
            <span>Receber nossas novidades</span>
            <IconArrowRight size={24} />
          </a>
        </div>
      </div>

      <!-- Coluna direita (imagem) -->
      <div class="lg:col-span-7">
        <div
          class="relative h-[360px] sm:h-[420px] md:h-[503px]
                 overflow-hidden rounded-[16px] ring-1 ring-black/5
                 shadow-[0_18px_50px_rgba(1,13,40,0.16)]"
        >
          <img
            src={specialistImage}
            alt="Equipe da F10 colaborando com gestores escolares"
            class="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <!-- overlay navy 28% -->
          <div
            class="absolute inset-0 bg-[#000A57]/30 md:bg-[#000A57]/28"
          ></div>
          <div
            class="pointer-events-none absolute inset-0 rounded-[16px] ring-1 ring-inset ring-white/10"
          ></div>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  /* Tudo em Tailwind; bloco reservado para ajustes finos, se necessário. */
</style>
