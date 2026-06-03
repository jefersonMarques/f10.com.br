<slot />

<style>
  :global([role="dialog"] .overflow-y-auto:has(.border-emerald-200.bg-emerald-50)) {
    display: flex;
    min-height: 360px;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  :global([role="dialog"] .overflow-y-auto:has(.border-emerald-200.bg-emerald-50) > :not(.border-emerald-200.bg-emerald-50)) {
    display: none !important;
  }

  :global([role="dialog"] .overflow-y-auto:has(.border-emerald-200.bg-emerald-50) .border-emerald-200.bg-emerald-50) {
    margin-top: 0;
    max-width: 440px;
    border: 0;
    background: transparent;
    padding: 0;
  }

  :global([role="dialog"] .overflow-y-auto:has(.border-emerald-200.bg-emerald-50) .border-emerald-200.bg-emerald-50 > div) {
    flex-direction: column;
    align-items: center;
    gap: 0;
  }

  :global([role="dialog"] .overflow-y-auto:has(.border-emerald-200.bg-emerald-50) .border-emerald-200.bg-emerald-50 svg) {
    margin: 0;
    width: 76px;
    height: 76px;
    border-radius: 9999px;
    background: #ecfdf5;
    padding: 16px;
    color: #059669;
  }

  :global([role="dialog"] .overflow-y-auto:has(.border-emerald-200.bg-emerald-50) .border-emerald-200.bg-emerald-50 p:first-child) {
    margin-top: 24px;
    color: #010d28;
    font-size: 0;
    font-weight: 650;
    line-height: 1.2;
    letter-spacing: -0.02em;
  }

  :global([role="dialog"] .overflow-y-auto:has(.border-emerald-200.bg-emerald-50) .border-emerald-200.bg-emerald-50 p:first-child::after) {
    content: "Solicitação enviada com sucesso";
    font-size: 22px;
  }

  :global([role="dialog"] .overflow-y-auto:has(.border-emerald-200.bg-emerald-50) .border-emerald-200.bg-emerald-50 p:last-child) {
    margin-top: 12px;
    color: rgba(0, 10, 87, 0.72);
    font-size: 15px;
    line-height: 1.65;
  }
</style>
