<script lang="ts">
  import type { PageData } from "./$types";

  import AboutSummary from "$lib/components/AboutSummary.svelte";
  import Benefits from "$lib/components/Benefits.svelte";
  import BlogSection from "$lib/components/BlogSection.svelte";
  import Hero from "$lib/components/Hero.svelte";
  import SeoHead from "$lib/components/SeoHead.svelte";
  import Solutions from "$lib/components/Solutions.svelte";
  import Testimonials from "$lib/components/Testimonials.svelte";
  import {
    DEFAULT_OG_IMAGE,
    ORGANIZATION_DATA,
    SITE_URL,
    SOFTWARE_APPLICATION_DATA,
    WEBSITE_DATA,
    buildWebPageData,
  } from "$lib/seo/site";

  export let data: PageData;

  const canonicalUrl = `${SITE_URL}/`;
  const seoTitle = "F10 Software | Software de Gestão Escolar Completo";
  const seoDescription =
    "A F10 Software é uma plataforma completa de gestão escolar para cursos livres, idiomas, ensino técnico e redes, com financeiro, CRM, WhatsApp, AVA e aplicativo.";

  const webPageData = buildWebPageData({
    path: "/",
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
  ogImageAlt="F10 Software, plataforma completa de gestão escolar"
  ogImageType="image/png"
  ogImageWidth={1200}
  ogImageHeight={630}
  organizationData={ORGANIZATION_DATA}
  websiteData={WEBSITE_DATA}
  {webPageData}
  softwareApplicationData={SOFTWARE_APPLICATION_DATA}
/>

<Hero />
<AboutSummary />
<Benefits />
<Testimonials />
<Solutions />
<BlogSection
  hero={data.blog.hero}
  posts={data.blog.posts}
  error={data.blog.error}
/>
