<script lang="ts">
  import { Plus, Save, ShieldCheck } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  const initialProfileId = form && "profileId" in form && typeof form.profileId === "string"
    ? form.profileId
    : data.profiles[0]?.id ?? "";
  let selectedProfileId = initialProfileId;

  $: selectedProfile = data.profiles.find((profile) => profile.id === selectedProfileId) ?? null;

  function grantScope(permissionCode: string): string {
    return selectedProfile?.grants.find((grant) => grant.permissionCode === permissionCode)?.scope ?? "own";
  }

  function hasGrant(permissionCode: string): boolean {
    return selectedProfile?.grants.some((grant) => grant.permissionCode === permissionCode) ?? false;
  }
</script>

<svelte:head><title>Perfis de acesso | F10 Operations</title></svelte:head>

<ApplicationContent width="standard">
  <ApplicationBackLink href="/app/settings" label="Configurações" className="mb-3" />

  {#if form?.message}
    <div class={form.success
      ? "application-text-caption mb-4 rounded-2xl border border-app-success-border bg-app-success-bg px-4 py-3 font-medium text-app-success-text"
      : "application-text-caption mb-4 rounded-2xl border border-app-danger-border bg-app-danger-bg px-4 py-3 font-medium text-app-danger-text"}>{form.message}</div>
  {/if}

  <div class="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
    <aside class="space-y-4">
      <section class="rounded-[22px] border border-app-border bg-app-surface p-4">
        <div class="flex items-center gap-2">
          <ShieldCheck size={17} class="text-app-primary"/>
          <h2 class="text-[14px] font-semibold text-app-text">Perfis de acesso</h2>
        </div>

        <div class="mt-4 space-y-2">
          {#each data.profiles as profile}
            <button
              type="button"
              on:click={() => (selectedProfileId = profile.id)}
              class={"w-full rounded-xl border px-3 py-3 text-left transition " + (selectedProfileId === profile.id ? "border-app-primary bg-app-selected" : "border-app-border hover:bg-app-subtle")}
            >
              <strong class="application-text-caption block text-app-text">{profile.name}</strong>
              <span class="application-text-meta mt-1 block text-app-text-soft">{profile.isSystem ? "Padrão do sistema" : profile.grants.length + " permissões"}</span>
            </button>
          {/each}
        </div>
      </section>

      <form method="POST" action="?/create" class="rounded-[22px] border border-app-border bg-app-surface p-4">
        <label class="block">
          <span class="application-text-caption font-semibold text-app-text-muted">Novo perfil</span>
          <input name="name" required minlength="2" maxlength="80" placeholder="Ex.: Comercial" class="application-text-caption mt-2 h-10 w-full rounded-xl border border-app-border-control bg-app-surface px-3"/>
        </label>
        <button type="submit" class="application-text-caption mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-app-primary px-4 font-semibold text-white"><Plus size={14}/>Criar perfil</button>
      </form>
    </aside>

    {#if selectedProfile}
      <section class="overflow-hidden rounded-[22px] border border-app-border bg-app-surface">
        <header class="border-b border-app-border-soft px-5 py-5 sm:px-6">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-[17px] font-semibold text-app-text">{selectedProfile.name}</h2>
              <p class="application-text-meta mt-1 text-app-text-soft">{selectedProfile.isSystem ? "Perfil protegido." : "Defina os acessos herdados por todos os usuários deste perfil."}</p>
            </div>
            {#if selectedProfile.isSystem}
              <span class="application-text-meta rounded-full bg-app-muted px-2.5 py-1 font-bold text-app-text-muted">Sistema</span>
            {/if}
          </div>
        </header>

        {#if selectedProfile.isSystem}
          <div class="divide-y divide-app-border-soft">
            {#each data.permissionCatalog.filter((permission) => hasGrant(permission.code)) as permission}
              <div class="flex items-center justify-between gap-4 px-5 py-3 sm:px-6">
                <span class="application-text-caption font-semibold text-app-text">{permission.name}</span>
                <span class="application-text-meta rounded-full bg-app-muted px-2 py-1 font-bold text-app-text-muted">{grantScope(permission.code) === "all" ? "Tudo" : grantScope(permission.code) === "team" ? "Equipe" : "Próprio"}</span>
              </div>
            {/each}
          </div>
        {:else}
          <form method="POST" action="?/update">
            <input type="hidden" name="profileId" value={selectedProfile.id}/>
            <div class="border-b border-app-border-soft px-5 py-4 sm:px-6">
              <label class="block max-w-[440px]">
                <span class="application-text-meta font-bold uppercase tracking-[0.07em] text-app-text-soft">Nome</span>
                <input name="name" value={selectedProfile.name} required minlength="2" maxlength="80" class="application-text-caption mt-1.5 h-10 w-full rounded-xl border border-app-border-control bg-app-surface px-3"/>
              </label>
            </div>

            <div class="divide-y divide-app-border-soft">
              {#each data.permissionCatalog as permission}
                <div class="grid gap-3 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_150px] sm:items-center sm:px-6">
                  <label class="flex min-w-0 items-start gap-3">
                    <input name="permissionCode" type="checkbox" value={permission.code} checked={hasGrant(permission.code)} class="mt-0.5 h-4 w-4 rounded border-app-border-control"/>
                    <span class="min-w-0">
                      <strong class="application-text-caption block text-app-text">{permission.name}</strong>
                      <span class="application-text-meta mt-0.5 block text-app-text-soft">{permission.description}</span>
                    </span>
                  </label>
                  <select name={"scope:" + permission.code} value={grantScope(permission.code)} class="application-text-caption h-9 rounded-lg border border-app-border-control bg-app-surface px-2">
                    <option value="own">Próprio</option>
                    <option value="team">Equipe</option>
                    <option value="all">Tudo</option>
                  </select>
                </div>
              {/each}
            </div>

            <div class="flex justify-end border-t border-app-border-soft px-5 py-4 sm:px-6">
              <button type="submit" class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-xl bg-app-primary px-4 font-semibold text-white"><Save size={14}/>Salvar perfil</button>
            </div>
          </form>
        {/if}
      </section>
    {/if}
  </div>
</ApplicationContent>
