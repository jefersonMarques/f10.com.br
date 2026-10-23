<script lang="ts">
  import { page } from "$app/stores";
  import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-svelte";

  $: status = $page.status;
  $: title = status === 403
    ? "Acesso não autorizado"
    : status === 404
      ? "Ticket não encontrado"
      : "Não foi possível carregar este ticket";

  $: description = status === 403
    ? "Este ticket não está disponível para o seu perfil."
    : status === 404
      ? "O ticket pode ter sido removido ou não estar mais disponível."
      : "O atendimento está preservado. Tente abrir novamente.";
</script>

<svelte:head>
  <title>{title} | F10 Operations</title>
</svelte:head>

<section class="flex min-h-[65vh] items-center justify-center bg-[var(--app-bg)] px-4 py-10">
  <div class="w-full max-w-md rounded-2xl border border-[var(--app-border)] bg-white p-6 text-center shadow-sm">
    <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--app-warning-bg)] text-[#A9510D]">
      <AlertTriangle size={22}/>
    </div>
    <h1 class="mt-4 text-[18px] font-semibold text-[#202637]">{title}</h1>
    <p class="mt-2 text-[13px] leading-5 text-[#737989]">{description}</p>
    <div class="mt-5 flex flex-wrap justify-center gap-2">
      <a href="/app/tickets" class="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--app-border-control)] bg-white px-4 text-[12px] font-semibold text-[#30394B]">
        <ArrowLeft size={15}/>Voltar aos tickets
      </a>
      {#if status >= 500}
        <button type="button" on:click={() => window.location.reload()} class="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--app-primary)] px-4 text-[12px] font-semibold text-white">
          <RefreshCw size={15}/>Tentar novamente
        </button>
      {/if}
    </div>
    <p class="mt-4 text-[11px] text-[#9298A5]">Código {status}</p>
  </div>
</section>
