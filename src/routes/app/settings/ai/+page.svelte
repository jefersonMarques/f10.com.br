<script lang="ts">
  import { Bot, CheckCircle2, FlaskConical, KeyRound, Save, ShieldCheck, Sparkles } from "lucide-svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { ActionData, PageData } from "./$types";

  export let data: PageData;
  export let form: ActionData;

  function taskDefinition(code: string) {
    return data.taskDefinitions.find((definition) => definition.code === code);
  }

  function capabilityLabel(code: string): string {
    return (data.capabilityLabels as Record<string, string>)[code] ?? code;
  }

  $: publicRuntimeReady =
    data.helpPublicAi.enabled &&
    data.publicTaskReady &&
    data.publicHelpSecretConfigured;
</script>

<svelte:head><title>Inteligência Artificial | F10 Operations</title></svelte:head>

<ApplicationContent width="standard">
  {#if form?.message}
    <div class={"application-text-caption mb-4 rounded-2xl border px-4 py-3 font-medium " + (form.success ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]")}>{form.message}</div>
  {/if}

  <section class="rounded-[22px] border border-[#D8DDF4] bg-white p-5 sm:p-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex items-start gap-3">
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><Sparkles size={20}/></span>
        <div>
          <h1 class="text-[17px] font-semibold text-[#11182C]">Inteligência Artificial</h1>
          <p class="application-text-caption mt-1 max-w-[760px] leading-5 text-[#7C8291]">Provedores, modelos, funções, fallbacks e limites ficam centralizados aqui. O produto chama funções de IA; o gateway decide qual provedor e modelo executar.</p>
        </div>
      </div>
      <a href="/app/chat/lab" class="application-text-caption inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#DDE1EA] px-4 font-semibold text-[#000A57]"><FlaskConical size={14}/>Abrir laboratório</a>
    </div>
  </section>

  <section class="mt-5 rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
    <div class="flex items-center gap-3">
      <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F2F0FF] text-[#5C4BA2]"><KeyRound size={18}/></span>
      <div><h2 class="text-[14px] font-semibold text-[#252C3D]">Provedores</h2><p class="application-text-meta mt-1 leading-4 text-[#858B99]">Credenciais podem continuar no ambiente ou ser armazenadas criptografadas no PostgreSQL. O segredo nunca retorna ao navegador.</p></div>
    </div>

    {#if !data.secretStorageConfigured}
      <p class="application-text-caption mt-4 rounded-xl border border-[#F1D7BD] bg-[#FFF9F3] px-4 py-3 leading-5 text-[#7A3B08]">Para salvar chaves pelo painel, defina <code>AI_SECRETS_KEY</code> com pelo menos 32 caracteres aleatórios no ambiente do servidor. Credenciais já configuradas por variável de ambiente continuam funcionando.</p>
    {/if}

    <div class="mt-5 grid gap-4 lg:grid-cols-2">
      {#each data.providers as provider}
        <article class="rounded-2xl border border-[#E5E7ED] bg-[#FAFAFC] p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-[13px] font-semibold text-[#252C3D]">{provider.label}</h3>
                <span class={"application-text-meta rounded-full px-2 py-1 font-bold " + (provider.configured ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#FFF4E9] text-[#A9510D]")}>{provider.configured ? "Configurado" : "Pendente"}</span>
              </div>
              <p class="application-text-meta mt-1 text-[#8B909E]">{provider.endpoint}</p>
            </div>
            {#if provider.lastTestStatus}
              <span class={"application-text-meta rounded-full px-2 py-1 font-bold " + (provider.lastTestStatus === "ok" ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#FFF0F0] text-[#9B3C3C]")}>{provider.lastTestStatus === "ok" ? "Teste OK" : "Teste falhou"}</span>
            {/if}
          </div>

          <div class="application-text-caption mt-4 grid gap-2 text-[#656C7B]">
            <div class="flex justify-between gap-3"><span>Origem da chave</span><strong>{provider.credentialSource === "database" ? "Painel criptografado" : provider.credentialSource === "environment" ? "Variável de ambiente" : "Não configurada"}</strong></div>
            <div class="flex justify-between gap-3"><span>Modelo padrão</span><strong>{provider.defaultModel}</strong></div>
          </div>

          <form method="POST" action="?/saveCredential" class="mt-4 flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="provider" value={provider.code}/>
            <input name="apiKey" type="password" required minlength="8" autocomplete="new-password" placeholder="Nova API key" disabled={!data.secretStorageConfigured} class="h-10 min-w-0 flex-1 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px] disabled:bg-[#F1F2F5]"/>
            <button type="submit" disabled={!data.secretStorageConfigured} class="application-text-meta min-h-10 rounded-xl bg-[#000A57] px-3 font-semibold text-white disabled:opacity-40">Salvar chave</button>
          </form>

          <div class="mt-3 flex flex-wrap gap-2">
            <form method="POST" action="?/testProvider">
              <input type="hidden" name="provider" value={provider.code}/>
              <input type="hidden" name="model" value={provider.defaultModel}/>
              <button type="submit" disabled={!provider.configured} class="application-text-meta min-h-9 rounded-xl border border-[#DDE1EA] bg-white px-3 font-semibold text-[#000A57] disabled:opacity-40">Testar conexão</button>
            </form>
            {#if provider.credentialSource === "database"}
              <form method="POST" action="?/removeCredential">
                <input type="hidden" name="provider" value={provider.code}/>
                <button type="submit" class="application-text-meta min-h-9 rounded-xl px-3 font-semibold text-[#9B3C3C] hover:bg-[#FFF0F0]">Remover chave do painel</button>
              </form>
            {/if}
          </div>
        </article>
      {/each}
    </div>

    <p class="application-text-caption mt-4 rounded-xl bg-[#F7F8FB] px-4 py-3 leading-5 text-[#747A8A]">Claude e Grok ficam para a próxima etapa. O gateway já separa função, provedor e modelo, então novos adaptadores entram sem espalhar condicionais pelo domínio.</p>
  </section>

  <section class="mt-5 rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
    <div class="flex items-center gap-3"><span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><Bot size={18}/></span><div><h2 class="text-[14px] font-semibold text-[#252C3D]">Funções de IA</h2><p class="application-text-meta mt-1 leading-4 text-[#858B99]">Cada função escolhe provedor, modelo, fallback e somente as capacidades que o servidor permite para aquele contexto.</p></div></div>

    <div class="mt-5 space-y-4">
      {#each data.profiles as profile}
        {@const definition = taskDefinition(profile.task)}
        {#if definition}
          <form method="POST" action="?/saveTask" class="rounded-2xl border border-[#E5E7ED] bg-[#FAFAFC] p-4">
            <input type="hidden" name="task" value={profile.task}/>
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="text-[13px] font-semibold text-[#252C3D]">{definition.label}</h3>
                  <span class={"application-text-meta rounded-full px-2 py-1 font-bold " + (definition.wired ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#F1F2F5] text-[#777D8C]")}>{definition.wired ? "Conectada ao produto" : "Preparada"}</span>
                </div>
                <p class="application-text-meta mt-1 max-w-[760px] leading-4 text-[#858B99]">{definition.description}</p>
              </div>
              <label class="application-text-caption flex items-center gap-2 font-semibold text-[#555B6B]">
                <input name="enabled" type="checkbox" checked={profile.enabled} disabled={!definition.wired} class="h-4 w-4 rounded border-[#C9CEDA]"/>
                Ativa
              </label>
            </div>

            <div class="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <label class="block"><span class="application-text-meta mb-1 block font-semibold text-[#5A6170]">Provedor principal</span><select name="provider" class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px]">{#each data.providers as provider}<option value={provider.code} selected={provider.code === profile.provider}>{provider.label}</option>{/each}</select></label>
              <label class="block"><span class="application-text-meta mb-1 block font-semibold text-[#5A6170]">Modelo</span><input name="model" required maxlength="160" value={profile.model} class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px]"/></label>
              <label class="block"><span class="application-text-meta mb-1 block font-semibold text-[#5A6170]">Fallback</span><select name="fallbackProvider" class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px]"><option value="">Sem fallback</option>{#each data.providers as provider}<option value={provider.code} selected={provider.code === profile.fallbackProvider}>{provider.label}</option>{/each}</select></label>
              <label class="block"><span class="application-text-meta mb-1 block font-semibold text-[#5A6170]">Modelo do fallback</span><input name="fallbackModel" maxlength="160" value={profile.fallbackModel} placeholder="Opcional" class="h-10 w-full rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px]"/></label>
            </div>

            <fieldset class="mt-4">
              <legend class="application-text-meta mb-2 font-semibold text-[#5A6170]">Capacidades permitidas</legend>
              <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {#each definition.allowedCapabilities as capability}
                  <label class="application-text-meta flex items-start gap-2 rounded-xl border border-[#E1E4EC] bg-white px-3 py-2.5 text-[#555B6B]">
                    <input name="capability" value={capability} type="checkbox" checked={profile.capabilities.includes(capability)} class="mt-0.5 h-4 w-4 rounded border-[#C9CEDA]"/>
                    <span>{capabilityLabel(capability)}</span>
                  </label>
                {/each}
              </div>
            </fieldset>

            <button type="submit" class="application-text-meta mt-4 inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#000A57] px-3 font-semibold text-white"><Save size={13}/>Salvar função</button>
          </form>
        {/if}
      {/each}
    </div>
  </section>

  <div class="mt-5 grid gap-5 xl:grid-cols-2">
    <section class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
      <div class="flex items-center gap-3"><span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F2F0FF] text-[#5C4BA2]"><ShieldCheck size={18}/></span><div><h2 class="text-[14px] font-semibold text-[#252C3D]">Limites operacionais</h2><p class="application-text-meta mt-1 text-[#858B99]">Proteções de custo e duração do atendimento automático.</p></div></div>
      <form method="POST" action="?/savePolicy" class="mt-5 grid gap-4 sm:grid-cols-3">
        <label class="block"><span class="application-text-meta mb-1.5 block font-semibold text-[#555B6B]">Respostas por conversa</span><input name="maxRunsPerConversation" type="number" min="1" max="20" value={data.runtimePolicy.maxRunsPerConversation} class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
        <label class="block"><span class="application-text-meta mb-1.5 block font-semibold text-[#555B6B]">Tokens por dia</span><input name="dailyTokenBudget" type="number" min="5000" max="5000000" step="1000" value={data.runtimePolicy.dailyTokenBudget} class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
        <label class="block"><span class="application-text-meta mb-1.5 block font-semibold text-[#555B6B]">Máximo por resposta</span><input name="maxOutputTokens" type="number" min="200" max="2000" step="50" value={data.runtimePolicy.maxOutputTokens} class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
        <div class="sm:col-span-3"><button type="submit" class="application-text-meta inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#000A57] px-3 font-semibold text-white"><Save size={13}/>Salvar limites</button></div>
      </form>
    </section>

    <section class="rounded-[22px] border border-[#D8DDF4] bg-white p-5 sm:p-6">
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-3"><span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]"><CheckCircle2 size={18}/></span><div><h2 class="text-[14px] font-semibold text-[#252C3D]">Central de Ajuda pública</h2><p class="application-text-meta mt-1 text-[#858B99]">Disponibilidade e rate limit do assistente público.</p></div></div>
        <span class={"application-text-meta rounded-full px-2.5 py-1 font-bold " + (publicRuntimeReady ? "bg-[#EEF8F1] text-[#2F7045]" : "bg-[#FFF4E9] text-[#A9510D]")}>{publicRuntimeReady ? "Pronta" : "Incompleta"}</span>
      </div>

      <form method="POST" action="?/saveHelpPublicAi" class="mt-5 space-y-4">
        <div class="grid gap-2 sm:grid-cols-2">
          <label class="application-text-meta flex items-start gap-2 rounded-xl border border-[#E1E4EC] bg-[#FAFBFD] px-3 py-3 text-[#555B6B]"><input name="enabled" type="checkbox" checked={data.helpPublicAi.enabled} class="mt-0.5 h-4 w-4 rounded border-[#C9CEDA]"/><span><strong class="block">Habilitar assistente público</strong><small class="mt-1 block text-[#858B99]">Interruptor geral da API e do campo flutuante.</small></span></label>
          <label class="application-text-meta flex items-start gap-2 rounded-xl border border-[#E1E4EC] bg-[#FAFBFD] px-3 py-3 text-[#555B6B]"><input name="anonymousAccessEnabled" type="checkbox" checked={data.helpPublicAi.anonymousAccessEnabled} class="mt-0.5 h-4 w-4 rounded border-[#C9CEDA]"/><span><strong class="block">Permitir visitantes sem login</strong><small class="mt-1 block text-[#858B99]">Quando desmarcado, exige autenticação F10.</small></span></label>
        </div>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label class="block"><span class="application-text-meta mb-1 block font-semibold text-[#5A6170]">Janela</span><input name="rateLimitWindowMinutes" type="number" min="1" max="60" value={data.helpPublicAi.rateLimitWindowMinutes} class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
          <label class="block"><span class="application-text-meta mb-1 block font-semibold text-[#5A6170]">Por sessão</span><input name="sessionRequestLimit" type="number" min="1" max="100" value={data.helpPublicAi.sessionRequestLimit} class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
          <label class="block"><span class="application-text-meta mb-1 block font-semibold text-[#5A6170]">Por IP</span><input name="ipRequestLimit" type="number" min="1" max="500" value={data.helpPublicAi.ipRequestLimit} class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
          <label class="block"><span class="application-text-meta mb-1 block font-semibold text-[#5A6170]">Global/hora</span><input name="globalRequestLimitPerHour" type="number" min="10" max="50000" value={data.helpPublicAi.globalRequestLimitPerHour} class="h-10 w-full rounded-xl border border-[#DDE1EA] px-3 text-[11px]"/></label>
        </div>
        {#if !data.publicTaskReady}<p class="application-text-meta rounded-xl bg-[#FFF9F3] px-3 py-2.5 leading-4 text-[#7A3B08]">A função “IA da Central de Ajuda” precisa estar ativa e ter um provedor configurado.</p>{/if}
        {#if !data.publicHelpSecretConfigured}<p class="application-text-meta rounded-xl bg-[#FFF9F3] px-3 py-2.5 leading-4 text-[#7A3B08]">Defina <code>HELP_PUBLIC_AI_SECRET</code> no ambiente do servidor para proteger sessões anônimas.</p>{/if}
        <button type="submit" class="application-text-meta inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#000A57] px-3 font-semibold text-white"><Save size={13}/>Salvar política pública</button>
      </form>
    </section>
  </div>
</ApplicationContent>
