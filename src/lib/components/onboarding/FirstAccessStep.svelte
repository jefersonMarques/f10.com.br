<script lang="ts">
  import ScreenshotGuideStep from "$lib/components/onboarding/ScreenshotGuideStep.svelte";
  import { provisionalAccessSlides } from "$lib/onboarding/setupGuide";

  export let onComplete: () => void = () => undefined;
</script>

<ScreenshotGuideStep
  eyebrow="Senha provisória"
  title="Faça o primeiro login com os dados do e-mail"
  description="Este primeiro login serve para confirmar seus dados e abrir a janela de criação da nova senha."
  slides={provisionalAccessSlides}
  completionLabel="A tela para criar senha apareceu"
  {onComplete}
/>
