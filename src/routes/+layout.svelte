<script lang="ts">
  import "../app.css";
  import { onMount } from "svelte";
  import { afterNavigate } from "$app/navigation";
  import { page } from "$app/stores";

  import Header from "$lib/components/Header.svelte";
  import Footer from "$lib/components/Footer.svelte";
  import Popup, { type PopupSize } from "$lib/components/popup/Popup.svelte";
  import PopupSolutionsList from "$lib/components/popup/PopupSolutionsList.svelte";

  import ContactWhatsappModalForm from "$lib/components/forms/ContactModalForm.svelte";
  import FloatingWhatsappButton from "$lib/components/forms/FloatingWhatsappButton.svelte";
  import { contactModalConfig } from "$lib/stores/contactModals";
  import SolutionList from "$lib/components/forms/SolutionList.svelte";

  type FbqFunction = (...args: unknown[]) => void;

  type SeoOverride = {
    title: string;
    description: string;
    canonical: string;
    robots: string;
    renderPrimary?: boolean;
  };

  const siteUrl = "https://f10.com.br";
  const defaultOgImage = `${siteUrl}/cover.png?v=2`;
  const standalonePaths = new Set(["/apresentacao/cebrac-crm-whatsapp"]);
  const seoOverrides: Record<string, SeoOverride> = {
    "/contato": {
      title: "Contato | F10 Software",
      description:
        "Fale com os especialistas da F10 Software sobre gestão escolar, demonstrações, suporte comercial e oportunidades profissionais.",
      canonical: `${siteUrl}/contato`,
      robots: "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1",
      renderPrimary: false,
    },
    "/termos-de-uso": {
      title: "Termos de Uso | F10 Software",
      description:
        "Consulte os termos de uso dos produtos, serviços e plataformas da F10 Software.",
      canonical: `${siteUrl}/termos-de-uso`,
      robots: "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1",
    },
    "/politica-de-privacidade": {
      title: "Política de Privacidade | F10 Software",
      description:
        "Entenda como a F10 Software coleta, utiliza, armazena e protege dados pessoais em conformidade com a LGPD.",
      canonical: `${siteUrl}/politica-de-privacidade`,
      robots: "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1",
    },
    "/download": {
      title: "Download do F10 Software",
      description:
        "Página de download do instalador e dos recursos de acesso ao F10 Software.",
      canonical: `${siteUrl}/download`,
      robots: "noindex,follow",
    },
  };

  let modalSize: PopupSize = "xl";

  $: modalConfig = $contactModalConfig;
  $: pathname = $page.url.pathname;
  $: isStandalonePage = standalonePaths.has(pathname);
  $: isOnboardingPage = pathname === "/primeiros-passos-f10";
  $: isHelpPage = pathname === "/ajuda-f10";
  $: seoOverride = seoOverrides[pathname];

  onMount(() => {
    const win = window as typeof window & { fbq?: FbqFunction };

    const trackPageView = () => {
      if (typeof win.fbq === "function") {
        win.fbq("track", "PageView");
      }
    };

    trackPageView();

    const unsubscribe = afterNavigate(() => {
      trackPageView();
    });

    return unsubscribe;
  });
</script>

<svelte:head>
  {#if seoOverride}
    {#if seoOverride.renderPrimary !== false}
      <title>{seoOverride.title}</title>
      <meta name="description" content={seoOverride.description} />
      <meta property="og:title" content={seoOverride.title} />
      <meta property="og:description" content={seoOverride.description} />
    {/if}

    <meta name="robots" content={seoOverride.robots} />
    <meta name="googlebot" content={seoOverride.robots} />
    <link rel="canonical" href={seoOverride.canonical} />
    <link rel="alternate" hreflang="pt-BR" href={seoOverride.canonical} />
    <link rel="alternate" hreflang="x-default" href={seoOverride.canonical} />

    <meta property="og:type" content="website" />
    <meta property="og:url" content={seoOverride.canonical} />
    <meta property="og:site_name" content="F10 Software" />
    <meta property="og:locale" content="pt_BR" />
    <meta property="og:image" content={defaultOgImage} />
    <meta property="og:image:secure_url" content={defaultOgImage} />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="F10 Software, plataforma completa de gestão escolar" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={seoOverride.title} />
    <meta name="twitter:description" content={seoOverride.description} />
    <meta name="twitter:image" content={defaultOgImage} />
  {/if}
</svelte:head>

{#if isStandalonePage}
  <slot />
{:else if isOnboardingPage}
  <main class="h-[100dvh] overflow-hidden">
    <slot />
  </main>
  <FloatingWhatsappButton variant="support" />
{:else if isHelpPage}
  <main class="h-[100dvh] overflow-hidden">
    <slot />
  </main>
{:else}
  <Header />
  <main>
    <slot />
  </main>
  <Footer />
  <FloatingWhatsappButton variant="contact" />

  <Popup bind:size={modalSize}>
    {#if modalConfig?.type === "contact"}
      <ContactWhatsappModalForm />
    {:else if modalConfig?.type === "solutions"}
      <PopupSolutionsList />
    {:else}
      <SolutionList />
    {/if}
  </Popup>
{/if}
