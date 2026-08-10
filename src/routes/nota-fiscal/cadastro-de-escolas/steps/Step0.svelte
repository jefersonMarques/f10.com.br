<!-- src/routes/nota-fiscal/cadastro-de-escolas/steps/Step0.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import { formDataStore } from "../formStore";
  import {
    invoiceXmlFileStore,
    parseInvoiceXml,
    type XmlPrefillResult,
  } from "../xmlPrefill";
  import {
    CheckCircle2,
    FileUp,
    Loader2,
    MapPin,
    Sparkles,
  } from "lucide-svelte";

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

  let xmlFileInput: HTMLInputElement;
  let isReadingXml = false;
  let xmlResult: XmlPrefillResult | null = null;
  let xmlMessage = "";
  let xmlError = "";

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
      ibgeCode: xmlResult?.ibgeCode ?? "",
      provider: "",
      message: isAvailable
        ? "Sua cidade está disponível para emissão de notas fiscais. Continue o preenchimento dos dados."
        : "Sua cidade não está elegível para emissão de notas fiscais, porém você poderá prosseguir com o preenchimento dos dados.",
      checkedAt: new Date().toISOString(),
      raw: xmlResult
        ? {
            xmlKind: xmlResult.kind,
            fieldsPrefilled: xmlResult.detectedFields,
          }
        : null,
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

  function triggerXmlFileInput() {
    xmlFileInput.click();
  }

  function applyPrefillData(result: XmlPrefillResult) {
    formDataStore.update((prev) => ({
      ...prev,
      ...result.data,
      phone: result.data.phone || prev.phone,
      email: result.data.email || prev.email,
      website: prev.website,
    }));
  }

  async function processXmlFile(file: File) {
    xmlError = "";
    xmlMessage = "";
    xmlResult = null;

    if (!file.name.toLowerCase().endsWith(".xml")) {
      throw new Error("Selecione um arquivo XML original da nota fiscal.");
    }

    if (file.size > 2 * 1024 * 1024) {
      throw new Error("O XML deve ter no máximo 2 MB.");
    }

    const result = parseInvoiceXml(await file.text());
    xmlResult = result;
    applyPrefillData(result);

    const parsedState = normalizeState(String(result.data.state ?? ""));
    const parsedCity = String(result.data.city ?? "").trim();

    if (parsedState) {
      state = parsedState;
      await loadCoveredCitiesByState(parsedState);

      if (parsedCity) {
        city = findCoveredCityMatch(parsedCity) || parsedCity;
        applyCityResult();
      }
    } else if (parsedCity) {
      city = parsedCity;
    }

    xmlMessage = result.detectedFields.length
      ? `${result.kindLabel} identificado. Preenchemos ${result.detectedFields.length} informaç${result.detectedFields.length === 1 ? "ão" : "ões"} automaticamente. Revise os dados nas próximas etapas.`
      : "XML válido selecionado. Não encontramos campos compatíveis para preencher automaticamente, mas o arquivo será enviado junto com o cadastro.";
  }

  async function handleXmlFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    invoiceXmlFileStore.set(file);
    xmlError = "";
    xmlMessage = "";

    if (!file) {
      xmlResult = null;
      return;
    }

    isReadingXml = true;
    try {
      await processXmlFile(file);
    } catch (error) {
      invoiceXmlFileStore.set(null);
      xmlResult = null;
      input.value = "";
      xmlError = error instanceof Error ? error.message : "Não foi possível ler o XML.";
    } finally {
      isReadingXml = false;
    }
  }

  function removeXml() {
    invoiceXmlFileStore.set(null);
    xmlResult = null;
    xmlMessage = "";
    xmlError = "";
    if (xmlFileInput) xmlFileInput.value = "";
  }

  onMount(() => {
    const existingFile = $invoiceXmlFileStore;
    if (!existingFile) return;

    isReadingXml = true;
    void processXmlFile(existingFile)
      .catch((error) => {
        xmlError = error instanceof Error ? error.message : "Não foi possível ler o XML.";
      })
      .finally(() => {
        isReadingXml = false;
      });
  });
