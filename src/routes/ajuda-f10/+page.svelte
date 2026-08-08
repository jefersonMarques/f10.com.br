<script lang="ts">
  import HelpHub from "$lib/components/help/HelpHub.svelte";
  import SeoHead from "$lib/components/SeoHead.svelte";
  import {
    getYoutubeThumbnailUrl,
    getYoutubeUrl,
    trainingVideos,
  } from "$lib/help/trainingCatalog";
  import { helpDestinations } from "$lib/help/helpDecisionTree";
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
  const seoTitle = "Ajuda F10 | Orientação Guiada e Treinamentos";
  const seoDescription =
    "Responda perguntas simples para encontrar a orientação certa para instalar, acessar ou utilizar as principais rotinas do F10.";

  const helpTopics = helpDestinations.map((destination) => ({
    title: destination.title,
    description: destination.description,
    url: `${canonicalUrl}?goal=${destination.id}`,
  }));

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
        url: `${canonicalUrl}?goal=${training.id}`,
        sameAs: getYoutubeUrl(training.videoId),
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
  ogImageAlt="Orientação guiada e treinamentos do F10 Software"
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
