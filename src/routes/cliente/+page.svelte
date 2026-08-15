<script lang="ts">
  import { ArrowLeft, Mail, ShieldCheck } from "lucide-svelte";
  import type { ActionData } from "./$types";

  export let form: ActionData;
</script>

<svelte:head>
  <title>Área do Cliente | F10 Software</title>
  <meta name="description" content="Acesse seus chamados de suporte F10 com um link seguro enviado por e-mail." />
</svelte:head>

<main class="min-h-screen bg-[#F7F8FB] px-5 py-8 text-[#10172A] sm:py-14">
  <div class="mx-auto max-w-[560px]">
    <a href="/ajuda-f10" class="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-[11px] font-semibold text-[#5F6676] hover:bg-white hover:text-[#000A57]"><ArrowLeft size={16} />Central de Ajuda</a>

    <section class="mt-5 overflow-hidden rounded-[28px] border border-[#E1E4EC] bg-white shadow-[0_18px_55px_rgba(1,13,40,0.07)]">
      <header class="bg-[#010D28] px-6 py-7 text-white sm:px-8 sm:py-8">
        <span class="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-[#FF9A4B]"><ShieldCheck size={21} /></span>
        <p class="mt-5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#FF9A4B]">Área do Cliente F10</p>
        <h1 class="mt-2 text-[28px] font-semibold tracking-[-0.04em] sm:text-[34px]">Acompanhe seus chamados</h1>
        <p class="mt-3 text-[12px] leading-6 text-white/65">Não usamos senha. Informe o mesmo e-mail cadastrado no atendimento e enviaremos um link de acesso de uso único.</p>
      </header>

      <div class="px-6 py-7 sm:px-8">
        {#if form?.message}
          <div class={`mb-5 rounded-2xl px-4 py-3 text-[11px] leading-5 ${form.success ? "border border-[#CFE6D6] bg-[#F3FAF5] text-[#356347]" : "border border-[#F0D0C8] bg-[#FFF7F4] text-[#8A493A]"}`}>
            {form.message}
            {#if "diagnosticCode" in form && form.diagnosticCode}
              <span class="mt-1 block font-mono text-[9px] opacity-75">localhost: {form.diagnosticCode}</span>
            {/if}
          </div>
        {/if}

        <form method="POST" action="?/requestAccess" class="space-y-4">
          <label class="block">
            <span class="text-[11px] font-semibold text-[#515868]">E-mail cadastrado</span>
            <div class="relative mt-1.5">
              <Mail class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A91A1]" size={17} />
              <input name="email" type="email" required maxlength="254" autocomplete="email" value={form && "email" in form ? form.email ?? "" : ""} placeholder="voce@empresa.com.br" class="h-12 w-full rounded-xl border border-[#DDE1E9] pl-11 pr-3 text-[12px] outline-none transition focus:border-[#000A57] focus:ring-4 focus:ring-[#000A57]/10" />
            </div>
          </label>
          <button type="submit" class="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#000A57] px-5 text-[12px] font-semibold text-white transition hover:bg-[#111B71] focus:outline-none focus:ring-4 focus:ring-[#000A57]/20">Enviar link de acesso</button>
        </form>

        <p class="mt-5 text-center text-[9px] leading-4 text-[#9298A5]">Por segurança, a tela sempre mostra a mesma confirmação, exista ou não um cadastro com o e-mail informado.</p>
      </div>
    </section>
  </div>
</main>
