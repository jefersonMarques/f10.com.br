<script lang="ts">
  import { onMount } from "svelte";
  import {
    Check, Copy, CreditCard, LoaderCircle, QrCode, Share2,
  } from "lucide-svelte";
  import { renderPixQrCode } from "$lib/finance/financeQrCode";

  type Contract = { id: number; number: string };
  type Installment = {
    receivableId: number;
    installment: number;
    amount: string;
    dueDate: string;
    paid: boolean;
    payable: boolean;
  };
  type Pix = {
    receivableId: number;
    installment: number;
    amount: string;
    dueDate: string;
    expiresAt: string | null;
    copyPaste: string;
  };

  export let scope: "customer" | "operator";
  export let ticketId = "";

  let enabled = false;
  let allowed = true;
  let initialized = false;
  let contracts: Contract[] = [];
  let selectedContractId = 0;
  let contractsLoaded = false;
  let lookupVersion = 0;
  let document = "";
  let birth = "";
  let openInstallments: Installment[] = [];
  let paidInstallments: Installment[] = [];
  let showPaid = false;
  let pix: Pix | null = null;
  let qrSvg = "";
  let pending = "";
  let feedback = "";
  let errorMessage = "";

  $: birthRequired = document.replace(/\D/g, "").length === 11;
  $: documentValid = [11, 14].includes(document.replace(/\D/g, "").length);
  $: canIdentify = documentValid && (!birthRequired || /^\d{2}\/\d{2}\/\d{4}$/.test(birth));
  $: canConsult = Boolean(contractsLoaded && selectedContractId && canIdentify);

  onMount(() => {
    void checkAvailability();
  });

  function url(): string {
    const parameters = new URLSearchParams({ scope });
    if (scope === "operator") parameters.set("ticketId", ticketId);
    return `/api/finance/consult?${parameters.toString()}`;
  }

  function describeError(code: string): string {
    if (code === "FINANCE_RATE_LIMITED") return "Muitas consultas. Tente novamente mais tarde.";
    if (code === "FINANCE_PAYER_NOT_VALIDATED") return "Não foi possível confirmar os dados do pagador.";
    if (code === "FINANCE_DOCUMENT_INVALID" || code === "FINANCE_BIRTH_INVALID") {
      return "Confira o documento e a data de nascimento.";
    }
    if (code === "FINANCE_PIX_UNAVAILABLE") return "Este PIX não está disponível. Consulte a equipe financeira.";
    if (code === "FINANCE_CONTRACT_NOT_AUTHORIZED") return "Contrato não autorizado para este acesso.";
    return "Não foi possível consultar o Financeiro agora.";
  }

  async function checkAvailability(): Promise<void> {
    pending = "contracts";
    try {
      const response = await fetch(url(), { cache: "no-store" });
      if (response.status === 403) {
        allowed = false;
        return;
      }
      if (!response.ok) throw new Error("FINANCE_UNAVAILABLE");
      const data = await response.json() as { enabled: boolean };
      enabled = data.enabled === true;
    } catch {
      errorMessage = "Consulta financeira indisponível.";
    } finally {
      initialized = true;
      pending = "";
    }
  }

  function resetPayer(): void {
    lookupVersion += 1;
    contractsLoaded = false;
    contracts = [];
    selectedContractId = 0;
    clearSelection();
  }

  function clearSelection(): void {
    lookupVersion += 1;
    openInstallments = [];
    paidInstallments = [];
    pix = null;
    qrSvg = "";
    feedback = "";
    errorMessage = "";
  }

  async function query(
    action: "contracts" | "installments" | "pix",
    receivableId?: number,
  ): Promise<void> {
    if (!canIdentify || pending || (action !== "contracts" && !canConsult)) return;

    const activeVersion = lookupVersion;
    pending = action;
    errorMessage = "";
    feedback = "";
    if (action === "contracts") {
      contractsLoaded = false;
      contracts = [];
      selectedContractId = 0;
      openInstallments = [];
      paidInstallments = [];
      showPaid = false;
    }
    if (action !== "pix") {
      pix = null;
      qrSvg = "";
    }

    try {
      const response = await fetch("/api/finance/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          scope,
          ticketId: scope === "operator" ? ticketId : undefined,
          action,
          contractId: selectedContractId,
          receivableId,
          document: document.replace(/\D/g, ""),
          birth: birthRequired ? birth : "",
        }),
      });
      const data = await response.json() as Record<string, unknown>;
      if (activeVersion !== lookupVersion) return;
      if (!response.ok) throw new Error(String(data.error ?? "FINANCE_UNAVAILABLE"));

      if (action === "contracts") {
        contracts = Array.isArray(data.contracts) ? data.contracts as Contract[] : [];
        selectedContractId = contracts[0]?.id ?? 0;
        contractsLoaded = true;
      } else if (action === "installments") {
        openInstallments = Array.isArray(data.open) ? data.open as Installment[] : [];
        paidInstallments = Array.isArray(data.paid) ? data.paid as Installment[] : [];
      } else {
        pix = data as unknown as Pix;
        qrSvg = renderPixQrCode(pix.copyPaste);
      }
    } catch (cause) {
      if (activeVersion !== lookupVersion) return;
      errorMessage = describeError(cause instanceof Error ? cause.message : "");
      if (action === "pix") {
        pix = null;
        qrSvg = "";
      }
    } finally {
      pending = "";
    }
  }

  async function copyPix(): Promise<void> {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix.copyPaste);
      feedback = "Código PIX copiado.";
    } catch {
      feedback = "Selecione e copie o código exibido abaixo.";
    }
  }

  async function sharePix(): Promise<void> {
    if (!pix) return;
    if (!navigator.share) {
      await copyPix();
      return;
    }
    try {
      await navigator.share({
        title: "PIX F10",
        text: `PIX F10 · Parcela ${pix.installment} · ${pix.amount}\n${pix.copyPaste}`,
      });
      feedback = "Compartilhamento iniciado.";
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      feedback = "Não foi possível compartilhar. Use Copiar PIX.";
    }
  }
