<script lang="ts">
  import { CheckCircle2, CircleAlert, Save } from "lucide-svelte";
  import HelpImageAnnotationEditor from "$lib/components/help/HelpImageAnnotationEditor.svelte";
  import type { HelpImageAnnotation } from "$lib/help/helpImageAnnotations";

  export let contentId: string;
  export let blockId: string;
  export let imageUrl: string;
  export let altText = "";
  export let initialAnnotations: HelpImageAnnotation[] = [];
  export let annotations: HelpImageAnnotation[] = initialAnnotations;
  export let disabled = false;
  export let showSaveButton = true;
  export let saveLabel = "Salvar marcações";
  export let saveHandler:
    | ((annotations: HelpImageAnnotation[]) => Promise<{ success: boolean; message?: string }>)
    | null = null;

  let saving = false;
  let message = "";
  let success = false;
  let appliedInitialSignature = JSON.stringify(initialAnnotations);

  $: {
    const nextInitialSignature = JSON.stringify(initialAnnotations);
    if (nextInitialSignature !== appliedInitialSignature) {
      annotations = initialAnnotations;
      appliedInitialSignature = nextInitialSignature;
    }
  }

  async function saveAnnotations(): Promise<void> {
    if (disabled || saving) return;
    saving = true;
    message = "";
    success = false;
    try {
      if (saveHandler) {
        const result = await saveHandler(annotations);
        success = result.success;
        message = result.message ?? (success ? "Marcações salvas." : "Não foi possível salvar as marcações.");
        return;
      }

      const response = await fetch(
        `/api/app/help/content/${contentId}/images/${blockId}/annotations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ annotations }),
        },
      );
      const result = (await response.json()) as { success?: boolean; message?: string };
      success = response.ok && Boolean(result.success);
      message = result.message ?? (success ? "Marcações salvas." : "Não foi possível salvar as marcações.");
      if (success) appliedInitialSignature = JSON.stringify(annotations);
    } catch {
      message = "Não foi possível salvar as marcações.";
    } finally {
      saving = false;
    }
  }
</script>

<div class="rounded-[20px] border border-[#DDE1EA] bg-white p-3 sm:p-4">
  <HelpImageAnnotationEditor
    {imageUrl}
    {altText}
    bind:annotations
    {disabled}
  />

  {#if showSaveButton}
    <div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-h-5">
        {#if message}
          <span class={`application-text-meta inline-flex items-center gap-1.5 font-semibold ${success ? "text-[#2F7045]" : "text-[#9B2C2C]"}`}>
            {#if success}<CheckCircle2 size={13}/>{:else}<CircleAlert size={13}/>{/if}{message}
          </span>
        {/if}
      </div>
      {#if !disabled}
        <button
          type="button"
          disabled={saving}
          on:click={saveAnnotations}
          class="application-text-caption inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 font-semibold text-white disabled:cursor-wait disabled:opacity-60"
        ><Save size={14}/>{saving ? "Salvando..." : saveLabel}</button>
      {/if}
    </div>
  {/if}
</div>
