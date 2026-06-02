(() => {
  const TARGET_PATH = "/solucoes/nota-fiscal";
  const COVERAGE_ENDPOINT = "https://backend.f10.com.br/dfe/nfse/cidades-cobertura";
  const CITY_DATALIST_ID = "nfse-city-coverage-options";

  if (!window.location.pathname.startsWith(TARGET_PATH)) return;

  let coveredCities = [];
  let currentState = "";
  let requestId = 0;

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

  function setInputValue(input, value) {
    if (!(input instanceof HTMLInputElement)) return;
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
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

  function ensureDatalist() {
    let datalist = document.getElementById(CITY_DATALIST_ID);

    if (!datalist) {
      datalist = document.createElement("datalist");
      datalist.id = CITY_DATALIST_ID;
      document.body.appendChild(datalist);
    }

    datalist.replaceChildren(
      ...coveredCities.map((city) => {
        const option = document.createElement("option");
        option.value = city;
        return option;
      }),
    );

    return datalist;
  }

  function getFields() {
    const cityInput = findInputByLabel("Cidade");
    const stateInput = findInputByLabel("Estado");

    if (!(cityInput instanceof HTMLInputElement)) return null;
    if (!(stateInput instanceof HTMLInputElement)) return null;

    return { cityInput, stateInput };
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

  function setCityEnabled(enabled) {
    const fields = getFields();
    if (!fields) return;

    fields.cityInput.disabled = !enabled;
    fields.cityInput.setAttribute("list", CITY_DATALIST_ID);
    fields.cityInput.setAttribute("autocomplete", "off");

    if (!enabled) {
      fields.cityInput.placeholder = "Informe a UF primeiro";
      return;
    }

    fields.cityInput.placeholder = "Digite para encontrar a cidade";
  }

  async function loadCitiesByState(stateValue) {
    const state = normalizeState(stateValue);
    const fields = getFields();

    if (!fields) return;

    if (state.length !== 2) {
      currentState = "";
      coveredCities = [];
      ensureDatalist();
      setCityEnabled(false);
      setInputValue(fields.cityInput, "");
      clearFieldMessage();
      return;
    }

    if (state === currentState && coveredCities.length > 0) return;

    const localRequestId = ++requestId;
    currentState = state;
    coveredCities = [];
    ensureDatalist();
    setCityEnabled(false);
    setInputValue(fields.cityInput, "");
    showFieldMessage(fields.cityInput, "Buscando cidades com cobertura...");

    try {
      const params = new URLSearchParams({ uf: state });
      const response = await fetch(`${COVERAGE_ENDPOINT}?${params.toString()}`, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) throw new Error("coverage_request_failed");

      const cities = extractCityNames(await response.json());
      if (localRequestId !== requestId) return;

      coveredCities = cities;
      ensureDatalist();
      setCityEnabled(coveredCities.length > 0);

      if (coveredCities.length === 0) {
        showFieldMessage(fields.cityInput, "Nenhuma cidade com cobertura encontrada para esta UF.");
        return;
      }

      showFieldMessage(
        fields.cityInput,
        `${coveredCities.length} cidade${coveredCities.length === 1 ? "" : "s"} com cobertura disponível${coveredCities.length === 1 ? "" : "s"}.`,
      );
    } catch {
      if (localRequestId !== requestId) return;
      setCityEnabled(false);
      showFieldMessage(fields.cityInput, "Não foi possível consultar as cidades com cobertura.", "error");
    }
  }

  function normalizeSelectedCity() {
    const fields = getFields();
    if (!fields) return;

    const normalizedCity = normalizeText(fields.cityInput.value);
    const matchedCity = coveredCities.find((city) => normalizeText(city) === normalizedCity);

    if (!fields.cityInput.value.trim()) return;

    setInputValue(fields.cityInput, matchedCity || "");
  }

  function bindFields() {
    const fields = getFields();
    if (!fields || fields.stateInput.dataset.nfseCoverageBound === "true") return;

    fields.stateInput.dataset.nfseCoverageBound = "true";
    fields.cityInput.dataset.nfseCoverageBound = "true";

    fields.stateInput.addEventListener("input", () => {
      const state = normalizeState(getInputValue(fields.stateInput));
      setInputValue(fields.stateInput, state);
      void loadCitiesByState(state);
    });

    fields.cityInput.addEventListener("blur", normalizeSelectedCity);
    setCityEnabled(normalizeState(getInputValue(fields.stateInput)).length === 2 && coveredCities.length > 0);

    const initialState = normalizeState(getInputValue(fields.stateInput));
    if (initialState.length === 2) {
      void loadCitiesByState(initialState);
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
