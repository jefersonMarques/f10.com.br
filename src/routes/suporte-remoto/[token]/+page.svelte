<script lang="ts">
  import { CheckCircle2, Monitor, ShieldCheck, XCircle } from "lucide-svelte";
  import type { ActionData, PageData } from "./$types";
  export let data: PageData;
  export let form: ActionData;

  const final = data.consent.status === "authorized" || data.consent.status === "denied";
</script>

<svelte:head><title>Autorizar acesso remoto | F10</title><meta name="robots" content="noindex,nofollow,noarchive" /></svelte:head>

<main class="flex min-h-screen items-center justify-center bg-[#F5F6FA] px-5 py-10 text-[#10172A]">
  <section class="w-full max-w-[620px] rounded-[28px] border border-[#E2E5ED] bg-white p-6 shadow-[0_18px_60px_rgba(1,13,40,0.08)] sm:p-9">
    <div class="flex items-center gap-3"><span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF0FF] text-[#000A57]"><Monitor size={22}/></span><div><p class="text-[9px] font-bold uppercase tracking-[0.12em] text-[#EA6D0B]">Suporte F10</p><h1 class="mt-1 text-[22px] font-semibold">Solicitação de acesso remoto</h1></div></div>

    {#if form?.message}<div class="mt-5 rounded-xl bg-[#FFF0F0] px-4 py-3 text-[10px] text-[#9B3C3C]">{form.message}</div>{/if}

    {#if data.consent.expired && data.consent.status === "requested"}
      <div class="mt-7 rounded-2xl border border-[#E5E7ED] bg-[#F8F9FB] p-5 text-center"><XCircle size={28} class="mx-auto text-[#8C92A0]"/><strong class="mt-3 block text-[13px]">Esta solicitação expirou</strong><p class="mt-2 text-[10px] leading-5 text-[#7A8190]">Peça ao atendente F10 para gerar uma nova autorização.</p></div>
    {:else if final || data.consent.status !== "requested"}
      <div class="mt-7 rounded-2xl border border-[#DCEBE1] bg-[#F5FBF7] p-5 text-center">
        {#if data.consent.status === "authorized"}<CheckCircle2 size={30} class="mx-auto text-[#2F7045]"/><strong class="mt-3 block text-[14px] text-[#285D39]">Acesso autorizado</strong><p class="mt-2 text-[10px] leading-5 text-[#65806E]">O atendente pode iniciar a sessão remota. Você pode voltar ao chat.</p>{:else}<XCircle size={30} class="mx-auto text-[#9B3C3C]"/><strong class="mt-3 block text-[14px] text-[#7E3939]">Acesso não autorizado</strong><p class="mt-2 text-[10px] leading-5 text-[#896868]">Nenhum acesso remoto foi liberado por esta solicitação.</p>{/if}
      </div>
    {:else}
      <div class="mt-7 rounded-2xl border border-[#E2E5ED] bg-[#F8F9FB] p-5"><span class="text-[9px] text-[#9297A5]">Computador solicitado</span><strong class="mt-1 block text-[15px]">{data.consent.deviceName || "Computador do atendimento"}</strong>{#if data.consent.customerName}<span class="mt-2 block text-[10px] text-[#777E8E]">Cliente: {data.consent.customerName}</span>{/if}</div>
      <div class="mt-5 flex items-start gap-3 rounded-2xl border border-[#D8DEF2] bg-[#F8F9FF] px-4 py-3"><ShieldCheck size={17} class="mt-0.5 shrink-0 text-[#000A57]"/><p class="text-[10px] leading-5 text-[#5F6780]">Ao autorizar, você permite que o atendente F10 inicie uma sessão de suporte remoto no computador indicado. A solicitação e os horários de início e encerramento ficam registrados no atendimento.</p></div>
      <div class="mt-6 grid gap-3 sm:grid-cols-2"><form method="POST" action="?/deny"><button type="submit" class="min-h-12 w-full rounded-xl border border-[#E1C5C5] bg-white text-[11px] font-semibold text-[#8A3B3B]">Recusar</button></form><form method="POST" action="?/authorize"><button type="submit" class="min-h-12 w-full rounded-xl bg-[#000A57] text-[11px] font-semibold text-white">Autorizar acesso</button></form></div>
      <p class="mt-4 text-center text-[8px] leading-4 text-[#A0A5B0]">A autorização expira automaticamente se não for respondida dentro do prazo configurado pela F10.</p>
    {/if}
  </section>
</main>
