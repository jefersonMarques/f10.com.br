<script lang="ts">
  import { ArrowLeft, KeyRound, Mail, ShieldCheck } from "lucide-svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  $: loginEmail = form && "action" in form && form.action === "login" && "email" in form
    ? form.email ?? ""
    : "";
  $: returnTo = form && "action" in form && form.action === "login" && "returnTo" in form
    ? form.returnTo ?? data.returnTo
    : data.returnTo;
  $: schedulingLogin = returnTo.startsWith("/agendar/");
</script>

<svelte:head>
  <title>Área do Cliente | F10 Software</title>
  <meta name="description" content="Entre na Área do Cliente para acompanhar chamados e solicitações." />
</svelte:head>

<main class="min-h-screen bg-[#F7F8FB] px-5 py-8 text-[#10172A] sm:py-14">
  <div class="mx-auto max-w-[620px]">
    <a href="/ajuda-f10" class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-xl px-2 font-semibold text-[#5F6676] hover:bg-white hover:text-[#000A57]"><ArrowLeft size={16} />Central de Ajuda</a>

    <section class="mt-5 overflow-hidden rounded-[28px] border border-[#E1E4EC] bg-white shadow-[0_18px_55px_rgba(1,13,40,0.07)]">
      <header class="bg-[#010D28] px-6 py-7 text-white sm:px-8 sm:py-8">
        <span class="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-[#FF9A4B]"><ShieldCheck size={21} /></span>
        <p class="application-text-caption mt-5 font-bold uppercase tracking-[0.14em] text-[#FF9A4B]">Área do Cliente F10</p>
        <h1 class="mt-2 text-[28px] font-semibold tracking-[-0.04em] sm:text-[34px]">Entre na Área do Cliente</h1>
        <p class="application-text-control mt-3 leading-6 text-white/65">Informe seu e-mail e senha para continuar.</p>
      </header>

      <div class="px-6 py-7 sm:px-8">
        {#if form?.message && "action" in form && form.action === "login"}
          <div
            class={form.success
              ? "application-text-caption mb-5 rounded-2xl border border-[#CFE6D6] bg-[#F3FAF5] px-4 py-3 leading-5 text-[#356347]"
              : "application-text-caption mb-5 rounded-2xl border border-[#F0D0C8] bg-[#FFF7F4] px-4 py-3 leading-5 text-[#8A493A]"}
          >
            {form.message}
          </div>
        {/if}

        <form method="POST" action="?/login" class="space-y-4">
          <input type="hidden" name="returnTo" value={returnTo} />

          <label class="block">
            <span class="application-text-caption font-semibold text-[#515868]">E-mail</span>
            <div class="relative mt-1.5">
              <Mail class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A91A1]" size={17} />
              <input
                name="email"
                type="email"
                required
                maxlength="254"
                autocomplete="username"
                value={loginEmail}
                placeholder="voce@empresa.com.br"
                class="application-text-control h-12 w-full rounded-xl border border-[#DDE1E9] pl-11 pr-3 outline-none transition focus:border-[#000A57] focus:ring-4 focus:ring-[#000A57]/10"
              />
            </div>
          </label>

          <label class="block">
            <span class="application-text-caption font-semibold text-[#515868]">Senha</span>
            <div class="relative mt-1.5">
              <KeyRound class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A91A1]" size={17} />
              <input
                name="password"
                type="password"
                required
                maxlength="512"
                autocomplete="current-password"
                class="application-text-control h-12 w-full rounded-xl border border-[#DDE1E9] pl-11 pr-3 outline-none transition focus:border-[#000A57] focus:ring-4 focus:ring-[#000A57]/10"
              />
            </div>
          </label>

          <button
            type="submit"
            class="application-text-control inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#000A57] px-5 font-semibold text-white transition hover:bg-[#111B71] focus:outline-none focus:ring-4 focus:ring-[#000A57]/20"
          >
            Entrar
          </button>
        </form>

        {#if !schedulingLogin}
        <details class="mt-6 border-t border-[#ECEEF3] pt-5">
          <summary class="application-text-caption cursor-pointer font-semibold text-[#656C7C]">Não consegue entrar?</summary>

          {#if form?.message && "action" in form && form.action === "requestAccess"}
            <div class={`application-text-caption mt-4 rounded-2xl px-4 py-3 leading-5 ${form.success ? "border border-[#CFE6D6] bg-[#F3FAF5] text-[#356347]" : "border border-[#F0D0C8] bg-[#FFF7F4] text-[#8A493A]"}`}>
              {form.message}
            </div>
          {/if}

          <form method="POST" action="?/requestAccess" class="mt-4 flex gap-2">
            <input name="email" type="email" required maxlength="254" autocomplete="email" placeholder="voce@empresa.com.br" class="application-text-caption h-11 min-w-0 flex-1 rounded-xl border border-[#DDE1E9] px-3 outline-none focus:border-[#000A57]" />
            <button type="submit" class="application-text-caption shrink-0 rounded-xl border border-[#D8DCE5] bg-white px-4 font-semibold text-[#000A57]">Enviar link</button>
          </form>
        </details>
        {/if}
      </div>
    </section>
  </div>
</main>
