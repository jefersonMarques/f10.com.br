<script lang="ts">
  import { CheckCircle2, CircleAlert, FolderKanban, Plus, Save } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  $: values = form && "values" in form ? form.values : null;
</script>

<svelte:head><title>Categorias | Base de Conhecimento F10</title></svelte:head>

<ApplicationContent width="wide">
  <ApplicationBackLink href="/app/help" label="Base de Conhecimento" className="mb-3" />

  <div class="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
    <div>
      <h1 class="text-[22px] font-semibold tracking-[-0.03em] text-[#11182C]">Categorias</h1>
      <p class="mt-1 max-w-[760px] text-[11px] leading-5 text-[#858A98]">Organize a Central de Ajuda por áreas como Comercial, Financeiro e Pedagógico. Uma trilha pode aparecer em várias categorias.</p>
    </div>
    <a href="/treinamento/categorias" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#DDE1EA] bg-white px-4 text-[11px] font-semibold text-[#000A57]">Ver catálogo público</a>
  </div>

  {#if form?.message}
    <div class={`mb-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-[12px] font-medium ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>
      {#if form.success}<CheckCircle2 size={18}/>{:else}<CircleAlert size={18}/>{/if}<span>{form.message}</span>
    </div>
  {/if}

  <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
    <section class="overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
      <header class="border-b border-[#EEF0F5] px-5 py-4 sm:px-6"><h2 class="text-[15px] font-semibold text-[#11182C]">Categorias cadastradas</h2><p class="mt-1 text-[10px] text-[#858A98]">Desative uma categoria para escondê-la do catálogo sem perder associações.</p></header>
      {#if data.categories.length === 0}
        <div class="px-6 py-14 text-center"><FolderKanban size={34} class="mx-auto text-[#B6BBC7]"/><p class="mt-4 text-[12px] font-semibold text-[#4B5160]">Nenhuma categoria criada</p></div>
      {:else}
        <div class="divide-y divide-[#EEF0F5]">
          {#each data.categories as category}
            <form method="POST" action="?/update" class="grid gap-3 px-5 py-4 sm:px-6 lg:grid-cols-[70px_1fr_170px]">
              <input type="hidden" name="categoryId" value={category.id}/>
              <label class="block"><span class="mb-1 block text-[9px] font-semibold text-[#777D8C]">Ícone</span><input name="icon" maxlength="32" value={category.icon} disabled={!data.canEdit} placeholder="💼" class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-center text-[18px] disabled:bg-[#F5F6F8]"/></label>
              <div class="grid gap-3 sm:grid-cols-2">
                <label class="block"><span class="mb-1 block text-[9px] font-semibold text-[#777D8C]">Nome</span><input name="name" required maxlength="160" value={category.name} disabled={!data.canEdit} class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px] disabled:bg-[#F5F6F8]"/></label>
                <label class="block"><span class="mb-1 block text-[9px] font-semibold text-[#777D8C]">Endereço</span><input name="slug" maxlength="100" value={category.slug} disabled={!data.canEdit} class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px] disabled:bg-[#F5F6F8]"/></label>
                <label class="block sm:col-span-2"><span class="mb-1 block text-[9px] font-semibold text-[#777D8C]">Descrição mostrada no catálogo</span><input name="description" maxlength="600" value={category.description} disabled={!data.canEdit} class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px] disabled:bg-[#F5F6F8]"/></label>
              </div>
              <div class="flex flex-col justify-between gap-3">
                <label class="block"><span class="mb-1 block text-[9px] font-semibold text-[#777D8C]">Ordem</span><input name="sortOrder" type="number" min="0" max="10000" value={category.sortOrder} disabled={!data.canEdit} class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px] disabled:bg-[#F5F6F8]"/></label>
                <label class="flex items-center gap-2 text-[10px] font-semibold text-[#596071]"><input name="active" type="checkbox" checked={category.active} disabled={!data.canEdit} class="h-4 w-4 rounded border-[#C9CED9]"/>Ativa</label>
                {#if data.canEdit}<button type="submit" class="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl bg-[#000A57] px-3 text-[10px] font-semibold text-white"><Save size={13}/>Salvar</button>{/if}
              </div>
            </form>
          {/each}
        </div>
      {/if}
    </section>

    {#if data.canEdit}
      <aside class="h-fit rounded-[22px] border border-[#E2E5ED] bg-white p-5">
        <div class="flex items-start gap-3"><span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF0E4] text-[#EA6D0B]"><Plus size={18}/></span><div><h2 class="text-[15px] font-semibold text-[#11182C]">Nova categoria</h2><p class="mt-1 text-[10px] leading-5 text-[#858A98]">Use nomes amplos e fáceis de reconhecer.</p></div></div>
        <form method="POST" action="?/create" class="mt-5 space-y-3">
          <label class="block"><span class="mb-1 block text-[10px] font-semibold text-[#5A6170]">Nome</span><input name="name" required maxlength="160" value={values?.name ?? ""} placeholder="Ex.: Comercial" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px]"/></label>
          <label class="block"><span class="mb-1 block text-[10px] font-semibold text-[#5A6170]">Endereço</span><input name="slug" maxlength="100" value={values?.slug ?? ""} placeholder="Gerado pelo nome" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px]"/></label>
          <label class="block"><span class="mb-1 block text-[10px] font-semibold text-[#5A6170]">Descrição pública</span><textarea name="description" maxlength="600" rows="3" class="w-full rounded-xl border border-[#DDE1EA] px-3 py-2.5 text-[11px]">{values?.description ?? ""}</textarea></label>
          <div class="grid grid-cols-[1fr_110px] gap-3"><label class="block"><span class="mb-1 block text-[10px] font-semibold text-[#5A6170]">Ícone</span><input name="icon" maxlength="32" value={values?.icon ?? ""} placeholder="💼" class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[16px]"/></label><label class="block"><span class="mb-1 block text-[10px] font-semibold text-[#5A6170]">Ordem</span><input name="sortOrder" type="number" min="0" max="10000" value={values?.sortOrder ?? 10} class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px]"/></label></div>
          <button type="submit" class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#EA6D0B] px-4 text-[12px] font-semibold text-white"><Plus size={15}/>Criar categoria</button>
        </form>
      </aside>
    {/if}
  </div>
</ApplicationContent>
