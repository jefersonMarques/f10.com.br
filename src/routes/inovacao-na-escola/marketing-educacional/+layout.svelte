<script lang="ts">
  import SeoHead from "$lib/components/SeoHead.svelte";
  import type { FaqItem } from "$lib/seo/schema";
  import {
    ORGANIZATION_DATA,
    SITE_URL,
    WEBSITE_DATA,
    buildWebPageData,
  } from "$lib/seo/site";

  const canonicalUrl = `${SITE_URL}/inovacao-na-escola/marketing-educacional`;
  const ogImageUrl = `${SITE_URL}/inovacao_marketing_hero.webp`;
  const seoTitle =
    "Marketing Educacional | Inovação em Captação e Matrículas";
  const seoDescription =
    "Marketing educacional com funil de matrículas, captação multicanal, CRM escolar, matrícula online e indicadores para escolas e redes.";

  const faqItems: FaqItem[] = [
    {
      question: "Como aumentar matrículas sem depender de indicações?",
      answer:
        "Use um funil de matrículas conectado ao CRM escolar para acompanhar cada etapa e reduzir o abandono no fechamento com matrícula online e assinatura eletrônica.",
    },
    {
      question: "Como trazer previsibilidade para a direção da escola?",
      answer:
        "Acompanhe metas, pipeline, conversões e gargalos por etapa, curso, turno e unidade em indicadores atualizados.",
    },
    {
      question: "Site, WhatsApp e eventos podem ser integrados ao CRM?",
      answer:
        "Sim. Os contatos podem entrar no CRM com origem e contexto preservados para que a equipe acompanhe cada oportunidade.",
    },
    {
      question: "A matrícula online reduz abandono na última etapa?",
      answer:
        "A jornada digital reduz papel, deslocamentos e espera, facilitando o envio de documentos, assinatura e confirmação da vaga.",
    },
    {
      question: "A solução funciona para redes e multiunidades?",
      answer:
        "Sim. A gestão pode consolidar resultados e comparar captação, atendimento e matrículas entre unidades e cursos.",
    },
  ];

  const webPageData = buildWebPageData({
    path: "/inovacao-na-escola/marketing-educacional",
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
  ogImageAlt="Marketing educacional integrado ao CRM e funil de matrículas F10"
  ogImageType="image/webp"
  renderPrimaryMeta={false}
  renderCanonicalLink={false}
  organizationData={ORGANIZATION_DATA}
  websiteData={WEBSITE_DATA}
  {webPageData}
  {faqItems}
/>

<slot />
