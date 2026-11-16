<script lang="ts">
  import { onMount } from "svelte";
  import {
    ArrowLeft, Check, ChevronRight, Copy, CreditCard, ExternalLink, LoaderCircle, QrCode, RefreshCw, Share2,
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
  let installmentsLoaded = false;
  let lookupVersion = 0;
  let openInstallments: Installment[] = [];
  let paidInstallments: Installment[] = [];
  let showPaid = false;
  let pix: Pix | null = null;
  let qrSvg = "";
  let pending = "";
  let feedback = "";
  let errorMessage = "";

  $: canConsult = Boolean(contractsLoaded && selectedContractId);

  onMount(() => {
    void loadContracts();
  });

  function url(): string {
    const parameters = new URLSearchParams({ scope });
    if (scope === "operator") parameters.set("ticketId", ticketId);
    return `/api/finance/consult?${parameters.toString()}`;
  }

  function describeError(code: string): string {
    if (code === "FINANCE_RATE_LIMITED") return "Muitas consultas. Tente novamente mais tarde.";
    if (code === "FINANCE_RESPONSE_INVALID") return "Não foi possível carregar as parcelas. Tente novamente.";
    if (code === "FINANCE_BACKEND_UNAVAILABLE") return "O serviço financeiro está temporariamente indisponível.";
    if (code === "FINANCE_PAYER_NOT_VALIDATED") return "Não foi possível confirmar os dados do pagador.";
    if (code === "FINANCE_PIX_UNAVAILABLE") return "Este PIX não está disponível. Consulte a equipe financeira.";
    if (code === "FINANCE_CONTRACT_NOT_AUTHORIZED") return "Contrato não autorizado para este acesso.";
    if (code === "FINANCE_COMPANY_AMBIGUOUS") return "Há mais de uma empresa vinculada. Fale com a equipe financeira.";
    if (code === "FINANCE_COMPANY_UNRESOLVED" || code === "FINANCE_COMPANY_NOT_LINKED") return "Não foi possível identificar a empresa para esta unidade. Fale com a equipe financeira.";
    return "Não foi possível consultar o Financeiro agora.";
  }

  async function loadContracts(): Promise<void> {
    pending = "contracts";
    errorMessage = "";
    try {
      const response = await fetch(url(), { cache: "no-store" });
      if (response.status === 403) {
        allowed = false;
        return;
      }
      const data = await response.json() as {
        enabled?: boolean;
        contracts?: Contract[];
        open?: Installment[];
        paid?: Installment[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "FINANCE_UNAVAILABLE");
      enabled = data.enabled === true;
      contracts = Array.isArray(data.contracts) ? data.contracts : [];
      selectedContractId = contracts[0]?.id ?? 0;
      contractsLoaded = enabled;

      if (scope === "customer" && enabled) {
        openInstallments = Array.isArray(data.open) ? data.open : [];
        installmentsLoaded = true;
      }
    } catch (cause) {
      errorMessage = describeError(cause instanceof Error ? cause.message : "");
    } finally {
      initialized = true;
      pending = "";
    }
  }

  function returnToOpenInstallments(): void {
    pix = null;
    qrSvg = "";
    errorMessage = "";
  }

  function clearSelection(): void {
    lookupVersion += 1;
    openInstallments = [];
    paidInstallments = [];
    pix = null;
    qrSvg = "";
    installmentsLoaded = false;
    feedback = "";
    errorMessage = "";
  }

  async function query(
    action: "installments" | "pix",
    receivableId?: number,
  ): Promise<void> {
    if (!canConsult || pending) return;

    const activeVersion = lookupVersion;
    pending = action;
    errorMessage = "";
    feedback = "";
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
        }),
      });
      const data = await response.json() as Record<string, unknown>;
      if (activeVersion !== lookupVersion) return;
      if (!response.ok) throw new Error(String(data.error ?? "FINANCE_UNAVAILABLE"));

      if (action === "installments") {
        openInstallments = Array.isArray(data.open) ? data.open as Installment[] : [];
        paidInstallments = Array.isArray(data.paid) ? data.paid as Installment[] : [];
        installmentsLoaded = true;
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
      {#if contractsLoaded && contracts.length === 0}
        <p role="status" class="text-[12px] text-[#747D8F]">
          Nenhum contrato financeiro foi encontrado para esta empresa.
        </p>
      {/if}

      {#if scope === "operator" && contracts.length > 0}
        {#if contracts.length > 1}
          <label class="block text-[13px] font-medium text-[#4D5769]">
            Contrato
            <select bind:value={selectedContractId} on:change={clearSelection}
              class="mt-1 h-10 w-full rounded-xl border border-[#DDE2EB] bg-white px-3 text-[13px]">
              {#each contracts as contract (contract.id)}
                <option value={contract.id}>Contrato {contract.number}</option>
              {/each}
            </select>
          </label>
        {/if}
        <button type="button" disabled={!canConsult || Boolean(pending)}
          on:click={() => void query("installments")}
          class="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-3 text-[13px] font-semibold text-white disabled:opacity-40">
          {#if pending === "installments"}<LoaderCircle size={16} class="animate-spin"/>{:else}<CreditCard size={16}/>{/if}
          Consultar parcelas
        </button>
      {/if}

        {#if scope === "customer" && pix}
          <button type="button" on:click={returnToOpenInstallments}
            class="inline-flex min-h-9 items-center gap-2 text-[13px] font-semibold text-[#000A57]">
            <ArrowLeft size={16}/> Voltar às parcelas
          </button>
        {/if}

        {#if openInstallments.length > 0 && (scope === "operator" || !pix)}
          <div class="space-y-2">
            <h4 class="text-[13px] font-semibold text-[#424D61]">Parcelas em aberto</h4>
            {#each openInstallments as installment (installment.receivableId)}
              {#if scope === "customer"}
                <button type="button"
                  disabled={!installment.payable || Boolean(pending)}
                  on:click={() => void query("pix", installment.receivableId)}
                  class="flex min-h-[64px] w-full items-center gap-3 rounded-xl border border-[#E2E7EF] bg-white px-3 py-3 text-left transition hover:border-[#AFB9D1] hover:bg-[#F6F8FC] disabled:cursor-not-allowed disabled:opacity-60">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EDF0FA] text-[#000A57]">
                    <CreditCard size={17} aria-hidden="true"/>
                  </span>
                  <span class="min-w-0 flex-1">
                    <strong class="block text-[13px] font-semibold text-[#18233D]">
                      Parcela {installment.installment}
                    </strong>
                    <span class="mt-0.5 block text-[12px] text-[#747D8F]">
                      {installment.amount} · {installment.dueDate || "Vencimento não informado"}
                    </span>
                    {#if !installment.payable}
                      <span class="block text-[12px] text-[#9B3C3C]">PIX indisponível</span>
                    {/if}
                  </span>
                  {#if pending === "pix"}
                    <LoaderCircle size={16} class="shrink-0 animate-spin text-[#000A57]"/>
                  {:else}
                    <ChevronRight size={18} class="shrink-0 text-[#8D97AA]"/>
                  {/if}
                </button>
              {:else}
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
              {/if}
            {/each}
          </div>
        {:else if installmentsLoaded && openInstallments.length === 0}
          <p class="text-[13px] text-[#3C7756]">Nenhuma parcela em aberto.</p>
        {/if}

        {#if scope === "operator" && paidInstallments.length > 0}
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
        {#if scope === "customer"}
          <a href="/api/finance/portal" target="_blank" rel="noopener noreferrer"
            class="flex min-h-[60px] w-full items-center gap-3 rounded-xl border border-[#DDE2EB] bg-white px-3 py-3 text-left transition hover:border-[#A8B4D7] hover:bg-[#F5F7FC]">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EDF0FA] text-[#000A57]">
              <ExternalLink size={17} aria-hidden="true"/>
            </span>
            <span class="min-w-0 flex-1">
              <strong class="block text-[13px] font-semibold text-[#000A57]">Ver todas</strong>
              <span class="block text-[12px] text-[#747D8F]">Todas as parcelas no painel financeiro</span>
            </span>
            <ChevronRight size={18} class="shrink-0 text-[#8D97AA]"/>
          </a>
        {/if}
        {#if feedback}<p role="status" class="text-[12px] font-medium text-[#2F7045]">{feedback}</p>{/if}
        {#if errorMessage}<p role="alert" class="text-[12px] text-[#9B3C3C]">{errorMessage}</p>{/if}
    </div>
  </section>
{:else if initialized && allowed && errorMessage}
  <div class="mb-3 flex items-center justify-between gap-2 rounded-xl border border-[#DDE2EB] bg-white p-3">
    <p role="alert" class="text-[13px] text-[#9B3C3C]">{errorMessage}</p>
    <button type="button" on:click={() => void loadContracts()} disabled={Boolean(pending)}
      class="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#CCD2E0] px-2.5 text-[12px] font-semibold text-[#000A57] disabled:opacity-50">
      <RefreshCw size={14}/> Tentar novamente
    </button>
  </div>
{:else if pending === "contracts" && allowed}
  <p role="status" class="mb-3 inline-flex items-center gap-2 text-[13px] text-[#5C6575]">
    <LoaderCircle size={16} class="animate-spin"/> Buscando parcelas...
  </p>
{/if}
