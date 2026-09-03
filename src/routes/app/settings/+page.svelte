<script lang="ts">
  import { Bot, Clock3, HardDrive, Save, Settings, Video } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;
</script>

<svelte:head><title>Configurações | F10 Operations</title></svelte:head>

<ApplicationContent width="standard">
  {#if form?.message}
    <div class={"application-text-caption mb-4 rounded-2xl border px-4 py-3 font-medium " + (form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]")}>{form.message}</div>
  {/if}

  <div class="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
    <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
      <div class="flex items-center gap-3">
        <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><Settings size={18}/></span>
        <div><h2 class="text-[14px] font-semibold text-[#252C3D]">Geral</h2><p class="application-text-meta mt-1 text-[#9297A5]">Identidade operacional, regionalização e parâmetros globais do Operations.</p></div>
      </div>

      <form method="POST" action="?/saveGeneral" class="mt-5 space-y-4">
        <label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6B]">Nome exibido do suporte</span><input name="supportDisplayName" value={data.general.supportDisplayName} maxlength="120" class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6B]">E-mail remetente</span><input name="supportSenderEmail" type="email" value={data.general.supportSenderEmail} maxlength="254" placeholder="suporte@f10.com.br" class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/><span class="application-text-meta mt-1 block leading-4 text-[#979CA8]">Identidade usada pelos e-mails da Área do Cliente.</span></label>
          <label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6B]">Nome do remetente</span><input name="supportSenderName" value={data.general.supportSenderName} maxlength="120" class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
        </div>
        <label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6B]">Timezone</span><input name="timezone" value={data.general.timezone} maxlength="80" class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
        <label class="block"><span class="application-text-caption mb-1.5 block font-semibold text-[#555B6B]">Janela de autorização remota</span><div class="flex items-center gap-2"><input name="remoteConsentMinutes" type="number" min="5" max="120" value={data.general.remoteConsentMinutes} class="h-10 w-28 rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/><span class="application-text-caption text-[#858B99]">minutos</span></div><span class="application-text-meta mt-1 block leading-4 text-[#979CA8]">Prazo usado pelos fluxos de autorização remota antes de expirar.</span></label>
        <button type="submit" class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 font-semibold text-white"><Save size={14}/>Salvar configurações gerais</button>
      </form>
    </section>

    <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
      <h2 class="text-[14px] font-semibold text-[#252C3D]">Áreas de configuração</h2>
      <p class="application-text-meta mt-1 leading-4 text-[#858B99]">Cada área concentra um tipo de responsabilidade para evitar configurações misturadas.</p>

      <div class="mt-5 space-y-2">
        <a href="/app/settings/atendimento" class="flex items-center justify-between gap-3 rounded-xl border border-[#E3E6EE] px-3 py-3 transition hover:bg-[#FAFBFD]">
          <span class="flex items-center gap-3"><Clock3 size={16} class="text-[#EA6D0B]"/><span><strong class="application-text-caption block text-[#343B4B]">Atendimento</strong><small class="application-text-meta mt-1 block text-[#858B99]">Equipe, entrada do chat, filas, distribuição e horário.</small></span></span>
          <span class="application-text-meta font-semibold text-[#000A57]">Abrir</span>
        </a>
        <a href="/app/settings/ai" class="flex items-center justify-between gap-3 rounded-xl border border-[#E3E6EE] px-3 py-3 transition hover:bg-[#FAFBFD]">
          <span class="flex items-center gap-3"><Bot size={16} class="text-[#5C4BA2]"/><span><strong class="application-text-caption block text-[#343B4B]">Inteligência Artificial</strong><small class="application-text-meta mt-1 block text-[#858B99]">Provedores, modelos, funções, fallbacks e limites.</small></span></span>
          <span class="application-text-meta font-semibold text-[#000A57]">Abrir</span>
        </a>
        <a href="/app/settings/integracoes" class="flex items-center justify-between gap-3 rounded-xl border border-[#E3E6EE] px-3 py-3 transition hover:bg-[#FAFBFD]">
          <span class="flex items-center gap-3"><HardDrive size={16} class="text-[#245D91]"/><span><strong class="application-text-caption block text-[#343B4B]">Integrações</strong><small class="application-text-meta mt-1 block text-[#858B99]">MinIO/S3, Brevo, Google, MeshCentral e backend F10.</small></span></span>
          <span class="application-text-meta font-semibold text-[#000A57]">Abrir</span>
        </a>
        <a href="/app/settings/help-video" class="flex items-center justify-between gap-3 rounded-xl border border-[#E3E6EE] px-3 py-3 transition hover:bg-[#FAFBFD]">
          <span class="flex items-center gap-3"><Video size={16} class="text-[#2F7045]"/><span><strong class="application-text-caption block text-[#343B4B]">Automações</strong><small class="application-text-meta mt-1 block text-[#858B99]">Processamento e automação da Base de Conhecimento.</small></span></span>
          <span class="application-text-meta font-semibold text-[#000A57]">Abrir</span>
        </a>
      </div>
    </section>
  </div>
</ApplicationContent>
