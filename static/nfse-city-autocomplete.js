(() => {
  const TARGET_PATH = "/solucoes/nota-fiscal";
  const COVERAGE_ENDPOINT = "https://backend.f10.com.br/dfe/nfse/cidades-cobertura";
  const DROPDOWN_ID = "nfse-city-coverage-dropdown";

  if (!window.location.pathname.startsWith(TARGET_PATH)) return;

  let coveredCities = [];
  let currentState = "";
  let requestId = 0;
  let isDropdownOpen = false;

  function normalizeState(value) {
    return String(value || "")
      .replace(/[^a-zA-Z]/g, "")
      .slice(0, 2)
      .toUpperCase();
  }

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function getInputValue(input) {
    return input instanceof HTMLInputElement ? input.value : "";
  }

  function setInputValue(input, value, options = {}) {
    if (!(input instanceof HTMLInputElement)) return;
    if (input.value === value) return;

    input.value = value;

    if (options.dispatch === true) {
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function extractCityNames(payload) {
    const source = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.cidades)
          ? payload.cidades
          : Array.isArray(payload?.cities)
            ? payload.cities
            : [];

    return Array.from(
      new Set(
        source
          .map((item) => {
            if (typeof item === "string") return item.trim();
            if (!item || typeof item !== "object") return "";
            return String(item.nome ?? item.name ?? item.cidade ?? item.city ?? "").trim();
          })
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }

  function findInputByLabel(labelText) {
    const labels = Array.from(document.querySelectorAll("label"));
    const label = labels.find((item) => normalizeText(item.textContent).includes(normalizeText(labelText)));
    return label?.querySelector("input") || null;
  }

  function getFields() {
    const cityInput = findInputByLabel("Cidade");
    const stateInput = findInputByLabel("Estado");

    if (!(cityInput instanceof HTMLInputElement)) return null;
    if (!(stateInput instanceof HTMLInputElement)) return null;

    return { cityInput, stateInput };
  }

  function reorderLocationFields() {
    const fields = getFields();
    if (!fields) return;

    const cityLabel = fields.cityInput.closest("label");
    const stateLabel = fields.stateInput.closest("label");

    if (!cityLabel || !stateLabel || stateLabel.dataset.nfseOrderFixed === "true") return;

    cityLabel.parentElement?.insertBefore(stateLabel, cityLabel);
    stateLabel.dataset.nfseOrderFixed = "true";
  }

  function getDropdown() {
    let dropdown = document.getElementById(DROPDOWN_ID);

    if (!dropdown) {
      dropdown = document.createElement("div");
      dropdown.id = DROPDOWN_ID;
      dropdown.className = "absolute z-[2147483647] hidden max-h-60 overflow-y-auto rounded-2xl border border-black/10 bg-white p-1 shadow-2xl";
      document.body.appendChild(dropdown);
    }

    return dropdown;
  }

  function positionDropdown(cityInput) {
    const dropdown = getDropdown();
    const rect = cityInput.getBoundingClientRect();

    dropdown.style.left = `${rect.left + window.scrollX}px`;
    dropdown.style.top = `${rect.bottom + window.scrollY + 6}px`;
    dropdown.style.width = `${rect.width}px`;
  }

  function hideDropdown() {
    isDropdownOpen = false;
    getDropdown().classList.add("hidden");
  }

  function getFilteredCities(search) {
    const normalizedSearch = normalizeText(search);
    if (String(search || "").trim().length < 2) return [];
    return coveredCities
      .filter((city) => normalizeText(city).includes(normalizedSearch))
      .slice(0, 8);
  }

  function renderDropdown() {
    const fields = getFields();
    if (!fields) return;

    const dropdown = getDropdown();
    const filteredCities = getFilteredCities(fields.cityInput.value);

    dropdown.replaceChildren();

    if (
      !isDropdownOpen ||
      fields.cityInput.value.trim().length < 2 ||
      coveredCities.length === 0 ||
      filteredCities.length === 0
    ) {
      hideDropdown();
      return;
    }

    positionDropdown(fields.cityInput);

    for (const city of filteredCities) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "block w-full rounded-xl px-3 py-2 text-left text-[14px] font-medium text-slate-700 hover:bg-orange-50 hover:text-slate-950";
      button.textContent = city;
      button.addEventListener("mousedown", (event) => {
        event.preventDefault();
        setInputValue(fields.cityInput, city, { dispatch: true });
        hideDropdown();
      });
      dropdown.appendChild(button);
    }

    dropdown.classList.remove("hidden");
  }

  function showFieldMessage(cityInput, message, tone = "muted") {
    const id = "nfse-city-coverage-message";
    let element = document.getElementById(id);

    if (!element) {
      element = document.createElement("span");
      element.id = id;
      element.className = "mt-1 block text-[12px]";
      cityInput.insertAdjacentElement("afterend", element);
    }

    element.textContent = message;
    element.className = `mt-1 block text-[12px] ${tone === "error" ? "text-rose-600" : "text-slate-500"}`;
  }

  function clearFieldMessage() {
    document.getElementById("nfse-city-coverage-message")?.remove();
  }

  function setCityAutocompleteReady(isReady) {
    const fields = getFields();
    if (!fields) return;

    fields.cityInput.disabled = false;
    fields.cityInput.removeAttribute("list");
    fields.cityInput.setAttribute("autocomplete", "off");

    fields.cityInput.placeholder = isReady ? "Digite ao menos 2 letras" : "Cidade";
  }

  async function loadCitiesByState(stateValue) {
    const state = normalizeState(stateValue);
    const fields = getFields();

    if (!fields) return;

    if (state.length !== 2) {
      currentState = "";
      coveredCities = [];
      clearFieldMessage();
      hideDropdown();
      setCityAutocompleteReady(false);
      return;
    }

    if (state === currentState && coveredCities.length > 0) return;

    const localRequestId = ++requestId;
    currentState = state;
    coveredCities = [];
    showFieldMessage(fields.cityInput, "Buscando sugestões de cidades com cobertura...");

    try {
      const params = new URLSearchParams({ uf: state });
      const response = await fetch(`${COVERAGE_ENDPOINT}?${params.toString()}`, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) throw new Error("coverage_request_failed");

      const cities = extractCityNames(await response.json());
      if (localRequestId !== requestId) return;

      coveredCities = cities;
      setCityAutocompleteReady(coveredCities.length > 0);

      if (coveredCities.length === 0) {
        clearFieldMessage();
        return;
      }

      showFieldMessage(
        fields.cityInput,
        `${coveredCities.length} sugestão${coveredCities.length === 1 ? "" : "ões"} disponível${coveredCities.length === 1 ? "" : "eis"}. Você também pode preencher manualmente.`,
      );
    } catch {
      if (localRequestId !== requestId) return;
      setCityAutocompleteReady(false);
      clearFieldMessage();
    }
  }

  function closeDropdownOnly() {
    hideDropdown();
  }

  function bindFields() {
    const fields = getFields();
    if (!fields || fields.stateInput.dataset.nfseCoverageBound === "true") return;

    reorderLocationFields();

    fields.stateInput.dataset.nfseCoverageBound = "true";
    fields.cityInput.dataset.nfseCoverageBound = "true";

    fields.cityInput.removeAttribute("list");
    fields.cityInput.disabled = false;

    fields.stateInput.addEventListener("input", () => {
      const state = normalizeState(getInputValue(fields.stateInput));
      setInputValue(fields.stateInput, state);
      void loadCitiesByState(state);
    });

    fields.cityInput.addEventListener("focus", () => {
      isDropdownOpen = true;
      renderDropdown();
    });

    fields.cityInput.addEventListener("input", () => {
      isDropdownOpen = true;
      renderDropdown();
    });

    fields.cityInput.addEventListener("blur", () => {
      setTimeout(closeDropdownOnly, 120);
    });

    window.addEventListener("resize", renderDropdown, { passive: true });
    window.addEventListener("scroll", renderDropdown, { passive: true });

    document.addEventListener("click", (event) => {
      const dropdown = getDropdown();
      if (!(event.target instanceof Node)) return;
      if (dropdown.contains(event.target) || fields.cityInput.contains(event.target)) return;
      hideDropdown();
    });

    const initialState = normalizeState(getInputValue(fields.stateInput));
    if (initialState.length === 2) {
      void loadCitiesByState(initialState);
    } else {
      setCityAutocompleteReady(false);
    }
  }

  const observer = new MutationObserver(bindFields);
  observer.observe(document.body, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindFields, { once: true });
  } else {
    bindFields();
  }
})();
