<script lang="ts">
  import { CalendarDays, Database, HardDrive, Mail, MonitorCog, ShieldCheck } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;
</script>

<svelte:head><title>Integrações | F10 Operations</title></svelte:head>

<ApplicationContent width="standard">
  {#if form?.message}
    <div class={"application-text-caption mb-4 rounded-2xl border px-4 py-3 font-medium " + (form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]")}>{form.message}</div>
  {/if}

  <div class="grid gap-5 lg:grid-cols-2">
    <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
      <div class="flex items-center gap-3">
        <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0F7FF] text-[#245D91]"><HardDrive size={18}/></span>
        <div><h2 class="text-[14px] font-semibold">Armazenamento</h2><p class="application-text-meta mt-1 text-[#9297A5]">MinIO/S3 separado por finalidade e privacidade.</p></div>
      </div>

      <div class="mt-5 space-y-3">
        <div class="rounded-xl border border-[#E3E6EE] bg-[#FAFBFD] p-3">
          <div class="flex items-center justify-between gap-3">
            <strong class="application-text-caption text-[#343B4B]">Central de Ajuda</strong>
            <span class={"application-text-meta rounded-full px-2 py-1 font-bold " + (data.storage.configured ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#FFF0F0] text-[#9B3C3C]")}>{data.storage.configured ? "Configurado" : "Incompleto"}</span>
          </div>
          <div class="application-text-meta mt-2 space-y-1 text-[#858B99]">
            <div>Bucket: <strong class="text-[#555B6B]">{data.storage.bucket || "—"}</strong></div>
            <div class="truncate">Endpoint: <strong class="text-[#555B6B]">{data.storage.endpoint || "—"}</strong></div>
          </div>
          <form method="POST" action="?/testStorage" class="mt-3">
            <button type="submit" class="application-text-meta min-h-9 rounded-xl border border-[#DDE1EA] bg-white px-3 font-semibold text-[#000A57]">Testar bucket</button>
          </form>
        </div>

        <div class="rounded-xl border border-[#E3E6EE] bg-[#FAFBFD] p-3">
          <div class="flex items-center justify-between gap-3">
            <strong class="application-text-caption text-[#343B4B]">Solicitações privadas</strong>
            <span class={"application-text-meta rounded-full px-2 py-1 font-bold " + (data.serviceRequestStorage.configured ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#FFF0F0] text-[#9B3C3C]")}>{data.serviceRequestStorage.configured ? "Configurado" : "Incompleto"}</span>
          </div>
          <div class="application-text-meta mt-2 space-y-1 text-[#858B99]">
            <div>Bucket: <strong class="text-[#555B6B]">{data.serviceRequestStorage.bucket || "—"}</strong></div>
            <div>Privado e separado: <strong class="text-[#555B6B]">{data.serviceRequestStorage.privateBucket ? "Sim" : "Não"}</strong></div>
            <div>Criptografia NFSe: <strong class="text-[#555B6B]">{data.serviceRequestSecretConfigured ? "Configurada" : "Pendente"}</strong></div>
          </div>
          <form method="POST" action="?/testServiceRequestStorage" class="mt-3">
            <button type="submit" class="application-text-meta min-h-9 rounded-xl border border-[#DDE1EA] bg-white px-3 font-semibold text-[#000A57]">Testar bucket privado</button>
          </form>
        </div>
      </div>
    </section>

    <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
      <div class="flex items-center gap-3">
        <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF4E9] text-[#A9510D]"><MonitorCog size={18}/></span>
        <div><h2 class="text-[14px] font-semibold">Acesso remoto</h2><p class="application-text-meta mt-1 text-[#9297A5]">MeshCentral como motor do desktop embutido.</p></div>
      </div>
      <div class="application-text-caption mt-5 space-y-3">
        <div class="flex justify-between gap-3"><span class="text-[#858B99]">Provider</span><strong>{data.remote.provider}</strong></div>
        <div class="flex justify-between gap-3"><span class="text-[#858B99]">URL pública</span><strong class="max-w-[300px] truncate">{data.remote.baseUrl || "—"}</strong></div>
        <div class="flex justify-between gap-3"><span class="text-[#858B99]">Controle automático</span><strong>{data.remoteControl.configured ? "Configurado" : "Pendente"}</strong></div>
        <div class="flex justify-between gap-3"><span class="text-[#858B99]">Usuário</span><strong>{data.remoteControl.loginUser || "—"}</strong></div>
        <div class="flex justify-between gap-3"><span class="text-[#858B99]">Consentimento</span><strong>{data.remoteControl.deviceConsentFlags === 8 ? "Desktop Prompt" : "Flags " + data.remoteControl.deviceConsentFlags}</strong></div>
      </div>
      <div class="mt-5 flex flex-wrap gap-2">
        <form method="POST" action="?/testRemote"><button type="submit" class="application-text-meta min-h-9 rounded-xl border border-[#DDE1EA] px-3 font-semibold">Testar interface</button></form>
        <form method="POST" action="?/testRemoteControl"><button type="submit" class="application-text-meta min-h-9 rounded-xl bg-[#000A57] px-3 font-semibold text-white">Testar integração</button></form>
      </div>
    </section>

    <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
      <div class="flex items-center gap-3">
        <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF8F1] text-[#2F7045]"><Mail size={18}/></span>
        <div><h2 class="text-[14px] font-semibold">E-mail transacional</h2><p class="application-text-meta mt-1 text-[#9297A5]">Brevo usado pela Área do Cliente e notificações.</p></div>
      </div>
      <div class="application-text-caption mt-5 space-y-3">
        <div class="flex justify-between"><span class="text-[#858B99]">Status</span><strong>{data.email.configured ? "Configurado" : "Pendente"}</strong></div>
        <div class="flex justify-between gap-3"><span class="text-[#858B99]">Remetente</span><strong>{data.email.senderEmail || "—"}</strong></div>
        <div class="flex justify-between gap-3"><span class="text-[#858B99]">Nome</span><strong>{data.email.senderName || "—"}</strong></div>
      </div>
    </section>

    <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
      <div class="flex items-center gap-3">
        <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><CalendarDays size={18}/></span>
        <div><h2 class="text-[14px] font-semibold">Google Calendar</h2><p class="application-text-meta mt-1 text-[#9297A5]">OAuth para agenda, sincronização e Google Meet.</p></div>
      </div>
      <div class="application-text-caption mt-5 space-y-3">
        <div class="flex justify-between"><span class="text-[#858B99]">Status do servidor</span><strong>{data.google.configured ? "Configurado" : "Pendente"}</strong></div>
        <div class="flex justify-between gap-3"><span class="text-[#858B99]">Callback</span><strong class="max-w-[320px] truncate">{data.google.redirectUri || "—"}</strong></div>
      </div>
    </section>

    <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6 lg:col-span-2">
      <div class="flex items-center gap-3">
        <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F2F0FF] text-[#5C4BA2]"><Database size={18}/></span>
        <div><h2 class="text-[14px] font-semibold">Backend F10</h2><p class="application-text-meta mt-1 text-[#9297A5]">Autenticação legada usada pela Área do Cliente.</p></div>
      </div>
      <div class="application-text-caption mt-5 grid gap-3 sm:grid-cols-2">
        <div class="flex justify-between gap-3 rounded-xl bg-[#FAFBFD] px-3 py-3"><span class="text-[#858B99]">Endpoint</span><strong class="max-w-[320px] truncate">{data.f10.backendUrl || "—"}</strong></div>
        <div class="flex justify-between gap-3 rounded-xl bg-[#FAFBFD] px-3 py-3"><span class="text-[#858B99]">Proteção do token</span><strong>{data.f10.customerTokenConfigured ? "Configurada" : "Pendente"}</strong></div>
      </div>
    </section>
  </div>

  <section class="application-text-caption mt-5 flex items-start gap-3 rounded-2xl border border-[#DDE1F0] bg-[#F8F9FF] px-4 py-3 leading-5 text-[#626A7E]">
    <ShieldCheck size={16} class="mt-0.5 shrink-0 text-[#000A57]"/>
    <span>Esta área exibe apenas status e parâmetros não secretos. Senhas do MinIO, Brevo, Google, MeshCentral e chaves de criptografia continuam protegidas no ambiente do servidor.</span>
  </section>
</ApplicationContent>
