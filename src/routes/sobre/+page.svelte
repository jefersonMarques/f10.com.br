<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import SeoHead from "$lib/components/SeoHead.svelte";
  import IconArrowRight from "$lib/icons/IconArrowRight.svelte";
  import IconBank from "$lib/icons/IconBank.svelte";
  import IconBooks from "$lib/icons/IconBooks.svelte";
  import IconDevice from "$lib/icons/IconDevice.svelte";
  import {
    ORGANIZATION_DATA,
    ORGANIZATION_ID,
    SITE_URL,
    WEBSITE_DATA,
    buildWebPageData,
  } from "$lib/seo/site";

  const canonicalUrl = `${SITE_URL}/sobre`;
  const ogImageUrl = `${SITE_URL}/bg_sobre.webp`;
  const seoTitle = "Sobre a F10 Software | Tecnologia para Gestão Escolar";
  const seoDescription =
    "Conheça a F10 Software, empresa brasileira especializada em tecnologia para gestão de cursos livres, escolas de idiomas, ensino técnico e redes educacionais.";

  const breadcrumbItems = [
    { name: "Início", item: `${SITE_URL}/` },
    { name: "Sobre a F10", item: canonicalUrl },
  ];

  const webPageData = buildWebPageData({
    path: "/sobre",
    title: seoTitle,
    description: seoDescription,
    pageType: "AboutPage",
    mainEntityId: ORGANIZATION_ID,
    imageUrl: ogImageUrl,
  });
</script>

<SeoHead
  title={seoTitle}
  description={seoDescription}
  canonical={canonicalUrl}
  ogImage={ogImageUrl}
  ogTitle={seoTitle}
  ogDescription={seoDescription}
  ogImageAlt="F10 Software, tecnologia especializada em gestão escolar"
  ogImageType="image/webp"
  organizationData={ORGANIZATION_DATA}
  websiteData={WEBSITE_DATA}
  {webPageData}
  {breadcrumbItems}
/>

<!-- ====== SOBRE / PRIMEIRA SESSÃO ====== -->
<section
  class="isolate overflow-hidden bg-white/20"
  aria-label="Sobre a F10 Software"
>
  <Breadcrumb
    baseUrl="https://f10.com.br"
    items={[{ label: "INÍCIO", href: "/" }, { label: "SOBRE A F10" }]}
  />

  <div
    class="container relative z-10 grid grid-cols-1 gap-8 pb-16 md:grid-cols-12"
  >
    <div class="flex items-center lg:col-span-7">
      <h1
        class="text-[42px] font-semibold leading-[1.08] text-[#010D28] md:text-[48px] md:leading-[1.3]"
      >
        Sobre a F10 Software:<br />
        tecnologia para transformar<br />
        a gestão escolar
      </h1>
    </div>

    <div class="flex items-center lg:col-span-5">
      <p class="text-[16px] leading-relaxed text-[#7E82A2]">
        A F10 Software é uma empresa brasileira de tecnologia especializada em
        gestão escolar. Desenvolvemos uma plataforma completa para escolas de
        cursos livres, idiomas, ensino profissionalizante, cursos técnicos e
        redes de franquias educacionais, atendendo às necessidades reais de
        gestores, professores, alunos e famílias.
      </p>
    </div>
  </div>

  <div class="container relative z-10 pb-16 lg:pb-24">
    <div
      class="relative h-[313px] overflow-hidden rounded-[28px] bg-[url(/bg_sobre.webp)] bg-top-right shadow-[0_20px_60px_rgba(1,13,40,0.18)] ring-1 ring-black/5"
      aria-label="Tecnologia feita para facilitar a gestão escolar"
    >
      <div class="absolute inset-0 bg-[#000A57AD]"></div>

      <div
        class="absolute inset-0 flex items-center justify-center px-6 md:px-12"
      >
        <p
          class="text-center text-[22px] font-semibold leading-tight text-white sm:text-[28px] md:text-[32px] lg:text-[36px]"
        >
          Tecnologia feita para facilitar a gestão de escolas de ensino livre,<br
            class="hidden md:block"
          />
          contribuindo para a melhoria da educação em todo o país.
        </p>
      </div>

      <div
        class="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/10"
      ></div>
    </div>
  </div>
