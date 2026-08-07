<script lang="ts">
  import GettingStartedJourney from "$lib/components/onboarding/GettingStartedJourney.svelte";
  import SeoHead from "$lib/components/SeoHead.svelte";
  import {
    getYoutubeThumbnailUrl,
    getYoutubeUrl,
    trainingVideos,
  } from "$lib/onboarding/trainingCatalog";
  import {
    DEFAULT_OG_IMAGE,
    ORGANIZATION_DATA,
    ORGANIZATION_ID,
    SITE_URL,
    SOFTWARE_APPLICATION_DATA,
    WEBSITE_DATA,
    buildWebPageData,
  } from "$lib/seo/site";

  const canonicalUrl = `${SITE_URL}/primeiros-passos-f10`;
  const seoTitle = "Primeiros Passos no F10 | Guia e Treinamentos";
  const seoDescription =
    "Siga a trilha guiada de primeiros passos no F10 para Windows: download, instalação, primeiro acesso, troca de senha, usuários e treinamentos.";

  const journeySteps = [
    {
      title: "Baixar o F10",
      description: "Baixe o instalador oficial em um computador com Windows.",
    },
    {
      title: "Instalar o F10",
      description: "Abra o instalador e siga cada tela do assistente de instalação.",
    },
    {
      title: "Entrar com a senha provisória",
      description: "Utilize o login e a senha provisória recebidos por e-mail.",
    },
    {
      title: "Criar uma nova senha",
      description: "Troque a senha provisória por uma senha pessoal.",
    },
    {
      title: "Entrar novamente no F10",
      description: "Após a tela recarregar, faça o login utilizando a nova senha.",
    },
    {
      title: "Criar usuários e funcionários",
      description: "Assista ao treinamento essencial e cadastre as pessoas da equipe.",
    },
    {
      title: "Definir os direitos dos usuários",
      description: "Configure quais menus e informações cada pessoa poderá acessar.",
    },
    {
      title: "Escolher uma rotina para aprender",
      description: "Escolha uma área e assista ao treinamento necessário sem sair da página.",
    },
  ];

  const quickStartSchema = {
    "@type": "ItemList",
    "@id": `${canonicalUrl}#steps`,
    name: "Trilha guiada de primeiros passos no F10",
    description:
      "Sequência de oito etapas para baixar, instalar, acessar, configurar e começar a utilizar o F10 Software no Windows.",
    numberOfItems: journeySteps.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: journeySteps.map((step, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: step.title,
      description: step.description,
      url: `${canonicalUrl}#onboarding-journey`,
    })),
  };

  const trainingLibrarySchema = {
    "@type": "ItemList",
    "@id": `${canonicalUrl}#training-library`,
    name: "Treinamentos em vídeo do F10",
    description:
      "Biblioteca de treinamentos para usuários iniciantes do F10, organizada por rotina de trabalho.",
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
    path: "/primeiros-passos-f10",
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
  ogImageAlt="Trilha guiada de primeiros passos no F10 Software"
  ogImageType="image/png"
  ogImageWidth={1200}
  ogImageHeight={630}
  organizationData={ORGANIZATION_DATA}
  websiteData={WEBSITE_DATA}
  {webPageData}
  softwareApplicationData={SOFTWARE_APPLICATION_DATA}
  additionalStructuredData={[quickStartSchema, trainingLibrarySchema]}
/>

<GettingStartedJourney />
