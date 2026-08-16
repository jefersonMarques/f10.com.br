<script lang="ts">
  import { ArrowLeft, CheckCircle2, LockKeyhole } from "lucide-svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;
</script>

<svelte:head>
  <title>Acesso interno | F10 Operations</title>
  <meta name="robots" content="noindex,nofollow,noarchive" />
  <meta name="googlebot" content="noindex,nofollow,noarchive" />
</svelte:head>

<main class="min-h-[100dvh] bg-[#F5F6FA] px-5 py-8 text-[#010D28] sm:px-8">
  <div class="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-[1120px] items-center justify-center">
    <section class="grid w-full overflow-hidden rounded-[30px] border border-[#E3E6EF] bg-white shadow-[0_30px_90px_rgba(1,13,40,0.12)] lg:grid-cols-[1.05fr_0.95fr]">
      <div class="hidden min-h-[650px] flex-col justify-between bg-[#000A57] p-12 text-white lg:flex">
        <div>
          <div class="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold">
            <span class="flex h-8 w-8 items-center justify-center rounded-full bg-[#EA6D0B] font-bold">F10</span>
            Operations
          </div>

          <h1 class="mt-16 max-w-[520px] text-[48px] font-semibold leading-[1.05] tracking-[-0.04em]">
            O trabalho da equipe F10 em um único lugar.
          </h1>
          <p class="mt-6 max-w-[470px] text-[17px] leading-7 text-white/70">
            Central de Ajuda, tarefas, atendimento, tickets e suporte remoto com controle de acesso e auditoria.
          </p>
        </div>

        <p class="text-sm text-white/50">Área restrita à equipe F10.</p>
      </div>

      <div class="flex min-h-[620px] items-center px-6 py-10 sm:px-12 lg:px-16">
        <div class="mx-auto w-full max-w-[420px]">
          <a
            href="/"
            data-sveltekit-reload
            class="inline-flex items-center gap-2 text-sm font-semibold text-[#5A6072] transition hover:text-[#000A57]"
          >
            <ArrowLeft size={17} aria-hidden="true" />
            Voltar ao site
          </a>

          <div class="mt-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF0E4] text-[#EA6D0B]">
            <LockKeyhole size={25} aria-hidden="true" />
          </div>

          <h2 class="mt-6 text-[32px] font-semibold tracking-[-0.03em] text-[#010D28]">
            Acessar F10 Operations
          </h2>
          <p class="mt-2 text-[15px] leading-6 text-[#6C7282]">
            Use suas credenciais internas para continuar.
          </p>

          {#if data.activated}
            <div class="mt-6 flex items-start gap-3 rounded-xl border border-[#B9E6C9] bg-[#F1FBF4] px-4 py-3 text-[12px] leading-5 text-[#176B35]">
              <CheckCircle2 size={18} class="mt-0.5 shrink-0" aria-hidden="true" />
              <span>Acesso ativado. Entre com a senha que você acabou de criar.</span>
            </div>
          {/if}

          {#if data.passwordReset}
            <div class="mt-6 flex items-start gap-3 rounded-xl border border-[#B9E6C9] bg-[#F1FBF4] px-4 py-3 text-[12px] leading-5 text-[#176B35]">
              <CheckCircle2 size={18} class="mt-0.5 shrink-0" aria-hidden="true" />
              <span>Senha redefinida com sucesso. Entre novamente com sua nova senha.</span>
            </div>
          {/if}

          <form method="POST" class="mt-8 space-y-5">
            <input type="hidden" name="returnTo" value={form?.returnTo ?? data.returnTo} />

            <label class="block">
              <span class="mb-2 block text-sm font-semibold text-[#242A3A]">E-mail</span>
              <input
                name="email"
                type="email"
                autocomplete="username"
                value={form?.email ?? ""}
                required
                maxlength="254"
                class="h-12 w-full rounded-xl border border-[#DDE1EA] bg-white px-4 text-[15px] outline-none transition placeholder:text-[#A5A9B5] focus:border-[#000A57] focus:ring-4 focus:ring-[#000A57]/10"
                placeholder="nome@f10.com.br"
              />
            </label>

            <label class="block">
              <span class="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-[#242A3A]">
                <span>Senha</span>
                <a href="/esqueci-senha" class="text-[13px] font-semibold text-[#000A57] hover:underline">Esqueci minha senha</a>
              </span>
              <input
                name="password"
                type="password"
                autocomplete="current-password"
                required
                maxlength="1024"
                class="h-12 w-full rounded-xl border border-[#DDE1EA] bg-white px-4 text-[15px] outline-none transition focus:border-[#000A57] focus:ring-4 focus:ring-[#000A57]/10"
              />
            </label>

            {#if form?.message}
              <div class="rounded-xl border border-[#F0C8C8] bg-[#FFF5F5] px-4 py-3 text-sm leading-5 text-[#A52A2A]" role="alert">
                {form.message}
              </div>
            {/if}

            <button
              type="submit"
              class="flex h-12 w-full items-center justify-center rounded-xl bg-[#000A57] px-5 text-[15px] font-semibold text-white transition hover:bg-[#111B71] focus:outline-none focus:ring-4 focus:ring-[#000A57]/20"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    </section>
  </div>
</main>
