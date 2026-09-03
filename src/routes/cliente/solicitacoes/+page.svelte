<script lang="ts">
  import { ArrowRight, Coins, FileText, School } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;
</script>

<svelte:head>
  <title>Solicitações | Área do Cliente F10</title>
  <meta name="robots" content="noindex,nofollow" />
</svelte:head>

<ApplicationContent width="standard" className="pb-10">
  <section class="rounded-[24px] border border-[#E1E4EC] bg-white p-5 shadow-[0_10px_32px_rgba(1,13,40,0.04)] sm:p-7">
    <p class="application-text-caption font-bold uppercase tracking-[0.1em] text-[#EA6D0B]">Serviços F10</p>
    <h1 class="mt-2 text-[26px] font-semibold tracking-[-0.035em] text-[#010D28]">Nova solicitação</h1>
    <p class="mt-2 max-w-[700px] text-[12px] leading-5 text-[#747C8D]">Abra uma solicitação estruturada para a unidade selecionada. Após o envio, um ticket é criado automaticamente e todo o acompanhamento continua pela Área do Cliente.</p>

    <div class="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E5E8EF] bg-[#FAFBFC] px-4 py-3">
      <div class="flex min-w-0 items-center gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><School size={18} /></span>
        <div class="min-w-0"><span class="application-text-meta block text-[#9298A5]">Unidade selecionada</span><strong class="mt-0.5 block truncate text-[12px] text-[#424A5B]">{data.context.groupName} · {data.context.unitName}</strong></div>
      </div>
      <a href="/cliente/unidade?returnTo=%2Fcliente%2Fsolicitacoes" class="application-text-caption rounded-xl border border-[#DDE1E9] bg-white px-3 py-2 font-semibold text-[#000A57]">Trocar unidade</a>
    </div>
  </section>

  <div class="mt-5 grid gap-4 md:grid-cols-2">
    <a href="/cliente/solicitacoes/nota-fiscal" class="group flex min-h-[220px] flex-col rounded-[24px] border border-[#E1E4EC] bg-white p-6 shadow-[0_8px_28px_rgba(1,13,40,0.035)] transition hover:-translate-y-0.5 hover:border-[#C7CEDC] hover:shadow-[0_14px_36px_rgba(1,13,40,0.08)]">
      <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF0E4] text-[#EA6D0B]"><FileText size={22} /></span>
      <h2 class="mt-5 text-[18px] font-semibold text-[#202737]">Nota Fiscal</h2>
      <p class="mt-2 text-[11px] leading-5 text-[#7A8190]">Envie os dados fiscais, certificado digital e XML necessários para implantação de NFS-e / NF-e.</p>
      <span class="application-text-caption mt-auto inline-flex items-center gap-1.5 pt-5 font-semibold text-[#000A57]">Iniciar solicitação <ArrowRight size={14} class="transition group-hover:translate-x-0.5" /></span>
    </a>

    <a href="/cliente/solicitacoes/cell-coin" class="group flex min-h-[220px] flex-col rounded-[24px] border border-[#E1E4EC] bg-white p-6 shadow-[0_8px_28px_rgba(1,13,40,0.035)] transition hover:-translate-y-0.5 hover:border-[#C7CEDC] hover:shadow-[0_14px_36px_rgba(1,13,40,0.08)]">
      <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF0FF] text-[#000A57]"><Coins size={22} /></span>
      <h2 class="mt-5 text-[18px] font-semibold text-[#202737]">CELL COIN</h2>
      <p class="mt-2 text-[11px] leading-5 text-[#7A8190]">Envie os dados cadastrais, documentos, selfie e aceite necessários para ativação do CELL COIN.</p>
      <span class="application-text-caption mt-auto inline-flex items-center gap-1.5 pt-5 font-semibold text-[#000A57]">Iniciar solicitação <ArrowRight size={14} class="transition group-hover:translate-x-0.5" /></span>
    </a>
  </div>
</ApplicationContent>
