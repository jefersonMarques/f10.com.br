<script lang="ts">
  import {
    Bell,
    CircleUserRound,
    Home,
    ClipboardList,
    Users2,
    KanbanSquare,
    Funnel,
    ChevronDown,
    Search,
    RefreshCw,
    Clock3,
    MessageCircleMore,
    Mail,
    Phone,
    CalendarDays,
  } from "lucide-svelte";

  type LeadCard = {
    name: string;
    source: string;
    stage: string;
    phone: string;
    activity: string;
    footer: string;
    accentClass: string;
    activityClass: string;
    deadline?: string;
    deadlineClass?: string;
    badgeLabel?: string;
    badgeClass?: string;
  };

  type BoardColumn = {
    title: string;
    total: number;
    showMenu?: boolean;
    cards: LeadCard[];
  };

  const boardColumns: BoardColumn[] = [
    {
      title: "Novos Leads",
      total: 4,
      cards: [
        {
          name: "Marina Costa",
          source: "Campanha Google Ads",
          stage: "Primeiro contato",
          phone: "(11) 98741-2031",
          activity: "Novo lead",
          footer: "1 interação, entrou há 18 min",
          accentClass: "bg-[#ff5c2f]",
          activityClass: "text-[#ff5c2f]",
        },
        {
          name: "Lucas Almeida",
          source: "Landing page Ensino Médio",
          stage: "Aguardando atendimento",
          phone: "(41) 99812-4456",
          activity: "Novo lead",
          footer: "2 interações, entrou há 43 min",
          accentClass: "bg-[#ff5c2f]",
          activityClass: "text-[#ff5c2f]",
        },
        {
          name: "Fernanda Rocha",
          source: "Indicação de responsável",
          stage: "Primeiro contato",
          phone: "(27) 99634-1802",
          activity: "Novo lead",
          footer: "1 interação, entrou há 1h",
          accentClass: "bg-[#ff5c2f]",
          activityClass: "text-[#ff5c2f]",
        },
        {
          name: "Mateus Nogueira",
          source: "Formulário do site",
          stage: "Sem retorno inicial",
          phone: "(62) 98114-7721",
          activity: "Novo lead",
          footer: "2 interações, entrou há 2h",
          accentClass: "bg-[#ff5c2f]",
          activityClass: "text-[#ff5c2f]",
        },
      ],
    },
    {
      title: "Em atendimento",
      total: 3,
      cards: [
        {
          name: "Bianca Teles",
          source: "Campanha Ensino Fundamental",
          stage: "Contato em andamento",
          phone: "(21) 98147-2345",
          activity: "WhatsApp enviado",
          deadline: "Hoje 10:30",
          deadlineClass: "text-[#ff5630]",
          footer: "4 interações, última há 35 min",
          accentClass: "bg-[#cfd7d2]",
          activityClass: "text-[#50635d]",
        },
        {
          name: "Henrique Duarte",
          source: "Landing page bolsas",
          stage: "Qualificação",
          phone: "(47) 99672-9018",
          activity: "Ligação realizada",
          deadline: "Hoje 14:00",
          deadlineClass: "text-[#ff5630]",
          footer: "5 interações, última há 1h",
          accentClass: "bg-[#cfd7d2]",
          activityClass: "text-[#50635d]",
        },
        {
          name: "Patrícia Mello",
          source: "Indicação",
          stage: "Avaliação de perfil",
          phone: "(51) 99761-4822",
          activity: "Retornar responsável",
          footer: "3 interações, última há 2h",
          accentClass: "bg-[#cfd7d2]",
          activityClass: "text-[#50635d]",
        },
      ],
    },
    {
      title: "Visitas agendadas",
      total: 2,
      showMenu: true,
      cards: [
        {
          name: "Camila Viana",
          source: "Campanha de rematrícula",
          stage: "Tour presencial",
          phone: "(41) 99112-3408",
          activity: "Agendado: 08/04 15:00",
          deadline: "Confirmar hoje",
          deadlineClass: "text-[#ff5630]",
          footer: "7 interações, última há 4h",
          accentClass: "bg-[#1890ff]",
          activityClass: "text-[#ff5630]",
          badgeLabel: "Visita Confirmada",
          badgeClass: "bg-[#1890ff] text-white",
        },
        {
          name: "Rafael Gomes",
          source: "Formulário do site",
          stage: "Apresentação da escola",
          phone: "(11) 99427-8211",
          activity: "Agendado: 09/04 09:30",
          footer: "6 interações, última hoje",
          accentClass: "bg-[#1890ff]",
          activityClass: "text-[#ff5630]",
          badgeLabel: "Visita Confirmada",
          badgeClass: "bg-[#1890ff] text-white",
        },
      ],
    },
    {
      title: "Propostas enviadas",
      total: 1,
      showMenu: true,
      cards: [
        {
          name: "Natália Azevedo",
          source: "Campanha Ensino Médio",
          stage: "Proposta comercial enviada",
          phone: "(61) 99632-7805",
          activity: "WhatsApp Mensagem",
          deadline: "Hoje 17:00",
          deadlineClass: "text-[#ff5630]",
          footer: "9 interações, última há 1h",
          accentClass: "bg-[#f5a524]",
          activityClass: "text-[#50635d]",
          badgeLabel: "Proposta Enviada",
          badgeClass: "bg-[#f5a524] text-white",
        },
      ],
    },
    {
      title: "Matrículas fechadas",
      total: 1,
      showMenu: true,
      cards: [
        {
          name: "Helena Barbosa",
          source: "Campanha local",
          stage: "Matrícula concluída · Turma manhã",
          phone: "(17) 99658-9011",
          activity: "Documentação validada",
          deadline: "Pago",
          deadlineClass: "text-[#31b24c]",
          footer: "12 interações, fechou hoje",
          accentClass: "bg-[#31b24c]",
          activityClass: "text-[#50635d]",
          badgeLabel: "Entrada Paga",
          badgeClass: "bg-[#56b94f] text-white",
        },
      ],
    },
    {
      title: "Perdidos",
      total: 1,
      cards: [
        {
          name: "Bruno Siqueira",
          source: "Landing page bolsa parcial",
          stage: "Sem retorno após follow-up",
          phone: "(79) 99133-6422",
          activity: "",
          footer: "4 interações, última há 5 dias",
          accentClass: "bg-[#cfd7d2]",
          activityClass: "text-[#50635d]",
        },
      ],
    },
  ];