</script>

<div class="space-y-6">
  <div class="rounded-2xl border border-orange-200 bg-orange-50/60 p-4 sm:p-5">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-start gap-3">
        <div class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--primary)] shadow-sm ring-1 ring-orange-100">
          <Sparkles size={19} />
        </div>
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-[16px] font-semibold text-black/85">
              Preencha automaticamente usando um XML
            </h2>
            <span class="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-black/45 ring-1 ring-black/5">
              Opcional
            </span>
          </div>
          <p class="mt-1 max-w-[76ch] text-[13px] leading-relaxed text-black/60">
            Se você já emitiu uma NF-e ou NFS-e, envie o XML original. Vamos aproveitar os dados fiscais que encontrarmos para reduzir o preenchimento manual.
          </p>
        </div>
      </div>

      <div class="shrink-0">
        <input
          bind:this={xmlFileInput}
          type="file"
          class="hidden"
          accept=".xml,application/xml,text/xml"
          on:change={handleXmlFileChange}
        />
        <button
          type="button"
          class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-[13px] font-semibold text-white hover:brightness-110 disabled:opacity-60 sm:w-auto"
          on:click={triggerXmlFileInput}
          disabled={isReadingXml}
        >
          {#if isReadingXml}
            <Loader2 size={16} class="animate-spin" />
            Lendo XML...
          {:else}
            <FileUp size={16} />
            {$invoiceXmlFileStore ? "Trocar XML" : "Selecionar XML"}
          {/if}
        </button>
      </div>
    </div>

    {#if $invoiceXmlFileStore}
      <div class="mt-4 flex flex-col gap-2 rounded-xl border border-black/10 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <div class="truncate text-[13px] font-semibold text-black/75">
            {$invoiceXmlFileStore.name}
          </div>
          <div class="mt-0.5 text-[11px] text-black/45">
            Este arquivo continuará anexado e será enviado ao servidor e no e-mail de homologação.
          </div>
        </div>
        <button
          type="button"
          class="shrink-0 text-[12px] font-semibold text-black/50 underline underline-offset-4 hover:text-red-600"
          on:click={removeXml}
        >
          Remover XML
        </button>
      </div>
    {/if}

    {#if xmlMessage}
      <div class="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[12px] text-emerald-800">
        <div class="flex items-start gap-2">
          <CheckCircle2 size={16} class="mt-0.5 shrink-0" />
          <div>
            <div class="font-semibold">{xmlMessage}</div>
            {#if xmlResult && xmlResult.detectedFields.length > 0}
              <div class="mt-2 flex flex-wrap gap-1.5">
                {#each xmlResult.detectedFields.slice(0, 10) as field}
                  <span class="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-emerald-800 ring-1 ring-emerald-100">
                    {field}
                  </span>
                {/each}
                {#if xmlResult.detectedFields.length > 10}
                  <span class="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-emerald-800 ring-1 ring-emerald-100">
                    +{xmlResult.detectedFields.length - 10}
                  </span>
                {/if}
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    {#if xmlError}
      <p class="mt-3 text-[12px] font-medium text-red-600">{xmlError}</p>
    {/if}

    <p class="mt-3 text-[11px] leading-relaxed text-black/45">
      Use o XML original baixado da prefeitura, Portal Nacional ou SEFAZ. O preenchimento automático é uma ajuda: os dados devem ser revisados antes do envio.
    </p>
  </div>

  <div class="border-t border-black/10 pt-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h2 class="text-[18px] font-semibold text-black/85">
          Verifique se a cidade já está disponível para NFS-e
        </h2>
        <p class="mt-1 text-[13px] text-black/60 max-w-[80ch]">
          Se o XML trouxe a cidade, ela já aparece abaixo. Caso contrário, selecione a UF e escolha uma cidade da lista de cobertura.
        </p>
      </div>

      <div class="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 border border-orange-100 text-[var(--primary)]">
        <MapPin size={20} />
      </div>
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
