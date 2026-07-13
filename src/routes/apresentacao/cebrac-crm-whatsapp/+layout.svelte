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