</script>

{#if initialized && allowed && enabled}
  <section class="mb-4 rounded-2xl border border-[#DDE2EB] bg-white p-3.5 shadow-sm" aria-label="Consulta financeira">
    <div class="flex items-center gap-2 text-[#18233D]">
      <CreditCard size={18} aria-hidden="true"/>
      <h3 class="text-[14px] font-semibold">Financeiro</h3>
    </div>

    <div class="mt-3 space-y-3">
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label class="block text-[12px] font-medium text-[#4D5769]">
          CPF/CNPJ do pagador
          <input bind:value={document} on:input={resetPayer} inputmode="numeric"
            autocomplete="off" maxlength="30" placeholder="Somente números"
            class="mt-1 h-10 w-full rounded-xl border border-[#DDE2EB] bg-white px-3 text-[13px]"/>
        </label>
        {#if birthRequired}
          <label class="block text-[12px] font-medium text-[#4D5769]">
            Data de nascimento
            <input bind:value={birth} on:input={resetPayer} placeholder="DD/MM/AAAA"
              autocomplete="off" maxlength="10"
              class="mt-1 h-10 w-full rounded-xl border border-[#DDE2EB] bg-white px-3 text-[13px]"/>
          </label>
        {/if}
      </div>
      <button type="button" disabled={!canIdentify || Boolean(pending)}
        on:click={() => void query("contracts")}
        class="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-3 text-[13px] font-semibold text-white disabled:opacity-40">
        {#if pending === "contracts"}<LoaderCircle size={16} class="animate-spin"/>{:else}<CreditCard size={16}/>{/if}
        Buscar contratos
      </button>

      {#if contractsLoaded && contracts.length === 0}
        <p role="status" class="text-[12px] text-[#747D8F]">
          A F10 não retornou contratos para os dados validados.
        </p>
      {/if}

      {#if contracts.length > 0}
        <label class="block text-[12px] font-medium text-[#4D5769]">
          Contrato
          <select bind:value={selectedContractId} on:change={clearSelection}
            class="mt-1 h-10 w-full rounded-xl border border-[#DDE2EB] bg-white px-3 text-[13px]">
            {#each contracts as contract (contract.id)}
              <option value={contract.id}>Contrato {contract.number}</option>
            {/each}
          </select>
        </label>
        <button type="button" disabled={!canConsult || Boolean(pending)}
          on:click={() => void query("installments")}
          class="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-3 text-[13px] font-semibold text-white disabled:opacity-40">
          {#if pending === "installments"}<LoaderCircle size={16} class="animate-spin"/>{:else}<CreditCard size={16}/>{/if}
          Consultar parcelas
        </button>
      {/if}

        {#if openInstallments.length > 0}
          <div class="space-y-2">
            <h4 class="text-[12px] font-semibold text-[#424D61]">Parcelas em aberto</h4>
            {#each openInstallments as installment (installment.receivableId)}
              <div class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E4E8EF] p-2.5">
                <div class="min-w-0">
                  <strong class="block text-[13px] font-semibold text-[#242C3C]">
                    {installment.amount}
                  </strong>
                  <span class="text-[12px] text-[#737C8A]">
                    Parcela {installment.installment} · {installment.dueDate}
                  </span>
                </div>
                <button type="button" disabled={!installment.payable || Boolean(pending)}
                  on:click={() => void query("pix", installment.receivableId)}
                  class="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#CCD2E0] px-3 text-[12px] font-semibold text-[#000A57] disabled:opacity-40">
                  <QrCode size={15}/> PIX
                </button>
              </div>
            {/each}
          </div>
        {:else if paidInstallments.length > 0}
          <p class="text-[12px] text-[#3C7756]">Nenhuma parcela em aberto.</p>
        {/if}

        {#if paidInstallments.length > 0}
          <button type="button" on:click={() => (showPaid = !showPaid)}
            class="text-[12px] font-semibold text-[#000A57] underline underline-offset-2">
            {showPaid ? "Ocultar pagamentos" : `Ver pagamentos (${paidInstallments.length})`}
          </button>
          {#if showPaid}
            <div class="max-h-48 space-y-1 overflow-y-auto">
              {#each paidInstallments as item (item.receivableId)}
                <div class="flex items-center justify-between gap-2 rounded-lg bg-[#F3F8F5] px-3 py-2 text-[12px] text-[#365A48]">
                  <span><Check size={13} class="inline"/> Parcela {item.installment}</span>
                  <span>{item.amount}</span>
                </div>
              {/each}
            </div>
          {/if}
        {/if}

        {#if pix}
          <div class="rounded-xl border border-[#D9E7DE] bg-[#F7FBF8] p-3">
            <div class="text-center">
              <p class="text-[13px] font-bold text-[#1A5E36]">{pix.amount}</p>
              <p class="mt-1 text-[12px] text-[#5F6D62]">
                Parcela {pix.installment} · Vencimento {pix.dueDate}
              </p>
            </div>
            <div class="mx-auto my-3 w-full max-w-[212px] rounded-xl bg-white p-2" aria-label="QR Code PIX">
              {@html qrSvg}
            </div>
            {#if pix.expiresAt}
              <p class="mb-2 text-center text-[12px] text-[#66736A]">Válido até {pix.expiresAt}</p>
            {/if}
            <textarea readonly rows="2" value={pix.copyPaste} aria-label="Código PIX Copia e Cola"
              class="w-full resize-none rounded-lg border border-[#D5DCE5] bg-white p-2 text-[12px] text-[#465265]"></textarea>
            <div class="mt-2 grid grid-cols-2 gap-2">
              <button type="button" on:click={() => void copyPix()}
                class="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-[#000A57] px-2 text-[12px] font-semibold text-white">
                <Copy size={15}/>Copiar PIX
              </button>
              <button type="button" on:click={() => void sharePix()}
                class="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#CCD2E0] bg-white px-2 text-[12px] font-semibold text-[#000A57]">
                <Share2 size={15}/>Compartilhar
              </button>
            </div>
          </div>
        {/if}
        {#if feedback}<p role="status" class="text-[12px] font-medium text-[#2F7045]">{feedback}</p>{/if}
        {#if errorMessage}<p role="alert" class="text-[12px] text-[#9B3C3C]">{errorMessage}</p>{/if}
    </div>
  </section>
{:else if initialized && allowed && errorMessage}
  <p role="status" class="mb-3 text-[12px] text-[#9B3C3C]">{errorMessage}</p>
{/if}
