<script lang="ts">
  import {
    ArrowLeft,
    CheckCircle2,
    Copy,
    KeyRound,
    ShieldCheck,
    UserRound,
  } from "lucide-svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  const scopeLabels: Record<string, string> = {
    own: "Próprio",
    team: "Equipe",
    all: "Tudo",
  };

  async function copyInviteLink(inviteUrl: string): Promise<void> {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(inviteUrl);
  }
</script>

<svelte:head>
  <title>{data.details.user.name} | Equipe | F10 Operations</title>
</svelte:head>

<div class="mx-auto max-w-[1280px] px-5 py-7 sm:px-8 sm:py-9">
  <a
    href="/app/team"
    class="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-[12px] font-semibold text-[#5F6575] transition hover:bg-white hover:text-[#000A57]"
  >
    <ArrowLeft size={17} aria-hidden="true" />
    Voltar para equipe
  </a>

  <div class="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
    <div class="min-w-0">
      <div class="flex flex-wrap items-center gap-2">
        {#each data.details.roles as role}
          <span class="rounded-full bg-[#EEF0FF] px-3 py-1.5 text-[10px] font-bold text-[#000A57]">
            {role}
          </span>
        {/each}
        <span
          class={`rounded-full px-3 py-1.5 text-[10px] font-bold ${
            data.details.user.status === "active"
              ? "bg-[#EEF8F1] text-[#2F7045]"
              : data.details.user.status === "invited"
                ? "bg-[#FFF4E9] text-[#A9510D]"
                : "bg-[#F1F2F5] text-[#777D8C]"
          }`}
        >
          {data.details.user.status === "active"
            ? "Ativo"
            : data.details.user.status === "invited"
              ? "Convite pendente"
              : "Inativo"}
        </span>
      </div>

      <h1 class="mt-3 truncate text-[30px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[38px]">
        {data.details.user.name}
      </h1>
      <p class="mt-1 truncate text-[13px] text-[#7C8291]">{data.details.user.email}</p>
    </div>
  </div>

  {#if form?.inviteUrl}
    <section class="mt-6 rounded-[22px] border border-[#B9E6C9] bg-[#F1FBF4] p-5">
      <div class="flex items-start gap-3">
        <CheckCircle2 size={20} class="mt-0.5 shrink-0 text-[#176B35]" aria-hidden="true" />
        <div class="min-w-0 flex-1">
          <h2 class="text-[13px] font-semibold text-[#176B35]">Novo convite criado</h2>
          <p class="mt-1 text-[11px] leading-5 text-[#427354]">
            O link anterior foi invalidado. Envie somente este novo link ao integrante.
          </p>
          <div class="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              readonly
              value={form.inviteUrl}
              class="h-11 min-w-0 flex-1 rounded-xl border border-[#C9E6D1] bg-white px-3 text-[11px] text-[#31553B] outline-none"
            />
            <button
              type="button"
              on:click={() => copyInviteLink(form.inviteUrl)}
              class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#176B35] px-4 text-[11px] font-semibold text-white"
            >
              <Copy size={15} aria-hidden="true" />
              Copiar link
            </button>
          </div>
        </div>
      </div>
    </section>
  {:else if form?.message}
    <div
      class={`mt-6 rounded-2xl border px-4 py-3 text-[12px] font-medium ${
        form.success
          ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]"
          : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"
      }`}
    >
      {form.message}
    </div>
  {/if}

  {#if data.isSelf}
    <section class="mt-6 flex items-start gap-3 rounded-2xl border border-[#D8DCEC] bg-[#F7F8FC] px-5 py-4">
      <ShieldCheck size={19} class="mt-0.5 shrink-0 text-[#000A57]" aria-hidden="true" />
      <p class="text-[11px] leading-5 text-[#666C7D]">
        Esta é sua própria conta. Alterações de status e permissões pessoais ficam bloqueadas para evitar perda acidental de acesso administrativo.
      </p>
    </section>
  {/if}

  <div class="mt-7 grid gap-6 xl:grid-cols-[330px_minmax(0,1fr)]">
    <aside class="space-y-5">
      <section class="rounded-[24px] border border-[#E2E5ED] bg-white p-5">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]">
            <UserRound size={19} aria-hidden="true" />
          </span>
          <div>
            <h2 class="text-[14px] font-semibold text-[#11182C]">Conta</h2>
            <p class="mt-0.5 text-[10px] text-[#8B909E]">Controle de acesso ao Operations</p>
          </div>
        </div>

        <dl class="mt-5 space-y-3 text-[11px]">
          <div class="flex justify-between gap-3">
            <dt class="text-[#8A8F9D]">Ativação concluída</dt>
            <dd class="font-semibold text-[#444A59]">{data.details.user.activatedAt ? "Sim" : "Não"}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-[#8A8F9D]">Status</dt>
            <dd class="font-semibold text-[#444A59]">{data.details.user.status}</dd>
          </div>
        </dl>

        {#if data.canManage}
          <div class="mt-5 space-y-2 border-t border-[#EEF0F5] pt-5">
            {#if !data.details.user.activatedAt}
              <form method="POST" action="?/regenerateInvite">
                <button
                  type="submit"
                  class="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-3 text-[11px] font-semibold text-white"
                >
                  <KeyRound size={15} aria-hidden="true" />
                  Gerar novo convite
                </button>
              </form>

              {#if data.details.user.status === "invited"}
                <form method="POST" action="?/status">
                  <input type="hidden" name="status" value="inactive" />
                  <button
                    type="submit"
                    class="min-h-10 w-full rounded-xl border border-[#E4CBD0] px-3 text-[11px] font-semibold text-[#9A3440] transition hover:bg-[#FFF6F7]"
                  >
                    Cancelar convite
                  </button>
                </form>
              {/if}
            {:else if data.details.user.status === "active"}
              <form method="POST" action="?/status">
                <input type="hidden" name="status" value="inactive" />
                <button
                  type="submit"
                  class="min-h-10 w-full rounded-xl border border-[#E4CBD0] px-3 text-[11px] font-semibold text-[#9A3440] transition hover:bg-[#FFF6F7]"
                >
                  Desativar usuário
                </button>
              </form>
            {:else}
              <form method="POST" action="?/status">
                <input type="hidden" name="status" value="active" />
                <button
                  type="submit"
                  class="min-h-10 w-full rounded-xl bg-[#000A57] px-3 text-[11px] font-semibold text-white"
                >
                  Reativar usuário
                </button>
              </form>
            {/if}
          </div>
        {/if}
      </section>

      <section class="rounded-[24px] border border-[#E2E5ED] bg-white p-5">
        <div class="flex items-start gap-3">
          <ShieldCheck size={18} class="mt-0.5 shrink-0 text-[#EA6D0B]" aria-hidden="true" />
          <div>
            <h2 class="text-[12px] font-semibold text-[#353B4A]">Como as permissões funcionam</h2>
            <p class="mt-2 text-[10px] leading-5 text-[#777D8D]">
              “Herdar” usa o perfil base. “Permitir” concede um acesso específico e “Negar” remove até mesmo um acesso herdado do perfil.
            </p>
          </div>
        </div>
      </section>
    </aside>

    <section class="overflow-hidden rounded-[24px] border border-[#E2E5ED] bg-white">
      <header class="border-b border-[#EEF0F5] px-5 py-4 sm:px-6">
        <h2 class="text-[16px] font-semibold text-[#11182C]">Permissões individuais</h2>
        <p class="mt-1 text-[11px] text-[#858A98]">
          O acesso efetivo combina o perfil base com as exceções definidas abaixo.
        </p>
      </header>

      <div class="divide-y divide-[#EEF0F5]">
        {#each data.details.permissions as permission}
          <article class="grid gap-4 px-5 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_140px_150px_90px] lg:items-center">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-[12px] font-semibold text-[#303645]">{permission.name}</h3>
                <span class="rounded-full bg-[#F2F3F6] px-2 py-1 text-[9px] font-medium text-[#777D8B]">
                  {permission.effectiveScope ? scopeLabels[permission.effectiveScope] : "Sem acesso"}
                </span>
              </div>
              <p class="mt-1 text-[10px] leading-4 text-[#8B909D]">{permission.description}</p>
              <code class="mt-1.5 block text-[9px] text-[#A0A5B0]">{permission.code}</code>
            </div>

            <form method="POST" action="?/permission" class="contents">
              <input type="hidden" name="permissionCode" value={permission.code} />

              <label class="block">
                <span class="mb-1 block text-[9px] font-bold uppercase tracking-[0.08em] text-[#9A9FAD] lg:hidden">Regra</span>
                <select
                  name="effect"
                  value={permission.override?.effect ?? "inherit"}
                  disabled={!data.canManage || !permission.canActorChange}
                  class="h-10 w-full rounded-lg border border-[#DDE1EA] bg-white px-2 text-[10px] outline-none disabled:bg-[#F5F6F8] disabled:text-[#A0A5B0]"
                >
                  <option value="inherit">Herdar perfil</option>
                  <option value="allow">Permitir</option>
                  <option value="deny">Negar</option>
                </select>
              </label>

              <label class="block">
                <span class="mb-1 block text-[9px] font-bold uppercase tracking-[0.08em] text-[#9A9FAD] lg:hidden">Escopo</span>
                <select
                  name="scope"
                  value={permission.override?.scope ?? permission.effectiveScope ?? "own"}
                  disabled={!data.canManage || !permission.canActorChange}
                  class="h-10 w-full rounded-lg border border-[#DDE1EA] bg-white px-2 text-[10px] outline-none disabled:bg-[#F5F6F8] disabled:text-[#A0A5B0]"
                >
                  <option value="own">Próprio</option>
                  <option value="team">Equipe</option>
                  <option value="all">Tudo</option>
                </select>
              </label>

              <button
                type="submit"
                disabled={!data.canManage || !permission.canActorChange}
                class="h-10 rounded-lg bg-[#000A57] px-3 text-[10px] font-semibold text-white transition hover:bg-[#111B71] disabled:cursor-not-allowed disabled:bg-[#D8DBE3]"
              >
                Salvar
              </button>
            </form>
          </article>
        {/each}
      </div>
    </section>
  </div>
</div>
