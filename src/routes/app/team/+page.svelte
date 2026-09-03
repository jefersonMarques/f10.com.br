<script lang="ts">
  import {
    CheckCircle2,
    Copy,
    ExternalLink,
    MessageCircleMore,
    Plus,
    ShieldCheck,
    UserRound,
    Users,
  } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  $: values = form && "values" in form ? form.values : null;

  async function copyInviteLink(inviteUrl: string): Promise<void> {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(inviteUrl);
  }
</script>

<svelte:head>
  <title>Equipe | F10 Operations</title>
</svelte:head>

<ApplicationContent width="standard">
  {#if form?.inviteUrl}
    <section class="mb-3 rounded-[22px] border border-[#B9E6C9] bg-[#F1FBF4] p-5">
      <div class="flex items-start gap-3">
        <CheckCircle2 size={20} class="mt-0.5 shrink-0 text-[#176B35]" aria-hidden="true" />
        <div class="min-w-0 flex-1">
          <h2 class="text-[13px] font-semibold text-[#176B35]">Convite criado para {form.invitedUserName}</h2>
          <p class="mt-1 text-[11px] leading-5 text-[#427354]">Este link é de uso único. Ele deixa de funcionar depois da ativação ou após 48 horas.</p>
          <div class="mt-4 flex flex-col gap-2 sm:flex-row">
            <input readonly value={form.inviteUrl} class="h-11 min-w-0 flex-1 rounded-xl border border-[#C9E6D1] bg-white px-3 text-[11px] text-[#31553B] outline-none" />
            <button type="button" on:click={() => copyInviteLink(form.inviteUrl)} class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#176B35] px-4 text-[11px] font-semibold text-white"><Copy size={15} aria-hidden="true" />Copiar link</button>
          </div>
        </div>
      </div>
    </section>
  {:else if form?.message}
    <div class={`mb-3 rounded-2xl border px-4 py-3 text-[12px] font-medium ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>{form.message}</div>
  {/if}

  <section class="mb-5 rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex items-start gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><Users size={19} aria-hidden="true" /></span>
        <div>
          <h2 class="text-[16px] font-semibold text-[#11182C]">Equipes de atendimento</h2>
          <p class="mt-1 max-w-[720px] text-[11px] leading-5 text-[#858A98]">Agrupe os integrantes responsáveis pelas filas e áreas de atendimento. Depois, defina a equipe principal em Configurações de atendimento.</p>
        </div>
      </div>
      <a href="/app/settings/atendimento" class="application-text-caption inline-flex min-h-9 shrink-0 items-center justify-center rounded-xl border border-[#DDE1EA] bg-white px-3 font-semibold text-[#000A57] hover:bg-[#F8F9FC]">Configurar atendimento</a>
    </div>

    {#if data.teamManagement.teams.length === 0}
      <div class="mt-5 rounded-2xl border border-dashed border-[#D7DAE3] bg-[#FAFAFC] px-4 py-5">
        <p class="text-[12px] font-semibold text-[#4B5160]">Nenhuma equipe cadastrada</p>
        <p class="application-text-caption mt-1 leading-5 text-[#7C8291]">Crie a primeira equipe para poder vinculá-la ao Suporte F10, Nota Fiscal e CELL COIN.</p>
      </div>
    {:else}
      <div class="mt-5 grid gap-3 lg:grid-cols-2">
        {#each data.teamManagement.teams as team}
          <div class="rounded-2xl border border-[#E5E7ED] bg-[#FAFAFC] p-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <strong class="text-[13px] font-semibold text-[#252C3D]">{team.name}</strong>
                  <span class={`application-text-meta rounded-full px-2 py-1 font-bold ${team.active ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#F1F2F5] text-[#777D8C]"}`}>{team.active ? "Ativa" : "Inativa"}</span>
                  {#if team.inUse}<span class="application-text-meta rounded-full bg-[#EEF0FF] px-2 py-1 font-bold text-[#000A57]">Em uso</span>{/if}
                </div>
                <p class="application-text-meta mt-1 text-[#8B909E]">{team.members.length} {team.members.length === 1 ? "integrante" : "integrantes"}</p>
              </div>
            </div>

            {#if data.canManageTeams}
              <details class="mt-4 rounded-xl border border-[#E1E4EC] bg-white p-3">
                <summary class="application-text-caption cursor-pointer list-none font-semibold text-[#000A57]">Editar equipe</summary>
                <form method="POST" action="?/updateTeam" class="mt-4 space-y-4">
                  <input type="hidden" name="teamId" value={team.id} />
                  <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Nome</span><input name="name" required minlength="2" maxlength="80" value={team.name} class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[12px] outline-none transition focus:border-[#000A57] focus:ring-2 focus:ring-[#000A57]/10" /></label>
                  <label class="application-text-caption flex items-center gap-2 font-semibold text-[#555B6B]"><input name="active" type="checkbox" checked={team.active} class="h-4 w-4 rounded border-[#C9CEDA]" />Equipe ativa</label>
                  {#if team.inUse}<p class="application-text-meta rounded-xl bg-[#F2F3F8] px-3 py-2 leading-4 text-[#727888]">Equipes vinculadas a filas ou áreas ativas não podem ser desativadas até que o vínculo seja alterado.</p>{/if}

                  <fieldset>
                    <legend class="mb-2 text-[11px] font-semibold text-[#4A5060]">Integrantes</legend>
                    {#if data.teamManagement.users.length === 0}
                      <p class="application-text-caption rounded-xl border border-dashed border-[#D7DAE3] px-3 py-3 text-[#7C8291]">Nenhum usuário ativo ou convidado disponível.</p>
                    {:else}
                      <div class="grid gap-2 sm:grid-cols-2">
                        {#each data.teamManagement.users as user}
                          <label class="flex items-start gap-2 rounded-xl border border-[#E5E7ED] bg-[#FAFAFC] px-3 py-2.5">
                            <input name="memberUserId" value={user.id} type="checkbox" checked={team.members.some((member) => member.userId === user.id)} class="mt-0.5 h-4 w-4 rounded border-[#C9CEDA]" />
                            <span class="min-w-0"><strong class="block truncate text-[11px] font-semibold text-[#414858]">{user.name}</strong><span class="application-text-meta block truncate text-[#8B909E]">{user.email}{user.status === "invited" ? " · convite pendente" : ""}</span></span>
                          </label>
                        {/each}
                      </div>
                    {/if}
                  </fieldset>

                  <button type="submit" class="application-text-caption inline-flex min-h-10 items-center justify-center rounded-xl bg-[#000A57] px-4 font-semibold text-white">Salvar equipe</button>
                </form>
              </details>
            {:else if team.members.length > 0}
              <div class="mt-3 flex flex-wrap gap-2">
                {#each team.members as member}<span class="application-text-meta rounded-full bg-white px-2.5 py-1 font-semibold text-[#646A79]">{member.name}</span>{/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    {#if data.canManageTeams}
      <details class="mt-4 rounded-2xl border border-dashed border-[#D7DAE3] bg-[#FAFBFC] p-4" open={data.teamManagement.teams.length === 0}>
        <summary class="application-text-caption cursor-pointer list-none font-semibold text-[#000A57]">+ Criar equipe de atendimento</summary>
        <form method="POST" action="?/createTeam" class="mt-4 space-y-4">
          <label class="block max-w-[520px]"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Nome da equipe</span><input name="name" required minlength="2" maxlength="80" placeholder="Ex.: Suporte F10" class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[13px] outline-none transition focus:border-[#000A57] focus:ring-2 focus:ring-[#000A57]/10" /></label>
          <fieldset>
            <legend class="mb-2 text-[11px] font-semibold text-[#4A5060]">Integrantes iniciais</legend>
            {#if data.teamManagement.users.length === 0}
              <p class="application-text-caption rounded-xl border border-dashed border-[#D7DAE3] bg-white px-3 py-3 text-[#7C8291]">Ainda não existem usuários ativos ou convidados para adicionar. A equipe pode ser criada sem integrantes e configurada depois.</p>
            {:else}
              <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {#each data.teamManagement.users as user}
                  <label class="flex items-start gap-2 rounded-xl border border-[#E5E7ED] bg-white px-3 py-2.5">
                    <input name="memberUserId" value={user.id} type="checkbox" class="mt-0.5 h-4 w-4 rounded border-[#C9CEDA]" />
                    <span class="min-w-0"><strong class="block truncate text-[11px] font-semibold text-[#414858]">{user.name}</strong><span class="application-text-meta block truncate text-[#8B909E]">{user.email}{user.status === "invited" ? " · convite pendente" : ""}</span></span>
                  </label>
                {/each}
              </div>
            {/if}
          </fieldset>
          <button type="submit" class="application-text-caption inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 font-semibold text-white"><Plus size={14} aria-hidden="true" />Criar equipe</button>
        </form>
      </details>
    {/if}
  </section>

  <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
    <section class="overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
      <header class="flex items-center justify-between gap-4 border-b border-[#EEF0F5] px-5 py-4 sm:px-6">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><UserRound size={19} aria-hidden="true" /></span>
          <div><h2 class="text-[16px] font-semibold text-[#11182C]">Usuários administráveis</h2><p class="mt-1 text-[11px] text-[#858A98]">{data.users.length} registros disponíveis para seu perfil</p></div>
        </div>
      </header>

      {#if data.users.length === 0}
        <div class="px-6 py-14 text-center"><UserRound size={30} class="mx-auto text-[#B5BAC7]" aria-hidden="true" /><p class="mt-4 text-[13px] font-semibold text-[#4B5160]">Nenhum usuário para administrar</p></div>
      {:else}
        <div class="divide-y divide-[#EEF0F5]">
          {#each data.users as user}
            <a href={`/app/team/${user.id}`} class="group flex flex-col gap-3 px-5 py-4 transition hover:bg-[#FAFAFC] sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <span class="min-w-0">
                <span class="flex flex-wrap items-center gap-2">
                  <strong class="truncate text-[13px] font-semibold text-[#202637]">{user.name}</strong>
                  <span class={`application-text-meta rounded-full px-2 py-1 font-bold uppercase tracking-[0.06em] ${user.status === "active" ? "bg-[#EEF8F1] text-[#2F7045]" : user.status === "invited" ? "bg-[#FFF4E9] text-[#A9510D]" : "bg-[#F1F2F5] text-[#777D8C]"}`}>{user.status === "active" ? "Ativo" : user.status === "invited" ? "Convite pendente" : "Inativo"}</span>
                </span>
                <span class="mt-1 block truncate text-[11px] text-[#8B909E]">{user.email}</span>
              </span>
              <span class="flex items-center gap-2">{#each user.roles as role}<span class="application-text-meta rounded-full bg-[#F3F4F7] px-2.5 py-1 font-bold text-[#646A79]">{role}</span>{/each}<ExternalLink size={15} class="ml-1 text-[#A0A5B2] transition group-hover:text-[#EA6D0B]" aria-hidden="true" /></span>
            </a>
          {/each}
        </div>
      {/if}
    </section>

    {#if data.canManage}
      <section class="h-fit rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
        <div class="flex items-start gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF0E4] text-[#EA6D0B]"><Plus size={19} aria-hidden="true" /></span>
          <div><h2 class="text-[16px] font-semibold text-[#11182C]">Adicionar integrante</h2><p class="mt-1 text-[11px] leading-5 text-[#858A98]">O novo integrante define a própria senha pelo link de ativação.</p></div>
        </div>

        <form method="POST" action="?/invite" class="mt-6 space-y-4">
          <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Nome</span><input name="name" required maxlength="120" value={values?.name ?? ""} class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[13px] outline-none transition focus:border-[#000A57] focus:ring-2 focus:ring-[#000A57]/10" /></label>
          <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">E-mail</span><input name="email" type="email" required maxlength="254" value={values?.email ?? ""} class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[13px] outline-none transition focus:border-[#000A57] focus:ring-2 focus:ring-[#000A57]/10" /></label>
          <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Perfil base</span><select name="roleCode" value={values?.roleCode ?? "EMPLOYEE"} class="h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[13px] outline-none transition focus:border-[#000A57] focus:ring-2 focus:ring-[#000A57]/10"><option value="EMPLOYEE">Funcionário</option>{#if data.canCreateAdmin}<option value="ADMIN">Admin</option>{/if}</select></label>
          <label class="flex items-start gap-3 rounded-2xl border border-[#E2E5ED] bg-[#F8F9FC] px-4 py-3">
            <input name="includeInChatRouting" type="checkbox" checked={values?.includeInChatRouting ?? false} class="mt-1 h-4 w-4 rounded border-[#C9CEDA]" />
            <span><strong class="flex items-center gap-2 text-[11px] text-[#303746]"><MessageCircleMore size={14}/>Participar da distribuição do chat</strong><span class="application-text-meta mt-1 block leading-4 text-[#858B99]">Quando a conta for ativada e o usuário estiver Online, poderá entrar na rotação automática de novos atendimentos.</span></span>
          </label>
          <button type="submit" class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 text-[12px] font-semibold text-white transition hover:bg-[#111B71]"><Plus size={17} aria-hidden="true" />Criar convite</button>
        </form>

        <div class="mt-5 flex items-start gap-3 rounded-2xl bg-[#F7F8FB] px-4 py-4"><ShieldCheck size={18} class="mt-0.5 shrink-0 text-[#000A57]" aria-hidden="true" /><p class="application-text-caption leading-5 text-[#747A8A]">Admins podem cadastrar e administrar funcionários. Contas administrativas ficam reservadas ao Super Admin.</p></div>
      </section>
    {/if}
  </div>
</ApplicationContent>
