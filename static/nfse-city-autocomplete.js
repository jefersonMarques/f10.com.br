(() => {
  const TARGET_PATH = "/solucoes/nota-fiscal";
  const COVERAGE_ENDPOINT = "https://backend.f10.com.br/dfe/nfse/cidades-cobertura";
  const CHECK_ENDPOINT = "/api/nfse/nfse-city-check";
  const SUBMIT_ENDPOINT = "/api/nfse/nfse-interest/submit";
  const DROPDOWN_ID = "nfse-city-coverage-dropdown";
  const RESULT_ID = "nfse-lead-eligibility-result";

  if (!window.location.pathname.startsWith(TARGET_PATH)) return;

  let coveredCities = [];
  let currentState = "";
  let requestId = 0;
  let isDropdownOpen = false;
  let isLeadSubmitting = false;

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

  function normalizeWhitespace(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function isEmailValid(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  function getPlural(value, singular, plural) {
    return value === 1 ? singular : plural;
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

  function getLeadFields() {
    const nameInput = findInputByLabel("Nome");
    const emailInput = findInputByLabel("E-mail");
    const whatsappInput = findInputByLabel("WhatsApp");
    const schoolNameInput = findInputByLabel("Nome da escola");
    const cityInput = findInputByLabel("Cidade");
    const stateInput = findInputByLabel("Estado");

    if (!(nameInput instanceof HTMLInputElement)) return null;
    if (!(emailInput instanceof HTMLInputElement)) return null;
    if (!(whatsappInput instanceof HTMLInputElement)) return null;
    if (!(schoolNameInput instanceof HTMLInputElement)) return null;
    if (!(cityInput instanceof HTMLInputElement)) return null;
    if (!(stateInput instanceof HTMLInputElement)) return null;

    return { nameInput, emailInput, whatsappInput, schoolNameInput, cityInput, stateInput };
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
    } catch {
      if (localRequestId !== requestId) return;
      setCityAutocompleteReady(false);
      clearFieldMessage();
    }
  }

  function closeDropdownOnly() {
    hideDropdown();
  }

  function clearLeadErrors() {
    document.querySelectorAll("[data-nfse-lead-error]").forEach((element) => element.remove());
  }

  function showLeadError(input, message) {
    const label = input.closest("label");
    if (!label) return;

    const element = document.createElement("span");
    element.dataset.nfseLeadError = "true";
    element.className = "mt-1 block text-[12px] text-rose-600";
    element.textContent = message;
    label.appendChild(element);
  }

  function validateLeadFields(fields) {
    clearLeadErrors();

    const values = {
      name: normalizeWhitespace(fields.nameInput.value),
      email: fields.emailInput.value.trim(),
      whatsapp: normalizeWhitespace(fields.whatsappInput.value),
      schoolName: normalizeWhitespace(fields.schoolNameInput.value),
      city: normalizeWhitespace(fields.cityInput.value),
      state: normalizeState(fields.stateInput.value),
    };

    let isValid = true;

    if (!values.name) {
      showLeadError(fields.nameInput, "Informe o nome.");
      isValid = false;
    }

    if (!isEmailValid(values.email)) {
      showLeadError(fields.emailInput, "Informe um e-mail válido.");
      isValid = false;
    }

    if (!values.whatsapp) {
      showLeadError(fields.whatsappInput, "Informe o WhatsApp.");
      isValid = false;
    }

    if (!values.schoolName) {
      showLeadError(fields.schoolNameInput, "Informe o nome da escola.");
      isValid = false;
    }

    if (!values.city) {
      showLeadError(fields.cityInput, "Informe a cidade.");
      isValid = false;
    }

    if (values.state.length !== 2) {
      showLeadError(fields.stateInput, "Informe a UF com 2 letras.");
      isValid = false;
    }

    return { isValid, values };
  }

  function renderLeadResult(result) {
    const fields = getLeadFields();
    if (!fields) return;

    let container = document.getElementById(RESULT_ID);
    const fieldsGrid = fields.cityInput.closest(".grid");
    const isAvailable = result.status === "available";
    const isError = result.status === "error";

    if (!container) {
      container = document.createElement("div");
      container.id = RESULT_ID;
      fieldsGrid?.insertAdjacentElement("afterend", container);
    }

    const theme = isAvailable
      ? {
          wrapper: "mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4",
          icon: "text-emerald-700 bg-emerald-100",
          title: "Sua cidade está elegível para emissão de notas fiscais",
          text: "A equipe F10 recebeu seus dados e poderá orientar os próximos passos sobre o recurso.",
          textClass: "text-emerald-800",
          titleClass: "text-emerald-900",
        }
      : {
          wrapper: "mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4",
          icon: "text-rose-700 bg-rose-100",
          title: isError ? "Não foi possível verificar sua cidade agora" : "Sua cidade ainda não está elegível para emissão de notas fiscais",
          text: isError
            ? "Mesmo assim, seus dados foram enviados para a equipe F10 avaliar o interesse no recurso."
            : "Seus dados foram enviados para a equipe F10 acompanhar o interesse e avaliar a disponibilidade do recurso.",
          textClass: "text-rose-800",
          titleClass: "text-rose-900",
        };

    container.className = theme.wrapper;
    container.innerHTML = `
      <div class="flex gap-3">
        <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${theme.icon}">${isAvailable ? "✓" : "!"}</div>
        <div>
          <p class="text-[14px] font-semibold ${theme.titleClass}">${theme.title}</p>
          <p class="mt-1 text-[13px] leading-relaxed ${theme.textClass}">${theme.text}</p>
          <p class="mt-2 text-[12px] leading-relaxed ${theme.textClass}">Cidade: <strong>${result.city}</strong> / ${result.state}</p>
        </div>
      </div>
    `;
  }

  async function notifyTeam(values, cityCheckResult) {
    const payload = {
      submissionKind: "nfse_interest_lead",
      submittedAt: new Date().toISOString(),
      city: cityCheckResult.city,
      state: cityCheckResult.state,
      ibgeCode: cityCheckResult.ibgeCode || "",
      cityCheckStatus: cityCheckResult.status,
      cityCheckMessage: cityCheckResult.message,
      cityCheckCheckedAt: cityCheckResult.checkedAt,
      name: values.name,
      email: values.email,
      whatsapp: values.whatsapp,
      schoolName: values.schoolName,
    };

    const response = await fetch(SUBMIT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.message || "Não foi possível enviar os dados para a equipe F10.");
    }
  }

  function findLeadSubmitButton(target) {
    if (!(target instanceof Element)) return null;
    const button = target.closest("button");
    if (!(button instanceof HTMLButtonElement)) return null;
    const text = normalizeText(button.textContent);
    return text.includes("verificar minha cidade") ? button : null;
  }

  async function handleLeadSubmit(event) {
    const button = findLeadSubmitButton(event.target);
    if (!button) return;

    const fields = getLeadFields();
    if (!fields) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (isLeadSubmitting) return;

    const { isValid, values } = validateLeadFields(fields);
    if (!isValid) return;

    isLeadSubmitting = true;
    const originalHtml = button.innerHTML;
    button.disabled = true;
    button.innerHTML = "Verificando e enviando...";

    try {
      const params = new URLSearchParams({ city: values.city, state: values.state });
      const checkResponse = await fetch(`${CHECK_ENDPOINT}?${params.toString()}`);
      const data = await checkResponse.json().catch(() => null);

      if (!checkResponse.ok) {
        throw new Error(data?.message || "Não foi possível verificar a cidade agora.");
      }

      const cityCheckResult = {
        status: data.available ? "available" : "unavailable",
        city: data.city || values.city,
        state: data.state || values.state,
        ibgeCode: data.ibgeCode || "",
        provider: data.provider || "",
        message: data.message || "Verificação concluída.",
        checkedAt: data.checkedAt || new Date().toISOString(),
        raw: data.raw || null,
      };

      await notifyTeam(values, cityCheckResult);
      renderLeadResult(cityCheckResult);
    } catch (error) {
      const fallbackResult = {
        status: "error",
        city: values.city,
        state: values.state,
        ibgeCode: "",
        provider: "",
        message: error instanceof Error ? error.message : "Não foi possível verificar a cidade agora.",
        checkedAt: new Date().toISOString(),
        raw: null,
      };

      try {
        await notifyTeam(values, fallbackResult);
      } catch {
        // pt-BR: O resultado visual permanece mesmo quando a notificação falha.
      }

      renderLeadResult(fallbackResult);
    } finally {
      isLeadSubmitting = false;
      button.disabled = false;
      button.innerHTML = originalHtml;
    }
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

  document.addEventListener("click", handleLeadSubmit, true);

  const observer = new MutationObserver(bindFields);
  observer.observe(document.body, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindFields, { once: true });
  } else {
    bindFields();
  }
})();
