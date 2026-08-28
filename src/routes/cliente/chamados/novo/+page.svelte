<script lang="ts">
  import { FileText, Paperclip, Send } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  const formValues = form && "values" in form ? form.values : null;
  let globalContext = formValues?.scope === "global";
  let groupValue = formValues?.groupId
    ? String(formValues.groupId)
    : data.selectedGroupId
      ? String(data.selectedGroupId)
      : data.groups.length === 1
        ? String(data.groups[0].grupo_id)
        : "";
  let unitValue = formValues?.unitId
    ? String(formValues.unitId)
    : data.selectedUnitId
      ? String(data.selectedUnitId)
      : "";

  $: selectedGroup = data.groups.find((group) => group.grupo_id === Number(groupValue)) ?? null;
  $: availableUnits = selectedGroup?.unidades ?? [];
  $: if (!globalContext && availableUnits.length === 1 && !unitValue) {
    unitValue = String(availableUnits[0].unidade_id);
  }

  function handleGroupChange(event: Event): void {
    const nextGroupId = Number((event.currentTarget as HTMLSelectElement).value);
    const nextUnits = data.groups.find((group) => group.grupo_id === nextGroupId)?.unidades ?? [];
    unitValue = nextUnits.length === 1 ? String(nextUnits[0].unidade_id) : "";
  }
</script>

<svelte:head><title>Novo chamado | F10 Software</title></svelte:head>

<ApplicationContent width="narrow">
  <ApplicationBackLink href="/cliente/chamados" label="Meus chamados" className="mb-3" />

  <section class="rounded-[22px] border border-[#E1E4EC] bg-white p-5 shadow-[0_10px_32px_rgba(1,13,40,0.04)] sm:p-6">
    <div class="flex items-start gap-3">
      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F1F3FF] text-[#000A57]"><FileText size={19} /></div>
      <div>
        <p class="application-text-caption font-bold uppercase tracking-[0.1em] text-[#EA6D0B]">Central de suporte</p>
        <h1 class="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-[#202737]">Abrir novo chamado</h1>
        <p class="application-text-meta mt-1 leading-5 text-[#858C9C]">Descreva o que aconteceu. A equipe F10 faz a triagem e direciona o chamado internamente.</p>
      </div>
    </div>

    {#if form?.message}
      <div class="application-text-caption mt-5 rounded-xl bg-[#FFF4F1] px-4 py-3 text-[#914D3D]">{form.message}</div>
    {/if}

    <form method="POST" action="?/create" enctype="multipart/form-data" class="mt-6 space-y-5">
      {#if data.allowGlobalContext}
        <label class="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#DDE1E9] bg-[#FAFBFC] p-4">
          <input
            type="checkbox"
            name="globalContext"
            bind:checked={globalContext}
            class="mt-0.5 h-4 w-4 rounded border-[#C7CCD6] text-[#000A57] focus:ring-[#000A57]"
          />
          <span>
            <span class="block text-[12px] font-semibold text-[#404858]">Problema global</span>
            <span class="application-text-meta mt-1 block leading-4 text-[#858C9C]">Marque quando o problema afetar todos os grupos e escolas da sua conta.</span>
          </span>
        </label>
      {/if}

      <div class="grid gap-4 sm:grid-cols-2">
        <label>
          <span class="application-text-caption font-semibold text-[#555D6E]">Grupo</span>
          <select
            name="groupId"
            bind:value={groupValue}
            on:change={handleGroupChange}
            required={!globalContext}
            disabled={globalContext}
            class="application-text-control mt-1.5 h-11 w-full rounded-xl border border-[#DDE1E9] bg-white px-3 outline-none disabled:bg-[#F5F6F8] disabled:text-[#A1A6B0] focus:border-[#000A57]"
          >
            <option value="" disabled>Selecione o grupo</option>
            {#each data.groups as group}
              <option value={String(group.grupo_id)}>{group.grupo}</option>
            {/each}
          </select>
        </label>

        <label>
          <span class="application-text-caption font-semibold text-[#555D6E]">Escola</span>
          <select
            name="unitId"
            bind:value={unitValue}
            required={!globalContext}
            disabled={globalContext || !selectedGroup}
            class="application-text-control mt-1.5 h-11 w-full rounded-xl border border-[#DDE1E9] bg-white px-3 outline-none disabled:bg-[#F5F6F8] disabled:text-[#A1A6B0] focus:border-[#000A57]"
          >
            <option value="" disabled>{selectedGroup ? "Selecione a escola" : "Selecione o grupo primeiro"}</option>
            {#each availableUnits as unit}
              <option value={String(unit.unidade_id)}>{unit.unidade}</option>
            {/each}
          </select>
        </label>
      </div>

      <label class="block">
        <span class="application-text-caption font-semibold text-[#555D6E]">Assunto</span>
        <input name="subject" required minlength="3" maxlength="180" value={formValues?.subject ?? ""} placeholder="Ex.: Não consigo concluir o fechamento da turma" class="application-text-control mt-1.5 h-11 w-full rounded-xl border border-[#DDE1E9] px-3 outline-none focus:border-[#000A57] focus:ring-4 focus:ring-[#000A57]/10" />
      </label>

      <label class="block">
        <span class="application-text-caption font-semibold text-[#555D6E]">Descrição</span>
        <textarea name="message" required maxlength="10000" rows="7" placeholder="Explique o que você estava fazendo, o que aconteceu e, se houver, a mensagem de erro exibida." class="application-text-control mt-1.5 w-full resize-y rounded-2xl border border-[#DDE1E9] px-4 py-3 leading-5 outline-none focus:border-[#000A57] focus:ring-4 focus:ring-[#000A57]/10">{formValues?.message ?? ""}</textarea>
      </label>

      <label class="block rounded-2xl border border-dashed border-[#CCD2DE] bg-[#FAFBFC] p-4">
        <span class="flex items-center gap-2 text-[12px] font-semibold text-[#4F5768]"><Paperclip size={15} />Anexos</span>
        <input type="file" name="files" multiple accept="image/png,image/jpeg,image/webp,application/pdf" class="application-text-control mt-3 block w-full text-[#666E7F]" />
        <p class="application-text-meta mt-2 text-[#9399A6]">Até 4 arquivos PNG, JPG, WEBP ou PDF, com no máximo 10 MB cada.</p>
      </label>

      <div class="flex flex-col-reverse gap-2 border-t border-[#ECEEF3] pt-5 sm:flex-row sm:items-center sm:justify-end">
        <a href="/cliente/chamados" class="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#DDE1E9] px-5 text-[11px] font-semibold text-[#606879]">Cancelar</a>
        <button type="submit" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#000A57] px-5 text-[11px] font-semibold text-white hover:bg-[#111B71]"><Send size={15} />Abrir chamado</button>
      </div>
    </form>
  </section>
</ApplicationContent>
