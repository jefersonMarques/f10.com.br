<script lang="ts">
  import { onDestroy } from "svelte";
  import { Camera, CheckCircle2, LoaderCircle, Trash2, UserRound } from "lucide-svelte";
  import { MAX_CUSTOMER_AVATAR_BYTES, normalizeCustomerProfileName } from "$lib/support/customerProfile";

  export let initialName = "";
  export let fullProfile = false;
  export let loginEmail = "";
  export let initialContactEmail: string | null = null;
  export let initialContactPhone: string | null = null;
  export let initialHasAvatar = false;
  export let onSaved: (name: string) => void | Promise<void>;

  let name = initialName;
  let contactEmail = initialContactEmail ?? "";
  let contactPhone = initialContactPhone ?? "";
  let hasAvatar = initialHasAvatar;
  let avatarVersion = 0;
  let avatarFailed = false;
  let avatar: File | null = null;
  let avatarInput: HTMLInputElement;
  let previewUrl = "";
  let removeAvatar = false;
  let saving = false;
  let error = "";
  let saved = false;

  $: avatarUrl = previewUrl || (hasAvatar && !removeAvatar
    ? `/api/support/chat/auth/profile/avatar?v=${avatarVersion}` : "");
  $: if (avatarUrl) resetAvatarError(avatarUrl);

  function resetAvatarError(_url: string): void {
    avatarFailed = false;
  }

  function clearPreview(): void {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = "";
  }

  function selectAvatar(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    saved = false;
    error = "";
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)
      || file.size < 1 || file.size > MAX_CUSTOMER_AVATAR_BYTES) {
      error = "Escolha uma foto JPG, PNG ou WebP de até 2 MB.";
      return;
    }
    clearPreview();
    avatar = file;
    previewUrl = URL.createObjectURL(file);
    removeAvatar = false;
  }

  function clearAvatar(): void {
    clearPreview();
    avatar = null;
    removeAvatar = hasAvatar;
    saved = false;
    error = "";
  }

  function profileError(code: string | undefined, status: number): string {
    if (status === 401) return "Entre novamente na sua conta F10.";
    if (code === "INVALID_CONTACT_EMAIL") return "Informe um e-mail de contato válido.";
    if (code === "INVALID_CONTACT_PHONE") return "Informe um telefone válido, com DDD.";
    if (code === "INVALID_AVATAR" || status === 413) return "Escolha uma foto JPG, PNG ou WebP de até 2 MB.";
    if (code === "INVALID_CUSTOMER_NAME") return "Informe um nome válido.";
    return "Não foi possível atualizar seu perfil. Tente novamente.";
  }

  async function save(): Promise<void> {
    const normalized = normalizeCustomerProfileName(name);
    if (!normalized || saving) return;
    saving = true;
    saved = false;
    error = "";
    try {
      let options: RequestInit;
      if (fullProfile) {
        const form = new FormData();
        form.set("name", normalized);
        form.set("contactEmail", contactEmail);
        form.set("contactPhone", contactPhone);
        if (avatar) form.set("avatar", avatar);
        if (removeAvatar) form.set("removeAvatar", "true");
        options = { method: "POST", body: form };
      } else {
        options = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: normalized }),
        };
      }
      const response = await fetch("/api/support/chat/auth/profile", options);
      const result = await response.json() as { name?: string; hasAvatar?: boolean; error?: string };
      if (!response.ok || !result.name) {
        error = profileError(result.error, response.status);
        return;
      }

      name = result.name;
      if (fullProfile) {
        hasAvatar = result.hasAvatar === true;
        avatarVersion += 1;
        avatar = null;
        removeAvatar = false;
        clearPreview();
        saved = true;
      }
      await onSaved(result.name);
    } catch {
      error = "Não foi possível atualizar seu perfil. Tente novamente.";
    } finally {
      saving = false;
    }
  }

  onDestroy(clearPreview);
</script>

