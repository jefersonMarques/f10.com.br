<script lang="ts">
  import { browser } from "$app/environment";
  import { page } from "$app/stores";
  import GettingStartedJourney from "$lib/components/onboarding/GettingStartedJourney.svelte";
  import SeoHead from "$lib/components/SeoHead.svelte";
  import {
    DEFAULT_OG_IMAGE,
    ORGANIZATION_DATA,
    SITE_URL,
    SOFTWARE_APPLICATION_DATA,
    WEBSITE_DATA,
    buildWebPageData,
  } from "$lib/seo/site";

  const canonicalUrl = `${SITE_URL}/primeiros-passos-f10`;
  const seoTitle = "Primeiros Passos no F10 | Instalação e Primeiro Acesso";
  const seoDescription =
    "Siga a trilha guiada para baixar e instalar o F10 no Windows, entrar com a senha provisória e concluir seu primeiro acesso.";

  const journeySteps = [
    {
      title: "Baixar o F10",
      description: "Baixe o instalador oficial em um computador com Windows.",
    },
    {
      title: "Instalar o F10",
      description:
        "Abra o instalador e siga cada tela do assistente de instalação.",
    },
    {
      title: "Entrar com a senha provisória",
      description:
        "Utilize o login e a senha provisória recebidos por e-mail.",
    },
    {
      title: "Criar uma nova senha",
      description: "Troque a senha provisória por uma senha pessoal.",
    },
    {
      title: "Entrar novamente no F10",
      description:
        "Após a tela recarregar, faça o login utilizando a nova senha.",
    },
  ];

  const quickStartSchema = {
    "@type": "ItemList",
    "@id": `${canonicalUrl}#steps`,
    name: "Trilha guiada de instalação e primeiro acesso ao F10",
    description:
      "Sequência de cinco etapas para baixar, instalar e fazer o primeiro acesso ao F10 Software no Windows.",
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

  const webPageData = buildWebPageData({
    path: "/primeiros-passos-f10",
    title: seoTitle,
    description: seoDescription,
  });

  $: startAtFirstAccess =
    browser && $page.url.searchParams.get("etapa") === "primeiro-acesso";
</script>

<SeoHead
  title={seoTitle}
  description={seoDescription}
  canonical={canonicalUrl}
  ogImage={DEFAULT_OG_IMAGE}
  ogTitle={seoTitle}
  ogDescription={seoDescription}
  ogImageAlt="Trilha guiada de instalação e primeiro acesso ao F10 Software"
  ogImageType="image/png"
  ogImageWidth={1200}
  ogImageHeight={630}
  organizationData={ORGANIZATION_DATA}
  websiteData={WEBSITE_DATA}
  {webPageData}
  softwareApplicationData={SOFTWARE_APPLICATION_DATA}
  additionalStructuredData={[quickStartSchema]}
/>

<GettingStartedJourney {startAtFirstAccess} />
