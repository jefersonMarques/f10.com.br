(() => {
  const targetPath = "/solucoes/nota-fiscal";

  if (window.location.pathname !== targetPath) {
    return;
  }

  const styleId = "nfse-success-modal-style";

  function ensureStyles() {
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      [data-nfse-success-only="true"] {
        display: flex !important;
        min-height: 360px !important;
        align-items: center !important;
        justify-content: center !important;
        text-align: center !important;
      }

      [data-nfse-success-only="true"] > :not(.nfse-success-card) {
        display: none !important;
      }

      [data-nfse-success-only="true"] .nfse-success-card {
        margin-top: 0 !important;
        width: 100% !important;
        max-width: 440px !important;
        border: 0 !important;
        background: transparent !important;
        padding: 0 !important;
      }

      [data-nfse-success-only="true"] .nfse-success-card > div {
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 0 !important;
      }

      [data-nfse-success-only="true"] .nfse-success-card svg {
        margin: 0 !important;
        width: 76px !important;
        height: 76px !important;
        border-radius: 9999px !important;
        background: #ecfdf5 !important;
        padding: 16px !important;
        color: #059669 !important;
      }

      [data-nfse-success-only="true"] .nfse-success-card p:first-child {
        margin-top: 24px !important;
        color: #010d28 !important;
        font-size: 22px !important;
        font-weight: 650 !important;
        line-height: 1.2 !important;
        letter-spacing: -0.02em !important;
      }

      [data-nfse-success-only="true"] .nfse-success-card p:last-child {
        margin-top: 12px !important;
        color: rgba(0, 10, 87, 0.72) !important;
        font-size: 15px !important;
        line-height: 1.65 !important;
      }
    `;

    document.head.appendChild(style);
  }

  function findSuccessTitle(dialog) {
    return Array.from(dialog.querySelectorAll("p")).find((element) => {
      return element.textContent?.trim() === "Solicitação enviada";
    });
  }

  function updateSuccessModal() {
    const dialogs = document.querySelectorAll('[role="dialog"]');

    dialogs.forEach((dialog) => {
      const successTitle = findSuccessTitle(dialog);
      const content = dialog.querySelector(".overflow-y-auto.overscroll-contain");

      if (!content) {
        return;
      }

      if (!successTitle) {
        content.removeAttribute("data-nfse-success-only");
        content.querySelector(".nfse-success-card")?.classList.remove("nfse-success-card");
        return;
      }

      const successCard = successTitle.closest(".rounded-2xl");

      if (!successCard) {
        return;
      }

      ensureStyles();
      content.setAttribute("data-nfse-success-only", "true");
      successCard.classList.add("nfse-success-card");
      successTitle.textContent = "Solicitação enviada com sucesso";
    });
  }

  const observer = new MutationObserver(updateSuccessModal);

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  updateSuccessModal();
})();
