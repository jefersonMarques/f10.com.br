<script lang="ts">
  import { onMount } from "svelte";
  import {
    CheckCircle2, ChevronRight, Copy, Filter, Plus, Search, ShieldCheck,
    UserPlus, Users, X,
  } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import UserAvatar from "$lib/components/application/UserAvatar.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  type ModalMode = "person" | "team" | "invite" | null;
  let activeTab: "people" | "teams" =
    form && "action" in form &&
    (form.action === "createTeam" || form.action === "updateTeam")
      ? "teams" : "people";
  let search = "";
  let statusFilter = "all";
  let profileFilter = "all";
  let teamFilter = "all";
  let sortBy = "name";
  let modalMode: ModalMode = null;
  let selectedUserId: string | null = null;
  let selectedTeamId: string | null = null;
  let modalElement: HTMLDialogElement;
  let inviteRoleCode = data.accessProfiles[0]?.code ?? "";

  $: values = form && "values" in form ? form.values : null;
  $: inviteCanUseChat = data.accessProfiles
    .find((profile) => profile.code === inviteRoleCode)
    ?.grants.some((grant) => grant.permissionCode === "chat.respond") ?? false;
  $: selectedUser = data.users.find((user) => user.id === selectedUserId);
  $: selectedTeam = data.teamManagement.teams.find((team) => team.id === selectedTeamId);
  $: filteredUsers = data.users
    .filter((user) => {
      const term = search.trim().toLocaleLowerCase("pt-BR");
      const matchesTerm = !term || user.name.toLocaleLowerCase("pt-BR").includes(term)
        || user.email.toLocaleLowerCase("pt-BR").includes(term);
      const matchesProfile = profileFilter === "all" || user.roles.includes(profileFilter);
      const matchesTeam = teamFilter === "all" ||
        data.teamManagement.teams.some((team) =>
          team.id === teamFilter && team.members.some((member) => member.userId === user.id));
      return matchesTerm && matchesProfile && matchesTeam &&
        (statusFilter === "all" || user.status === statusFilter);
    })
    .sort((first, second) => sortBy === "recent"
      ? (new Date(second.lastLoginAt ?? 0).getTime() - new Date(first.lastLoginAt ?? 0).getTime())
      : first.name.localeCompare(second.name, "pt-BR"));

  function initials(name: string): string {
    return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
  }

  function openModal(mode: Exclude<ModalMode, null>, id: string | null = null): void {
    modalMode = mode;
    selectedUserId = mode === "person" ? id : null;
    selectedTeamId = mode === "team" ? id : null;
    if (!modalElement.open) modalElement.showModal();
  }

  function closeModal(): void {
    modalElement.close();
    modalMode = null;
  }

  async function copyInviteLink(url: string): Promise<void> {
    if (navigator.clipboard) await navigator.clipboard.writeText(url);
  }

  onMount(() => {
    if (values && form?.success === false) openModal("invite");
  });
</script>

<svelte:head><title>Equipe | Helpdesk F10</title></svelte:head>

