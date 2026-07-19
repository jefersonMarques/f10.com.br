<script lang="ts">
  import "../app.css";
  import "../cebrac-presentation.css";
  import "../cebrac-journey.css";
  import "../cebrac-investment.css";
  import "../cebrac-investment-solid.css";
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

{#if !isStandalonePage}
  <Header />
{/if}

<slot />

{#if !isStandalonePage}
  <Footer />

  <FloatingWhatsappButton
    url="https://api.whatsapp.com/send?phone=554130333300&text=Ol%C3%A1%2C%20gostaria%20de%20saber%20mais%20sobre%20a%20F10%20Software."
  />

  <Popup bind:size={modalSize} open={$contactModalConfig.open} on:close={() => contactModalConfig.close()}>
    {#if modalConfig.type === "contact"}
      <ContactWhatsappModalForm />
    {:else if modalConfig.type === "solutions"}
      <PopupSolutionsList />
    {:else}
      <SolutionList />
    {/if}
  </Popup>
{/if}
