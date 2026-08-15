<script lang="ts">
  import { KeyRound, ShieldCheck } from "lucide-svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  $: token = form?.token ?? data.token;
</script>

<svelte:head>
  <title>Ativar acesso | F10 Operations</title>
  <meta name="robots" content="noindex,nofollow,noarchive" />
  <meta name="googlebot" content="noindex,nofollow,noarchive" />
</svelte:head>

<main class="min-h-[100dvh] bg-[#F5F6FA] px-5 py-8 text-[#010D28] sm:px-8">
  <div class="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-[760px] items-center justify-center">
    <section class="w-full rounded-[30px] border border-[#E3E6EF] bg-white p-6 shadow-[0_30px_90px_rgba(1,13,40,0.12)] sm:p-10">
      <div class="mx-auto max-w-[480px]">
        <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF0E4] text-[#EA6D0B]">
          <KeyRound size={25} aria-hidden="true" />
        </div>

        <p class="mt-6 text-[10px] font-bold uppercase tracking-[0.14em] text-[#EA6D0B]">
          F10 Operations
        </p>
        <h1 class="mt-2 text-[30px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[36px]">
          Ative seu acesso
        </h1>
        <p class="mt-3 text-[14px] leading-6 text-[#6C7282]">
          Defina uma senha pessoal. O convite é de uso único e deixa de funcionar após a ativação.
        </p>

        {#if !token}
          <div class="mt-7 rounded-2xl border border-[#F0C8C8] bg-[#FFF5F5] px-4 py-4 text-[12px] leading-5 text-[#9B2C2C]">
            O link de ativação não é válido. Solicite um novo convite ao administrador.
          </div>
        {:else}
          <form method="POST" class="mt-8 space-y-5">
            <input type="hidden" name="token" value={token} />

            <label class="block">
              <span class="mb-2 block text-[12px] font-semibold text-[#242A3A]">Nova senha</span>
              <input
                name="password"
                type="password"
                autocomplete="new-password"
                minlength="14"
                maxlength="1024"
                required
                class="h-12 w-full rounded-xl border border-[#DDE1EA] bg-white px-4 text-[15px] outline-none transition focus:border-[#000A57] focus:ring-4 focus:ring-[#000A57]/10"
              />
              <span class="mt-1.5 block text-[10px] text-[#969BA8]">Use pelo menos 14 caracteres.</span>
            </label>

            <label class="block">
              <span class="mb-2 block text-[12px] font-semibold text-[#242A3A]">Confirmar senha</span>
              <input
                name="confirmation"
                type="password"
                autocomplete="new-password"
                minlength="14"
                maxlength="1024"
                required
                class="h-12 w-full rounded-xl border border-[#DDE1EA] bg-white px-4 text-[15px] outline-none transition focus:border-[#000A57] focus:ring-4 focus:ring-[#000A57]/10"
              />
            </label>

            {#if form?.message}
              <div class="rounded-xl border border-[#F0C8C8] bg-[#FFF5F5] px-4 py-3 text-[12px] leading-5 text-[#A52A2A]" role="alert">
                {form.message}
              </div>
            {/if}

            <button
              type="submit"
              class="flex h-12 w-full items-center justify-center rounded-xl bg-[#000A57] px-5 text-[14px] font-semibold text-white transition hover:bg-[#111B71] focus:outline-none focus:ring-4 focus:ring-[#000A57]/20"
            >
              Criar senha e ativar acesso
            </button>
          </form>
        {/if}

        <div class="mt-8 flex items-start gap-3 rounded-2xl bg-[#F7F8FB] px-4 py-4">
          <ShieldCheck size={18} class="mt-0.5 shrink-0 text-[#000A57]" aria-hidden="true" />
          <p class="text-[10px] leading-5 text-[#747A8A]">
            A senha definida nesta tela não é exibida ao administrador e será armazenada somente como hash seguro.
          </p>
        </div>
      </div>
    </section>
  </div>
</main>