</section>

<!-- ====== MISSÃO / VISÃO / VALORES ====== -->
<section class="border-t border-slate-200 bg-white/20">
  <div class="container mx-auto">
    <div class="grid gap-8 md:grid-cols-3">
      <div
        class="rounded-[24px] bg-[#F3F4FD] p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(1,13,40,0.08)]"
      >
        <p class="mb-2 text-[14px] font-semibold text-[#EA6D0B]">Missão</p>
        <h2 class="mb-4 text-[26px] font-semibold leading-snug text-[#010D28]">
          Tecnologia para uma Educação com Propósito
        </h2>
        <p class="text-[14px] leading-relaxed text-[#7E82A2]">
          Potencializar a eficiência das instituições de ensino com tecnologia
          acessível, inteligente e segura, promovendo uma gestão mais humana,
          moderna e orientada a resultados. Buscamos ser parceiros estratégicos
          das escolas na construção de um futuro educacional mais eficaz e
          inclusivo.
        </p>
      </div>

      <div
        class="rounded-[24px] bg-[#F3F4FD] p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(1,13,40,0.08)]"
      >
        <p class="mb-2 text-[14px] font-semibold text-[#EA6D0B]">Visão</p>
        <h2 class="mb-4 text-[26px] font-semibold leading-snug text-[#010D28]">
          Liderar a Inovação na Gestão Escolar Brasileira
        </h2>
        <p class="text-[14px] leading-relaxed text-[#7E82A2]">
          Ser a principal referência em soluções de gestão escolar no Brasil,
          reconhecida por transformar a educação por meio da inovação, do
          atendimento de excelência e de parcerias duradouras com escolas e
          redes educacionais.
        </p>
      </div>

      <div
        class="rounded-[24px] bg-[#F3F4FD] p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(1,13,40,0.08)]"
      >
        <p class="mb-2 text-[14px] font-semibold text-[#EA6D0B]">Valores</p>
        <h2 class="mb-4 text-[26px] font-semibold leading-snug text-[#010D28]">
          Princípios que Guiam toda a Nossa Jornada
        </h2>
        <p class="text-[14px] leading-relaxed text-[#7E82A2]">
          Inovação contínua, compromisso com a educação, ética e transparência
          nas relações, foco nas pessoas e resultados com propósito. Esses são
          os princípios que norteiam nossas decisões, parcerias e o
          desenvolvimento das nossas soluções tecnológicas.
        </p>
      </div>
    </div>

    <div class="mt-16 md:mt-20">
      <div
        class="relative overflow-hidden rounded-[28px] shadow-[0_20px_60px_rgba(1,13,40,0.12)] ring-1 ring-black/5"
      >
        <img
          src="/bg_mvv.webp"
          alt="Ambiente educacional tecnológico com pessoas colaborando"
          class="max-h-[533px] w-full object-cover"
          loading="lazy"
        />
        <div
          class="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/10"
        ></div>
      </div>
    </div>
  </div>
</section>

