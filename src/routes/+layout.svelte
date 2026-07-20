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

{#if isStandalonePage}
  <slot />
{:else}
  <Header />
  <main>
    <slot />
  </main>
  <Footer />
  <FloatingWhatsappButton />

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
