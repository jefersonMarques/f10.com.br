<script lang="ts">
  import { CheckCircle2, CircleAlert, Save, Sparkles } from "lucide-svelte";
  import HelpRichText from "$lib/components/help/HelpRichText.svelte";

  export let contentId: string;
  export let value = "";
  export let canEdit = false;

  let quickGuide = value;
  let saving = false;
  let message = "";
  let success = false;

  async function saveQuickGuide(): Promise<void> {
    if (!canEdit || saving) return;
    saving = true;
    message = "";
    success = false;
    try {
      const response = await fetch(`/api/app/help/content/${encodeURIComponent(contentId)}/quick-guide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quickGuide }),
      });
      if (!response.ok) {
        message = "Não foi possível salvar o resumo rápido.";
        return;
      }
      success = true;
      message = "Resumo rápido salvo. O conteúdo voltou para rascunho até a próxima publicação.";
    } catch {
      message = "Não foi possível salvar o resumo rápido.";
    } finally {
      saving = false;
    }
  }
</script>

<section class="mt-5 rounded-[22px] border border-[#D8DDF4] bg-[#F8F9FF] p-5 sm:p-6">
  <div class="flex items-start gap-3">
    <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#000A57]"><Sparkles size={19}/></span>
    <div>
      <h2 class="text-[16px] font-semibold text-[#11182C]">Resumo rápido do procedimento</h2>
      <p class="mt-1 max-w-[760px] text-[11px] leading-5 text-[#777D8D]">Fica logo abaixo do vídeo na Central. Use texto curto, emojis e destaque os caminhos principais para que o usuário consiga concluir a tarefa sem abrir todos os passos.</p>
    </div>
  </div>

  {#if message}
    <div class={`mt-4 flex items-start gap-2 rounded-xl border px-3 py-2 text-[10px] ${success ? "border-[#B9E6C9] bg-white text-[#176B35]" : "border-[#F0C8C8] bg-white text-[#9B2C2C]"}`}>
      {#if success}<CheckCircle2 size={14}/>{:else}<CircleAlert size={14}/>{/if}<span>{message}</span>
    </div>
  {/if}

  <div class="mt-5 grid gap-4 xl:grid-cols-2">
    <label class="block">
      <span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Texto do resumo</span>
      <span class="mb-2 block text-[10px] leading-5 text-[#858A98]">Suporta <strong>**negrito**</strong>, <em>*itálico*</em>, <code>`código`</code>, listas, linhas numeradas e emojis.</span>
      <textarea bind:value={quickGuide} disabled={!canEdit} maxlength="12000" rows="11" placeholder={'🚀 **Passo 1:** Abra o F10 e faça login\n👥 **Passo 2:** Entre em **Cadastros > Funcionários** e clique em **+**\n✅ **Passo 3:** Preencha os dados e salve'} class="w-full resize-y rounded-xl border border-[#D8DDF4] bg-white px-3 py-3 text-[11px] leading-5 disabled:bg-[#F4F5F8]"></textarea>
    </label>

    <div class="rounded-2xl border border-[#D8DDF4] bg-white p-4">
      <span class="text-[10px] font-bold uppercase tracking-[0.08em] text-[#858A98]">Preview público</span>
      {#if quickGuide.trim()}
        <HelpRichText text={quickGuide} className="mt-4 space-y-1.5 text-[12px] leading-6 text-[#4E5565]"/>
      {:else}
        <p class="mt-4 text-[11px] leading-5 text-[#9297A5]">O resumo rápido é opcional. Quando preenchido, aparece imediatamente após o aviso do vídeo.</p>
      {/if}
    </div>
  </div>

  {#if canEdit}
    <div class="mt-4 flex justify-end">
      <button type="button" disabled={saving} on:click={saveQuickGuide} class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 text-[11px] font-semibold text-white disabled:opacity-50"><Save size={14}/>{saving ? "Salvando..." : "Salvar resumo rápido"}</button>
    </div>
  {/if}
</section>
