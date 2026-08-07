<script lang="ts">
  import ScreenshotGuideStep from "$lib/components/onboarding/ScreenshotGuideStep.svelte";
  import { installationSlides } from "$lib/onboarding/setupGuide";

  export let onComplete: () => void = () => undefined;
</script>

<ScreenshotGuideStep
  eyebrow="Instalação guiada"
  title="Instale o F10 seguindo as imagens"
  description="Faça no computador o que aparece em cada imagem. Use os botões para avançar pelas orientações."
  slides={installationSlides}
  completionLabel="Concluí a instalação"
  {onComplete}
/>
