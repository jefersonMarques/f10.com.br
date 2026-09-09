<script lang="ts">
  import {
    ArrowDown,
    ArrowUp,
    BookOpen,
    CheckCircle2,
    CircleAlert,
    Layers3,
    Plus,
    Save,
    Trash2,
  } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  let loadedCollectionKey = "";
  let selectedIds: string[] = [];
  let contentToAdd = "";

  $: {
    const key = data.newCollection
      ? "new"
      : data.selectedCollection?.id ?? "";
    if (key !== loadedCollectionKey) {
      loadedCollectionKey = key;
      selectedIds = data.selectedCollection?.items.map((item) => item.contentId) ?? [];
      contentToAdd = "";
    }
  }

  $: availableContents = data.publishedContents.filter(
    (content) => !selectedIds.includes(content.contentId),
  );

  function selectedContent(contentId: string) {
    return (
      data.publishedContents.find((content) => content.contentId === contentId) ??
      data.selectedCollection?.items.find((item) => item.contentId === contentId) ??
      null
    );
  }

  function addContent(): void {
    if (!contentToAdd || selectedIds.includes(contentToAdd)) return;
    selectedIds = [...selectedIds, contentToAdd];
    contentToAdd = "";
  }

  function moveContent(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= selectedIds.length) return;
    const next = [...selectedIds];
    [next[index], next[target]] = [next[target], next[index]];
    selectedIds = next;
  }

  function removeContent(contentId: string): void {
    selectedIds = selectedIds.filter((id) => id !== contentId);
  }
</script>

<svelte:head><title>Coleções | Base de Conhecimento F10</title></svelte:head>

