<script lang="ts">
  import { onMount } from "svelte";
  import {
    CheckCircle2,
    ChevronDown,
    LoaderCircle,
    TriangleAlert,
  } from "lucide-svelte";

  export let enabled = false;

  type VideoProcessingJobStatus =
    | "queued"
    | "running"
    | "retry_waiting"
    | "completed"
    | "failed";

  type VideoProcessingJob = {
    id: string;
    contentId: string;
    contentTitle: string;
    status: VideoProcessingJobStatus;
    stage: string;
    progressLabel: string;
    progressDetail: string;
    attemptCount: number;
    maxAttempts: number;
    completedParts: number;
    totalParts: number | null;
  };

  const ACTIVE_STATUSES = new Set<VideoProcessingJobStatus>([
    "queued",
    "running",
    "retry_waiting",
  ]);
  const REFRESH_INTERVAL_MS = 5_000;

  let jobs: VideoProcessingJob[] = [];
  let panelOpen = false;
  let refreshTimer: ReturnType<typeof setInterval> | null = null;
  let refreshing = false;

  $: activeJobs = jobs.filter((job) => ACTIVE_STATUSES.has(job.status));
  $: hasFailedJob = jobs.some((job) => job.status === "failed");
  $: triggerLabel = activeJobs.length > 0
    ? "Processando"
    : hasFailedJob
      ? "Atenção"
      : "Pronto";

  function triggerClasses(): string {
    if (activeJobs.length > 0) {
      return "border-[#F1D7BD] bg-[#FFF9F3] text-[#A9510D] hover:bg-[#FFF4E9]";
    }
    if (hasFailedJob) {
      return "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C] hover:bg-[#FFF0F0]";
    }
    return "border-[#CFE8D7] bg-[#F6FBF7] text-[#2D7143] hover:bg-[#EEF8F1]";
  }

  async function refreshJobs(): Promise<void> {
    if (!enabled || refreshing) return;
    refreshing = true;
    try {
      const response = await fetch("/api/app/help/video-processing", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) return;

      const payload = await response.json().catch(() => ({})) as {
        success?: boolean;
        jobs?: VideoProcessingJob[];
      };
      if (payload.success && Array.isArray(payload.jobs)) {
        jobs = payload.jobs;
        if (jobs.length === 0) panelOpen = false;
      }
    } catch {
      // O indicador é auxiliar e tenta novamente na próxima atualização.
    } finally {
      refreshing = false;
    }
  }

  onMount(() => {
    if (!enabled) return;

    void refreshJobs();
    refreshTimer = setInterval(() => {
      if (!document.hidden) void refreshJobs();
    }, REFRESH_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (!document.hidden) void refreshJobs();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (refreshTimer) clearInterval(refreshTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  });
</script>

{#if enabled && jobs.length > 0}
  <div class="relative">
    <button
      type="button"
      class={`application-text-caption flex h-10 items-center gap-2 rounded-xl border px-2.5 font-semibold transition sm:px-3 ${triggerClasses()}`}
      aria-label="Acompanhar processamento de conteúdo"
      aria-expanded={panelOpen}
      on:click={() => (panelOpen = !panelOpen)}
    >
      {#if activeJobs.length > 0}
        <LoaderCircle size={16} class="animate-spin" aria-hidden="true" />
      {:else if hasFailedJob}
        <TriangleAlert size={16} aria-hidden="true" />
      {:else}
        <CheckCircle2 size={16} aria-hidden="true" />
      {/if}
      <span class="hidden md:inline">{triggerLabel}</span>
      {#if activeJobs.length > 0}
        <span class="application-text-meta inline-flex min-w-5 items-center justify-center rounded-full bg-white px-1.5 font-bold">
          {activeJobs.length}
        </span>
      {/if}
      <ChevronDown size={13} class="hidden sm:block" aria-hidden="true" />
    </button>

    {#if panelOpen}
      <div class="absolute right-0 top-12 z-50 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#E1E4EC] bg-white shadow-2xl shadow-slate-900/15">
        <div class="flex items-center justify-between border-b border-[#EEF0F5] px-4 py-3">
          <strong class="text-[12px] font-semibold text-[#202637]">Processamento de conteúdo</strong>
          {#if activeJobs.length > 0}
            <span class="application-text-meta rounded-full bg-[#FFF3E9] px-2 py-1 font-semibold text-[#A9510D]">
              {activeJobs.length} ativo(s)
            </span>
          {/if}
        </div>

        <div class="max-h-[420px] overflow-y-auto p-1.5">
          {#each jobs as job}
            <a
              href={ACTIVE_STATUSES.has(job.status) ? "/app/help/content" : `/app/help/content/${job.contentId}/images`}
              class="flex items-start gap-3 rounded-xl px-3 py-3 transition hover:bg-[#F6F7FB]"
              on:click={() => (panelOpen = false)}
            >
              <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F5F6FA]">
                {#if ACTIVE_STATUSES.has(job.status)}
                  <LoaderCircle size={15} class="animate-spin text-[#A9510D]" aria-hidden="true" />
                {:else if job.status === "failed"}
                  <TriangleAlert size={15} class="text-[#9B2C2C]" aria-hidden="true" />
                {:else}
                  <CheckCircle2 size={15} class="text-[#2D7143]" aria-hidden="true" />
                {/if}
              </span>

              <span class="min-w-0 flex-1">
                <strong class="block truncate text-[12px] font-semibold text-[#303645]">
                  {job.contentTitle}
                </strong>
                <span class="mt-1 block text-[11px] font-medium leading-4 text-[#5E6575]">
                  {job.progressLabel}
                </span>
                {#if job.progressDetail}
                  <span class="mt-0.5 block line-clamp-2 text-[10px] leading-4 text-[#8A909E]">
                    {job.progressDetail}
                  </span>
                {/if}
                {#if job.totalParts && job.totalParts > 0}
                  <span class="mt-1.5 block text-[10px] font-semibold text-[#8A909E]">
                    {Math.min(job.completedParts, job.totalParts)} de {job.totalParts} partes
                  </span>
                {:else if ACTIVE_STATUSES.has(job.status) && job.attemptCount > 0}
                  <span class="mt-1.5 block text-[10px] font-semibold text-[#8A909E]">
                    Tentativa {job.attemptCount} de {job.maxAttempts}
                  </span>
                {/if}
              </span>
            </a>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/if}
