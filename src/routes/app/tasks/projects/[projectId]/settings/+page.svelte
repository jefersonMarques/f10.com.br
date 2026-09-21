<script lang="ts">
  import { CheckCircle2, CircleAlert, UserPlus, Users, X } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  $: memberIds = new Set(data.members.map((member) => member.id));
  $: availableUsers = data.activeUsers.filter((user) => !memberIds.has(user.id));
</script>

<svelte:head><title>Configurações · {data.project.name} | F10 Operations</title></svelte:head>

<ApplicationContent width="narrow">
  <ApplicationBackLink href={`/app/tasks?project=${data.project.id}`} label="Voltar ao projeto" className="mb-3" />

  <section class="mb-3 rounded-[22px] border border-[#E2E5ED] bg-white px-5 py-4">
    <h2 class="truncate text-[18px] font-semibold text-[#202637]">{data.project.name}</h2>
    <p class="mt-1 text-[11px] text-[#858A98]">Informações e integrantes do projeto.</p>
  </section>

  {#if form?.message}<div class={`mb-3 flex items-start gap-3 rounded-2xl border px-4 py-3 text-[12px] font-medium ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>{#if form.success}<CheckCircle2 size={18}/>{:else}<CircleAlert size={18}/>{/if}<span>{form.message}</span></div>{/if}

  <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
    <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
      <h2 class="text-[16px] font-semibold text-[#11182C]">Informações do projeto</h2>
      <p class="mt-1 text-[11px] text-[#858A98]">Mantenha aqui apenas configurações estruturais. O trabalho diário fica na lista e no quadro.</p>
      <form method="POST" action="?/updateProject" class="mt-6 space-y-4">
        <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Nome</span><input name="name" required maxlength="120" value={data.project.name} class="h-11 w-full rounded-xl border border-[#DDE1EA] px-3 text-[13px] outline-none focus:border-[#000A57]"/></label>
        <label class="block"><span class="mb-1.5 block text-[11px] font-semibold text-[#4A5060]">Descrição</span><textarea name="description" maxlength="1000" rows="6" value={data.project.description} class="w-full resize-y rounded-xl border border-[#DDE1EA] px-3 py-3 text-[13px] leading-6 outline-none focus:border-[#000A57]"></textarea></label>
        <button type="submit" class="min-h-11 rounded-xl bg-[#000A57] px-5 text-[12px] font-semibold text-white">Salvar projeto</button>
      </form>
    </section>

    <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5">
      <div class="flex items-center gap-3"><Users size={18} class="text-[#000A57]"/><div><h2 class="text-[14px] font-semibold text-[#11182C]">Integrantes</h2><p class="application-text-caption mt-1 text-[#8A909E]">Quem pode participar das tarefas deste projeto.</p></div></div>

      <div class="mt-5 space-y-2">
        {#each data.members as member}
          <div class="flex items-center gap-3 rounded-xl border border-[#E7E9EF] px-3 py-3">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEF0FF] text-[11px] font-bold text-[#000A57]">{member.name.slice(0,1).toUpperCase()}</span>
            <div class="min-w-0 flex-1"><strong class="block truncate text-[11px] font-semibold text-[#303646]">{member.name}</strong><span class="application-text-caption mt-0.5 block truncate text-[#8B909E]">{member.email}</span></div>
            <form method="POST" action="?/removeMember"><input type="hidden" name="userId" value={member.id}/><button type="submit" class="flex h-8 w-8 items-center justify-center rounded-lg text-[#9B6B6B] hover:bg-[#FFF0F0]" aria-label={`Remover ${member.name}`}><X size={15}/></button></form>
          </div>
        {/each}
      </div>

      {#if availableUsers.length > 0}
        <form method="POST" action="?/addMember" class="mt-4 flex gap-2 border-t border-[#EEF0F5] pt-4">
          <select name="userId" required class="h-10 min-w-0 flex-1 rounded-xl border border-[#DDE1EA] bg-white px-2 text-[11px] outline-none focus:border-[#000A57]"><option value="">Adicionar integrante</option>{#each availableUsers as user}<option value={user.id}>{user.name}</option>{/each}</select>
          <button type="submit" class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#000A57] text-white" aria-label="Adicionar integrante"><UserPlus size={17}/></button>
        </form>
      {/if}
    </section>
  </div>
</ApplicationContent>
