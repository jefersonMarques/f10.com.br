<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import IconArrowRight from "$lib/icons/IconArrowRight.svelte";
  import IconBank from "$lib/icons/IconBank.svelte";
  import IconBooks from "$lib/icons/IconBooks.svelte";
  import IconDevice from "$lib/icons/IconDevice.svelte";

  // Nenhuma lógica necessária por enquanto.
</script>

<svelte:head>
  <title>F10 Software — Gestão escolar moderna e performática</title>
  <meta
    name="description"
    content="Plataforma completa de gestão escolar: acadêmico, financeiro, CRM, marketing e aplicativo white-label. Performance, SEO e conversão."
  />
  <meta
    property="og:title"
    content="F10 Software — Gestão escolar moderna e performática"
  />
  <meta
    property="og:description"
    content="Plataforma completa de gestão escolar com performance máxima e SEO preparado para Google e LLMs."
  />
</svelte:head>

<!-- ====== SOBRE / PRIMEIRA SESSÃO ====== -->
<section
  class="overflow-hidden bg-white/20 px-20 bg-white/20 isolate overflow-hidden"
  aria-label="Sobre a F10"
>
  <!-- Breadcrumb -->
  <Breadcrumb
    baseUrl="https://f10.com.br"
    items={[{ label: "INICIO", href: "/" }, { label: "SOBRE A F10 F10" }]}
  />

  <!-- Título e texto lado a lado -->
  <div
    class="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-0 md:gap-0 px-5 md:px-8 py-16"
  >
    <!-- Coluna esquerda: título -->
    <div class="lg:col-span-7 flex items-center">
      <h1
        class="text-[#010D28] leading-[1.5] font-semibold leading-[1.05] text-[48px]"
      >
        Tecnologia e educação<br />
        caminhando juntas pelo futuro<br />
        do ensino
      </h1>
    </div>

    <!-- Coluna direita: texto -->
    <div class="lg:col-span-5 flex items-center">
      <p class="text-[16px] leading-relaxed text-[#7E82A2]">
        A F10 Software nasceu da união entre especialistas em educação e
        tecnologia, com o propósito de revolucionar a forma como escolas
        brasileiras gerenciam seu dia a dia. Focados exclusivamente em
        instituições de ensino livre e redes de franquias educacionais,
        desenvolvemos soluções que atendem às necessidades reais de gestores,
        professores, alunos e famílias.
      </p>
    </div>
  </div>

  <!-- Banner com imagem + overlay -->
  <div class="relative z-10 px-5 md:px-8 pb-16 lg:pb-24">
    <div
      class="relative overflow-hidden rounded-[28px] ring-1 ring-black/5
             shadow-[0_20px_60px_rgba(1,13,40,0.18)] bg-[url(/bg_sobre.webp)] bg-top-right h-[313px]"
      aria-label="Tecnologia feita para facilitar a gestão escolar"
    >
      <!-- Overlay azul -->
      <div class="absolute inset-0 bg-[#000A57AD]"></div>

      <!-- Headline centralizada -->
      <div
        class="absolute inset-0 flex items-center justify-center px-6 md:px-12"
      >
        <p
          class="text-white text-center font-semibold leading-tight
                 text-[22px] sm:text-[28px] md:text-[32px] lg:text-[36px]"
        >
          Tecnologia feita para facilitar a gestão de escolas de ensino livre,<br
            class="hidden md:block"
          />
          contribuindo para a melhoria da educação em todo o país.
        </p>
      </div>

      <!-- Borda interna -->
      <div
        class="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/10"
      ></div>
    </div>
  </div>
</section>

<!-- ====== MISSÃO / VISÃO / VALORES ====== -->
<section class="bg-white/20 px-20 border-t border-slate-200">
  <div class="mx-auto px-6">
    <!-- Grid de 3 cards -->
    <div class="grid md:grid-cols-3 gap-8">
      <!-- Missão -->
      <div
        class="bg-[#F3F4FD] rounded-[24px] shadow-sm p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(1,13,40,0.08)]"
      >
        <p class="text-[#EA6D0B] text-[14px] font-semibold mb-2">Missão</p>
        <h3 class="text-[#010D28] text-[26px] font-semibold mb-4 leading-snug">
          Tecnologia para uma Educação com Propósito
        </h3>
        <p class="text-[#7E82A2] text-[14px] leading-relaxed">
          Potencializar a eficiência das instituições de ensino com tecnologia
          acessível, inteligente e segura, promovendo uma gestão mais humana,
          moderna e orientada a resultados. Buscamos ser parceiros estratégicos
          das escolas na construção de um futuro educacional mais eficaz e
          inclusivo.
        </p>
      </div>

      <!-- Visão -->
      <div
        class="bg-[#F3F4FD] rounded-[24px] shadow-sm p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(1,13,40,0.08)]"
      >
        <p class="text-[#EA6D0B] text-[14px] font-semibold mb-2">Visão</p>
        <h3 class="text-[#010D28] text-[26px] font-semibold mb-4 leading-snug">
          Liderar a Inovação na Gestão Escolar Brasileira
        </h3>
        <p class="text-[#7E82A2] text-[14px] leading-relaxed">
          Ser a principal referência em soluções de gestão escolar no Brasil,
          reconhecida por transformar a educação por meio da inovação, do
          atendimento de excelência e de parcerias duradouras com escolas e
          redes educacionais.
        </p>
      </div>

      <!-- Valores -->
      <div
        class="bg-[#F3F4FD] rounded-[24px] shadow-sm p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(1,13,40,0.08)]"
      >
        <p class="text-[#EA6D0B] text-[14px] font-semibold mb-2">Valores</p>
        <h3 class="text-[#010D28] text-[26px] font-semibold mb-4 leading-snug">
          Princípios que Guiam toda a Nossa Jornada
        </h3>
        <p class="text-[#7E82A2] text-[14px] leading-relaxed">
          Inovação contínua, compromisso com a educação, ética e transparência
          nas relações, foco nas pessoas e resultados com propósito. Esses são
          os princípios que norteiam nossas decisões, parcerias e o
          desenvolvimento das nossas soluções tecnológicas.
        </p>
      </div>
    </div>

    <!-- Imagem decorativa -->
    <div class="mt-16 md:mt-20">
      <div
        class="relative overflow-hidden rounded-[28px] shadow-[0_20px_60px_rgba(1,13,40,0.12)] ring-1 ring-black/5"
      >
        <img
          src="/bg_mvv.webp"
          alt="Ambiente educacional tecnológico com pessoas colaborando"
          class="w-full object-cover max-h-[533px]"
          loading="lazy"
        />
        <div
          class="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/10"
        ></div>
      </div>
    </div>
  </div>
