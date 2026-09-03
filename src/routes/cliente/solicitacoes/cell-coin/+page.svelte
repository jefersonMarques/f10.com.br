<script lang="ts">
  import { School, ShieldCheck } from "lucide-svelte";
  import LegacyServiceRequestSubmissionBridge from "$lib/components/serviceRequests/LegacyServiceRequestSubmissionBridge.svelte";
  import LegacyCellCoinForm from "../../../celcoin/cadastro-de-escolas/+page.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;
</script>

<svelte:head>
  <title>Solicitação CELL COIN | Área do Cliente F10</title>
  <meta name="robots" content="noindex,nofollow" />
</svelte:head>

<LegacyServiceRequestSubmissionBridge endpoint="/api/registration/submit" />

<div class="mx-auto mt-4 max-w-[1180px] px-4 sm:px-6">
  <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#DDE2EC] bg-[#F8F9FF] px-4 py-3">
    <div class="flex min-w-0 items-center gap-3"><School size={17} class="shrink-0 text-[#000A57]" /><div class="min-w-0"><span class="application-text-meta block text-[#858C9C]">Solicitação para</span><strong class="application-text-caption mt-0.5 block truncate text-[#3E4656]">{data.context.groupName} · {data.context.unitName}</strong></div></div>
    <a href="/cliente/unidade?returnTo=%2Fcliente%2Fsolicitacoes%2Fcell-coin" class="application-text-caption rounded-xl border border-[#DDE1EA] bg-white px-3 py-2 font-semibold text-[#000A57]">Trocar unidade</a>
  </div>
  <div class="application-text-caption mt-2 flex items-start gap-2 rounded-xl border border-[#DDE9E1] bg-[#F5FAF7] px-3 py-2.5 leading-5 text-[#4F6658]"><ShieldCheck size={14} class="mt-0.5 shrink-0" /><span>Os documentos são armazenados no bucket privado da solicitação. Limites atuais: <strong>10 MB por documento</strong>, <strong>5 MB para a selfie</strong> e 50 MB no total.</span></div>
</div>

<LegacyCellCoinForm />
