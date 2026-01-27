<!-- Breadcrumb.svelte -->
<script lang="ts">
    import { page } from "$app/stores";
    import { derived } from "svelte/store";

    // ===== Props =====
    export let items: Array<{ label: string; href?: string }> | null = null;
    export let routeMeta: Record<string, { label?: string; hide?: boolean }> =
        {};
    export let className: string = "";
    export let separator: string = "•";
    export let baseUrl: string = "https://f10.com.br";

    // ===== Utils =====
    function humanize(segment: string): string {
        const s = decodeURIComponent(segment).replace(/[-_]+/g, " ").trim();
        return s.toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());
    }

    function joinUrl(parts: string[]): string {
        return (
            parts
                .join("/")
                .replace(/\/{2,}/g, "/")
                .replace(/\/$/, "") || "/"
        );
    }

    function normalizeBaseUrl(url: string): string {
        return url.replace(/\/+$/, "");
    }

    // Fallback automático de breadcrumbs a partir do path atual
    const autoCrumbs = derived(page, ($page) => {
        const pathname = $page.url?.pathname || "/";

        if (pathname === "/") {
            const label = routeMeta["/"]?.label ?? "Início";
            return [{ label, href: "/" }];
        }

        const segs = pathname.split("/").filter(Boolean);
        const acc: Array<{ label: string; href: string }> = [];
        let pathAcc = "";

        for (const seg of segs) {
            pathAcc = joinUrl([pathAcc, "/", seg]);
            if (routeMeta[pathAcc]?.hide) continue;

            const label =
                routeMeta[pathAcc]?.label ??
                (/^[a-f0-9-]{12,}$/i.test(seg) ? "Detalhe" : humanize(seg));

            acc.push({ label, href: pathAcc });
        }

        const homeLabel = routeMeta["/"]?.label ?? "Início";
        return [{ label: homeLabel, href: "/" }, ...acc];
    });

    // Fonte final (items editoriais > fallback automático)
    let finalCrumbs: Array<{ label: string; href?: string }> = [];
    $: {
        if (items && items.length > 0) {
            if (items[0]?.href !== "/") {
                const homeLabel = routeMeta["/"]?.label ?? "Início";
                finalCrumbs = [{ label: homeLabel, href: "/" }, ...items];
            } else {
                finalCrumbs = items;
            }
        } else {
            $autoCrumbs && (finalCrumbs = $autoCrumbs);
        }
    }

    function buildBreadcrumbJsonLd(
        list: Array<{ label: string; href?: string }>,
        base: string,
        pathname: string,
    ): string {
        const baseNormalized = normalizeBaseUrl(base);

        const obj = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: list.map((c, idx) => ({
                "@type": "ListItem",
                position: idx + 1,
                name: c.label,
                item: c.href
                    ? `${baseNormalized}${c.href === "/" ? "" : c.href}`
                    : `${baseNormalized}${pathname || ""}`,
            })),
        };

        return JSON.stringify(obj);
    }

    // Sempre declare para evitar variável implícita no TS
    let jsonLdScriptTag = "";

    $: jsonLdScriptTag = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: finalCrumbs.map((c, idx) => ({
            "@type": "ListItem",
            position: idx + 1,
            name: c.label,
            item: c.href
                ? `${baseUrl.replace(/\/$/, "")}${c.href === "/" ? "" : c.href}`
                : `${baseUrl.replace(/\/$/, "")}${$page.url.pathname}`,
        })),
    });
</script>

<nav
    class={`text-sm text-[12px] text-[#010D28]/50 ${className} container mt-8 mb-12`.trim()}
    itemscope
    itemtype="https://schema.org/BreadcrumbList"
>
    <ol class="flex flex-wrap gap-2 md:gap-3 leading-none">
        {#each finalCrumbs as crumb, i (crumb.href ?? crumb.label)}
            <li
                class="inline-flex items-center gap-2 leading-none"
                itemprop="itemListElement"
                itemscope
                itemtype="https://schema.org/ListItem"
            >
                {#if crumb.href && i < finalCrumbs.length - 1}
                    <a
                        href={crumb.href}
                        class="text-[12px] hover:text-[#010D28] text-[#AEB3D9] underline-offset-4 hover:underline align-middle"
                        itemprop="item"
                    >
                        <span itemprop="name">{crumb.label}</span>
                    </a>
                    <meta itemprop="position" content={String(i + 1)} />
                    <span
                        aria-hidden="true"
                        class="text-[#AEB3D9] text-[12px] align-middle leading-none flex items-center justify-center"
                    >
                        {separator}
                    </span>
                {:else}
                    <span
                        class="text-[12px] font-semibold text-[#000A57]/70 align-middle leading-none"
                        itemprop="name"
                    >
                        {crumb.label}
                    </span>
                    <meta itemprop="position" content={String(i + 1)} />
                {/if}
            </li>
        {/each}
    </ol>
</nav>

<svelte:head>
  {@html `<script id="jsonld-breadcrumb" type="application/ld+json">${jsonLdScriptTag}</script>`}
</svelte:head>

