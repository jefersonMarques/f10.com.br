<script lang="ts">
  import { page } from "$app/stores";
  import SeoHead from "$lib/components/SeoHead.svelte";
  import type { FaqItem } from "$lib/seo/schema";
  import {
    ORGANIZATION_DATA,
    SITE_URL,
    SOFTWARE_APPLICATION_DATA,
    WEBSITE_DATA,
    buildWebPageData,
  } from "$lib/seo/site";

  const canonicalUrl = `${SITE_URL}/inovacao-na-escola`;
  const ogImageUrl = `${SITE_URL}/inovacao_hero.webp`;
  const seoTitle = "Inovação na Escola | Gestão Escolar Integrada F10";
  const seoDescription =
    "Inovação na escola com CRM educacional, matrícula online, ensino híbrido, indicadores, aplicativo, WhatsApp e gestão integrada para redes e escolas.";

  const faqItems: FaqItem[] = [
    {
      question: "Como aumentar matrículas sem depender de indicações?",
      answer:
        "Estruture um funil de matrículas com CRM educacional, acompanhamento das etapas comerciais, matrícula online e assinatura eletrônica.",
    },
    {
      question: "Como reduzir a evasão de alunos?",
      answer:
        "Use comunicação segmentada, acompanhamento de frequência e notas, alertas e histórico das ações realizadas pela equipe pedagógica.",
    },
    {
      question: "É possível prever inadimplência escolar?",
      answer:
        "Indicadores financeiros, histórico de pagamentos, lembretes automáticos e meios de pagamento integrados ajudam a identificar riscos e agir preventivamente.",
    },
    {
      question: "A F10 funciona para redes, franquias e multiunidades?",
      answer:
        "Sim. A F10 oferece visão consolidada, controle por unidade, auditoria e comparação de resultados entre escolas e cursos.",
    },
    {
      question: "O que é um funil de matrículas?",
      answer:
        "É a organização das etapas percorridas por um interessado, desde o primeiro contato até a matrícula, permitindo acompanhar conversões e próximas ações.",
    },
  ];

  const breadcrumbItems = [
    { name: "Início", item: `${SITE_URL}/` },
    { name: "Inovação na escola", item: canonicalUrl },
  ];

  const relatedSolutions = [
    {
      name: "CRM escolar e captação de alunos",
      description:
        "Organize o funil de matrículas, tarefas comerciais, histórico e atendimento aos interessados.",
      href: "/solucoes/crm-escolar",
    },
    {
      name: "AVA e Portal do Aluno",
      description:
        "Integre conteúdos, aulas, atividades, documentos e comunicação da jornada acadêmica.",
      href: "/solucoes/ambiente-virtual-de-aprendizado-ava",
    },
    {
      name: "Indicadores e Business Intelligence",
      description:
        "Acompanhe dados financeiros, acadêmicos, comerciais e operacionais para tomar decisões.",
      href: "/solucoes/indicadores-e-bi",
    },
    {
      name: "WhatsApp integrado à gestão escolar",
      description:
        "Centralize atendimento, cobranças, avisos e comunicação com alunos e responsáveis.",
      href: "/solucoes/whatsapp",
    },
  ];

  const relatedSolutionsSchema = {
    "@type": "ItemList",
    "@id": `${canonicalUrl}#related-solutions`,
    name: "Soluções relacionadas à inovação na escola",
    numberOfItems: relatedSolutions.length,
    itemListElement: relatedSolutions.map((solution, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "WebPage",
        name: solution.name,
        description: solution.description,
        url: `${SITE_URL}${solution.href}`,
      },
    })),
  };

  const webPageData = buildWebPageData({
    path: "/inovacao-na-escola",
    title: seoTitle,
    description: seoDescription,
    imageUrl: ogImageUrl,
  });

  $: isHubPage = $page.url.pathname === "/inovacao-na-escola";
</script>

{#if isHubPage}
  <SeoHead
    title={seoTitle}
    description={seoDescription}
    canonical={canonicalUrl}
    ogImage={ogImageUrl}
    ogTitle={seoTitle}
    ogDescription={seoDescription}
    ogImageAlt="Gestão escolar integrada e inovação na escola com a F10"
    ogImageType="image/webp"
    renderPrimaryMeta={false}
    renderCanonicalLink={false}
    organizationData={ORGANIZATION_DATA}
    websiteData={WEBSITE_DATA}
    {webPageData}
    softwareApplicationData={SOFTWARE_APPLICATION_DATA}
    {faqItems}
    {breadcrumbItems}
    additionalStructuredData={[relatedSolutionsSchema]}
  />
{/if}

<slot />

{#if isHubPage}
  <section class="bg-white py-12 md:py-16" aria-labelledby="related-solutions-title">
    <div class="container px-5 md:px-8 lg:px-20">
      <div class="max-w-3xl">
        <p class="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#EA6D0B]">
          Soluções relacionadas
        </p>
        <h2
          id="related-solutions-title"
          class="mt-3 text-[28px] font-semibold leading-tight text-[#000A57] md:text-[36px]"
        >
          Recursos para colocar a inovação em prática
        </h2>
        <p class="mt-3 text-[15px] leading-relaxed text-[#7E82A2] md:text-[16px]">
          Conheça as áreas da plataforma F10 que conectam captação, ensino,
          indicadores e comunicação escolar.
        </p>
      </div>

      <div class="mt-8 grid gap-5 md:grid-cols-2">
        {#each relatedSolutions as solution}
          <a
            href={solution.href}
            class="rounded-[22px] border border-[#E7EAF8] bg-[#F8F9FE] p-6 transition hover:-translate-y-0.5 hover:border-[#EA6D0B]/40 hover:shadow-[0_12px_32px_rgba(1,13,40,0.08)]"
          >
            <h3 class="text-[19px] font-semibold text-[#000A57]">
              {solution.name}
            </h3>
            <p class="mt-2 text-[14px] leading-relaxed text-[#7E82A2]">
              {solution.description}
            </p>
            <span class="mt-4 inline-flex text-[14px] font-semibold text-[#EA6D0B]">
              Conhecer solução
            </span>
          </a>
        {/each}
      </div>
    </div>
  </section>
{/if}
