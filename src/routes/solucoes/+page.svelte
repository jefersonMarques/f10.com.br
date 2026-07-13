<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import SeoHead from "$lib/components/SeoHead.svelte";
  import SolutionsLight from "$lib/components/SolutionsLight.svelte";
  import IconArrowRight from "$lib/icons/IconArrowRight.svelte";
  import {
    DEFAULT_OG_IMAGE,
    ORGANIZATION_DATA,
    SITE_URL,
    SOFTWARE_APPLICATION_DATA,
    WEBSITE_DATA,
    buildWebPageData,
  } from "$lib/seo/site";

  const canonicalUrl = `${SITE_URL}/solucoes`;
  const seoTitle = "Soluções F10 | Software Completo de Gestão Escolar";
  const seoDescription =
    "Conheça as soluções da F10 para gestão pedagógica, financeira, administrativa, CRM escolar, WhatsApp, captação de alunos, AVA, aplicativo e indicadores.";

  const breadcrumbItems = [
    { name: "Início", item: `${SITE_URL}/` },
    { name: "Soluções", item: canonicalUrl },
  ];

  const webPageData = buildWebPageData({
    path: "/solucoes",
    title: seoTitle,
    description: seoDescription,
    pageType: "CollectionPage",
  });

  const solutionPages = [
    { name: "WhatsApp para escolas", path: "/solucoes/whatsapp" },
    { name: "CRM escolar", path: "/solucoes/crm-escolar" },
    {
      name: "Marketing e captação de alunos",
      path: "/solucoes/marketing-captacao-de-alunos",
    },
    { name: "Vendas e matrículas", path: "/solucoes/vendas" },
    {
      name: "Aplicativo Smart Aluno",
      path: "/solucoes/aplicativo-smart-aluno",
    },
    {
      name: "Ambiente Virtual de Aprendizagem e Portal do Aluno",
      path: "/solucoes/ambiente-virtual-de-aprendizado-ava",
    },
    { name: "Gestão pedagógica", path: "/solucoes/pedagogico" },
    { name: "Gestão financeira", path: "/solucoes/financeiro" },
    { name: "Nota fiscal", path: "/solucoes/nota-fiscal" },
    { name: "Indicadores e BI", path: "/solucoes/indicadores-e-bi" },
  ];

  const solutionsItemList = {
    "@type": "ItemList",
    "@id": `${canonicalUrl}#solutions-list`,
    name: "Soluções de gestão escolar da F10 Software",
    numberOfItems: solutionPages.length,
    itemListElement: solutionPages.map((solution, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "WebPage",
        name: solution.name,
        url: `${SITE_URL}${solution.path}`,
      },
    })),
  };
</script>

<SeoHead
  title={seoTitle}
  description={seoDescription}
  canonical={canonicalUrl}
  ogImage={DEFAULT_OG_IMAGE}
  ogTitle={seoTitle}
  ogDescription={seoDescription}
  ogImageAlt="Soluções de gestão escolar da F10 Software"
  ogImageType="image/png"
  ogImageWidth={1200}
  ogImageHeight={630}
  organizationData={ORGANIZATION_DATA}
  websiteData={WEBSITE_DATA}
  {webPageData}
  softwareApplicationData={SOFTWARE_APPLICATION_DATA}
  {breadcrumbItems}
  additionalStructuredData={[solutionsItemList]}
/>

<section
  class="isolate overflow-hidden bg-white pb-16"
  aria-label="Soluções de gestão escolar F10"
>
  <Breadcrumb
    baseUrl="https://f10.com.br"
    items={[{ label: "INÍCIO", href: "/" }, { label: "SOLUÇÕES" }]}
  />

  <div
    class="container relative z-10 grid grid-cols-1 gap-y-10 lg:grid-cols-12 lg:gap-x-16"
  >
    <div class="flex items-start lg:col-span-6">
      <h1
        class="text-[36px] font-semibold leading-[1.05] text-[#010D28] md:text-[48px]"
      >
        Soluções de gestão escolar
        <br />
        para escolas que querem
        <br />
        crescer
      </h1>
    </div>

    <div class="flex items-center lg:col-span-6">
      <div class="max-w-xl space-y-6">
        <h2
          class="text-[22px] font-medium leading-snug text-[#7E82A2] md:text-[26px]"
        >
          Tecnologia integrada para organizar a operação e apoiar o crescimento.
        </h2>

        <p class="text-[16px] leading-relaxed text-[#7E82A2]">
          A F10 reúne gestão pedagógica, administrativa, financeira, comercial e
          de marketing em um único software escolar. O ecossistema foi
          desenvolvido para cursos livres, escolas de idiomas, ensino técnico,
          redes de ensino e franquias educacionais que precisam escalar com
          controle, produtividade e melhor experiência para alunos e famílias.
        </p>
      </div>
    </div>
  </div>
</section>

<SolutionsLight />

<section class="bg-white">
  <div
    class="container flex flex-col items-start gap-16 px-6 py-16 md:px-10 lg:px-20"
  >
    <div class="flex w-full flex-col gap-16 lg:flex-row">
      <div class="relative min-h-[260px] flex-1 lg:h-[414px]">
        <div class="relative h-full w-full">
          <img
            src="/social_prove_f10.webp"
            alt="Equipe representando as escolas que escolheram a F10"
            class="h-full w-full rounded-[16px] object-cover"
            loading="lazy"
          />
          <div
            class="pointer-events-none absolute inset-0 rounded-[16px] bg-[rgba(0,10,87,0.28)]"
          ></div>
        </div>
      </div>

      <div
        class="flex w-full max-w-[508px] flex-col justify-start gap-4 lg:ml-4"
      >
        <h2
          class="text-[32px] font-medium leading-[1.1] text-[#7E82A2] md:text-[40px] lg:text-[48px]"
        >
          Quer entender por que mais de
          <span class="font-semibold text-[#010D28]">520 escolas</span>
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
            class="inline-flex items-center justify-center gap-[12px] rounded-[70px] bg-[#EA6D0B] px-8 py-3 text-[16px] font-bold leading-[1.4] tracking-[-0.02em] text-white transition-transform hover:scale-[1.02] hover:bg-[#f9811a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EA6D0B] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            <span>Saiba mais sobre a F10 Software</span>
            <IconArrowRight />
          </a>
        </div>
      </div>
    </div>
  </div>
</section>
