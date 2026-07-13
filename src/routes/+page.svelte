<script lang="ts">
  import type { PageData } from "./$types";

  import AboutSummary from "$lib/components/AboutSummary.svelte";
  import Benefits from "$lib/components/Benefits.svelte";
  import BlogSection from "$lib/components/BlogSection.svelte";
  import Hero from "$lib/components/Hero.svelte";
  import SeoHead from "$lib/components/SeoHead.svelte";
  import Solutions from "$lib/components/Solutions.svelte";
  import Testimonials from "$lib/components/Testimonials.svelte";

  export let data: PageData;

  const baseUrl = "https://f10.com.br";
  const canonicalUrl = `${baseUrl}/`;
  const ogImageUrl = `${baseUrl}/cover.png?v=2`;

  const seoTitle = "F10 Software | Software de Gestão Escolar Completo";
  const seoDescription =
    "A F10 Software é uma plataforma completa de gestão escolar para cursos livres, idiomas, ensino técnico e redes, com financeiro, CRM, WhatsApp, AVA e aplicativo.";

  const organizationId = `${baseUrl}/#organization`;
  const websiteId = `${baseUrl}/#website`;
  const webPageId = `${baseUrl}/#webpage`;
  const softwareId = `${baseUrl}/#software`;

  const organizationData = {
    id: organizationId,
    name: "F10 Software",
    alternateName: "F10",
    description:
      "Empresa brasileira de tecnologia especializada em software de gestão escolar para cursos livres, escolas de idiomas, ensino profissionalizante, cursos técnicos e redes educacionais.",
    url: canonicalUrl,
    logo: `${baseUrl}/logo_f10.svg`,
    image: [ogImageUrl],
    email: "vendas@f10.com.br",
    telephone: "+55 41 99294-3443",
    sameAs: [
      "https://www.facebook.com/F10Software",
      "https://www.linkedin.com/company/f10software/",
      "https://www.youtube.com/@f10software76",
      "https://www.instagram.com/f10software/",
    ],
    contactPoint: [
      {
        contactType: "sales",
        telephone: "+55 41 99294-3443",
        email: "vendas@f10.com.br",
        areaServed: "BR",
        availableLanguage: "pt-BR",
      },
    ],
  };

  const websiteData = {
    id: websiteId,
    name: "F10 Software",
    alternateName: "F10",
    url: canonicalUrl,
    publisherId: organizationId,
    inLanguage: "pt-BR",
  };

  const webPageData = {
    id: webPageId,
    name: seoTitle,
    description: seoDescription,
    url: canonicalUrl,
    isPartOfId: websiteId,
    aboutId: organizationId,
    mainEntityId: softwareId,
    primaryImageUrl: ogImageUrl,
    inLanguage: "pt-BR",
  };

  const softwareApplicationData = {
    id: softwareId,
    name: "F10 Software",
    description:
      "Plataforma completa de gestão escolar que integra as áreas pedagógica, financeira, administrativa, comercial e de marketing.",
    url: canonicalUrl,
    brandName: "F10",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "SchoolManagementSoftware",
    operatingSystem: "Web",
    inLanguage: "pt-BR",
    providerId: organizationId,
    publisherId: organizationId,
    featureList: [
      "Gestão pedagógica e secretaria escolar",
      "Gestão financeira, cobranças, boletos e Pix",
      "CRM escolar com funil de matrículas em Kanban",
      "WhatsApp integrado e atendimento multiusuário",
      "Aplicativo para alunos e responsáveis",
      "Portal do Aluno e Ambiente Virtual de Aprendizagem",
      "Matrícula online e assinatura digital",
      "Indicadores gerenciais e Business Intelligence",
    ],
    screenshot: [`${baseUrl}/hero_image.webp`],
    image: [ogImageUrl],
  };
</script>

<SeoHead
  title={seoTitle}
  description={seoDescription}
  canonical={canonicalUrl}
  ogImage={ogImageUrl}
  ogTitle={seoTitle}
  ogDescription={seoDescription}
  ogImageAlt="F10 Software, plataforma completa de gestão escolar"
  ogImageType="image/png"
  ogImageWidth={1200}
  ogImageHeight={630}
  {organizationData}
  {websiteData}
  {webPageData}
  {softwareApplicationData}
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
