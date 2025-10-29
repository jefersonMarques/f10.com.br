<script>
  import "../app.css";
  import Header from "$lib/components/Header.svelte";
  import Footer from "$lib/components/Footer.svelte";
</script>

<svelte:head>
  <!-- SEO global básico -->
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#ffffff" />
  <meta name="description" content="F10 Software — Plataforma completa de gestão escolar com alta performance e SEO impecável." />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="F10 Software" />
  <link rel="icon" href="/favicon.png" />
</svelte:head>

<div
  class="min-h-screen text-slate-900 flex flex-col
         bg-[#dfe1f5]/[0.20]
         backdrop-blur-[2px] supports-[backdrop-filter]:backdrop-blur-[0.5px]">

  <Header />
  <main class="flex-1">
    <slot />
  </main>
  <Footer />
</div>
