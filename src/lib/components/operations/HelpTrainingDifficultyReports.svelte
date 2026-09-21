<script lang="ts">
  import { CircleAlert, Mail } from "lucide-svelte";

  type DifficultyReport = {
    source: "invite" | "public";
    name: string;
    email: string;
    organizationName: string;
    version: number;
    stepId: string;
    stepTitle: string;
    detail: string;
    reportedAt: string | Date;
  };

  export let reports: DifficultyReport[] = [];

  function formatDate(value: string | Date): string {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  }
</script>

{#if reports.length > 0}
  <section class="mt-5 overflow-hidden rounded-[22px] border border-[#F0D5BE] bg-white">
    <header class="flex flex-col justify-between gap-3 border-b border-[#F4E6DA] bg-[#FFF9F3] px-5 py-4 sm:flex-row sm:items-center sm:px-6">
      <div class="flex items-start gap-3">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF0E4] text-[#B85408]"><CircleAlert size={17}/></span>
        <div>
          <h2 class="text-[14px] font-semibold text-[#3C3027]">Relatos de dificuldade</h2>
          <p class="mt-1 text-[10px] leading-5 text-[#806F61]">Texto original informado pelo participante, ligado à orientação exata em que ele parou.</p>
        </div>
      </div>
      <span class="rounded-full bg-white px-3 py-1.5 text-[9px] font-semibold text-[#8B5A34] ring-1 ring-[#EAD7C7]">{reports.length} recentes</span>
    </header>

    <div class="max-h-[460px] divide-y divide-[#F0F1F4] overflow-y-auto">
      {#each reports as report}
        <article class="grid gap-3 px-5 py-4 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)_130px] lg:items-start">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <strong class="truncate text-[11px] font-semibold text-[#2C3342]">{report.name}</strong>
              <span class={`rounded-full px-2 py-1 text-[8px] font-bold uppercase tracking-[0.05em] ${report.source === "invite" ? "bg-[#EEF0FF] text-[#000A57]" : "bg-[#EEF8F1] text-[#2F7045]"}`}>{report.source === "invite" ? "convite" : "público"}</span>
            </div>
            {#if report.email}<a href={`mailto:${report.email}`} class="mt-1 inline-flex max-w-full items-center gap-1.5 truncate text-[9px] font-medium text-[#000A57]"><Mail size={11}/>{report.email}</a>{/if}
            {#if report.organizationName}<p class="mt-1 truncate text-[9px] text-[#8B909D]">{report.organizationName}</p>{/if}
          </div>

          <div class="min-w-0">
            <p class="text-[9px] font-semibold uppercase tracking-[0.06em] text-[#8C6B50]">{report.stepTitle} · v{report.version}</p>
            <p class="mt-2 whitespace-pre-line text-[11px] leading-5 text-[#555C6C]">{report.detail}</p>
          </div>

          <time datetime={new Date(report.reportedAt).toISOString()} class="text-[9px] text-[#8B909D] lg:text-right">{formatDate(report.reportedAt)}</time>
        </article>
      {/each}
    </div>
  </section>
{/if}
