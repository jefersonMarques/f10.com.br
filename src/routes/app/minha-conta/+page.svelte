<script lang="ts">
  import { CalendarDays, Camera, CheckCircle2, CircleAlert, KeyRound, Mail, Save, UserRound } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  $: initials = data.account.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
</script>

<svelte:head><title>Minha conta | F10 Operations</title></svelte:head>

<ApplicationContent width="narrow">
  {#if form?.message}
    <div class={`mb-3 flex items-start gap-3 rounded-2xl border px-4 py-3 text-[11px] font-medium ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>
      {#if form.success}<CheckCircle2 size={17} class="mt-0.5 shrink-0" />{:else}<CircleAlert size={17} class="mt-0.5 shrink-0" />{/if}
      <span>{form.message}</span>
    </div>
  {/if}

  <div class="grid gap-5 lg:grid-cols-2">
    <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
      <div class="flex items-center gap-3">
        <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><UserRound size={18} /></span>
        <div><h2 class="text-[14px] font-semibold">Perfil</h2><p class="mt-1 text-[9px] text-[#9297A5]">Nome e avatar exibidos dentro do Operations e no atendimento.</p></div>
      </div>

      <div class="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
        <div class="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E1E4EC] bg-[#F4F5FA] text-[22px] font-semibold text-[#000A57]">
          {#if data.account.hasAvatar}
            <img src="/app/minha-conta/avatar" alt="Seu avatar" class="h-full w-full object-cover" />
          {:else}
            {initials || "F10"}
          {/if}
        </div>

        <form method="POST" action="?/avatar" enctype="multipart/form-data" class="min-w-0 flex-1">
          <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#555B6B]">Avatar</span><input name="avatar" type="file" accept="image/png,image/jpeg,image/webp" required disabled={!data.avatarStorageConfigured} class="block w-full text-[10px] text-[#697080] file:mr-3 file:rounded-lg file:border-0 file:bg-[#EEF0FF] file:px-3 file:py-2 file:text-[9px] file:font-semibold file:text-[#000A57]" /></label>
          <p class="mt-2 text-[8px] leading-4 text-[#9499A6]">JPG, PNG ou WebP, até 2 MB.{#if !data.avatarStorageConfigured} O armazenamento de assets precisa estar configurado para habilitar o envio.{/if}</p>
          <button type="submit" disabled={!data.avatarStorageConfigured} class="mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#DDE1EA] px-3 text-[9px] font-semibold text-[#000A57] disabled:cursor-not-allowed disabled:opacity-50"><Camera size={14} />Atualizar avatar</button>
        </form>
      </div>

      <form method="POST" action="?/name" class="mt-6 border-t border-[#EEF0F5] pt-5">
        <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#555B6B]">Nome</span><input name="name" required minlength="2" maxlength="120" value={data.account.name} autocomplete="name" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px] outline-none focus:border-[#000A57]" /></label>
        <button type="submit" class="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 text-[10px] font-semibold text-white"><Save size={14} />Salvar nome</button>
      </form>
    </section>

    <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
      <div class="flex items-center gap-3"><span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF4E9] text-[#A9510D]"><Mail size={18} /></span><div><h2 class="text-[14px] font-semibold">E-mail de acesso</h2><p class="mt-1 text-[9px] text-[#9297A5]">Alterar o e-mail também altera seu login.</p></div></div>
      <form method="POST" action="?/email" class="mt-5 space-y-4">
        <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#555B6B]">E-mail</span><input name="email" type="email" required maxlength="254" value={data.account.email} autocomplete="email" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px] outline-none focus:border-[#000A57]" /></label>
        <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#555B6B]">Senha atual</span><input name="currentPassword" type="password" required maxlength="200" autocomplete="current-password" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px] outline-none focus:border-[#000A57]" /></label>
        <p class="text-[8px] leading-4 text-[#9499A6]">Por segurança, a troca exige sua senha atual e encerra todas as outras sessões abertas.</p>
        <button type="submit" class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 text-[10px] font-semibold text-white"><Save size={14} />Atualizar e-mail</button>
      </form>
    </section>

    <section class="rounded-[22px] border border-[#DDE7E1] bg-[#F8FBF9] p-5 sm:p-6 lg:col-span-2">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-start gap-3"><span class="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#2F7045] shadow-sm"><CalendarDays size={18}/></span><div><h2 class="text-[14px] font-semibold text-[#284D35]">Google Calendar</h2><p class="mt-1 max-w-2xl text-[9px] leading-4 text-[#738079]">Configure calendários compartilhados, sincronização de Tarefas e Tickets, importação de eventos e permissões de compartilhamento.</p></div></div>
        <a href="/app/minha-conta/google" class="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-[#2F7045] px-4 text-[10px] font-semibold text-white">Configurar Google Calendar</a>
      </div>
    </section>

    <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6 lg:col-span-2">
      <div class="flex items-center gap-3"><span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F2F0FF] text-[#5C4BA2]"><KeyRound size={18} /></span><div><h2 class="text-[14px] font-semibold">Senha</h2><p class="mt-1 text-[9px] text-[#9297A5]">Troque sua senha sem expor credenciais em logs ou histórico.</p></div></div>
      <form method="POST" action="?/password" class="mt-5 grid gap-4 md:grid-cols-3">
        <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#555B6B]">Senha atual</span><input name="currentPassword" type="password" required maxlength="200" autocomplete="current-password" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px] outline-none focus:border-[#000A57]" /></label>
        <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#555B6B]">Nova senha</span><input name="newPassword" type="password" required minlength="12" maxlength="200" autocomplete="new-password" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px] outline-none focus:border-[#000A57]" /></label>
        <label class="block"><span class="mb-1.5 block text-[10px] font-semibold text-[#555B6B]">Confirmar nova senha</span><input name="confirmPassword" type="password" required minlength="12" maxlength="200" autocomplete="new-password" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px] outline-none focus:border-[#000A57]" /></label>
        <div class="md:col-span-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p class="text-[8px] leading-4 text-[#9499A6]">Mínimo de 12 caracteres, com letras e números. As outras sessões serão encerradas após a alteração.</p><button type="submit" class="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-[#000A57] px-4 text-[10px] font-semibold text-white"><KeyRound size={14} />Trocar senha</button></div>
      </form>
    </section>
  </div>
</ApplicationContent>
