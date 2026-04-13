<script lang="ts">
    import {
        buildBreadcrumbSchema,
        buildFaqSchema,
        buildSoftwareApplicationSchema,
        buildStructuredDataGraph,
        type BreadcrumbItem,
        type FaqItem,
        type SoftwareApplicationSchemaInput,
    } from "$lib/seo/schema";

    export let title: string;
    export let description: string;
    export let canonical: string;
    export let ogImage: string;

    export let robots = "index,follow";
    export let language = "pt-BR";

    export let ogTitle: string | undefined = undefined;
    export let ogDescription: string | undefined = undefined;
    export let ogType = "website";

    export let twitterCard = "summary_large_image";
    export let twitterTitle: string | undefined = undefined;
    export let twitterDescription: string | undefined = undefined;
    export let twitterImage: string | undefined = undefined;

    export let faqItems: FaqItem[] = [];
    export let breadcrumbItems: BreadcrumbItem[] = [];
    export let softwareApplicationData: SoftwareApplicationSchemaInput | null =
        null;

    let structuredDataJsonEscaped = "";

    $: {
        const graph: Record<string, unknown>[] = [];

        /* Monta apenas os blocos realmente informados pela página. */
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

        structuredDataJsonEscaped =
            graph.length > 0 ? buildStructuredDataGraph(graph) : "";
    }
</script>

<svelte:head>
    <title>{title}</title>

    <meta name="description" content={description} />
    <meta name="robots" content={robots} />
    <meta name="language" content={language} />
    <link rel="canonical" href={canonical} />

    <meta property="og:title" content={ogTitle ?? title} />
    <meta property="og:description" content={ogDescription ?? description} />
    <meta property="og:type" content={ogType} />
    <meta property="og:url" content={canonical} />
    <meta property="og:image" content={ogImage} />

    <meta name="twitter:card" content={twitterCard} />
    <meta name="twitter:title" content={twitterTitle ?? ogTitle ?? title} />
    <meta
        name="twitter:description"
        content={twitterDescription ?? ogDescription ?? description}
    />
    <meta name="twitter:image" content={twitterImage ?? ogImage} />

    {#if structuredDataJsonEscaped}
        {@html `<script type="application/ld+json">${structuredDataJsonEscaped}</script>`}
    {/if}
</svelte:head>
