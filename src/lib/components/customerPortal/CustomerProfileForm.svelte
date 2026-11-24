<script lang="ts">
  import { LoaderCircle } from "lucide-svelte";
  import { normalizeCustomerProfileName } from "$lib/support/customerProfile";
  export let initialName = "";
  export let onSaved: (name: string) => void | Promise<void>;
  let name = initialName;
  let saving = false;
  let error = "";

  async function save(): Promise<void> {
    const normalized = normalizeCustomerProfileName(name);
    if (!normalized || saving) return;
    saving = true;
    error = "";
    try {
      const response = await fetch("/api/support/chat/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: normalized }),
      });
      const result = await response.json() as { name?: string };
      if (!response.ok || !result.name) {
        error = response.status === 401 ? "Entre novamente na sua conta F10." : "Não foi possível atualizar seu perfil.";
        return;
      }
      await onSaved(result.name);
    } catch {
      error = "Não foi possível atualizar seu perfil. Tente novamente.";
    } finally {
      saving = false;
    }
  }
</script>

<form class="space-y-4" on:submit|preventDefault={save}>
  <label class="block text-[13px] font-semibold text-[#414857]">Como podemos chamar você?
    <input bind:value={name} autocomplete="name" required maxlength="120" class="mt-2 h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[14px] outline-none focus:border-[#000A57]" placeholder="Seu nome" />
  </label>
  {#if error}<p role="alert" class="text-[13px] text-[#A83F32]">{error}</p>{/if}
  <button type="submit" disabled={saving || !normalizeCustomerProfileName(name)} class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] text-[14px] font-semibold text-white disabled:opacity-50">
    {#if saving}<LoaderCircle size={16} class="animate-spin"/>{/if} Salvar e continuar
  </button>
</form>
