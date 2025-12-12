<script lang="ts">
  import Hero from "$lib/components/Hero.svelte";
  import Benefits from "$lib/components/Benefits.svelte";
  import Solutions from "$lib/components/Solutions.svelte";
  import Testimonials from "$lib/components/Testimonials.svelte";
  import BlogSection from "$lib/components/BlogSection.svelte";
</script>

<svelte:head>
  <title>F10 Software — Gestão escolar moderna e performática</title>
  <meta
    name="description"
    content="Plataforma completa de gestão escolar: acadêmico, financeiro, CRM, marketing e aplicativo white-label. Performance, SEO e conversão."
  />
  <meta
    property="og:title"
    content="F10 Software — Gestão escolar moderna e performática"
  />
  <meta
    property="og:description"
    content="Plataforma completa de gestão escolar com performance máxima e SEO preparado para Google e LLMs."
  />
</svelte:head>

<Hero />
<Benefits />
<Testimonials />
<Solutions />
<BlogSection />


