<script lang="ts">
  import "../app.css";
  import Header from "$lib/components/Header.svelte";
  import Footer from "$lib/components/Footer.svelte";
  import Popup, { type PopupSize } from "$lib/components/popup/Popup.svelte";
  import ContactWhatsappModalForm from "$lib/components/forms/ContactModalForm.svelte";
  import FloatingWhatsappButton from "$lib/components/forms/FloatingWhatsappButton.svelte";
  import { contactModalConfig } from "$lib/stores/contactModals";

  let modalSize: PopupSize = "xl";

  // ler o store reativo
  $: modalConfig = $contactModalConfig;
</script>

<svelte:head>
  <!-- SEO global básico -->
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#ffffff" />
  <meta
    name="description"
    content="F10 Software — Plataforma completa de gestão escolar com alta performance e SEO impecável."
  />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="F10 Software" />
  <link rel="icon" href="/favicon.png" />
</svelte:head>

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
  defaultMessage="Olá, vi a página de planos da F10 e quero entender qual é o melhor para o meu colégio."
  product="F10 – Planos e Implantação"
  page=""
  subSource="Botão flutuante"
  leadDescription="Cliente interessado."
/>

<!-- Modal global, lendo a config do store -->
<Popup size={modalSize}>
  <ContactWhatsappModalForm
    whatsAppNumber="5541992943443"
    defaultMessage={modalConfig.defaultMessage}
    product={modalConfig.product}
    subSource={modalConfig.subSource}
    leadDescription={modalConfig.leadDescription}
    onChangeSize={(s) => (modalSize = s)}
  />
</Popup>
