<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import SolutionsLight from "$lib/components/SolutionsLight.svelte";
  import IconArrowRight from "$lib/icons/IconArrowRight.svelte";
  import IconBank from "$lib/icons/IconBank.svelte";
  import IconBooks from "$lib/icons/IconBooks.svelte";
  import IconDevice from "$lib/icons/IconDevice.svelte";

  // Nenhuma lógica necessária por enquanto.
</script>

<svelte:head>
  <title>Tecnologia educacional para escolas que querem crescer</title>
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
<section class="overflow-hidden bg-white isolate pb-16" aria-label="Sobre a F10">
  <!-- Breadcrumb -->
  <Breadcrumb
    baseUrl="https://f10.com.br"
    items={[{ label: "HOME", href: "/" }, { label: "SOLUÇÕES" }]}
  />

  <!-- Título e texto lado a lado -->
  <div
    class="container relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-y-10 lg:gap-x-16"
  >
    <!-- Coluna esquerda: título -->
    <div class="lg:col-span-6 flex items-top">
      <h1
        class="text-[#010D28] font-semibold leading-[1.05] text-[36px] md:text-[48px]"
      >
        Tecnologia educacional
        <br />
        para escolas que querem
        <br />
        crescer
      </h1>
    </div>

    <!-- Coluna direita: subtítulo + texto -->
    <div class="lg:col-span-6 flex items-center">
      <div class="space-y-6 max-w-xl">
        <h2
          class="text-[22px] md:text-[26px] leading-snug text-[#7E82A2] font-medium"
        >
          Descubra como a tecnologia pode trabalhar a favor do seu crescimento.
        </h2>

        <p class="text-[16px] leading-relaxed text-[#7E82A2]">
          Na F10, desenvolvemos soluções inteligentes que transformam a gestão
          escolar em todas as áreas: pedagógica, administrativa, financeira e
          comercial. Aqui, você encontra um ecossistema completo de ferramentas
          pensado para escolas livres, redes de ensino e franquias educacionais
          que desejam escalar, economizar e manter seus alunos engajados.
        </p>
      </div>
    </div>
  </div>
</section>

<SolutionsLight />

<!-- ====== PROVA SOCIAL (520 ESCOLAS) ====== -->
<section class="bg-white">
  <div
    class="container flex flex-col items-start gap-16 px-6 md:px-10 lg:px-20 py-16"
  >
    <div class="flex flex-col lg:flex-row gap-16 w-full">
      <!-- Imagem à esquerda -->
      <div class="relative flex-1 min-h-[260px] lg:h-[414px]">
        <div class="relative h-full w-full">
          <img
            src="/social_prove_f10.webp"
            alt="Equipe representando as escolas que escolheram a F10"
            class="h-full w-full object-cover rounded-[16px]"
            loading="lazy"
          />
          <!-- Overlay azul escuro 28% -->
          <div
            class="pointer-events-none absolute inset-0 rounded-[16px] bg-[rgba(0,10,87,0.28)]"
          ></div>
        </div>
      </div>

      <!-- Texto à direita -->
      <div
        class="flex flex-col justify-top gap-4 w-full max-w-[508px] lg:ml-4"
      >
        <h2
          class="font-medium text-[32px] md:text-[40px] lg:text-[48px] leading-[1.1] text-[#7E82A2]"
        >
          Quer entender por que mais de
          <span class="text-[#010D28] font-semibold">520 escolas</span>
          já escolheram a F10?
        </h2>

        <p class="text-[16px] leading-[1.8] text-[#010D28]">
          Nossa trajetória é marcada por inovação, experiência e resultados
          concretos. Conheça a história, os valores e a missão que impulsionam
          nossas soluções e transformam a gestão educacional no Brasil.
        </p>

        <div>
          <a
            href="/sobre"
            class="inline-flex items-center justify-center gap-[12px] px-8 py-3 rounded-[70px] bg-[#EA6D0B] text-white font-bold text-[16px] leading-[1.4] tracking-[-0.02em] transition-transform hover:scale-[1.02] hover:bg-[#f9811a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA6D0B] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            <span>Saiba mais sobre a F10</span>
            <IconArrowRight />
          </a>
        </div>
      </div>
    </div>
  </div>
</section>