</section>

<section class="bg-white/20 pt-16 pb-24">
  <div class="container">
    <!-- grid de 2 colunas: 1 flexível + 1 fixa (máx 360px) -->
    <div class="grid md:grid-cols-[1fr_360px] gap-8 items-stretch">
      <!-- Coluna 1 -->
      <div class="grid gap-8">
        <!-- Linha superior: 2 cards lado a lado -->
        <div class="grid md:grid-cols-2 gap-8">
          <!-- Gestão Administrativa -->
          <div
            class="bg-[#F3F4FD] rounded-[28px] p-8 shadow-sm transition-all duration-300
                   hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(1,13,40,0.08)]"
          >
            <IconDevice />
            <h3 class="text-[#010D28] font-regular text-[40px] mb-3 mt-4">
              Gestão Administrativa
            </h3>
            <p class="text-[#7E82A2] text-[16px] leading-relaxed mb-6 pr-16">
              Organize matrículas, calendários e turmas com automação e controle
              total da rotina escolar.
            </p>
            <a
              href="#"
              class="inline-flex items-center justify-center px-6 py-3 rounded-full
                     bg-[#EA6D0B] text-white font-semibold text-[15px] hover:brightness-110
                     transition-all"
            >
              Conhecer
              <IconArrowRight size={24} classType={"ml-12"} />
            </a>
          </div>

          <!-- Gestão Financeira -->
          <div
            class="bg-[#F3F4FD] rounded-[28px] p-8 shadow-sm transition-all duration-300
                   hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(1,13,40,0.08)]"
          >
            <IconBank />
            <h3
              class="text-[#010D28] font-regular text-[40px] mb-3 mt-4 mr-4 pr-16"
            >
              Gestão Financeira
            </h3>
            <p class="text-[#7E82A2] text-[16px] leading-relaxed mb-6 pr-16">
              Controle mensalidades, inadimplência e finanças com segurança,
              agilidade e transparência.
            </p>
            <a
              href="#"
              class="inline-flex items-center justify-center px-6 py-3 rounded-full
                     bg-[#EA6D0B] text-white font-semibold text-[15px] hover:brightness-110
                     transition-all"
            >
              Conhecer
              <IconArrowRight size={24} classType={"ml-12"} />
            </a>
          </div>
        </div>

        <!-- Linha inferior: Gestão Pedagógica -->
        <div
          class="bg-[#F3F4FD] rounded-[28px] p-8 shadow-sm transition-all duration-300
         hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(1,13,40,0.08)]
         grid grid-cols-[auto_1fr_auto] items-center gap-6"
        >
          <!-- Ícone à esquerda centralizado -->
          <div class="flex items-center justify-center h-full">
            <IconBooks />
          </div>

          <!-- Conteúdo central -->
          <div>
            <h3 class="text-[#010D28] font-regular text-[40px] mb-3">
              Gestão Pedagógica
            </h3>
            <p class="text-[#7E82A2] text-[16px] leading-relaxed pr-10">
              Registre e acompanhe notas, frequência e planejamentos de forma
              prática e integrada.
            </p>
          </div>

          <!-- Botão à direita centralizado -->
          <div class="flex items-center justify-center">
            <a
              href="#"
              class="inline-flex items-center justify-center px-6 py-3 rounded-full
             bg-[#EA6D0B] text-white font-regular text-[15px] hover:brightness-110
             transition-all h-[50px]"
            >
              Conhecer
              <IconArrowRight size={24} classType={"ml-12"} />
            </a>
          </div>
        </div>
      </div>

      <!-- Coluna 2: Comunicação Escolar -->
      <div
        class="bg-[#F3F4FD] rounded-[28px] p-8 shadow-sm flex flex-col justify-center
               transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(1,13,40,0.08)] max-w-[360px] w-full"
      >
        <IconDevice />
        <h3 class="text-[#010D28] font-regular text-[40px] mb-4 leading-tight">
          Comunicação Escolar
        </h3>
        <p class="text-[#7E82A2] text-[16px] leading-relaxed mb-6 pr-4">
          Conecte escola, famílias e alunos com avisos, portais exclusivos e
          mensagens automáticas.
        </p>
        <a
          href="#"
          class="inline-flex items-center justify-center px-6 py-3 rounded-full
                 bg-[#EA6D0B] text-white font-semibold text-[15px] hover:brightness-110
                 transition-all self-start mr-12"
        >
          Conhecer
          <IconArrowRight size={24} classType={"ml-12"} />
        </a>
      </div>
    </div>
  </div>
</section>
