<script lang="ts">
  import ScreenshotGuideStep from "$lib/components/onboarding/ScreenshotGuideStep.svelte";
  import { finalAccessSlides } from "$lib/onboarding/setupGuide";
</script>

<ScreenshotGuideStep
  eyebrow="Acesso definitivo"
  title="Entre novamente com a nova senha"
  description="A tela recarregou de propósito. Repita o login, mas agora utilize a senha pessoal que acabou de criar."
  slides={finalAccessSlides}
/>
