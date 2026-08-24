<script lang="ts">
  import { Bot, CheckCircle2, CircleAlert, Save, Video } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  $: mp4Ready = data.runtime.openAi && data.runtime.ffmpeg;
  $: youtubeReady = mp4Ready && data.runtime.youtube;
</script>

<svelte:head><title>Automação de vídeos | Configurações | F10 Operations</title></svelte:head>

<ApplicationContent width="standard">
  {#if form?.message}
    <div class={`application-text-caption mb-4 flex items-start gap-2 rounded-2xl border px-4 py-3 font-medium ${form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>
      {#if form.success}<CheckCircle2 size={16}/>{:else}<CircleAlert size={16}/>{/if}{form.message}
    </div>
  {/if}

  <section class="rounded-[24px] border border-[#E2E5ED] bg-white p-5 sm:p-7">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex items-start gap-3">
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF3E9] text-[#EA6D0B]"><Video size={20}/></span>
        <div>
          <h1 class="text-[17px] font-semibold text-[#11182C]">Geração automática de conteúdo por vídeo</h1>
          <p class="mt-1 max-w-[760px] text-[11px] leading-5 text-[#858B99]">Alternativa ao fluxo manual de prompt + ZIP. O servidor extrai o áudio, cria uma transcrição temporal, estrutura o artigo e só então captura e valida poucos screenshots nas janelas relevantes.</p>
        </div>
      </div>
      <span class={`application-text-meta w-fit rounded-full px-3 py-1.5 font-bold ${data.settings.enabled ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#F3F4F7] text-[#777D8D]"}`}>{data.settings.enabled ? "Habilitada" : "Desabilitada"}</span>
    </div>

    <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-2xl border border-[#E2E5ED] bg-[#FAFBFD] p-4"><span class="application-text-meta uppercase tracking-[0.06em] text-[#969BA8]">OpenAI</span><strong class={`mt-2 block text-[11px] ${data.runtime.openAi ? "text-[#2F7045]" : "text-[#9B3C3C]"}`}>{data.runtime.openAi ? "Configurada" : "Pendente"}</strong><small class="mt-1 block text-[9px] leading-4 text-[#858B99]">Artigo e validação visual: {data.model}</small></div>
      <div class="rounded-2xl border border-[#E2E5ED] bg-[#FAFBFD] p-4"><span class="application-text-meta uppercase tracking-[0.06em] text-[#969BA8]">FFmpeg</span><strong class={`mt-2 block text-[11px] ${data.runtime.ffmpeg ? "text-[#2F7045]" : "text-[#9B3C3C]"}`}>{data.runtime.ffmpeg ? "Disponível" : "Não encontrado"}</strong><small class="mt-1 block break-all text-[9px] leading-4 text-[#858B99]">{data.runtime.ffmpegPath}</small></div>
      <div class="rounded-2xl border border-[#E2E5ED] bg-[#FAFBFD] p-4"><span class="application-text-meta uppercase tracking-[0.06em] text-[#969BA8]">YouTube</span><strong class={`mt-2 block text-[11px] ${data.runtime.youtube ? "text-[#2F7045]" : "text-[#A9510D]"}`}>{data.runtime.youtube ? "yt-dlp disponível" : "yt-dlp pendente"}</strong><small class="mt-1 block break-all text-[9px] leading-4 text-[#858B99]">{data.runtime.ytDlpPath}</small></div>
      <div class="rounded-2xl border border-[#E2E5ED] bg-[#FAFBFD] p-4"><span class="application-text-meta uppercase tracking-[0.06em] text-[#969BA8]">Transcrição</span><strong class="mt-2 block text-[11px] text-[#303645]">whisper-1</strong><small class="mt-1 block text-[9px] leading-4 text-[#858B99]">Segmentos com timestamps para planejar os cortes.</small></div>
    </div>

    <div class="mt-5 grid gap-3 sm:grid-cols-2">
      <div class={`rounded-2xl border p-4 ${youtubeReady ? "border-[#CFE4D6] bg-[#F5FBF7]" : "border-[#F0D8C3] bg-[#FFF9F3]"}`}><strong class="text-[11px] text-[#343B4B]">Link do YouTube</strong><p class="mt-2 text-[10px] leading-5 text-[#727887]">O servidor usa <strong>yt-dlp</strong> para obter o vídeo temporariamente. A URL original continua sendo o vídeo principal do artigo.</p></div>
      <div class={`rounded-2xl border p-4 ${mp4Ready ? "border-[#CFE4D6] bg-[#F5FBF7]" : "border-[#F0D8C3] bg-[#FFF9F3]"}`}><strong class="text-[11px] text-[#343B4B]">Arquivo .mp4</strong><p class="mt-2 text-[10px] leading-5 text-[#727887]">Não depende de yt-dlp. O MP4 enviado é usado na análise, armazenado no F10 e vinculado automaticamente como vídeo principal do artigo.</p></div>
    </div>

    <div class="mt-5 rounded-2xl border border-[#D8DDF4] bg-[#F8F9FF] p-4">
      <div class="flex items-start gap-3"><Bot size={17} class="mt-0.5 shrink-0 text-[#000A57]"/><p class="text-[10px] leading-5 text-[#5D6475]">A OpenAI não recebe o vídeo bruto. Primeiro o F10 envia apenas o áudio para obter transcrição e timestamps. O artigo é estruturado somente com texto; depois o FFmpeg extrai até três candidatos por etapa nas janelas planejadas. A visão começa em baixa resolução e usa alta resolução somente quando precisar ler detalhes pequenos.</p></div>
    </div>

    <form method="POST" action="?/save" class="mt-6">
      <label class="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#E2E5ED] bg-[#FAFBFD] p-4">
        <input name="enabled" type="checkbox" checked={data.settings.enabled} class="mt-0.5 h-4 w-4 rounded border-[#C9CEDA]" />
        <span><strong class="application-text-caption block text-[#343B4B]">Habilitar geração automática por vídeo</strong><small class="application-text-meta mt-1 block leading-5 text-[#858B99]">Quando desabilitada, a importação por ZIP continua funcionando normalmente e a alternativa automática não aparece para os editores.</small></span>
      </label>
      <button type="submit" class="application-text-caption mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 font-semibold text-white"><Save size={14}/>Salvar configuração</button>
    </form>
  </section>

  <section class="mt-4 rounded-[20px] border border-[#F1D7BD] bg-[#FFF9F3] p-5">
    <h2 class="text-[12px] font-semibold text-[#7A3B08]">Pré-requisitos do servidor</h2>
    <p class="mt-2 text-[10px] leading-5 text-[#855832]">Para `.mp4`, instale FFmpeg. Para YouTube, instale também `yt-dlp`. Use somente vídeos que a F10 tenha autorização para processar. Os caminhos podem ser sobrescritos por `HELP_VIDEO_FFMPEG_PATH` e `HELP_VIDEO_YTDLP_PATH`.</p>
  </section>
</ApplicationContent>
