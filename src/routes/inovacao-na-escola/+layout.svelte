<script lang="ts">
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

  const webPageData = buildWebPageData({
    path: "/inovacao-na-escola",
    title: seoTitle,
    description: seoDescription,
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
/>

<slot />