<ApplicationContent width="wide">
  {#if form?.inviteUrl}
    <div role="status" class="mb-4 rounded-xl border border-app-success-border bg-app-success-bg p-4 text-app-success-text">
      <div class="flex items-center gap-2"><CheckCircle2 size={18}/><strong class="application-text-caption">Convite criado para {form.invitedUserName}</strong></div>
      <div class="mt-3 flex flex-wrap gap-2">
        <input readonly value={form.inviteUrl} aria-label="Link de ativação" class="application-text-caption h-10 min-w-0 flex-1 rounded-lg border border-app-border-control bg-app-surface px-3 text-app-text"/>
        <button type="button" on:click={() => void copyInviteLink(form.inviteUrl)}
          class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-lg bg-app-primary px-4 font-semibold text-white">
          <Copy size={15}/> Copiar link
        </button>
      </div>
    </div>
  {:else if form?.message}
    <div role="status" class={`application-text-caption mb-4 rounded-xl border px-4 py-3 ${form.success ? "border-app-success-border bg-app-success-bg text-app-success-text" : "border-app-danger-border bg-app-danger-bg text-app-danger-text"}`}>
      {form.message}
    </div>
  {/if}

  <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
    <div class="flex items-center gap-2">
      <Users size={21} class="text-app-primary"/>
      <h2 class="application-text-section font-semibold text-app-text">Pessoas e equipes</h2>
    </div>
    <div class="flex gap-2">
      <a href="/app/settings/access-profiles"
        class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-lg border border-app-border-control px-3 font-semibold text-app-text">
        <ShieldCheck size={16}/> Perfis de acesso
      </a>
      {#if data.canManage}
        <button type="button" on:click={() => openModal("invite")}
          class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-lg bg-app-primary px-3 font-semibold text-white">
          <UserPlus size={16}/> Convidar
        </button>
      {/if}
    </div>
  </header>

  <nav class="mb-4 flex gap-2" aria-label="Gestão de equipe">
    <button type="button" class:active={activeTab === "people"} on:click={() => (activeTab = "people")}
      class="application-text-caption min-h-10 rounded-lg border border-app-border-control px-4 font-semibold text-app-text">
      Pessoas ({data.users.length})
    </button>
    <button type="button" class:active={activeTab === "teams"} on:click={() => (activeTab = "teams")}
      class="application-text-caption min-h-10 rounded-lg border border-app-border-control px-4 font-semibold text-app-text">
      Equipes ({data.teamManagement.teams.length})
    </button>
  </nav>

  {#if activeTab === "people"}
    <section class="overflow-hidden rounded-xl border border-app-border bg-app-surface">
      <div class="flex flex-wrap gap-2 border-b border-app-border p-3">
        <label class="flex min-h-10 min-w-[180px] flex-1 items-center gap-2 rounded-lg border border-app-border-control px-3">
          <Search size={16} class="shrink-0 text-app-text-soft"/>
          <input bind:value={search} aria-label="Buscar pessoas" placeholder="Nome ou e-mail"
            class="application-text-caption min-w-0 flex-1 bg-transparent text-app-text outline-none"/>
        </label>
        <Filter size={18} class="self-center text-app-text-soft"/>
        <select bind:value={statusFilter} aria-label="Filtrar status" class="application-text-caption min-h-10 rounded-lg border border-app-border-control bg-app-surface px-2 text-app-text">
          <option value="all">Todos os status</option><option value="active">Ativos</option>
          <option value="invited">Convidados</option><option value="inactive">Inativos</option>
        </select>
        <select bind:value={profileFilter} aria-label="Filtrar perfil" class="application-text-caption min-h-10 rounded-lg border border-app-border-control bg-app-surface px-2 text-app-text">
          <option value="all">Todos os perfis</option>
          {#each data.accessProfiles as profile (profile.code)}
            <option value={profile.code}>{profile.name}</option>
          {/each}
        </select>
        <select bind:value={teamFilter} aria-label="Filtrar equipe" class="application-text-caption min-h-10 rounded-lg border border-app-border-control bg-app-surface px-2 text-app-text">
          <option value="all">Todas as equipes</option>
          {#each data.teamManagement.teams as team (team.id)}
            <option value={team.id}>{team.name}</option>
          {/each}
        </select>
        <select bind:value={sortBy} aria-label="Ordenar pessoas" class="application-text-caption min-h-10 rounded-lg border border-app-border-control bg-app-surface px-2 text-app-text">
          <option value="name">Nome A–Z</option><option value="recent">Último acesso</option>
        </select>
      </div>
      <div class="divide-y divide-app-border">
        {#each filteredUsers as user (user.id)}
          <button type="button" on:click={() => openModal("person", user.id)}
            class="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-app-subtle">
            <UserAvatar userId={user.id} name={user.name} hasAvatar={user.hasAvatar} />
            <span class="min-w-0 flex-1">
              <strong class="application-text-caption block truncate text-app-text">{user.name}</strong>
              <span class="application-text-meta block truncate text-app-text-soft">{user.email} · {user.roleNames.join(", ") || "Sem perfil"}</span>
            </span>
            <span class:positive={user.status === "active"}
              class="application-text-meta rounded-full bg-app-subtle px-2 py-1 font-semibold text-app-text-soft">
              {user.status === "active" ? "Ativo" : user.status === "invited" ? "Convite pendente" : "Inativo"}
            </span>
            <ChevronRight size={17} class="text-app-text-soft"/>
          </button>
        {:else}
          <p class="application-text-caption p-6 text-center text-app-text-soft">Nenhuma pessoa corresponde aos filtros.</p>
        {/each}
      </div>
    </section>
  {:else}
    <section class="rounded-xl border border-app-border bg-app-surface p-4">
      <div class="mb-4 flex items-center justify-between gap-2">
        <h3 class="application-text-caption font-semibold text-app-text">Equipes de atendimento</h3>
        {#if data.canManageTeams}
          <button type="button" on:click={() => openModal("team")}
            class="application-text-caption inline-flex min-h-9 items-center gap-2 rounded-lg border border-app-border-control px-3 font-semibold text-app-primary">
            <Plus size={15}/> Nova equipe
          </button>
        {/if}
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        {#each data.teamManagement.teams as team (team.id)}
          <button type="button" on:click={() => openModal("team", team.id)}
            class="rounded-xl border border-app-border p-4 text-left hover:bg-app-subtle">
            <span class="flex items-center justify-between gap-2">
              <strong class="application-text-caption text-app-text">{team.name}</strong>
              <span class="application-text-meta text-app-text-soft">{team.active ? "Ativa" : "Inativa"}</span>
            </span>
            <span class="application-text-caption mt-2 block text-app-text-soft">{team.members.length} integrantes{team.inUse ? " · Em uso" : ""}</span>
          </button>
        {:else}
          <p class="application-text-caption text-app-text-soft">Nenhuma equipe cadastrada.</p>
        {/each}
      </div>
    </section>
  {/if}
</ApplicationContent>

<dialog bind:this={modalElement} on:close={() => (modalMode = null)}
  class="w-[min(94vw,640px)] max-h-[90vh] overflow-y-auto rounded-2xl border border-app-border bg-app-surface p-0 text-app-text shadow-xl backdrop:bg-black/40">
  <div class="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-app-border bg-app-surface p-4">
    <h2 class="application-text-section font-semibold text-app-text">
      {modalMode === "person" ? "Detalhes do usuário" : modalMode === "invite" ? "Convidar integrante" : selectedTeam ? "Editar equipe" : "Nova equipe"}
    </h2>
    <button type="button" on:click={closeModal} aria-label="Fechar" class="rounded-lg p-2 hover:bg-app-subtle"><X size={18}/></button>
  </div>

  {#if modalMode === "person" && selectedUser}
    <div class="space-y-4 p-4">
      <div class="flex items-center gap-3">
        <UserAvatar userId={selectedUser.id} name={selectedUser.name} hasAvatar={selectedUser.hasAvatar} size="md"/>
        <div class="min-w-0">
          <strong class="application-text-caption block text-app-text">{selectedUser.name}</strong>
          <span class="application-text-caption block truncate text-app-text-soft">{selectedUser.email}</span>
        </div>
      </div>
      <dl class="application-text-caption grid gap-3 sm:grid-cols-2">
        <div><dt class="text-app-text-soft">Conta</dt><dd class="font-semibold">{selectedUser.status === "active" ? "Ativa" : selectedUser.status === "invited" ? "Convite pendente" : "Inativa"}</dd></div>
        <div><dt class="text-app-text-soft">Último login</dt><dd class="font-semibold">{selectedUser.lastLoginAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(selectedUser.lastLoginAt)) : "Não registrado"}</dd></div>
        <div><dt class="text-app-text-soft">Perfil</dt><dd class="font-semibold">{selectedUser.roleNames.join(", ") || "Não atribuído"}</dd></div>
        <div><dt class="text-app-text-soft">Equipes</dt><dd class="font-semibold">
          {data.teamManagement.teams.filter((team) => team.members.some((member) => member.userId === selectedUser.id)).map((team) => team.name).join(", ") || "Nenhuma"}
        </dd></div>
      </dl>
      <div class="flex justify-end">
        <a href={`/app/team/${selectedUser.id}`}
          class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-lg bg-app-primary px-4 font-semibold text-white">
          Gerenciar conta e permissões <ChevronRight size={16}/>
        </a>
      </div>
    </div>
  {:else if modalMode === "invite" && data.canManage}
    <form method="POST" action="?/invite" class="space-y-3 p-4">
      <label class="application-text-caption block font-semibold">Nome
        <input name="name" required maxlength="120" value={values?.name ?? ""} class="mt-1 h-11 w-full rounded-lg border border-app-border-control bg-app-surface px-3 text-app-text"/>
      </label>
      <label class="application-text-caption block font-semibold">E-mail
        <input name="email" type="email" required maxlength="254" value={values?.email ?? ""} class="mt-1 h-11 w-full rounded-lg border border-app-border-control bg-app-surface px-3 text-app-text"/>
      </label>
      <label class="application-text-caption block font-semibold">Perfil de acesso
        <select name="roleCode" bind:value={inviteRoleCode} class="mt-1 h-11 w-full rounded-lg border border-app-border-control bg-app-surface px-3 text-app-text">
          {#each data.accessProfiles as profile (profile.code)}
            <option value={profile.code}>{profile.name}</option>
          {/each}
        </select>
      </label>
      {#if inviteCanUseChat}
        <label class="application-text-caption flex items-center gap-2">
          <input name="includeInChatRouting" type="checkbox" checked={values?.includeInChatRouting ?? false}/>
          Participar da distribuição do chat
        </label>
      {/if}
      <div class="flex justify-end">
        <button type="submit" class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-lg bg-app-primary px-4 font-semibold text-white">
          <UserPlus size={16}/> Criar convite
        </button>
      </div>
    </form>
  {:else if modalMode === "team" && data.canManageTeams}
    <form method="POST" action={selectedTeam ? "?/updateTeam" : "?/createTeam"} class="space-y-4 p-4">
      {#if selectedTeam}<input type="hidden" name="teamId" value={selectedTeam.id}/>{/if}
      <label class="application-text-caption block font-semibold">Nome da equipe
        <input name="name" required minlength="2" maxlength="80" value={selectedTeam?.name ?? ""}
          class="mt-1 h-11 w-full rounded-lg border border-app-border-control bg-app-surface px-3 text-app-text"/>
      </label>
      {#if selectedTeam}
        <label class="application-text-caption flex items-center gap-2">
          <input name="active" type="checkbox" checked={selectedTeam.active} disabled={selectedTeam.inUse && selectedTeam.active}/>
          Equipe ativa
        </label>
        {#if selectedTeam.inUse && selectedTeam.active}
          <input name="active" type="hidden" value="on"/>
          <p class="application-text-meta text-app-text-soft">Equipe vinculada a fila ou área ativa.</p>
        {/if}
      {/if}
      <fieldset>
        <legend class="application-text-caption mb-2 font-semibold">Integrantes</legend>
        <div class="grid max-h-60 gap-2 overflow-y-auto sm:grid-cols-2">
          {#each data.teamManagement.users as user (user.id)}
            <label class="application-text-caption flex items-center gap-2 rounded-lg border border-app-border p-2">
              <input name="memberUserId" value={user.id} type="checkbox"
                checked={selectedTeam?.members.some((member) => member.userId === user.id) ?? false}/>
              <span class="min-w-0 truncate">{user.name}</span>
            </label>
          {/each}
        </div>
      </fieldset>
      <div class="flex justify-end">
        <button type="submit" class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-lg bg-app-primary px-4 font-semibold text-white">
          Salvar equipe
        </button>
      </div>
    </form>
  {/if}
</dialog>

<style>
  .active { background: var(--app-primary); border-color: var(--app-primary); color: white; }
  .positive { background: var(--app-success-bg); color: var(--app-success-text); }
</style>
