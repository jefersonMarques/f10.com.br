<script lang="ts">
  import { ArrowLeft, Building2, Link2, Search, ShieldAlert, Users, CheckCircle2 } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { PageData, ActionData } from "./$types";
  import { F10_CUSTOMER_ROLES } from "$lib/server/support/f10CustomerAccessParsing";

  export let data: PageData;
  export let form: ActionData;

  function href(page: number, userId?: string): string {
    const params = new URLSearchParams();
    if (userId) params.set("user", userId);
    if (data.query) params.set("q", data.query);
    if (userId && data.groupId) params.set("group", data.groupId);
    if (!userId && !data.pendingOnly) params.set("pending", "0");
    if (page > 1) params.set("page", String(page));
    return "/app/customers/access?" + params.toString();
  }
  function date(value: Date | string | null): string {
    if (!value) return "Sem registro";
    const valueDate = new Date(value);
    return Number.isNaN(valueDate.getTime()) ? "Sem registro" :
      new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(valueDate);
  }
</script>

<svelte:head><title>Atribuir unidades | Clientes F10</title></svelte:head>

<ApplicationContent width="wide">
  <header class="mb-5 flex flex-wrap items-center justify-between gap-3">
    <div>
      <a href={data.details ? "/app/customers/access" : "/app/customers"}
        class="application-text-meta mb-1 inline-flex items-center gap-1 font-semibold text-app-primary">
        <ArrowLeft size={16}/> {data.details ? "Pessoas e vínculos" : "Clientes"}
      </a>
      <h1 class="text-xl font-bold text-app-text">{data.details ? "Atribuir unidades" : "Pessoas e vínculos"}</h1>
      <p class="application-text-caption mt-1 text-app-text-muted">
        Grupos reconhecidos pelo login · Unidades atribuídas manualmente
      </p>
    </div>
    {#if !data.details}
      <span class="application-text-caption rounded-lg bg-app-subtle px-3 py-2 text-app-text-muted">Operação {data.unitId}</span>
    {/if}
  </header>

  {#if form?.message}
    <div role="alert" class="application-text-caption mb-4 flex items-center gap-2 rounded-xl bg-app-warning-bg p-3 text-app-warning-text">
      <ShieldAlert size={17}/>{form.message}
    </div>
  {/if}

  {#if data.details}
    <section class="mb-4 rounded-2xl border border-app-border bg-app-surface p-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="application-text-caption font-bold text-app-text">{data.details.user.name}</h2>
          <p class="application-text-caption mt-1 text-app-text-muted">
            {data.details.user.email ?? "Sem e-mail"} · ID {data.details.user.userId}
          </p>
        </div>
        <span class={Number(data.details.user.assignedCount) > 0
          ? "application-text-caption inline-flex items-center gap-1.5 rounded-full bg-app-success-bg px-3 py-1.5 font-semibold text-app-success-text"
          : "application-text-caption rounded-full bg-app-warning-bg px-3 py-1.5 font-semibold text-app-warning-text"}>
          {#if Number(data.details.user.assignedCount) > 0}<CheckCircle2 size={15}/>{/if}
          {Number(data.details.user.assignedCount)} unidade(s) atribuída(s)
        </span>
      </div>
      <div class="mt-4 flex flex-wrap gap-2">
        {#each data.details.groups as group}
          <span class={group.commercialName
            ? "application-text-caption inline-flex items-center gap-1.5 rounded-lg border border-app-border px-3 py-2 text-app-text"
            : "application-text-caption inline-flex items-center gap-1.5 rounded-lg bg-app-warning-bg px-3 py-2 text-app-warning-text"}>
            <Building2 size={15}/> {group.commercialName ?? group.groupName} · Grupo {group.groupId}
            {#if !group.commercialName} · Não cadastrado{/if}
          </span>
        {/each}
      </div>
      <p class="application-text-meta mt-3 text-app-text-muted">
        Grupos do último login: {date(data.details.user.authenticatedAt)}. As atribuições abaixo não alteram o acesso ao portal.
      </p>
    </section>

    <section class="overflow-hidden rounded-2xl border border-app-border bg-app-surface">
      <form method="GET" action="/app/customers/access" class="flex flex-wrap items-end gap-2 border-b border-app-border-soft p-4">
        <input type="hidden" name="user" value={data.details.user.userId}/>
        <label class="min-w-[200px] flex-1">
          <span class="application-text-meta mb-1 block font-semibold text-app-text-muted">Unidade ou contrato</span>
          <span class="relative block">
            <Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-muted"/>
            <input name="q" value={data.query} placeholder="Buscar unidade ou número"
              class="application-text-caption h-10 w-full rounded-xl border border-app-border-control bg-app-subtle pl-9 pr-3 text-app-text"/>
          </span>
        </label>
        <label class="min-w-[190px] flex-1 sm:flex-none">
          <span class="application-text-meta mb-1 block font-semibold text-app-text-muted">Grupo</span>
          <select name="group" class="application-text-caption h-10 w-full rounded-xl border border-app-border-control bg-app-subtle px-3 text-app-text">
            <option value="">Todos os grupos</option>
            {#each data.details.groups.filter((group) => group.commercialName) as group}
              <option value={group.groupId} selected={data.groupId === group.groupId}>{group.commercialName}</option>
            {/each}
          </select>
        </label>
        <button type="submit" class="application-text-caption h-10 rounded-xl bg-app-primary px-4 font-semibold text-white">Buscar</button>
      </form>
      {#if data.details.units.length === 0}
        <div class="application-text-caption p-6 text-center text-app-text-muted">
          Nenhuma unidade disponível para os grupos deste usuário.
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full min-w-[760px] text-left">
            <thead class="application-text-meta bg-app-subtle text-app-text-muted">
              <tr>
                <th class="px-4 py-3 font-semibold">Unidade / contrato</th>
                <th class="px-4 py-3 font-semibold">Grupo</th>
                <th class="px-4 py-3 font-semibold">Vínculo</th>
                <th class="px-4 py-3 font-semibold">Função e ação</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-app-border-soft">
              {#each data.details.units as unit}
                <tr>
                  <td class="application-text-caption px-4 py-3 align-top">
                    <strong class="block text-app-text">{String(unit.apelido)}</strong>
                    <span class="application-text-meta mt-1 block text-app-text-muted">Nº {String(unit.source_id)} · {String(unit.commercial_status ?? "")}</span>
                  </td>
                  <td class="application-text-caption px-4 py-3 align-top text-app-text-muted">{String(unit.group_name)}</td>
                  <td class="application-text-caption px-4 py-3 align-top">
                    {#if unit.function_role}
                      <span class="font-semibold text-app-success-text">Atribuída</span>
                    {:else}
                      <span class="font-semibold text-app-warning-text">Sem atribuição</span>
                    {/if}
                  </td>
                  <td class="px-4 py-3 align-top">
                    <div class="flex flex-wrap items-center gap-2">
                      <form method="POST" action="?/changeAssignment" class="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="userId" value={data.details.user.userId}/>
                        <input type="hidden" name="customerUnitId" value={String(unit.id)}/>
                        <input type="hidden" name="action" value="assign"/>
                        <select name="role" aria-label="Função do usuário" class="application-text-caption h-9 rounded-lg border border-app-border-control bg-app-subtle px-2 text-app-text">
                          {#each F10_CUSTOMER_ROLES as role}
                            <option value={role.value} selected={String(unit.function_role ?? "contato") === role.value}>{role.label}</option>
                          {/each}
                        </select>
                        <button type="submit" class="application-text-caption h-9 rounded-lg bg-app-primary px-3 font-semibold text-white">
                          {unit.function_role ? "Salvar" : "Atribuir"}
                        </button>
                      </form>
                      {#if unit.function_role}
                        <form method="POST" action="?/changeAssignment"
                          on:submit={(event) => {
                            if (!window.confirm("Remover a atribuição desta unidade?")) event.preventDefault();
                          }}>
                          <input type="hidden" name="userId" value={data.details.user.userId}/>
                          <input type="hidden" name="customerUnitId" value={String(unit.id)}/>
                          <input type="hidden" name="action" value="remove"/>
                          <button type="submit" class="application-text-caption h-9 rounded-lg border border-app-border-control px-3 text-app-text">Remover</button>
                        </form>
                      {/if}
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        {#if data.details.pages > 1}
          <div class="flex items-center justify-between border-t border-app-border-soft px-4 py-3">
            <span class="application-text-caption text-app-text-muted">Página {data.details.page} de {data.details.pages}</span>
            <div class="flex gap-2">
              {#if data.details.page > 1}
                <a href={href(data.details.page - 1, data.details.user.userId)} class="application-text-caption rounded-lg border border-app-border-control px-3 py-2 text-app-text">Anterior</a>
              {/if}
              {#if data.details.page < data.details.pages}
                <a href={href(data.details.page + 1, data.details.user.userId)} class="application-text-caption rounded-lg bg-app-primary px-3 py-2 font-semibold text-white">Próxima</a>
              {/if}
            </div>
          </div>
        {/if}
      {/if}
    </section>
  {:else if data.people}
    <section class="overflow-hidden rounded-2xl border border-app-border bg-app-surface">
      <div class="flex flex-wrap items-end justify-between gap-3 border-b border-app-border-soft p-4">
        <form method="GET" action="/app/customers/access" class="flex min-w-[230px] flex-1 flex-wrap items-end gap-2">
          <label class="min-w-[180px] flex-1">
            <span class="application-text-meta mb-1 block font-semibold text-app-text-muted">Pessoa</span>
            <input type="search" name="q" value={data.query} placeholder="Nome, e-mail ou ID"
              class="application-text-caption h-10 w-full rounded-xl border border-app-border-control bg-app-subtle px-3 text-app-text"/>
          </label>
          <input type="hidden" name="pending" value={data.pendingOnly ? "1" : "0"}/>
          <button type="submit" class="application-text-caption h-10 rounded-lg bg-app-primary px-4 font-semibold text-white">Buscar</button>
        </form>
        <a href={data.pendingOnly ? "/app/customers/access?pending=0" : "/app/customers/access"}
          class="application-text-caption inline-flex h-10 items-center rounded-lg border border-app-border-control px-4 font-semibold text-app-text">
          {data.pendingOnly ? "Mostrar todos" : "Somente sem atribuição"}
        </a>
      </div>
      <div class="flex justify-between border-b border-app-border-soft px-4 py-3">
        <strong class="application-text-caption text-app-text">{data.people.total} pessoa(s) {data.pendingOnly ? "sem atribuição" : "identificada(s)"}</strong>
        <span class="application-text-meta text-app-text-muted">20 por página</span>
      </div>
      {#if data.people.rows.length === 0}
        <p class="application-text-caption p-8 text-center text-app-text-muted">
          {data.pendingOnly ? "Nenhuma pessoa pendente encontrada." : "Nenhuma pessoa autenticada encontrada."}
        </p>
      {:else}
        <div class="divide-y divide-app-border-soft">
          {#each data.people.rows as person}
            <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div class="min-w-0 flex-1">
                <div class="application-text-caption font-semibold text-app-text">{person.name}</div>
                <div class="application-text-meta mt-1 text-app-text-muted">{person.email ?? "Sem e-mail"} · ID {person.userId}</div>
                <div class="mt-2 flex flex-wrap gap-1.5">
                  {#each person.groups as group}
                    <span class={group.matched
                      ? "application-text-meta rounded-lg bg-app-subtle px-2 py-1 text-app-text-muted"
                      : "application-text-meta rounded-lg bg-app-warning-bg px-2 py-1 text-app-warning-text"}>
                      {group.commercialName ?? group.groupName} · {group.groupId}
                      {#if !group.matched} (sem grupo na planilha){/if}
                    </span>
                  {/each}
                  {#if !person.hasSnapshot}
                    <span class="application-text-meta rounded-lg bg-app-warning-bg px-2 py-1 text-app-warning-text">Sem histórico de grupos</span>
                  {/if}
                </div>
              </div>
              <div class="flex items-center gap-3">
                <span class={person.assignedCount > 0 ? "application-text-caption font-semibold text-app-success-text" : "application-text-caption font-semibold text-app-warning-text"}>
                  {person.assignedCount > 0 ? person.assignedCount + " atribuída(s)" : "Sem atribuição"}
                </span>
                <a href={"/app/customers/access?user=" + encodeURIComponent(person.userId)}
                  class="application-text-caption inline-flex h-9 items-center gap-2 rounded-lg border border-app-border-control px-3 font-semibold text-app-text">
                  <Link2 size={16}/> Gerenciar
                </a>
              </div>
            </div>
          {/each}
        </div>
        {#if data.people.pages > 1}
          <div class="flex items-center justify-between gap-2 border-t border-app-border-soft p-4">
            <span class="application-text-caption text-app-text-muted">Página {data.people.page} de {data.people.pages}</span>
            <div class="flex gap-2">
              {#if data.people.page > 1}
                <a href={href(data.people.page - 1)} class="application-text-caption rounded-lg border border-app-border-control px-3 py-2 text-app-text">Anterior</a>
              {/if}
              {#if data.people.page < data.people.pages}
                <a href={href(data.people.page + 1)} class="application-text-caption rounded-lg bg-app-primary px-3 py-2 font-semibold text-white">Próxima</a>
              {/if}
            </div>
          </div>
        {/if}
      {/if}
    </section>
  {/if}
</ApplicationContent>
