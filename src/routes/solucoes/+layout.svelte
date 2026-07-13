<script lang="ts">
  import { page } from "$app/stores";
  import SeoHead from "$lib/components/SeoHead.svelte";
  import {
    DEFAULT_OG_IMAGE,
    ORGANIZATION_DATA,
    SITE_URL,
    WEBSITE_DATA,
    buildWebPageData,
  } from "$lib/seo/site";

  type LegacySolutionSeo = {
    title: string;
    description: string;
    imageAlt: string;
  };

  const seoByPath: Record<string, LegacySolutionSeo> = {
    "/solucoes/marketing-captacao-de-alunos": {
      title: "Marketing e Captação de Alunos | F10 Software",
      description:
        "Conecte campanhas, formulários, fontes de leads e indicadores ao CRM escolar para acompanhar captação, conversão e matrículas.",
      imageAlt: "Marketing e captação de alunos integrados ao F10",
    },
    "/solucoes/vendas": {
      title: "Vendas e Matrículas para Escolas | F10 Software",
      description:
        "Organize o processo comercial, funil de matrículas, contratos, assinatura digital, metas e acompanhamento de vendas da sua escola.",
      imageAlt: "Gestão de vendas e matrículas para escolas no F10",
    },
    "/solucoes/aplicativo-smart-aluno": {
      title: "Aplicativo do Aluno e Responsáveis | F10 Software",
      description:
        "Aplicativo escolar para alunos e responsáveis acompanharem aulas, avisos, financeiro, documentos e informações acadêmicas.",
      imageAlt: "Aplicativo Smart Aluno da F10 Software",
    },
    "/solucoes/ambiente-virtual-de-aprendizado-ava": {
      title: "AVA e Portal do Aluno | F10 Software",
      description:
        "Ambiente Virtual de Aprendizagem e Portal do Aluno integrados à gestão escolar, com conteúdos, aulas, atividades e documentos.",
      imageAlt: "AVA e Portal do Aluno integrados à gestão escolar F10",
    },
    "/solucoes/pedagogico": {
      title: "Gestão Pedagógica e Secretaria Escolar | F10",
      description:
        "Controle turmas, cursos, frequência, notas, documentos, certificados e rotina da secretaria em um sistema de gestão escolar integrado.",
      imageAlt: "Gestão pedagógica e secretaria escolar no F10",
    },
    "/solucoes/financeiro": {
      title: "Gestão Financeira Escolar, Boletos e Pix | F10",
      description:
        "Controle mensalidades, cobranças, inadimplência, boletos, Pix, fluxo de caixa e indicadores financeiros da sua escola.",
      imageAlt: "Gestão financeira escolar com boletos e Pix no F10",
    },
    "/solucoes/nota-fiscal": {
      title: "Emissão de Nota Fiscal para Escolas | F10 Software",
      description:
        "Integre a emissão e o acompanhamento de notas fiscais à gestão financeira e administrativa da sua instituição de ensino.",
      imageAlt: "Emissão de nota fiscal integrada ao software escolar F10",
    },
    "/solucoes/indicadores-e-bi": {
      title: "Indicadores e BI para Gestão Escolar | F10 Software",
      description:
        "Acompanhe indicadores financeiros, pedagógicos, comerciais e operacionais para tomar decisões com dados em escolas e redes.",
      imageAlt: "Indicadores e Business Intelligence para gestão escolar F10",
    },
  };

  $: seo = seoByPath[$page.url.pathname] ?? null;
  $: canonicalUrl = seo ? `${SITE_URL}${$page.url.pathname}` : "";
  $: webPageData = seo
    ? buildWebPageData({
        path: $page.url.pathname,
        title: seo.title,
        description: seo.description,
      })
    : null;
</script>

{#if seo && webPageData}
  <SeoHead
    title={seo.title}
    description={seo.description}
    canonical={canonicalUrl}
    ogImage={DEFAULT_OG_IMAGE}
    ogTitle={seo.title}
    ogDescription={seo.description}
    ogImageAlt={seo.imageAlt}
    ogImageType="image/png"
    ogImageWidth={1200}
    ogImageHeight={630}
    renderPrimaryMeta={false}
    renderCanonicalLink={false}
    organizationData={ORGANIZATION_DATA}
    websiteData={WEBSITE_DATA}
    {webPageData}
  />
{/if}

<slot />
