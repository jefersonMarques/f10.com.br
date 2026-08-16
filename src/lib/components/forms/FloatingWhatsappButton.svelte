<script lang="ts">
  import FloatingSupportButton from "$lib/components/onboarding/FloatingSupportButton.svelte";

  // Compatibilidade temporária com chamadas antigas. O botão flutuante público agora
  // abre exclusivamente o atendimento nativo F10; Movidesk/WhatsApp não são carregados.
  export let movideskChatClient = "";
  export let supportOpenMode: "widget" | "iframe" = "widget";
  export let supportStartOpen = false;
  export let variant: "contact" | "support" = "contact";
  export let whatsAppNumber = "";
  export let financeWhatsAppNumber = "";
  export let defaultMessage = "";
  export let source = "";
  export let page: string | undefined = undefined;
  export let product = "Software F10";
  export let subSource = "Botão flutuante site";
  export let leadDescription = "";

  void movideskChatClient;
  void supportOpenMode;
  void supportStartOpen;
  void variant;
  void whatsAppNumber;
  void financeWhatsAppNumber;
  void defaultMessage;
  void source;
  void page;
  void product;
  void subSource;
  void leadDescription;
</script>

<FloatingSupportButton />
