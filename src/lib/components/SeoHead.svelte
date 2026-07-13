<script lang="ts">
    import {
        buildBreadcrumbSchema,
        buildFaqSchema,
        buildOrganizationSchema,
        buildSoftwareApplicationSchema,
        buildStructuredDataGraph,
        buildWebPageSchema,
        buildWebsiteSchema,
        type BreadcrumbItem,
        type FaqItem,
        type JsonLdObject,
        type OrganizationSchemaInput,
        type SoftwareApplicationSchemaInput,
        type WebPageSchemaInput,
        type WebsiteSchemaInput,
    } from "$lib/seo/schema";

    export let title: string;
    export let description: string;
    export let canonical: string;
    export let ogImage: string;

    export let robots =
        "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1";
    export let language = "pt-BR";
    export let author = "F10 Software";

    export let ogTitle: string | undefined = undefined;
    export let ogDescription: string | undefined = undefined;
    export let ogType = "website";
    export let ogSiteName = "F10 Software";
    export let ogLocale = "pt_BR";
    export let ogImageAlt: string | undefined = undefined;
    export let ogImageType: string | undefined = undefined;
    export let ogImageWidth: number | undefined = undefined;
    export let ogImageHeight: number | undefined = undefined;

    export let twitterCard = "summary_large_image";
    export let twitterTitle: string | undefined = undefined;
    export let twitterDescription: string | undefined = undefined;
    export let twitterImage: string | undefined = undefined;

    export let renderPrimaryMeta = true;
    export let renderCanonicalLink = true;

    export let faqItems: FaqItem[] = [];
    export let breadcrumbItems: BreadcrumbItem[] = [];
    export let organizationData: OrganizationSchemaInput | null = null;
    export let websiteData: WebsiteSchemaInput | null = null;
    export let webPageData: WebPageSchemaInput | null = null;
    export let softwareApplicationData: SoftwareApplicationSchemaInput | null =
        null;
    export let additionalStructuredData: JsonLdObject[] = [];

    let structuredDataJsonEscaped = "";

    $: {
        const graph: JsonLdObject[] = [];

        if (organizationData) {
            graph.push(buildOrganizationSchema(organizationData));
        }

        if (websiteData) {
            graph.push(buildWebsiteSchema(websiteData));
        }

        if (webPageData) {
            graph.push(buildWebPageSchema(webPageData));
        }

        if (softwareApplicationData) {
            graph.push(
                buildSoftwareApplicationSchema({
                    ...softwareApplicationData,
                    image: softwareApplicationData.image?.length
                        ? softwareApplicationData.image
                        : [ogImage],
                }),
            );
        }

        if (faqItems.length > 0) {
            graph.push(buildFaqSchema(faqItems));
        }

        if (breadcrumbItems.length > 0) {
            graph.push(buildBreadcrumbSchema(breadcrumbItems));
        }

        if (additionalStructuredData.length > 0) {
            graph.push(...additionalStructuredData);
        }

        structuredDataJsonEscaped =
            graph.length > 0 ? buildStructuredDataGraph(graph) : "";
    }
</script>

<svelte:head>
    {#if renderPrimaryMeta}
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="author" content={author} />
        <meta name="language" content={language} />
        <meta name="application-name" content={ogSiteName} />
        <meta property="og:title" content={ogTitle ?? title} />
        <meta property="og:description" content={ogDescription ?? description} />
    {/if}

    <meta name="robots" content={robots} />
    <meta name="googlebot" content={robots} />

    {#if renderCanonicalLink}
        <link rel="canonical" href={canonical} />
    {/if}

    <link rel="alternate" hreflang={language} href={canonical} />
    <link rel="alternate" hreflang="x-default" href={canonical} />

    <meta property="og:type" content={ogType} />
    <meta property="og:url" content={canonical} />
    <meta property="og:site_name" content={ogSiteName} />
    <meta property="og:locale" content={ogLocale} />
    <meta property="og:image" content={ogImage} />
    <meta property="og:image:secure_url" content={ogImage} />

    {#if ogImageAlt}
        <meta property="og:image:alt" content={ogImageAlt} />
    {/if}

    {#if ogImageType}
        <meta property="og:image:type" content={ogImageType} />
    {/if}

    {#if ogImageWidth}
        <meta property="og:image:width" content={String(ogImageWidth)} />
    {/if}

    {#if ogImageHeight}
        <meta property="og:image:height" content={String(ogImageHeight)} />
    {/if}

    <meta name="twitter:card" content={twitterCard} />
    <meta name="twitter:title" content={twitterTitle ?? ogTitle ?? title} />
    <meta
        name="twitter:description"
        content={twitterDescription ?? ogDescription ?? description}
    />
    <meta name="twitter:image" content={twitterImage ?? ogImage} />

    {#if ogImageAlt}
        <meta name="twitter:image:alt" content={ogImageAlt} />
    {/if}

    {#if structuredDataJsonEscaped}
        {@html `<script type="application/ld+json">${structuredDataJsonEscaped}</script>`}
    {/if}
</svelte:head>
