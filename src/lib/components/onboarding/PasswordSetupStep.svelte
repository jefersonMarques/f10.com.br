<script lang="ts">
  import ScreenshotGuideStep from "$lib/components/onboarding/ScreenshotGuideStep.svelte";
  import { passwordSetupSlides } from "$lib/onboarding/setupGuide";
</script>

<ScreenshotGuideStep
  eyebrow="Troca obrigatória"
  title="Crie uma nova senha pessoal"
  description="A senha provisória funciona somente para iniciar o primeiro acesso. Depois de criar a nova senha, o F10 voltará para a tela de login."
  slides={passwordSetupSlides}
/>
