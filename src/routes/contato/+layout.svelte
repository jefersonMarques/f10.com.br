<script lang="ts">
  import SeoHead from "$lib/components/SeoHead.svelte";
  import {
    ORGANIZATION_DATA,
    SITE_URL,
    WEBSITE_DATA,
    buildWebPageData,
  } from "$lib/seo/site";
  import { onMount } from "svelte";

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

  onMount(() => {
    const whatsappLinks = document.querySelectorAll<HTMLAnchorElement>(
      'a[href="https://wa.me/5541992943443"]',
    );

    whatsappLinks.forEach((link) => {
      if (link.textContent?.includes("9294-3443")) {
        link.textContent = "(41) 99294-3443";
        link.setAttribute("aria-label", "WhatsApp comercial: (41) 99294-3443");
      }
    });
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
