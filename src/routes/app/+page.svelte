<script lang="ts">
  import {
    BookOpen,
    CheckCircle2,
    CheckSquare2,
    Headphones,
    KeyRound,
    MessageCircleMore,
    MonitorCog,
    ShieldCheck,
  } from "lucide-svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  const modules = [
    {
      title: "Central de Ajuda",
      description: "Conteúdo, fluxos interativos, treinamentos e publicação.",
      icon: BookOpen,
      permission: "help.view",
      phase: "Próxima fase",
    },
    {
      title: "Tarefas",
      description: "Projetos, responsáveis, prioridades e visão Kanban.",
      icon: CheckSquare2,
      permission: "tasks.view",
      phase: "Planejado",
    },
    {
      title: "Tickets",
      description: "Filas, SLA, histórico, responsáveis e atendimento.",
      icon: Headphones,
      permission: "tickets.view",
      phase: "Planejado",
    },
    {
      title: "Chat",
      description: "Atendimento nativo integrado aos tickets e à Central de Ajuda.",
      icon: MessageCircleMore,
      permission: "chat.view",
      phase: "Planejado",
    },
    {
      title: "Acesso remoto",
      description: "Sessões autorizadas vinculadas ao atendimento e auditadas.",
      icon: MonitorCog,
      permission: "remote.use",
      phase: "PoC planejada",
    },
  ];

  const permissionCodes = new Set(data.permissions.map((permission) => permission.code));
  $: visibleModules = modules.filter((module) => permissionCodes.has(module.permission));
</script>

<svelte:head>
  <title>Visão geral | F10 Operations</title>
</svelte:head>

<div class="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 sm:py-9">
  <section class="rounded-[26px] border border-[#E2E5ED] bg-white p-6 shadow-[0_12px_35px_rgba(1,13,40,0.05)] sm:p-8">
    <div class="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
      <div>
        <div class="inline-flex items-center gap-2 rounded-full bg-[#EEF0FF] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#000A57]">
          <ShieldCheck size={15} aria-hidden="true" />
          Fundação ativa
        </div>
        <h1 class="mt-5 text-[32px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[40px]">
          Olá, {data.user.name.split(" ")[0]}.
        </h1>
        <p class="mt-3 max-w-[720px] text-[15px] leading-7 text-[#686E7E]">
          A base do F10 Operations está preparada para receber a Central de Ajuda dinâmica e os módulos operacionais sem alterar o site público.
        </p>
      </div>

      <div class="grid grid-cols-2 gap-3 sm:min-w-[360px]">
        <div class="rounded-2xl bg-[#F7F8FB] p-4">
          <KeyRound size={19} class="text-[#EA6D0B]" aria-hidden="true" />
          <strong class="mt-3 block text-[22px] font-semibold">{data.permissions.length}</strong>
          <span class="text-[11px] text-[#858A98]">permissões efetivas</span>
        </div>
        <div class="rounded-2xl bg-[#F7F8FB] p-4">
          <CheckCircle2 size={19} class="text-[#1E8F5A]" aria-hidden="true" />
          <strong class="mt-3 block text-[22px] font-semibold">{data.roles.length}</strong>
          <span class="text-[11px] text-[#858A98]">papéis atribuídos</span>
        </div>
      </div>
    </div>
  </section>

  <section class="mt-7">
    <div class="mb-4 flex items-end justify-between gap-4">
      <div>
        <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-[#959AA8]">Módulos</p>
        <h2 class="mt-1 text-[22px] font-semibold tracking-[-0.02em]">Evolução da plataforma</h2>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {#each visibleModules as module}
        <article class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 shadow-[0_8px_24px_rgba(1,13,40,0.035)]">
          <div class="flex items-start justify-between gap-4">
            <span class="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F1F3F8] text-[#000A57]">
              <svelte:component this={module.icon} size={20} aria-hidden="true" />
            </span>
            <span class="rounded-full bg-[#FFF0E4] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[#C75B08]">{module.phase}</span>
          </div>
          <h3 class="mt-5 text-[17px] font-semibold text-[#161C2C]">{module.title}</h3>
          <p class="mt-2 text-[13px] leading-6 text-[#737989]">{module.description}</p>
        </article>
      {/each}
    </div>
  </section>
</div>
