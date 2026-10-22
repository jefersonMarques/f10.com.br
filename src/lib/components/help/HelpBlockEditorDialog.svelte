<script lang="ts">
  import { enhance } from "$app/forms";
  import type { SubmitFunction } from "@sveltejs/kit";
  import { ArrowDown, ArrowUp, Trash2, X } from "lucide-svelte";

  type EditableBlock = {
    id: string;
    blockType: "text" | "notice" | "link" | "image" | "file";
    textContent: string;
    noticeVariant: string | null;
    linkUrl: string | null;
    linkLabel: string | null;
    asset?: {
      storageKey: string | null;
      sourceUrl: string | null;
      altText: string;
      assistantDescription: string;
      extractedText: string;
      assistantSummary: string;
      subtitles: string;
    } | null;
  };

  export let editingBlock: EditableBlock;
  export let editBlockStepId: string;
  export let editingBlockIndex: number;
  export let editingBlockCount: number;
  export let onClose: () => void;
  export let submitEditorModal: SubmitFunction;
  export let errorMessage: string | null = null;
</script>

<div class="fixed inset-0 z-[148] flex items-center justify-center bg-[#050A1A]/60 px-4 py-6" role="presentation">
    <section role="dialog" aria-modal="true" aria-labelledby="help-block-edit-title" class="max-h-[90vh] w-full max-w-[670px] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
      <div class="mb-5 flex items-center justify-between">
        <h2 id="help-block-edit-title" class="text-[18px] font-semibold">{editingBlock.blockType === "image" ? "Imagem" : editingBlock.blockType === "file" ? "Arquivo" : editingBlock.blockType === "notice" ? "Aviso" : editingBlock.blockType === "link" ? "Link" : "Texto"}</h2>
        <button type="button" aria-label="Fechar" on:click={onClose} class="rounded-lg p-2 text-[#6E7584] hover:bg-[#F3F4F7]"><X size={18}/></button>
      </div>
      <form id="help-block-edit-form" method="POST" action="?/updateBlock" use:enhance={submitEditorModal} class="space-y-4">
        <input type="hidden" name="stepId" value={editBlockStepId}/>
        <input type="hidden" name="blockId" value={editingBlock.id}/>
        <input type="hidden" name="blockType" value={editingBlock.blockType}/>
        {#if editingBlock.blockType === "text" || editingBlock.blockType === "notice"}
          <label class="block text-[13px] font-semibold">Conteúdo
            <textarea name="textContent" required maxlength="50000" rows="8" class="mt-1.5 w-full rounded-xl border border-[#DDE1EA] p-3 text-[14px] leading-6">{editingBlock.textContent}</textarea>
          </label>
          {#if editingBlock.blockType === "notice"}
            <label class="block text-[13px] font-semibold">Tipo de aviso
              <select name="noticeVariant" class="mt-1.5 h-11 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[14px]">
                {#each [["info","Informação"],["warning","Atenção"],["success","Sucesso"],["danger","Importante"]] as option}
                  <option value={option[0]} selected={(editingBlock.noticeVariant ?? "info") === option[0]}>{option[1]}</option>
                {/each}
              </select>
            </label>
          {/if}
        {:else if editingBlock.blockType === "link"}
          <label class="block text-[13px] font-semibold">Texto do link
            <input name="linkLabel" required maxlength="240" value={editingBlock.linkLabel ?? ""} class="mt-1.5 h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[14px]"/>
          </label>
          <label class="block text-[13px] font-semibold">Endereço
            <input name="linkUrl" required type="url" value={editingBlock.linkUrl ?? ""} class="mt-1.5 h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[14px]"/>
          </label>
        {:else}
          {#if !editingBlock.asset?.storageKey}
            <label class="block text-[13px] font-semibold">URL do arquivo ou imagem
              <input name="sourceUrl" type="url" value={editingBlock.asset?.sourceUrl ?? ""} class="mt-1.5 h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[14px]"/>
            </label>
          {:else}
            <input type="hidden" name="sourceUrl" value={editingBlock.asset?.sourceUrl ?? ""}/>
            <p class="text-[13px] text-[#737989]">Arquivo armazenado no F10.</p>
          {/if}
          <label class="block text-[13px] font-semibold">Texto alternativo
            <input name="altText" maxlength="500" value={editingBlock.asset?.altText ?? ""} class="mt-1.5 h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[14px]"/>
          </label>
          <label class="block text-[13px] font-semibold">Descrição para IA
            <textarea name="assistantDescription" maxlength="20000" rows="4" class="mt-1.5 w-full rounded-xl border border-[#DDE1EA] p-3 text-[14px]">{editingBlock.asset?.assistantDescription ?? ""}</textarea>
          </label>
          <label class="block text-[13px] font-semibold">Texto extraído (opcional)
            <textarea name="extractedText" maxlength="200000" rows="3" class="mt-1.5 w-full rounded-xl border border-[#DDE1EA] p-3 text-[14px]">{editingBlock.asset?.extractedText ?? ""}</textarea>
          </label>
          <input type="hidden" name="assistantSummary" value={editingBlock.asset?.assistantSummary ?? ""}/>
          <input type="hidden" name="subtitles" value={editingBlock.asset?.subtitles ?? ""}/>
          {#if editingBlock.blockType === "file"}
            <label class="block text-[13px] font-semibold">Nome do arquivo
              <input name="linkLabel" maxlength="240" value={editingBlock.linkLabel ?? ""} class="mt-1.5 h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[14px]"/>
            </label>
          {/if}
        {/if}
        {#if errorMessage}<p role="alert" class="text-[13px] font-medium text-[#9B2C2C]">{form.message}</p>{/if}
        <div class="flex justify-end gap-2">
          <button type="button" on:click={onClose} class="min-h-10 rounded-xl border border-[#DDE1EA] px-4 text-[13px] font-semibold">Cancelar</button>
          <button type="submit" class="min-h-10 rounded-xl bg-[#000A57] px-5 text-[13px] font-semibold text-white">Salvar bloco</button>
        </div>
      </form>
      <div class="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#EEF0F5] pt-4">
        <div class="flex gap-2">
          {#each [["up","Subir"],["down","Descer"]] as direction, directionIndex}
            <form method="POST" action="?/moveBlock">
              <input type="hidden" name="stepId" value={editBlockStepId}/>
              <input type="hidden" name="blockId" value={editingBlock.id}/>
              <input type="hidden" name="direction" value={direction[0]}/>
              <button type="submit" disabled={directionIndex === 0 ? editingBlockIndex === 0 : editingBlockIndex >= editingBlockCount - 1} class="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[#DDE1EA] px-3 text-[13px] font-semibold text-[#000A57] disabled:opacity-35">
                {#if directionIndex === 0}<ArrowUp size={14}/>{:else}<ArrowDown size={14}/>{/if}{direction[1]}
              </button>
            </form>
          {/each}
        </div>
        <form method="POST" action="?/deleteBlock" on:submit={(event) => { if (!confirm("Excluir este bloco?")) event.preventDefault(); }}>
          <input type="hidden" name="stepId" value={editBlockStepId}/>
          <input type="hidden" name="blockId" value={editingBlock.id}/>
          <button type="submit" class="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#F0C8C8] px-3 text-[13px] font-semibold text-[#9B2C2C]"><Trash2 size={15}/>Excluir bloco</button>
        </form>
      </div>
    </section>
  </div>
