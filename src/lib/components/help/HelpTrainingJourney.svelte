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
  <section class="mx-auto max-w-[940px]">
    <header class="overflow-hidden rounded-[28px] border border-[#E0E3EB] bg-white shadow-[0_18px_55px_rgba(17,24,44,0.07)]">
      <div class="bg-[radial-gradient(circle_at_top_right,rgba(243,107,0,0.12),transparent_36%),linear-gradient(135deg,#FFFFFF_0%,#F8F9FF_100%)] px-6 py-7 sm:px-9 sm:py-9">
        <div class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div class="max-w-[640px]">
            <div class="flex items-center gap-2">
              <span class="text-[28px] font-black tracking-[-0.08em] text-[#F36B00]">F10</span>
              <span class="rounded-full border border-[#E7E9F0] bg-white px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.13em] text-[#000A57]">{preview ? "Prévia da jornada" : "Sua jornada"}</span>
            </div>
            <h1 class="mt-5 text-[28px] font-semibold tracking-[-0.04em] text-[#071431] sm:text-[38px]">{trainingTitle}</h1>
            {#if welcomeMessage}<p class="mt-3 max-w-[620px] text-[12px] leading-6 text-[#697080]">{welcomeMessage}</p>{/if}
          </div>

          <div class="min-w-[150px] rounded-2xl border border-[#E6E8EF] bg-white/90 p-4 shadow-sm">
            <div class="flex items-end justify-between gap-3">
              <strong class="text-[25px] font-semibold tracking-[-0.04em] text-[#11182C]">{percent}%</strong>
              <span class="pb-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[#8A90A0]">concluído</span>
            </div>
            <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-[#ECEEF3]">
              <div class="h-full rounded-full bg-[#F36B00] transition-[width] duration-500" style={`width: ${percent}%`}></div>
            </div>
            <p class="mt-2 text-[10px] text-[#858B99]">{completedModules} de {totalModules} módulos concluídos</p>
          </div>
        </div>
      </div>
    </header>

    <div class="mx-auto mt-7 max-w-[760px]">
      <div class="mb-5 flex items-center gap-3 px-1">
        <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-[#000A57] text-white"><Route size={17}/></span>
        <div>
          <h2 class="text-[13px] font-semibold text-[#252B3B]">Mapa da trilha</h2>
          <p class="mt-0.5 text-[10px] text-[#8B909D]">Conclua o módulo atual para liberar o próximo.</p>
        </div>
      </div>

      <div class="relative">
        <div class="absolute bottom-8 left-[24px] top-8 w-[2px] bg-[#DDE1E9] sm:left-[28px]"></div>

        <div class="relative space-y-4">
          {#each modules as module, index (module.id)}
            <article class={`relative grid grid-cols-[50px_minmax(0,1fr)] gap-3 sm:grid-cols-[58px_minmax(0,1fr)] ${module.status === "pending" ? "opacity-70" : ""}`}>
              <div class="relative flex justify-center pt-5">
                {#if module.status === "completed"}
                  <span class="z-10 flex h-10 w-10 items-center justify-center rounded-full border-[5px] border-[#F4F5F9] bg-[#2F7045] text-white shadow-sm"><Check size={16}/></span>
                {:else if module.status === "current"}
                  <span class="z-10 flex h-11 w-11 items-center justify-center rounded-full border-[5px] border-[#FFF3E9] bg-[#F36B00] text-[11px] font-bold text-white shadow-[0_0_0_5px_rgba(243,107,0,0.08)]">{String(index + 1).padStart(2, "0")}</span>
                {:else}
                  <span class="z-10 flex h-10 w-10 items-center justify-center rounded-full border-[5px] border-[#F4F5F9] bg-[#E6E8EE] text-[#89909F]"><LockKeyhole size={14}/></span>
                {/if}
              </div>

              <div class={`overflow-hidden rounded-[22px] border bg-white transition ${module.status === "current" ? "border-[#F3B27E] shadow-[0_14px_36px_rgba(243,107,0,0.10)]" : module.status === "completed" ? "border-[#DCE9E0]" : "border-[#E2E5EC]"}`}>
                <div class="p-5 sm:p-6">
                  <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class={`text-[9px] font-bold uppercase tracking-[0.12em] ${module.status === "current" ? "text-[#F36B00]" : module.status === "completed" ? "text-[#2F7045]" : "text-[#959BA8]"}`}>
                          {module.status === "completed" ? "Concluído" : module.status === "current" ? "Você está aqui" : "Próximo módulo"}
                        </span>
                      </div>
                      <h3 class="mt-2 text-[16px] font-semibold leading-6 text-[#202738]">{module.title}</h3>
                      {#if module.summary}<p class="mt-2 line-clamp-2 text-[11px] leading-5 text-[#747B8A]">{module.summary}</p>{/if}
                      <div class="mt-3 flex flex-wrap items-center gap-3 text-[10px] font-medium text-[#858B99]">
                        <span>{module.stepCount} {module.stepCount === 1 ? "orientação" : "orientações"}</span>
                        <span class="inline-flex items-center gap-1"><Clock3 size={11}/>{minutes(module.estimatedSeconds)}</span>
                      </div>
                    </div>

                    {#if module.status === "current"}
                      <div class="shrink-0">
                        {#if onOpen}
                          <button type="button" on:click={onOpen} class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#F36B00] px-4 text-[11px] font-bold text-white shadow-[0_10px_24px_rgba(243,107,0,0.18)]">Continuar <ChevronRight size={14}/></button>
                        {:else if openAction}
                          <form method="POST" action={openAction}>
                            <button type="submit" class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#F36B00] px-4 text-[11px] font-bold text-white shadow-[0_10px_24px_rgba(243,107,0,0.18)]">Continuar <ChevronRight size={14}/></button>
                          </form>
                        {/if}
                      </div>
                    {/if}
                  </div>
                </div>

                {#if module.status === "current"}
                  <div class="border-t border-[#F7DFCB] bg-[#FFF9F4] px-5 py-2.5 text-[9px] font-medium text-[#9B5A24] sm:px-6">Ao concluir este módulo, você volta automaticamente para este mapa.</div>
                {/if}
              </div>
            </article>
          {/each}
        </div>
      </div>
    </div>
  </section>
</main>
