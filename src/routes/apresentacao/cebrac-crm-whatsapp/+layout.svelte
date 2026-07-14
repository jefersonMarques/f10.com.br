<svelte:head>
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="F10 Software" />
  <meta property="og:title" content="CRM e WhatsApp integrados | Rede Cebrac + F10" />
  <meta
    property="og:description"
    content="Uma nova rotina comercial para acompanhar leads até a matrícula e manter o relacionamento com alunos dentro do F10."
  />
  <meta property="og:url" content="https://f10.com.br/apresentacao/cebrac-crm-whatsapp" />
  <meta property="og:image" content="https://f10.com.br/cebrac-crm-whatsapp-og.jpg" />
  <meta property="og:image:secure_url" content="https://f10.com.br/cebrac-crm-whatsapp-og.jpg" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="600" />
  <meta property="og:image:height" content="315" />
  <meta
    property="og:image:alt"
    content="CRM e WhatsApp integrados para a Rede Cebrac e F10"
  />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="CRM e WhatsApp integrados | Rede Cebrac + F10" />
  <meta
    name="twitter:description"
    content="Uma nova rotina comercial para acompanhar leads até a matrícula e manter o relacionamento com alunos dentro do F10."
  />
  <meta name="twitter:image" content="https://f10.com.br/cebrac-crm-whatsapp-og.jpg" />
</svelte:head>

<div class="cebrac-presentation-route">
  <slot />
</div>

<style>
  :global(.cebrac-presentation-route .presentation-page > section:first-child) {
    background-image: url('/background-hero-cebrac.png');
    background-position: center;
    background-repeat: no-repeat;
    background-size: cover;
  }

  :global(.cebrac-presentation-route .presentation-page > section:first-child > div:first-child) {
    display: none;
  }

  :global(.cebrac-presentation-route .presentation-page > section:first-child > div:nth-child(2) > div > div:nth-child(2)) {
    isolation: isolate;
  }

  :global(.cebrac-presentation-route .presentation-page > section:first-child > div:nth-child(2) > div > div:nth-child(2) > *) {
    display: none !important;
  }

  :global(.cebrac-presentation-route .presentation-page > section:first-child > div:nth-child(2) > div > div:nth-child(2)::after) {
    background-image: url('/hero-cebrac.webp');
    background-position: center;
    background-repeat: no-repeat;
    background-size: contain;
    content: '';
    filter: drop-shadow(0 30px 45px rgba(15, 35, 75, 0.22));
    inset: 3% -4% 1% -4%;
    pointer-events: none;
    position: absolute;
    z-index: 10;
  }

  @media (max-width: 1023px) {
    :global(.cebrac-presentation-route .presentation-page > section:first-child > div:nth-child(2) > div > div:nth-child(2)::after) {
      inset: 8% 0 4%;
    }
  }
</style>
