(() => {
  const NOTE_INVOICE_PATH = "/solucoes/nota-fiscal";

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function isNotaFiscalElement(element) {
    const text = normalizeText(element?.textContent || "");
    return text === "nota fiscal" || text.includes("nota fiscal");
  }

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const clickedElement = target.closest("a, button, [role='button']");
      if (!clickedElement) return;
      if (!isNotaFiscalElement(clickedElement)) return;

      const currentHref = clickedElement instanceof HTMLAnchorElement
        ? clickedElement.getAttribute("href") || ""
        : "";

      if (currentHref.startsWith("http") || currentHref === NOTE_INVOICE_PATH) return;

      event.preventDefault();
      event.stopPropagation();
      window.location.assign(NOTE_INVOICE_PATH);
    },
    true,
  );
})();
