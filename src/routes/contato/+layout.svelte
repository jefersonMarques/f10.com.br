<script lang="ts">
  import SeoHead from "$lib/components/SeoHead.svelte";
  import {
    ORGANIZATION_DATA,
    SITE_URL,
    WEBSITE_DATA,
    buildWebPageData,
  } from "$lib/seo/site";

  const canonicalUrl = `${SITE_URL}/contato`;
  const ogImageUrl = `${SITE_URL}/bg_contact.webp`;
  const seoTitle = "Contato F10 Software | Fale com Nossa Equipe";
  const seoDescription =
    "Fale com a equipe da F10 Software sobre gestão escolar, demonstrações, planos, suporte comercial e oportunidades profissionais.";

  const breadcrumbItems = [
    { name: "Início", item: `${SITE_URL}/` },
    { name: "Contato", item: canonicalUrl },
  ];

  const webPageData = buildWebPageData({
    path: "/contato",
    title: seoTitle,
    description: seoDescription,
    pageType: "ContactPage",
    mainEntityId: ORGANIZATION_DATA.id,
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
  ogImageAlt="Equipe de atendimento da F10 Software"
  ogImageType="image/webp"
  renderPrimaryMeta={false}
  organizationData={ORGANIZATION_DATA}
  websiteData={WEBSITE_DATA}
  {webPageData}
  {breadcrumbItems}
/>

<slot />
