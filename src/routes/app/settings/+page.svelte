<script lang="ts">
  import { Bot, Clock3, HardDrive, MonitorCog, Save, Settings, ShieldCheck } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;
</script>

<svelte:head><title>Configurações | F10 Operations</title></svelte:head>

<ApplicationContent width="standard">
  {#if form?.message}
    <div class={`application-text-caption mb-3 rounded-2xl border px-4 py-3 font-medium ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>{form.message}</div>
  {/if}

  <div class="grid gap-5 lg:grid-cols-2">
    <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
      <div class="flex items-center gap-3">
        <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><Settings size={18}/></span>
        <div><h2 class="text-[14px] font-semibold">Geral</h2><p class="application-text-meta mt-1 text-[#9297A5]">Valores não secretos persistidos no PostgreSQL.</p></div>
      </div>
      <form method="POST" action="?/saveGeneral" class="mt-5 space-y-4">
        <label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6B]">Nome exibido do suporte</span><input name="supportDisplayName" value={data.general.supportDisplayName} maxlength="120" class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]" /></label>
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6B]">E-mail remetente</span><input name="supportSenderEmail" type="email" value={data.general.supportSenderEmail} maxlength="254" placeholder="suporte@f10.com.br" class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]" /><span class="application-text-meta mt-1 block leading-4 text-[#979CA8]">Remetente usado pelos e-mails da Área do Cliente via Brevo.</span></label>
          <label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6B]">Nome do remetente</span><input name="supportSenderName" value={data.general.supportSenderName} maxlength="120" class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]" /><span class="application-text-meta mt-1 block leading-4 text-[#979CA8]">A chave da API Brevo continua somente no ambiente seguro do servidor.</span></label>
        </div>
        <label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6B]">Timezone</span><input name="timezone" value={data.general.timezone} maxlength="80" class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]" /></label>
        <label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6B]">Janela de autorização remota</span><div class="flex items-center gap-2"><input name="remoteConsentMinutes" type="number" min="5" max="120" value={data.general.remoteConsentMinutes} class="h-10 w-28 rounded-xl border border-[#DDE1EA] px-3 text-[11px]" /><span class="application-text-caption text-[#858B99]">minutos</span></div><span class="application-text-meta mt-1 block leading-4 text-[#979CA8]">Usada pelos fluxos de sessão do Operations. O consentimento do desktop também é solicitado localmente pelo MeshCentral.</span></label>
        <button type="submit" class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 font-semibold text-white"><Save size={14}/>Salvar</button>
      </form>

      <a href="/app/settings/atendimento" class="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-[#DDE1EA] bg-[#F8F9FC] px-4 py-3 transition hover:border-[#C9CEE0] hover:bg-[#F4F6FF]">
        <span class="flex items-center gap-3"><Clock3 size={17} class="text-[#EA6D0B]"/><span><strong class="application-text-caption block text-[#343B4B]">Operação do suporte</strong><small class="application-text-meta mt-1 block text-[#858B99]">Equipe responsável e horário de funcionamento exibido no chat.</small></span></span>
        <span class="application-text-meta font-semibold text-[#000A57]">Configurar</span>
      </a>
    </section>

    <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
      <div class="flex items-center gap-3"><span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0F7FF] text-[#245D91]"><HardDrive size={18}/></span><div><h2 class="text-[14px] font-semibold">Armazenamento</h2><p class="application-text-meta mt-1 text-[#9297A5]">MinIO ou qualquer endpoint S3 compatível.</p></div></div>
      <div class="application-text-caption mt-5 space-y-3"><div class="flex justify-between gap-3"><span class="text-[#858B99]">Provedor</span><strong>{data.storage.provider}</strong></div><div class="flex justify-between gap-3"><span class="text-[#858B99]">Bucket</span><strong>{data.storage.bucket || "—"}</strong></div><div class="flex justify-between gap-3"><span class="text-[#858B99]">Endpoint</span><strong class="max-w-[280px] truncate">{data.storage.endpoint || "—"}</strong></div></div>
      <div class="mt-5 flex items-center justify-between gap-3"><span class={`application-text-meta rounded-full px-2.5 py-1 font-bold ${data.storage.configured ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#FFF0F0] text-[#9B3C3C]"}`}>{data.storage.configured ? "Configurado" : "Incompleto"}</span><form method="POST" action="?/testStorage"><button type="submit" class="application-text-meta min-h-9 rounded-lg border border-[#DDE1EA] px-3 font-semibold">Testar conexão</button></form></div>
    </section>

    <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
      <div class="flex items-center gap-3"><span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F2F0FF] text-[#5C4BA2]"><Bot size={18}/></span><div><h2 class="text-[14px] font-semibold">Inteligência Artificial</h2><p class="application-text-meta mt-1 text-[#9297A5]">OpenAI e agente de suporte.</p></div></div>
      <div class="application-text-caption mt-5 space-y-3"><div class="flex justify-between"><span class="text-[#858B99]">OpenAI</span><strong>{data.ai.configured ? "Configurada" : "Não configurada"}</strong></div><div class="flex justify-between"><span class="text-[#858B99]">Modelo</span><strong>{data.ai.model}</strong></div><div class="flex justify-between"><span class="text-[#858B99]">IA no chat nativo</span><strong>{data.ai.chatEnabled ? "Habilitada" : "Desabilitada"}</strong></div></div>
      <a href="/app/chat/lab" class="application-text-meta mt-5 inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#DDE1EA] px-3 font-semibold text-[#000A57]">Abrir laboratório</a>
    </section>

    <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
      <div class="flex items-center gap-3"><span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF4E9] text-[#A9510D]"><MonitorCog size={18}/></span><div><h2 class="text-[14px] font-semibold">Acesso remoto</h2><p class="application-text-meta mt-1 text-[#9297A5]">MeshCentral como motor do desktop embutido no Operations.</p></div></div>

      <div class="application-text-caption mt-5 space-y-3">
        <div class="flex justify-between"><span class="text-[#858B99]">Provider</span><strong>{data.remote.provider}</strong></div>
        <div class="flex justify-between gap-3"><span class="text-[#858B99]">URL pública</span><strong class="max-w-[280px] truncate">{data.remote.baseUrl || "—"}</strong></div>
        <div class="flex justify-between"><span class="text-[#858B99]">Desktop</span><strong>Embutido no F10</strong></div>
        <div class="border-t border-[#EEF0F5] pt-3"></div>
        <div class="flex justify-between gap-3"><span class="text-[#858B99]">Integração automática</span><strong>{data.remoteControl.configured ? "Configurada" : "Pendente"}</strong></div>
        <div class="flex justify-between gap-3"><span class="text-[#858B99]">Usuário de integração</span><strong>{data.remoteControl.loginUser || "—"}</strong></div>
        <div class="flex justify-between gap-3"><span class="text-[#858B99]">Autenticação</span><strong>{data.remoteControl.usesLoginKey ? "Login key" : "Credencial protegida"}</strong></div>
        <div class="flex justify-between gap-3"><span class="text-[#858B99]">Agente Windows</span><strong>Tipo {data.remoteControl.windowsAgentType}</strong></div>
        <div class="flex justify-between gap-3"><span class="text-[#858B99]">Consentimento local</span><strong>{data.remoteControl.deviceConsentFlags === 8 ? "Desktop Prompt" : `Flags ${data.remoteControl.deviceConsentFlags}`}</strong></div>
        <div class="flex justify-between gap-3"><span class="text-[#858B99]">Compartilhamento</span><strong>{data.remoteControl.shareMinutes} min por link</strong></div>
      </div>

      <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
        <span class={`application-text-meta rounded-full px-2.5 py-1 font-bold ${data.remote.configured && data.remoteControl.configured ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#FFF0F0] text-[#9B3C3C]"}`}>{data.remote.configured && data.remoteControl.configured ? "Pronto" : "Incompleto"}</span>
        <div class="flex flex-wrap gap-2">
          <form method="POST" action="?/testRemote"><button type="submit" class="application-text-meta min-h-9 rounded-lg border border-[#DDE1EA] px-3 font-semibold">Testar interface</button></form>
          <form method="POST" action="?/testRemoteControl"><button type="submit" class="application-text-meta min-h-9 rounded-lg bg-[#000A57] px-3 font-semibold text-white">Testar integração</button></form>
        </div>
      </div>
    </section>
  </div>

  <section class="application-text-caption mt-5 flex items-start gap-3 rounded-2xl border border-[#DDE1F0] bg-[#F8F9FF] px-4 py-3 leading-5 text-[#626A7E]"><ShieldCheck size={16} class="mt-0.5 shrink-0 text-[#000A57]"/><span>Chaves OpenAI, Brevo, Access Key/Secret do MinIO e credenciais do MeshCentral não são gravadas em <code>operations_settings</code> nem devolvidas ao navegador. A tela expõe apenas parâmetros não secretos e o estado operacional das integrações.</span></section>
</ApplicationContent>