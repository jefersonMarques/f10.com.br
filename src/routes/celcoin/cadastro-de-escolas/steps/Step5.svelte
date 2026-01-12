<script lang="ts">
  import type { ContractState } from "$lib/types/celcoinSchoolRegistration";
  import { browser } from "$app/environment";
  import { onMount } from "svelte";

  export let contract: ContractState;
  export let setContractAccepted: (next: boolean) => void;

  export let clientLegalName: string | null = null;
  export let clientCnpj: string | null = null;

  export let contractTemplate: string;
  // ==============================
  // Utils
  // ==============================
  function onlyDigits(value: string) {
    return value.replace(/\D+/g, "");
  }

  function safeTrim(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
  }

  function escapeHtml(s: string) {
    return s
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function buildContractText(): string {
    const legalName = safeTrim(clientLegalName) || "NÃO INFORMADO";
    const cnpjDigits = onlyDigits(clientCnpj ?? "");
    const cnpj = cnpjDigits || "NÃO INFORMADO";

    const city = "Curitiba";
    const date = new Date();

    return contractTemplate
      .replaceAll("{{CLIENT_LEGAL_NAME}}", legalName)
      .replaceAll("{{CLIENT_CNPJ}}", cnpj)
      .replaceAll("{{TERM_CITY}}", city)
      .replaceAll("{{TERM_DATE_LONG}}", date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }));
  }

  let contractText = "";

  // Sempre atualiza quando nome/cnpj mudar
  $: contractText = buildContractText();

  // ==============================
  // Nova aba (HTML imprimível)
  // ==============================
  function openContractHtmlInNewTab() {
    const title = (contract?.title ?? "Contrato").trim() || "Contrato";

    const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif; padding:24px; color:#111;}
    h1{font-size:20px; margin:0 0 12px;}
    .muted{color:#555; font-size:12px; margin-bottom:16px;}
    pre{white-space:pre-wrap; line-height:1.45; font-size:13px; color:#222;}
    @media print { body{padding:0} }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="muted">Documento exibido a partir do Step 5 (texto fixo)</div>
  <pre>${escapeHtml(contractText)}</pre>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  // ==============================
  // Debug (opcional)
  // ==============================
  let debugEnabled = false;

  onMount(() => {
    debugEnabled = new URLSearchParams(window.location.search).has("debugStep5");

    if (browser) {
      (window as any).__STEP5__ = {
        contract,
        clientLegalName,
        clientCnpj,
        contractTextPreview: contractText.slice(0, 200),
        pdfUrlIgnored: contract?.pdfUrl ?? null,
        file: "steps/Step5.svelte",
      };
    }

    if (debugEnabled) {
      // eslint-disable-next-line no-alert
      alert("✅ Step5 montou (debugStep5=1). Veja window.__STEP5__ no console.");
    }
  });
</script>

<div>
  {#if debugEnabled}
    <div class="mb-4 rounded-xl border border-black/10 bg-yellow-50 p-3 text-[12px] text-black/70">
      <div><b>Step5 DEBUG</b></div>
      <div>pdfUrl (ignorado): {contract?.pdfUrl ? "sim" : "não"}</div>
      <div>clientLegalName: {clientLegalName ?? "(null)"}</div>
      <div>clientCnpj: {clientCnpj ?? "(null)"}</div>
      <div>window.__STEP5__ disponível no console</div>
    </div>
  {/if}

  <h2 class="text-[18px] font-semibold text-[var(--primary)]">Contrato e aceite</h2>

  <div class="mt-4 rounded-2xl border border-black/10 bg-white p-5">
    <p class="text-[13px] text-black/65">
      Leia o contrato abaixo e confirme o aceite para finalizar.
    </p>

    <div class="mt-4 flex items-center justify-between gap-3">
      <p class="text-[12px] text-black/60">Visualização por texto (fixo no Step 5)</p>
      <button
        type="button"
        class="text-[12px] font-semibold underline text-[var(--primary)]"
        on:click={openContractHtmlInNewTab}
      >
        Abrir em nova aba
      </button>
    </div>

    <div class="mt-3 rounded-2xl border border-black/10 bg-black/[0.02] p-4 max-h-[65vh] overflow-auto">
      <pre class="whitespace-pre-wrap text-[12px] leading-relaxed text-black/70 font-sans">
{contractText}
      </pre>
    </div>

    <div class="mt-4 flex items-start gap-3">
      <input
        id="contractAccepted"
        type="checkbox"
        checked={contract.accepted}
        on:change={(e) => setContractAccepted((e.currentTarget as HTMLInputElement).checked)}
        class="mt-1 h-5 w-5 rounded border-black/30"
      />

      <label for="contractAccepted" class="text-[13px] text-black/75">
        Li e aceito o contrato de adesão e o adendo de termos de uso.
        <button
          type="button"
          class="underline text-[var(--primary)] ml-1"
          on:click={openContractHtmlInNewTab}
        >
          Abrir em nova aba
        </button>
      </label>
    </div>

    {#if contract.error}
      <p class="mt-2 text-[12px] text-red-600">{contract.error}</p>
    {/if}

    {#if contract.acceptedAt}
      <p class="mt-2 text-[12px] text-black/50">
        Aceito em: {new Date(contract.acceptedAt).toLocaleString("pt-BR")}
      </p>
    {/if}
  </div>
</div>
