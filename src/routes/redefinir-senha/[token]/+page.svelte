<script lang="ts">
  import { ArrowLeft, KeyRound, ShieldCheck } from "lucide-svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;
</script>

<svelte:head>
  <title>Nova senha | F10 Operations</title>
  <meta name="robots" content="noindex,nofollow,noarchive" />
  <meta name="googlebot" content="noindex,nofollow,noarchive" />
</svelte:head>

<main class="min-h-[100dvh] bg-[#F5F6FA] px-5 py-8 text-[#010D28] sm:px-8">
  <div class="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-[760px] items-center justify-center">
    <section class="w-full rounded-[30px] border border-[#E3E6EF] bg-white px-6 py-10 shadow-[0_30px_90px_rgba(1,13,40,0.12)] sm:px-12 sm:py-12">
      <div class="mx-auto max-w-[430px]">
        <a href="/login" class="inline-flex items-center gap-2 text-sm font-semibold text-[#5A6072] transition hover:text-[#000A57]">
          <ArrowLeft size={17} aria-hidden="true" />
          Voltar ao login
        </a>

        <div class="mt-9 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF0E4] text-[#EA6D0B]">
          <KeyRound size={25} aria-hidden="true" />
        </div>

        <h1 class="mt-6 text-[32px] font-semibold tracking-[-0.03em] text-[#010D28]">Criar nova senha</h1>

        {#if data.valid}
          <p class="mt-2 text-[15px] leading-6 text-[#6C7282]">
            Defina uma nova senha para sua conta. Ao concluir, todas as sessões já abertas serão encerradas.
          </p>

          <form method="POST" class="mt-8 space-y-5">
            <label class="block">
              <span class="mb-2 block text-sm font-semibold text-[#242A3A]">Nova senha</span>
              <input
                name="newPassword"
                type="password"
                autocomplete="new-password"
                required
                minlength="12"
                maxlength="200"
                class="h-12 w-full rounded-xl border border-[#DDE1EA] bg-white px-4 text-[15px] outline-none transition focus:border-[#000A57] focus:ring-4 focus:ring-[#000A57]/10"
              />
              <span class="mt-2 block text-[13px] leading-5 text-[#858A98]">Use pelo menos 12 caracteres, incluindo letras e números.</span>
            </label>

            <label class="block">
              <span class="mb-2 block text-sm font-semibold text-[#242A3A]">Confirmar nova senha</span>
              <input
                name="confirmPassword"
                type="password"
                autocomplete="new-password"
                required
                minlength="12"
                maxlength="200"
                class="h-12 w-full rounded-xl border border-[#DDE1EA] bg-white px-4 text-[15px] outline-none transition focus:border-[#000A57] focus:ring-4 focus:ring-[#000A57]/10"
              />
            </label>

            {#if form?.message}
              <div class="rounded-xl border border-[#F0C8C8] bg-[#FFF5F5] px-4 py-3 text-sm leading-5 text-[#A52A2A]" role="alert">
                {form.message}
              </div>
            {/if}

            <button type="submit" class="flex h-12 w-full items-center justify-center rounded-xl bg-[#000A57] px-5 text-[15px] font-semibold text-white transition hover:bg-[#111B71] focus:outline-none focus:ring-4 focus:ring-[#000A57]/20">
              Salvar nova senha
            </button>
          </form>

          <div class="mt-6 flex items-start gap-3 rounded-2xl border border-[#D8DEF2] bg-[#F8F9FF] px-4 py-3 text-[13px] leading-5 text-[#626A7E]">
            <ShieldCheck size={17} class="mt-0.5 shrink-0 text-[#000A57]" aria-hidden="true" />
            <span>O link só pode ser utilizado uma vez. Depois da troca, faça login novamente com a nova senha.</span>
          </div>
        {:else}
          <p class="mt-2 text-[15px] leading-6 text-[#6C7282]">
            Este link é inválido, expirou ou já foi utilizado. Solicite uma nova redefinição para continuar.
          </p>
          <a href="/esqueci-senha" class="mt-7 flex h-12 w-full items-center justify-center rounded-xl bg-[#000A57] px-5 text-[15px] font-semibold text-white transition hover:bg-[#111B71]">
            Solicitar novo link
          </a>
        {/if}
      </div>
    </section>
  </div>
</main>
