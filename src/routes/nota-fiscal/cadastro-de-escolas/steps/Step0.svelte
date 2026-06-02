<!-- src/routes/nota-fiscal/cadastro-de-escolas/steps/Step0.svelte -->
<script lang="ts">
  import { formDataStore } from "../formStore";
  import { CheckCircle2, Loader2, MapPin } from "lucide-svelte";

  type CityCheckStatus = "idle" | "checking" | "available" | "unavailable" | "error";
  type CityCheckResult = {
    status: CityCheckStatus;
    city: string;
    state: string;
    ibgeCode: string;
    provider: string;
    message: string;
    checkedAt: string;
    raw?: Record<string, unknown> | null;
  };

  type StateOption = {
    value: string;
    label: string;
  };

  export let cityCheckResult: CityCheckResult | null = null;
  export let onApplyResult: (result: CityCheckResult) => void = () => {};
  export let onContinue: () => void = () => {};

  let city = $formDataStore.city || "";
  let state = normalizeState($formDataStore.state || "");
  let errors: Record<string, string> = {};
  let isLoadingCoveredCities = false;
  let isCityDropdownOpen = false;
  let coveredCities: string[] = [];
  let coverageMessage = "";
  let coverageRequestId = 0;

  const stateOptions: StateOption[] = [
    { value: "AC", label: "AC" },
    { value: "AL", label: "AL" },
    { value: "AP", label: "AP" },
    { value: "AM", label: "AM" },
    { value: "BA", label: "BA" },
    { value: "CE", label: "CE" },
    { value: "DF", label: "DF" },
    { value: "ES", label: "ES" },
    { value: "GO", label: "GO" },
    { value: "MA", label: "MA" },
    { value: "MT", label: "MT" },
    { value: "MS", label: "MS" },
    { value: "MG", label: "MG" },
    { value: "PA", label: "PA" },
    { value: "PB", label: "PB" },
    { value: "PR", label: "PR" },
    { value: "PE", label: "PE" },
    { value: "PI", label: "PI" },
    { value: "RJ", label: "RJ" },
    { value: "RN", label: "RN" },
    { value: "RS", label: "RS" },
    { value: "RO", label: "RO" },
    { value: "RR", label: "RR" },
    { value: "SC", label: "SC" },
    { value: "SP", label: "SP" },
    { value: "SE", label: "SE" },
    { value: "TO", label: "TO" },
  ];

  const cityCoverageLookupUrl = (stateValue: string) =>
    `https://backend.f10.com.br/dfe/nfse/cidades-cobertura?uf=${encodeURIComponent(stateValue)}`;

  $: normalizedCitySearch = normalizeText(city);
  $: filteredCoveredCities =
    city.trim().length >= 2
      ? coveredCities
          .filter((coveredCity) => normalizeText(coveredCity).includes(normalizedCitySearch))
          .slice(0, 8)
      : [];
  $: matchedCity = findCoveredCityMatch(city);
  $: hasSelectedState = Boolean(state);
  $: hasFilledCity = Boolean(city.trim());
  $: isCityAvailable = Boolean(matchedCity);
  $: hasUnavailableCity = hasSelectedState && hasFilledCity && !isCityAvailable && !isLoadingCoveredCities;
  $: canContinue = hasSelectedState && hasFilledCity && !isLoadingCoveredCities;
  $: resultPanelClass = isCityAvailable
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : hasUnavailableCity
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-black/10 bg-black/[0.02] text-black/60";
  $: continueButtonClass = isCityAvailable
    ? "bg-emerald-700 hover:brightness-110"
    : hasUnavailableCity
      ? "bg-red-600 hover:brightness-110"
      : "bg-[var(--primary)] hover:brightness-110";
  $: shouldShowCityDropdown =
    isCityDropdownOpen &&
    Boolean(state) &&
    !isLoadingCoveredCities &&
    coveredCities.length > 0 &&
    city.trim().length >= 2;

  function normalizeState(value: string): string {
    return value.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase();
  }

  function normalizeText(value: string): string {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function extractCityNames(payload: unknown): string[] {
    const data = payload as {
      data?: unknown;
      cidades?: unknown;
      cities?: unknown;
    };

    const source = Array.isArray(payload)
      ? payload
      : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.cidades)
          ? data.cidades
          : Array.isArray(data?.cities)
            ? data.cities
            : [];

    return Array.from(
      new Set(
        source
          .map((item) => {
            if (typeof item === "string") return item.trim();
            if (!item || typeof item !== "object") return "";

            const cityRecord = item as {
              nome?: unknown;
              name?: unknown;
              cidade?: unknown;
              city?: unknown;
            };

            return String(
              cityRecord.nome ??
                cityRecord.name ??
                cityRecord.cidade ??
                cityRecord.city ??
                "",
            ).trim();
          })
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }

  function findCoveredCityMatch(value: string): string {
    const normalizedCity = normalizeText(value);
    if (!normalizedCity) return "";
    return coveredCities.find((coveredCity) => normalizeText(coveredCity) === normalizedCity) || "";
  }

  async function loadCoveredCitiesByState(stateValue: string) {
    const selectedState = normalizeState(stateValue);
    const requestId = ++coverageRequestId;

    city = "";
    coveredCities = [];
    coverageMessage = "";
    cityCheckResult = null;
    isCityDropdownOpen = false;

    if (selectedState.length !== 2) return;

    isLoadingCoveredCities = true;

    try {
      const response = await fetch(cityCoverageLookupUrl(selectedState), {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error("coverage_request_failed");
      }

      const cities = extractCityNames(await response.json());

      if (requestId !== coverageRequestId) return;

      coveredCities = cities;

      if (cities.length === 0) {
        coverageMessage = "Nenhuma cidade com cobertura encontrada para esta UF.";
      } else {
        coverageMessage = `${cities.length} cidade${cities.length === 1 ? "" : "s"} com cobertura disponível${cities.length === 1 ? "" : "s"}.`;
      }
    } catch {
      if (requestId !== coverageRequestId) return;
      coverageMessage = "Não foi possível consultar as cidades com cobertura.";
    } finally {
      if (requestId === coverageRequestId) {
        isLoadingCoveredCities = false;
      }
    }
  }

  function handleStateChange(value: string) {
    state = normalizeState(value);
    errors = { ...errors, state: "", city: "" };
    void loadCoveredCitiesByState(state);
  }

  function handleCityInput(value: string) {
    city = value;
    isCityDropdownOpen = value.trim().length >= 2;
    errors = { ...errors, city: "" };
  }

  function applyCityResult() {
    const currentMatchedCity = findCoveredCityMatch(city);
    const resolvedCity = currentMatchedCity || city.trim();
    const isAvailable = Boolean(currentMatchedCity);

    if (currentMatchedCity) {
      city = currentMatchedCity;
    }

    const result: CityCheckResult = {
      status: isAvailable ? "available" : "unavailable",
      city: resolvedCity,
      state: normalizeState(state),
      ibgeCode: "",
      provider: "",
      message: isAvailable
        ? "Sua cidade está disponível para emissão de notas fiscais. Continue o preenchimento dos dados."
        : "Sua cidade não está elegível para emissão de notas fiscais, porém você poderá prosseguir com o preenchimento dos dados.",
      checkedAt: new Date().toISOString(),
      raw: null,
    };

    onApplyResult(result);
  }

  function selectCoveredCity(coveredCity: string) {
    city = coveredCity;
    isCityDropdownOpen = false;
    errors = { ...errors, city: "" };
    applyCityResult();
  }

  function normalizeSelectedCity() {
    if (!city.trim()) {
      isCityDropdownOpen = false;
      return;
    }

    const currentMatchedCity = findCoveredCityMatch(city);

    if (currentMatchedCity) {
      city = currentMatchedCity;
    }

    applyCityResult();
    isCityDropdownOpen = false;
  }

  function validateCityFields(): boolean {
    const next: Record<string, string> = {};

    if (normalizeState(state).length !== 2) {
      next.state = "Selecione a UF.";
    }

    if (!city.trim()) {
      next.city = "Informe a cidade.";
    }

    errors = next;
    return Object.keys(next).length === 0;
  }

  function continueWithCity() {
    if (!validateCityFields()) return;

    applyCityResult();

    formDataStore.update((prev) => ({
      ...prev,
      city: city.trim() || prev.city,
      state: normalizeState(state) || prev.state,
    }));

    onContinue();
  }
</script>

<div class="space-y-6">
  <div class="flex items-start justify-between gap-4">
    <div>
      <h2 class="text-[18px] font-semibold text-black/85">
        Verifique se a cidade já está disponível para NFS-e
      </h2>
      <p class="mt-1 text-[13px] text-black/60 max-w-[80ch]">
        Selecione a UF e escolha uma cidade da lista de cobertura antes do preenchimento completo.
      </p>
    </div>

    <div class="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 border border-orange-100 text-[var(--primary)]">
      <MapPin size={20} />
    </div>
  </div>

  <div class="grid gap-4 sm:grid-cols-12">
    <div class="sm:col-span-4">
      <label for="cityCheckState" class="mb-2 block text-[12px] font-semibold text-black/70">
        UF
      </label>
      <select
        id="cityCheckState"
        class={`h-11 w-full rounded-xl border bg-white px-3 text-[14px] font-semibold uppercase outline-none ${
          errors.state ? "border-red-300" : "border-black/15"
        }`}
        value={state}
        on:change={(event) => handleStateChange((event.target as HTMLSelectElement).value)}
      >
        <option value="">Selecione</option>
        {#each stateOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
      {#if errors.state}
        <p class="mt-1 text-[12px] text-red-600">{errors.state}</p>
      {/if}
    </div>

    <div class="sm:col-span-8">
      <label for="cityCheckCity" class="mb-2 block text-[12px] font-semibold text-black/70">
        Cidade
      </label>
      <div class="relative">
        <input
          id="cityCheckCity"
          class={`h-11 w-full rounded-xl border px-3 text-[14px] font-semibold outline-none disabled:bg-black/[0.03] disabled:text-black/40 ${
            errors.city ? "border-red-300" : "border-black/15"
          }`}
          value={city}
          autocomplete="off"
          disabled={!state || isLoadingCoveredCities || coveredCities.length === 0}
          placeholder={isLoadingCoveredCities
            ? "Carregando cidades..."
            : state
              ? "Digite ao menos 2 letras"
              : "Selecione a UF primeiro"}
          on:focus={() => (isCityDropdownOpen = city.trim().length >= 2)}
          on:input={(event) => handleCityInput((event.target as HTMLInputElement).value)}
          on:blur={() => {
            setTimeout(normalizeSelectedCity, 120);
          }}
        />

        {#if isLoadingCoveredCities}
          <div class="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-black/50">
            Buscando...
          </div>
        {/if}

        {#if shouldShowCityDropdown}
          <div class="absolute left-0 right-0 top-[calc(100%+6px)] z-40 max-h-60 overflow-y-auto rounded-xl border border-black/10 bg-white p-1 shadow-xl">
            {#if filteredCoveredCities.length > 0}
              {#each filteredCoveredCities as coveredCity}
                <button
                  type="button"
                  class="block w-full rounded-lg px-3 py-2 text-left text-[14px] font-medium text-black/75 hover:bg-[var(--primary)]/10 hover:text-black"
                  on:mousedown|preventDefault={() => selectCoveredCity(coveredCity)}
                >
                  {coveredCity}
                </button>
              {/each}
            {:else}
              <div class="px-3 py-2 text-[13px] text-black/50">
                Nenhuma cidade encontrada para este termo.
              </div>
            {/if}
          </div>
        {/if}
      </div>

      {#if errors.city}
        <p class="mt-1 text-[12px] text-red-600">{errors.city}</p>
      {:else if coverageMessage}
        <p class={`mt-1 text-[12px] ${coveredCities.length > 0 ? "text-black/50" : "text-red-600"}`}>
          {coverageMessage}
        </p>
      {/if}
    </div>
  </div>

  <div class={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${resultPanelClass}`}>
    <div class="text-[13px]">
      {#if isCityAvailable}
        <span class="inline-flex items-center gap-2 font-semibold">
          <CheckCircle2 size={16} />
          Sua cidade está disponível para emissão de notas fiscais. Continue o preenchimento dos dados.
        </span>
      {:else if hasUnavailableCity}
        <span class="font-semibold">
          Sua cidade não está elegível para emissão de notas fiscais, porém você poderá prosseguir com o preenchimento dos dados.
        </span>
      {:else}
        Se a cidade aparecer na lista, ela está disponível para NFS-e.
      {/if}
    </div>

    <button
      type="button"
      class={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-[13px] font-semibold text-white disabled:opacity-60 ${continueButtonClass}`}
      on:click={continueWithCity}
      disabled={!canContinue}
    >
      {#if isLoadingCoveredCities}
        <Loader2 size={16} class="animate-spin" />
        Carregando...
      {:else if hasUnavailableCity}
        Continuar mesmo assim
      {:else}
        Continuar
      {/if}
    </button>
  </div>
</div>
