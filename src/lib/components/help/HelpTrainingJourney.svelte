<script lang="ts">
  import { Check, ChevronRight, Clock3, LockKeyhole, Route } from "lucide-svelte";

  type JourneyModule = {
    id: string;
    title: string;
    summary: string;
    slug: string;
    sortOrder: number;
    stepCount: number;
    estimatedSeconds: number;
    status: "completed" | "current" | "pending";
  };

  export let trainingTitle: string;
  export let welcomeMessage = "";
  export let modules: JourneyModule[] = [];
  export let completedModules = 0;
  export let totalModules = 0;
  export let percent = 0;
  export let openAction = "";
  export let onOpen: (() => void) | undefined = undefined;
  export let preview = false;

  function minutes(seconds: number): string {
    const value = Math.max(1, Math.round(seconds / 60));
    return `~${value} min`;
  }
</script>

<main class="min-h-[100dvh] bg-[#F4F5F9] px-4 py-7 text-[#010D28] sm:px-6 sm:py-10">
  <section class="mx-auto max-w-[900px]">
    <header class="rounded-[24px] border border-[#E0E3EB] bg-white px-6 py-6 shadow-[0_16px_42px_rgba(17,24,44,0.06)] sm:px-8 sm:py-7">
      <div class="flex flex-col gap-6">
        <div class="flex flex-wrap items-center gap-3">
          <span class="text-[28px] font-black tracking-[-0.08em] text-[#F36B00]">F10</span>
          <span class="h-6 w-px bg-[#DDE1E9]"></span>
          <span class="rounded-full bg-[#F3F5F8] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#000A57]">{preview ? "Prévia da jornada" : "Sua jornada"}</span>
        </div>

        <div class="max-w-[680px]">
          <h1 class="text-[29px] font-semibold leading-tight tracking-[-0.04em] text-[#071431] sm:text-[38px]">{trainingTitle}</h1>
          {#if welcomeMessage}
            <p class="mt-3 max-w-[640px] text-[12px] leading-6 text-[#697080]">{welcomeMessage}</p>
          {/if}
        </div>

        <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div>
            <div class="flex items-center justify-between gap-4">
              <span class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A90A0]">Progresso</span>
              <strong class="text-[12px] font-semibold text-[#303645]">{completedModules} de {totalModules} módulos</strong>
            </div>
            <div class="mt-2 h-2 overflow-hidden rounded-full bg-[#ECEEF3]">
              <div class="h-full rounded-full bg-[#F36B00] transition-[width] duration-500" style={`width: ${percent}%`}></div>
            </div>
          </div>
          <strong class="text-[28px] font-semibold tracking-[-0.04em] text-[#11182C]">{percent}%</strong>
        </div>
      </div>
    </header>

    <div class="mx-auto mt-8 max-w-[760px]">
      <div class="mb-5 flex items-center gap-3">
        <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-[#000A57] text-white"><Route size={17}/></span>
        <div>
          <h2 class="text-[13px] font-semibold text-[#252B3B]">Mapa da trilha</h2>
          <p class="mt-0.5 text-[10px] text-[#8B909D]">Conclua o módulo atual para liberar o próximo.</p>
        </div>
      </div>

      <div class="relative">
        {#if modules.length > 1}
          <div class="absolute bottom-[18px] left-[18px] top-[18px] w-px bg-[#D9DEE8]"></div>
        {/if}

        <div class="relative">
          {#each modules as module, index (module.id)}
            <article class="grid grid-cols-[36px_minmax(0,1fr)] gap-4">
              <div class="relative z-10 flex justify-center">
                {#if module.status === "completed"}
                  <span class="flex h-9 w-9 items-center justify-center rounded-full border-4 border-[#F4F5F9] bg-[#2F7045] text-white shadow-sm">
                    <Check size={14}/>
                  </span>
                {:else if module.status === "current"}
                  <span class="flex h-9 w-9 items-center justify-center rounded-full border-4 border-[#FFF0E4] bg-[#F36B00] text-[10px] font-bold text-white shadow-[0_0_0_4px_rgba(243,107,0,0.08)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                {:else}
                  <span class="flex h-9 w-9 items-center justify-center rounded-full border-4 border-[#F4F5F9] bg-[#E6E9EF] text-[#8E95A3]">
                    <LockKeyhole size={13}/>
                  </span>
                {/if}
              </div>

              <div class="pb-5">
                <div class={`rounded-2xl border bg-white px-5 py-5 transition sm:px-6 ${module.status === "current" ? "border-[#F0B486] shadow-[0_12px_30px_rgba(243,107,0,0.09)]" : module.status === "completed" ? "border-[#DCE8E0]" : "border-[#E2E5EC]"}`}>
                  <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class={`text-[9px] font-bold uppercase tracking-[0.11em] ${module.status === "current" ? "text-[#F36B00]" : module.status === "completed" ? "text-[#2F7045]" : "text-[#949BA8]"}`}>
                          {module.status === "completed" ? "Concluído" : module.status === "current" ? "Você está aqui" : "Bloqueado"}
                        </span>
                      </div>

                      <h3 class="mt-1.5 text-[16px] font-semibold leading-6 text-[#202738]">{String(index + 1).padStart(2, "0")} · {module.title}</h3>

                      {#if module.summary}
                        <p class={`mt-2 line-clamp-2 text-[11px] leading-5 ${module.status === "pending" ? "text-[#9096A2]" : "text-[#747B8A]"}`}>{module.summary}</p>
                      {/if}

                      <div class="mt-3 flex flex-wrap items-center gap-3 text-[10px] font-medium text-[#858B99]">
                        <span>{module.stepCount} {module.stepCount === 1 ? "orientação" : "orientações"}</span>
                        <span class="inline-flex items-center gap-1"><Clock3 size={11}/>{minutes(module.estimatedSeconds)}</span>
                      </div>
                    </div>

                    {#if module.status === "current"}
                      <div class="shrink-0 sm:pt-1">
                        {#if onOpen}
                          <button type="button" on:click={onOpen} class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#F36B00] px-4 text-[11px] font-bold text-white shadow-[0_8px_18px_rgba(243,107,0,0.18)]">
                            Continuar
                            <ChevronRight size={14}/>
                          </button>
                        {:else if openAction}
                          <form method="POST" action={openAction}>
                            <button type="submit" class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#F36B00] px-4 text-[11px] font-bold text-white shadow-[0_8px_18px_rgba(243,107,0,0.18)]">
                              Continuar
                              <ChevronRight size={14}/>
                            </button>
                          </form>
                        {/if}
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
            </article>
          {/each}
        </div>
      </div>
    </div>
  </section>
</main>
