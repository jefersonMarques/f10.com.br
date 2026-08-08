<script lang="ts">
  import HelpHub from "$lib/components/help/HelpHub.svelte";
  import SeoHead from "$lib/components/SeoHead.svelte";
  import {
    getYoutubeThumbnailUrl,
    getYoutubeUrl,
    trainingCategories,
    trainingVideos,
  } from "$lib/help/trainingCatalog";
  import {
    DEFAULT_OG_IMAGE,
    ORGANIZATION_DATA,
    ORGANIZATION_ID,
    SITE_URL,
    SOFTWARE_APPLICATION_DATA,
    WEBSITE_DATA,
    buildWebPageData,
  } from "$lib/seo/site";

  const canonicalUrl = `${SITE_URL}/ajuda-f10`;
  const seoTitle = "Ajuda F10 | Instalação, Primeiro Acesso e Treinamentos";
  const seoDescription =
    "Encontre ajuda para instalar o F10, fazer o primeiro acesso e aprender as principais rotinas de gestão escolar com treinamentos em vídeo.";

  const helpTopics = [
    {
      title: "Instalar o F10",
      description:
        "Baixe o instalador oficial e siga a orientação de instalação em um computador com Windows.",
      url: `${SITE_URL}/primeiros-passos-f10`,
    },
    {
      title: "Fazer o primeiro acesso ao F10",
      description:
        "Entre com a senha provisória recebida por e-mail, crie uma nova senha e faça o segundo login.",
      url: `${SITE_URL}/primeiros-passos-f10?etapa=primeiro-acesso`,
    },
    ...trainingCategories.map((category) => ({
      title: `Treinamentos de ${category.label}`,
      description: category.description,
      url: `${canonicalUrl}#treinamentos-f10`,
    })),
  ];

  const helpTopicsSchema = {
    "@type": "ItemList",
    "@id": `${canonicalUrl}#help-topics`,
    name: "Opções de ajuda do F10 Software",
    description:
      "Orientações para instalação, primeiro acesso e uso das rotinas do F10.",
    numberOfItems: helpTopics.length,
    itemListElement: helpTopics.map((topic, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: topic.title,
      description: topic.description,
      url: topic.url,
    })),
  };

  const trainingLibrarySchema = {
    "@type": "ItemList",
    "@id": `${canonicalUrl}#training-library`,
    name: "Treinamentos em vídeo do F10",
    description:
      "Treinamentos do F10 organizados por configuração da equipe, comercial, matrículas, pedagógico, financeiro e operação.",
    numberOfItems: trainingVideos.length,
    itemListElement: trainingVideos.map((training, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "LearningResource",
        "@id": `${canonicalUrl}#training-${training.id}`,
        name: training.title,
        description: training.description,
        learningResourceType: "Video",
        educationalLevel: "Iniciante",
        inLanguage: "pt-BR",
        isAccessibleForFree: true,
        thumbnailUrl: getYoutubeThumbnailUrl(training.videoId),
        url: getYoutubeUrl(training.videoId),
        provider: { "@id": ORGANIZATION_ID },
      },
    })),
  };

  const webPageData = buildWebPageData({
    path: "/ajuda-f10",
    title: seoTitle,
    description: seoDescription,
  });
</script>

<SeoHead
  title={seoTitle}
  description={seoDescription}
  canonical={canonicalUrl}
  ogImage={DEFAULT_OG_IMAGE}
  ogTitle={seoTitle}
  ogDescription={seoDescription}
  ogImageAlt="Central de ajuda e treinamentos do F10 Software"
  ogImageType="image/png"
  ogImageWidth={1200}
  ogImageHeight={630}
  organizationData={ORGANIZATION_DATA}
  websiteData={WEBSITE_DATA}
  {webPageData}
  softwareApplicationData={SOFTWARE_APPLICATION_DATA}
  breadcrumbItems={[
    { name: "Início", item: `${SITE_URL}/` },
    { name: "Ajuda F10", item: canonicalUrl },
  ]}
  additionalStructuredData={[helpTopicsSchema, trainingLibrarySchema]}
/>

<HelpHub />