<form class="space-y-4" on:submit|preventDefault={save} on:input={() => saved = false}>
  {#if fullProfile}
    <div class="flex flex-wrap items-center gap-4 pb-2">
      <div class="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#DDE1EA] bg-[#EEF0FF] text-[#000A57]">
        {#if avatarUrl && !avatarFailed}
          <img src={avatarUrl} alt="Foto de perfil" class="h-full w-full object-cover" on:error={() => avatarFailed = true}/>
        {:else}
          <UserRound size={32}/>
        {/if}
      </div>
      <div class="min-w-0 flex-1 space-y-2">
        <p class="text-[14px] font-semibold text-[#18233D]">Foto de perfil <span class="font-normal text-[#697184]">(opcional)</span></p>
        <input bind:this={avatarInput} type="file" accept="image/jpeg,image/png,image/webp" class="hidden" on:change={selectAvatar}/>
        <div class="flex flex-wrap gap-2">
          <button type="button" disabled={saving} on:click={() => avatarInput.click()} class="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#DDE1EA] px-3 text-[13px] font-semibold text-[#000A57]"><Camera size={16}/> {avatarUrl ? "Trocar foto" : "Adicionar foto"}</button>
          {#if avatarUrl}
            <button type="button" disabled={saving} on:click={clearAvatar} class="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#DDE1EA] px-3 text-[13px] text-[#A83F32]" aria-label="Remover foto"><Trash2 size={15}/> Remover</button>
          {/if}
        </div>
        <p class="text-[12px] text-[#697184]">JPG, PNG ou WebP · até 2 MB</p>
      </div>
    </div>
  {/if}
  <label class="block text-[13px] font-semibold text-[#414857]">{fullProfile ? "Nome" : "Como podemos chamar você?"}
    <input bind:value={name} autocomplete="name" required maxlength="120" disabled={saving} class="mt-2 h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[14px] outline-none focus:border-[#000A57]" placeholder="Seu nome" />
  </label>
  {#if fullProfile}
    <label class="block text-[13px] font-semibold text-[#414857]">E-mail de login
      <input value={loginEmail} readonly class="mt-2 h-11 w-full rounded-xl border border-[#DDE1EA] bg-[#F5F6F9] px-3 text-[14px] font-normal text-[#697184]" />
    </label>
    <label class="block text-[13px] font-semibold text-[#414857]">E-mail de contato <span class="font-normal text-[#697184]">(opcional)</span>
      <input bind:value={contactEmail} type="email" autocomplete="email" maxlength="254" disabled={saving} placeholder="contato@exemplo.com.br" class="mt-2 h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[14px] font-normal outline-none focus:border-[#000A57]" />
      <span class="mt-1 block text-[12px] font-normal text-[#697184]">Não altera seu acesso ao F10.</span>
    </label>
    <label class="block text-[13px] font-semibold text-[#414857]">Telefone <span class="font-normal text-[#697184]">(opcional)</span>
      <input bind:value={contactPhone} type="tel" autocomplete="tel" maxlength="32" disabled={saving} placeholder="(00) 00000-0000" class="mt-2 h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[14px] font-normal outline-none focus:border-[#000A57]" />
    </label>
  {/if}
  {#if error}<p role="alert" class="rounded-xl bg-[#FFF0EF] px-3 py-2 text-[13px] text-[#A83F32]">{error}</p>{/if}
  {#if saved}<p role="status" class="flex items-center gap-2 rounded-xl bg-[#F0F9F3] px-3 py-2 text-[13px] text-[#207345]"><CheckCircle2 size={17}/> Perfil atualizado.</p>{/if}
  <button type="submit" disabled={saving || !normalizeCustomerProfileName(name)} class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#000A57] text-[14px] font-semibold text-white disabled:opacity-50">
    {#if saving}<LoaderCircle size={16} class="animate-spin"/>{/if} {fullProfile ? "Salvar perfil" : "Salvar e continuar"}
  </button>
</form>
