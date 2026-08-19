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
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;

  const modules = [
    {
      title: "Base de Conhecimento",
      description: "Conteúdo estruturado em passos, mídia e contexto exclusivo para IA.",
      icon: BookOpen,
      permission: "help.view",
      phase: "Disponível",
      href: "/app/help/content",
    },
    {
      title: "Tarefas",
      description: "Projetos, responsáveis, prioridades e visão Kanban.",
      icon: CheckSquare2,
      permission: "tasks.view",
      phase: "Disponível",
      href: "/app/tasks",
    },
    {
      title: "Tickets",
      description: "Filas, histórico, responsáveis e atendimento.",
      icon: Headphones,
      permission: "tickets.view",
      phase: "Disponível",
      href: "/app/tickets",
    },
    {
      title: "Chat",
      description: "Atendimento nativo integrado aos tickets e à operação humana.",
      icon: MessageCircleMore,
      permission: "chat.view",
      phase: "Disponível",
      href: "/app/chat",
    },
    {
      title: "Acesso remoto",
      description: "Sessões autorizadas vinculadas ao atendimento e auditadas.",
      icon: MonitorCog,
      permission: "remote.use",
      phase: "Disponível",
      href: "/app/remote",
    },
  ];

  const permissionCodes = new Set(data.permissions.map((permission) => permission.code));
  $: visibleModules = modules.filter((module) => permissionCodes.has(module.permission));
</script>

<svelte:head>
  <title>Visão geral | F10 Operations</title>
</svelte:head>

<ApplicationContent width="wide">
  <section class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
    <div class="flex items-center gap-4 rounded-2xl border border-[#E2E5ED] bg-white p-4 sm:p-5">
      <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF0FF] text-[#000A57]">
        <ShieldCheck size={20} aria-hidden="true" />
      </span>
      <div class="min-w-0">
        <strong class="block text-[15px] font-semibold text-[#202637]">Olá, {data.user.name.split(" ")[0]}.</strong>
        <p class="mt-1 text-[12px] leading-5 text-[#707687]">Conhecimento, tarefas e atendimento reunidos no mesmo ambiente operacional.</p>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="rounded-2xl border border-[#E2E5ED] bg-white p-4">
        <div class="flex items-center justify-between gap-3">
          <KeyRound size={17} class="text-[#EA6D0B]" aria-hidden="true" />
          <strong class="text-[19px] font-semibold text-[#202637]">{data.permissions.length}</strong>
        </div>
        <span class="mt-2 block text-[11px] text-[#858A98]">permissões efetivas</span>
      </div>
      <div class="rounded-2xl border border-[#E2E5ED] bg-white p-4">
        <div class="flex items-center justify-between gap-3">
          <CheckCircle2 size={17} class="text-[#1E8F5A]" aria-hidden="true" />
          <strong class="text-[19px] font-semibold text-[#202637]">{data.roles.length}</strong>
        </div>
        <span class="mt-2 block text-[11px] text-[#858A98]">papéis atribuídos</span>
      </div>
    </div>
  </section>

  <section class="mt-5">
    <div class="mb-3 flex items-center justify-between gap-4">
      <h2 class="text-[16px] font-semibold tracking-[-0.02em] text-[#202637]">Módulos</h2>
      <span class="text-[11px] text-[#8A909E]">{visibleModules.length} disponíveis</span>
    </div>

    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {#each visibleModules as module}
        <a href={module.href} class="group rounded-2xl border border-[#E2E5ED] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#C9CEDA] hover:shadow-[0_10px_24px_rgba(1,13,40,0.06)]">
          <div class="flex items-start justify-between gap-4">
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F1F3F8] text-[#000A57]">
              <svelte:component this={module.icon} size={19} aria-hidden="true" />
            </span>
            <span class="rounded-full bg-[#EEF8F1] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[#2F7045]">{module.phase}</span>
          </div>
          <h3 class="mt-4 text-[15px] font-semibold text-[#161C2C]">{module.title}</h3>
          <p class="mt-1.5 text-[12px] leading-5 text-[#737989]">{module.description}</p>
        </a>
      {/each}
    </div>
  </section>
</ApplicationContent>