</script>

<!-- MOCKUP DO KANBAN - HERO -->
<div class="relative pb-10">
  <div class="scale-[1] max-w-7xl mx-auto px-4 lg:px-8">
    <div
      class="py-2 relative overflow-hidden rounded-[28px] border border-[#dce3df] bg-[#edf1ef] shadow-[0_18px_45px_rgba(15,23,42,0.18)]"
    >
      <div class="relative z-[1] origin-top h-auto lg:h-[680px]">
        <!-- Header da aplicação -->
        <div class="flex h-[58px] items-center justify-between border-b border-[#dde5e1] bg-[#edf1ef] px-5">
          <div class="flex min-w-0 items-center gap-2">
            <img
              src="/logo.webp"
              alt="Logo do F10 CRM"
              class="h-11 flex-shrink-0"
            />
            <span class="truncate text-[20px] font-semibold text-[#8e9692]">
              Minha escola
            </span>
          </div>
          <div class="flex items-center gap-4 text-[#1c1f1f]">
            <div class="relative">
              <Bell class="h-[18px] w-[18px]" />
              <span
                class="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ef4444] px-1 text-[10px] font-bold leading-none text-white"
              >
                12
              </span>
            </div>
            <CircleUserRound class="h-[18px] w-[18px]" />
          </div>
        </div>

        <div class="flex min-h-[630px] bg-[#edf1ef]">
          <!-- Sidebar -->
          <aside class="hidden w-[72px] shrink-0 border-r border-[#dde5e1] bg-[#e8efeb] lg:flex">
            <div class="flex w-full flex-col items-center justify-between py-4">
              <div class="flex w-full flex-col items-center gap-5">
                <div class="flex flex-col items-center gap-2 text-[#4f5b57]">
                  <div class="flex h-10 w-10 items-center justify-center rounded-xl">
                    <Home class="h-5 w-5" />
                  </div>
                  <span class="text-[11px]">Home</span>
                </div>
                <div class="flex flex-col items-center gap-2 text-[#4f5b57]">
                  <div class="flex h-10 w-10 items-center justify-center rounded-xl">
                    <ClipboardList class="h-5 w-5" />
                  </div>
                  <span class="text-[11px]">Tarefas</span>
                </div>
                <div class="flex flex-col items-center gap-2 text-[#4f5b57]">
                  <div class="flex h-10 w-10 items-center justify-center rounded-xl">
                    <Users2 class="h-5 w-5" />
                  </div>
                  <span class="text-[11px]">Leads</span>
                </div>
                <div class="flex flex-col items-center gap-2 text-[#0b736a]">
                  <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#d4e6e1]">
                    <KanbanSquare class="h-5 w-5" />
                  </div>
                  <span class="text-[11px] font-medium">Kanban</span>
                </div>
              </div>
            </div>
          </aside>

          <!-- Área principal do Kanban -->
          <div class="min-w-0 flex-1 bg-[#edf1ef] px-3 pb-3 pt-3">
            <div class="rounded-[14px] bg-[#eef3f0]">
              <!-- Top bar do funil -->
              <div class="border-b border-[#d9e2dd] px-3 pt-3">
                <div class="flex flex-wrap items-center gap-8">
                  <button
                    type="button"
                    class="inline-flex items-center gap-2 border-b-[3px] border-[#117e73] pb-3 text-[14px] font-medium text-[#117e73]"
                  >
                    <Funnel class="h-4 w-4" />
                    <span>Funil: <strong class="font-semibold">Matrículas 2026</strong></span>
                    <ChevronDown class="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center gap-2 pb-3 text-[14px] font-medium text-[#f26b21]"
                  >
                    <ClipboardList class="h-4 w-4" />
                    Tarefas (14)
                  </button>
                </div>
              </div>

              <!-- Barra de filtros e busca -->
              <div class="border-b border-[#d9e2dd] px-3 py-2.5">
                <div class="flex flex-wrap items-center gap-3">
                  <div class="flex items-center gap-2">
                    <span class="relative h-8 w-8 rounded-full bg-[#ff4f45]">
                      <span class="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ff4f45] px-1 text-[10px] font-bold leading-none text-white">8</span>
                    </span>
                    <span class="relative h-8 w-8 rounded-full bg-[#f5c518]">
                      <span class="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ff8b1f] px-1 text-[10px] font-bold leading-none text-white">3</span>
                    </span>
                    <span class="h-8 w-8 rounded-full bg-[#2f93ff]"></span>
                    <span class="relative h-8 w-8 rounded-full bg-[#9d9d9d]">
                      <span class="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ff4f45] px-1 text-[10px] font-bold leading-none text-white">2</span>
                    </span>
                  </div>

                  <button
                    type="button"
                    class="inline-flex h-8 items-center gap-2 rounded-full border border-[#d7dfdb] bg-[#f5f7f6] px-4 text-[13px] font-medium text-[#616c68]"
                  >
                    Leads ativos
                  </button>

                  <div class="hidden items-center gap-2 md:flex">
                    <span class="flex h-8 w-8 items-center justify-center rounded-full bg-[#f1f3f2] text-[#6c7672]">
                      <CalendarDays class="h-4 w-4" /> <!-- se quiser adicionar ícone de calendário -->
                    </span>
                    <span class="flex h-8 w-8 items-center justify-center rounded-full bg-[#f1f3f2] text-[#6c7672]">
                      <ClipboardList class="h-4 w-4" />
                    </span>
                    <span class="flex h-8 w-8 items-center justify-center rounded-full bg-[#f1f3f2] text-[#6c7672]">
                      <Phone class="h-4 w-4" />
                    </span>
                    <span class="flex h-8 w-8 items-center justify-center rounded-full bg-[#f1f3f2] text-[#6c7672]">
                      <Mail class="h-4 w-4" />
                    </span>
                    <span class="flex h-8 w-8 items-center justify-center rounded-full bg-[#f1f3f2] text-[#6c7672]">
                      <MessageCircleMore class="h-4 w-4" />
                    </span>
                  </div>

                  <div class="min-w-[280px] flex-1">
                    <div class="flex h-9 items-center gap-3 rounded-full border border-[#d5deda] bg-[#f6f8f7] px-4">
                      <Search class="h-4 w-4 text-[#6f7b76]" />
                      <input
                        readonly
                        placeholder="Buscar lead, etapa ou responsável..."
                        class="w-full bg-transparent text-[14px] text-[#6f7b76] outline-none placeholder:text-[#8b9792]"
                      />
                    </div>
                  </div>

                  <button type="button" class="flex h-9 w-9 items-center justify-center rounded-full text-[#5f6965]">
                    <RefreshCw class="h-4 w-4" />
                  </button>
                </div>
              </div>

              <!-- Board com colunas (scroll horizontal no mobile) -->
              <div class="overflow-x-auto px-2 pb-2 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div class="flex min-w-[1630px] gap-4">
                  {#each boardColumns as column}
                    <div class="w-[272px] shrink-0 rounded-[8px] bg-[#f4f2f2]">
                      <div class="flex items-center justify-between border-b border-[#e0e0e0] px-4 py-4">
                        <h3 class="text-[14px] font-semibold text-[#222b29]">
                          {column.title}
                        </h3>
                        <div class="flex items-center gap-2 text-[#5f6965]">
                          <span class="text-[14px]">{column.total}</span>
                          {#if column.showMenu}
                            <Funnel class="h-4 w-4" />
                          {/if}
                        </div>
                      </div>
                      <div class="space-y-3 p-2">
                        {#each column.cards as card}
                          <article class="relative overflow-hidden rounded-[8px] border border-[#d3d9d6] bg-[#dbe1de] p-4">
                            <span class={`absolute inset-y-0 left-0 w-[3px] ${card.accentClass}`}></span>
                            {#if card.badgeLabel}
                              <div class="mb-2">
                                <span class={`inline-flex rounded-[4px] px-2 py-1 text-[10px] font-semibold leading-none ${card.badgeClass}`}>
                                  {card.badgeLabel}
                                </span>
                              </div>
                            {/if}
                            <h4 class="line-clamp-1 text-[15px] font-semibold leading-[1.25] text-[#202826]">
                              {card.name}
                            </h4>
                            <p class="mt-1 text-[12px] leading-[1.35] text-[#68736f]">
                              {card.source}
                            </p>
                            <p class="mt-0.5 text-[12px] leading-[1.35] text-[#68736f]">
                              {card.stage}
                            </p>
                            <p class="mt-2 text-[12px] text-[#55b96b]">
                              ↳ {card.phone}
                            </p>
                            <div class="my-2 border-t border-[#cfd6d2]"></div>
                            {#if card.activity || card.deadline}
                              <div class="flex items-center justify-between gap-2">
                                <div class="min-w-0">
                                  {#if card.activity}
                                    <span class={`text-[12px] ${card.activityClass}`}>
                                      {card.activity}
                                    </span>
                                  {/if}
                                </div>
                                {#if card.deadline}
                                  <span class={`whitespace-nowrap text-[12px] ${card.deadlineClass}`}>
                                    {card.deadline}
                                  </span>
                                {/if}
                              </div>
                            {/if}
                            <div class="mt-2 flex items-center justify-between gap-2">
                              <span class="text-[12px] text-[#5f6965]">
                                {card.footer}
                              </span>
                              <Clock3 class="h-4 w-4 shrink-0 text-[#2f84ff]" />
                            </div>
                          </article>
                        {/each}
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>