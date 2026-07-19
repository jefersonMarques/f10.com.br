<script lang="ts">
  import "../app.css";
  import "../cebrac-presentation.css";
  import "../cebrac-journey.css";
  import "../cebrac-investment.css";
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
  <slot />
{:else}
  <Header />
  <main>
    <slot />
  </main>
  <Footer />
  <FloatingWhatsappButton />

  <Popup
    open={modalConfig.open}
    title={modalConfig.title}
    description={modalConfig.description}
    size={modalSize}
    on:close={() => contactModalConfig.close()}
  >
    {#if modalConfig.type === "contact"}
      <ContactWhatsappModalForm />
    {:else if modalConfig.type === "solutions"}
      <SolutionList />
    {:else if modalConfig.type === "solutions-popup"}
      <PopupSolutionsList />
    {/if}
  </Popup>
{/if}
