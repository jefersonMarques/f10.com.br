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

  const standalonePaths = new Set(["/apresentacao/cebrac-crm-whatsapp"]);

  let modalSize: PopupSize = "xl";

  $: modalConfig = $contactModalConfig;
  $: isStandalonePage = standalonePaths.has($page.url.pathname);

  onMount(() => {
    afterNavigate(() => {
      const fbq = (window as Window & { fbq?: FbqFunction }).fbq;
      fbq?.("track", "PageView");
    });
  });
</script>

<svelte:head>
  <meta name="theme-color" content="#ffffff" />
  <link rel="icon" href="/favicon.png" />
</svelte:head>

{#if isStandalonePage}
  <main class="min-h-screen bg-white">
    <slot />
  </main>
{:else}
  <div
    class="min-h-screen text-slate-900 flex flex-col
           bg-[#dfe1f5]/[0.20]
           backdrop-blur-[2px] supports-[backdrop-filter]:backdrop-blur-[0.5px]"
  >
    <Header />
    <main class="flex-1">
      <slot />
    </main>
    <Footer />
  </div>

  <FloatingWhatsappButton
    whatsAppNumber="5541992943443"
    defaultMessage="Olá, vi a página de planos da F10 e quero entender qual é o melhor para a minha escola."
    product="F10 – Planos e Implantação"
    page=""
    subSource="Botão flutuante"
    leadDescription="Cliente interessado."
  />

  <Popup size={modalSize}>
    <ContactWhatsappModalForm
      whatsAppNumber="5541992943443"
      defaultMessage={modalConfig.defaultMessage}
      product={modalConfig.product}
      subSource={modalConfig.subSource}
      leadDescription={modalConfig.leadDescription}
      onChangeSize={(size) => (modalSize = size)}
    />
  </Popup>

  <PopupSolutionsList size={modalSize}>
    <SolutionList />
  </PopupSolutionsList>
{/if}