<section class="bg-white/20 pb-20 pt-12 md:pb-24 md:pt-16">
  <div class="container">
    <div
      class="grid grid-cols-1 items-stretch gap-8 md:grid-cols-[1fr_360px]"
    >
      <div class="grid gap-8">
        <div class="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div
            class="mx-auto w-full max-w-[420px] rounded-[28px] bg-[#F3F4FD] p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(1,13,40,0.08)] md:max-w-none md:p-8"
          >
            <div class="flex items-center justify-center md:justify-start">
              <IconDevice />
            </div>
            <h3
              class="mb-3 mt-4 text-center text-[28px] font-normal text-[#010D28] md:pr-24 md:text-left md:text-[40px]"
            >
              Gestão Administrativa
            </h3>
            <p
              class="mb-6 min-h-28 text-center text-[15px] leading-relaxed text-[#7E82A2] md:pr-24 md:text-left md:text-[16px]"
            >
              Organize matrículas, calendários e turmas com automação e controle
              total da rotina escolar.
            </p>
            <a
              href="/solucoes/vendas"
              class="inline-flex w-full items-center justify-center rounded-full bg-[#EA6D0B] px-6 py-3 text-[15px] font-semibold text-white transition-all hover:brightness-110 md:w-auto"
            >
              Conhecer gestão administrativa
              <IconArrowRight size={24} classType="md:ml-6" />
            </a>
          </div>

          <div
            class="mx-auto w-full max-w-[420px] rounded-[28px] bg-[#F3F4FD] p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(1,13,40,0.08)] md:max-w-none md:p-8"
          >
            <div class="flex items-center justify-center md:justify-start">
              <IconBank />
            </div>

            <h3
              class="mb-3 mt-4 text-center text-[28px] font-normal text-[#010D28] md:pr-16 md:text-left md:text-[40px]"
            >
              Gestão Financeira
            </h3>
            <p
              class="mb-6 min-h-28 text-center text-[15px] leading-relaxed text-[#7E82A2] md:pr-16 md:text-left md:text-[16px]"
            >
              Controle mensalidades, inadimplência e finanças com segurança,
              agilidade e transparência.
            </p>
            <a
              href="/solucoes/financeiro"
              class="inline-flex w-full items-center justify-center rounded-full bg-[#EA6D0B] px-6 py-3 text-[15px] font-semibold text-white transition-all hover:brightness-110 md:w-auto"
            >
              Conhecer gestão financeira
              <IconArrowRight size={24} classType="md:ml-6" />
            </a>
          </div>
        </div>

        <div
          class="mx-auto grid w-full max-w-[420px] grid-cols-1 items-center gap-6 rounded-[28px] bg-[#F3F4FD] p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(1,13,40,0.08)] md:max-w-none md:grid-cols-[auto_1fr_auto] md:p-8"
        >
          <div
            class="mb-4 flex h-full items-center justify-center md:mb-0 md:justify-start"
          >
            <IconBooks />
          </div>

          <div>
            <h3
              class="mb-3 text-center text-[28px] font-normal text-[#010D28] md:text-left md:text-[40px]"
            >
              Gestão Pedagógica
            </h3>
            <p
              class="text-center text-[15px] leading-relaxed text-[#7E82A2] md:pr-10 md:text-left md:text-[16px]"
            >
              Registre e acompanhe notas, frequência e planejamentos de forma
              prática e integrada.
            </p>
          </div>

          <div class="mt-4 flex items-center justify-center md:mt-0">
            <a
              href="/solucoes/pedagogico"
              class="inline-flex w-full items-center justify-center rounded-full bg-[#EA6D0B] px-6 py-3 text-[15px] font-semibold text-white transition-all hover:brightness-110 md:w-auto"
            >
              Conhecer gestão pedagógica
              <IconArrowRight size={24} classType="md:ml-6" />
            </a>
          </div>
        </div>
      </div>

      <div
        class="mx-auto flex w-full max-w-full flex-col justify-center rounded-[28px] bg-[#F3F4FD] p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(1,13,40,0.08)] md:mx-0 md:max-w-[360px] md:p-8 md:text-left"
      >
        <div class="mb-6 flex items-center justify-center md:justify-start">
          <IconDevice />
        </div>
        <h3
          class="mb-4 text-[28px] font-normal leading-tight text-[#010D28] md:text-[40px]"
        >
          Comunicação Escolar
        </h3>
        <p
          class="mb-6 text-[15px] leading-relaxed text-[#7E82A2] md:pr-4 md:text-[16px]"
        >
          Conecte escola, famílias e alunos com avisos, portais exclusivos e
          mensagens automáticas.
        </p>
        <a
          href="/solucoes/whatsapp"
          class="mx-auto inline-flex w-full items-center justify-center rounded-full bg-[#EA6D0B] px-6 py-3 text-[15px] font-semibold text-white transition-all hover:brightness-110 md:mx-0 md:w-auto"
        >
          Conhecer comunicação escolar
          <IconArrowRight size={24} classType="md:ml-6" />
        </a>
      </div>
    </div>
  </div>
</section>