<ApplicationContent width="wide">
  <ApplicationBackLink href="/app/help" label="Base de Conhecimento" className="mb-3" />

  <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 class="text-[22px] font-semibold tracking-[-0.03em] text-[#11182C]">Coleções</h1>
      <p class="mt-1 text-[11px] text-[#858A98]">Agrupe conteúdos publicados em uma ordem útil para o usuário.</p>
    </div>
    {#if data.canEdit}
      <a href="/app/help/collections?new=1" class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#EA6D0B] px-4 text-[11px] font-semibold text-white"><Plus size={15}/>Nova coleção</a>
    {/if}
  </div>

  {#if data.saved || form?.message}
    <div class={`mb-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-[12px] font-medium ${form?.message ? "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]" : "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]"}`}>
      {#if form?.message}<CircleAlert size={18}/><span>{form.message}</span>{:else}<CheckCircle2 size={18}/><span>Coleção salva.</span>{/if}
    </div>
  {/if}

  <div class="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
    <aside class="h-fit overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
      <header class="border-b border-[#EEF0F5] px-4 py-4">
        <div class="flex items-center gap-2"><Layers3 size={16} class="text-[#000A57]"/><h2 class="text-[14px] font-semibold text-[#11182C]">Coleções cadastradas</h2></div>
      </header>
      {#if data.collections.length === 0}
        <div class="px-5 py-10 text-center"><Layers3 size={28} class="mx-auto text-[#B5BAC7]"/><p class="mt-3 text-[11px] text-[#858A98]">Nenhuma coleção criada.</p></div>
      {:else}
        <div class="divide-y divide-[#EEF0F5]">
          {#each data.collections as collection}
            <a href={`/app/help/collections?collection=${collection.id}`} class={`block px-4 py-3 transition hover:bg-[#F8F9FC] ${data.selectedCollection?.id === collection.id ? "bg-[#F3F5FF]" : ""}`}>
              <div class="flex items-start justify-between gap-2">
                <strong class="text-[11px] font-semibold text-[#303746]">{collection.title}</strong>
                <span class={`rounded-full px-2 py-1 text-[8px] font-semibold ${collection.active ? "bg-[#EAF7EE] text-[#2F7045]" : "bg-[#F0F1F4] text-[#777D8B]"}`}>{collection.active ? "Ativa" : "Inativa"}</span>
              </div>
              <p class="mt-1 text-[9px] text-[#9297A5]">{collection.items.length} {collection.items.length === 1 ? "conteúdo" : "conteúdos"}</p>
            </a>
          {/each}
        </div>
      {/if}
    </aside>

    {#if data.newCollection || data.selectedCollection}
      {@const collection = data.selectedCollection}
      <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
        <div class="flex items-start gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><Layers3 size={18}/></span>
          <div>
            <h2 class="text-[16px] font-semibold text-[#11182C]">{collection ? "Editar coleção" : "Nova coleção"}</h2>
            <p class="mt-1 text-[10px] text-[#858A98]">A página pública exibirá somente os títulos abaixo, nesta ordem.</p>
          </div>
        </div>

        <form method="POST" action="?/save" class="mt-6">
          {#if collection}<input type="hidden" name="collectionId" value={collection.id}/>{/if}
          {#each selectedIds as contentId}
            <input type="hidden" name="contentId" value={contentId}/>
          {/each}

          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block sm:col-span-2"><span class="mb-1 block text-[10px] font-semibold text-[#5A6170]">Título</span><input name="title" required maxlength="160" value={collection?.title ?? ""} placeholder="Ex.: WhatsApp" disabled={!data.canEdit} class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px] disabled:bg-[#F5F6F8]"/></label>
            <label class="block"><span class="mb-1 block text-[10px] font-semibold text-[#5A6170]">Endereço</span><input name="slug" maxlength="120" value={collection?.slug ?? ""} placeholder="Gerado pelo título" disabled={!data.canEdit} class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px] disabled:bg-[#F5F6F8]"/></label>
            <label class="block"><span class="mb-1 block text-[10px] font-semibold text-[#5A6170]">Ordem na Central</span><input name="sortOrder" type="number" min="0" max="10000" value={collection?.sortOrder ?? 10} disabled={!data.canEdit} class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[12px] disabled:bg-[#F5F6F8]"/></label>
            <label class="block sm:col-span-2"><span class="mb-1 block text-[10px] font-semibold text-[#5A6170]">Descrição</span><textarea name="description" maxlength="600" rows="3" disabled={!data.canEdit} class="w-full resize-y rounded-xl border border-[#DDE1EA] px-3 py-2.5 text-[11px] disabled:bg-[#F5F6F8]">{collection?.description ?? ""}</textarea></label>
          </div>

          <div class="mt-5 border-t border-[#EEF0F5] pt-5">
            <div class="flex items-center justify-between gap-3">
              <div><h3 class="text-[13px] font-semibold text-[#303746]">Conteúdos</h3><p class="mt-1 text-[9px] text-[#9297A5]">Somente conteúdos já publicados podem ser adicionados.</p></div>
              <span class="rounded-full bg-[#F2F3F7] px-2.5 py-1 text-[9px] font-semibold text-[#6F7686]">{selectedIds.length}</span>
            </div>

            {#if data.canEdit}
              <div class="mt-4 flex gap-2">
                <select bind:value={contentToAdd} class="h-10 min-w-0 flex-1 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[10px]">
                  <option value="">Selecionar conteúdo...</option>
                  {#each availableContents as content}<option value={content.contentId}>{content.title}</option>{/each}
                </select>
                <button type="button" on:click={addContent} disabled={!contentToAdd} class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#000A57] text-white disabled:opacity-40" aria-label="Adicionar conteúdo"><Plus size={15}/></button>
              </div>
            {/if}

            <div class="mt-4 space-y-2">
              {#each selectedIds as contentId, index}
                {@const content = selectedContent(contentId)}
                <div class="flex items-center gap-2 rounded-xl border border-[#E4E7ED] bg-[#FAFAFC] px-3 py-2.5">
                  <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[10px] font-bold text-[#000A57]">{index + 1}</span>
                  <div class="min-w-0 flex-1">
                    <strong class="block truncate text-[11px] font-semibold text-[#303746]">{content?.title ?? "Conteúdo indisponível"}</strong>
                    {#if content && "published" in content && !content.published}<span class="mt-0.5 block text-[8px] font-semibold text-[#A55B18]">Não está mais publicado</span>{/if}
                  </div>
                  {#if data.canEdit}
                    <button type="button" on:click={() => moveContent(index, -1)} disabled={index === 0} class="flex h-8 w-8 items-center justify-center rounded-lg text-[#697080] hover:bg-white disabled:opacity-25" aria-label="Subir"><ArrowUp size={13}/></button>
                    <button type="button" on:click={() => moveContent(index, 1)} disabled={index === selectedIds.length - 1} class="flex h-8 w-8 items-center justify-center rounded-lg text-[#697080] hover:bg-white disabled:opacity-25" aria-label="Descer"><ArrowDown size={13}/></button>
                    <button type="button" on:click={() => removeContent(contentId)} class="flex h-8 w-8 items-center justify-center rounded-lg text-[#A33A3A] hover:bg-white" aria-label="Remover"><Trash2 size={13}/></button>
                  {/if}
                </div>
              {:else}
                <div class="rounded-xl border border-dashed border-[#D7DBE4] px-4 py-8 text-center"><BookOpen size={22} class="mx-auto text-[#A8AEBA]"/><p class="mt-2 text-[10px] text-[#8C929F]">Adicione ao menos um conteúdo.</p></div>
              {/each}
            </div>
          </div>

          <div class="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#EEF0F5] pt-5">
            <label class="flex items-center gap-2 text-[10px] font-semibold text-[#596071]"><input name="active" type="checkbox" checked={collection?.active ?? true} disabled={!data.canEdit} class="h-4 w-4 rounded border-[#C9CED9]"/>Ativa na Central de Ajuda</label>
            {#if data.canEdit}<button type="submit" disabled={selectedIds.length === 0} class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 text-[11px] font-semibold text-white disabled:opacity-40"><Save size={14}/>Salvar coleção</button>{/if}
          </div>
        </form>
      </section>
    {:else}
      <section class="flex min-h-[360px] items-center justify-center rounded-[22px] border border-dashed border-[#D4D8E1] bg-[#FAFAFC] px-6 text-center">
        <div><Layers3 size={32} class="mx-auto text-[#A8AEBB]"/><h2 class="mt-4 text-[14px] font-semibold text-[#4A5160]">Selecione uma coleção</h2><p class="mt-1 text-[10px] text-[#9297A5]">Ou crie uma nova coleção para começar.</p></div>
      </section>
    {/if}
  </div>
</ApplicationContent>
