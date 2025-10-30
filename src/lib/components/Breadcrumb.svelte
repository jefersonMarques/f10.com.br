<!-- Breadcrumb.svelte -->
<script lang="ts">
    import { page } from "$app/stores";
    import { derived } from "svelte/store";

    // ===== Props =====
    // Lista editorial (melhor para SEO). Se não for passada, cai no fallback automático via URL.
    export let items: Array<{ label: string; href?: string }> | null = null;

    // Mapa de paths para rótulos humanos e flags de ocultação
    // Ex.: { "/": { label: "Início" }, "/sobre": { label: "Sobre a F10" } }
    export let routeMeta: Record<string, { label?: string; hide?: boolean }> =
        {};

    // Classe utilitária opcional para <nav>
    export let className: string = "";

    // Separador visual entre os itens
    export let separator: string = "•";

    // URL base canônica (para JSON-LD com URLs absolutas)
    export let baseUrl: string = "https://f10.com.br";

    /**=====EXEMPLO DE USO=====**/
    //<Breadcrumb
    //  baseUrl="https://f10.com.br"
    //  items={[
    //    { label: "Início", href: "/" },
    //    { label: "Soluções", href: "/solucoes" },
    //    { label: "Gestão Financeira" } // último sem link
    //  ]}
    ///>

    // ===== Utils =====
    // Humaniza segmentos do path: "sobre-a-f10" -> "Sobre A F10"
    function humanize(segment: string): string {
        const s = decodeURIComponent(segment).replace(/[-_]+/g, " ").trim();
        return s.toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());
    }

    // Junta partes de URL evitando barras duplicadas e barra final desnecessária
    function joinUrl(parts: string[]): string {
        return (
            parts
                .join("/")
                .replace(/\/{2,}/g, "/")
                .replace(/\/$/, "") || "/"
        );
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
                // Se parecer um ID/slug técnico, use um rótulo genérico
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

    // Gera JSON-LD (string) — chamado no <script> para o TS "ver" o uso
    function buildBreadcrumbJsonLd(
        list: Array<{ label: string; href?: string }>,
        base: string,
        pathname: string,
    ): string {
        const obj = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: list.map((c, idx) => ({
                "@type": "ListItem",
                position: idx + 1,
                name: c.label,
                item: c.href
                    ? `${base}${c.href === "/" ? "" : c.href}`
                    : `${base}${pathname || ""}`,
            })),
        };
        return JSON.stringify(obj);
    }

    // String reativa para injeção no <script type="application/ld+json">
    $: jsonLdStr = buildBreadcrumbJsonLd(
        finalCrumbs,
        baseUrl,
        $page?.url?.pathname || "/",
    );
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
                        •
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

    <script type="application/ld+json">
    {jsonLdStr}
    </script>
</nav>

<style>
</style>
