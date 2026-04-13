<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import IconArrowRight from "$lib/icons/IconArrowRight.svelte";
  import FaqAccordion from "$lib/components/FaqAccordion.svelte";
  import SeoHead from "$lib/components/SeoHead.svelte";

  import {
    ArrowRight,
    CalendarClock,
    ClipboardList,
    MessageCircleMore,
    MessagesSquare,
    Target,
    Users2,
    Workflow,
  } from "lucide-svelte";

  import { contactModalConfig } from "$lib/stores/contactModals";
  import { showForm } from "$lib/stores/formPopup";

  import CrmKanbanDemo from "$lib/components/mockups/CrmKanbanDemo.svelte";
  import CrmWhatsAppDemo from "$lib/components/mockups/CrmWhatsAppDemo.svelte";

  const canonicalUrl = "https://f10.com.br/solucoes/crm-escolar";
  const ogImageUrl = "https://f10.com.br/og/f10-crm-escolar.jpg";

  const faqItems = [
    {
      question:
        "Já usamos planilhas e WhatsApp. O F10 CRM realmente faz diferença?",
      answer:
        "Sim. Planilhas e conversas soltas até ajudam no começo, mas não organizam o funil, não mostram claramente quem está sem retorno e não avisam quando o lead está esfriando. No F10 CRM, cada lead entra com contexto, passa por etapas definidas, recebe próximas ações e fica visível para a equipe e para a gestão.",
    },
    {
      question:
        "Minha equipe não é muito ‘de tecnologia’. Eles vão conseguir usar?",
      answer:
        "Sim. O F10 CRM foi pensado para a rotina da escola. A equipe trabalha com visão clara do funil, tarefas objetivas, histórico centralizado e WhatsApp dentro do sistema. Em vez de menus confusos, a lógica é simples: ver o lead, entender a etapa, executar a próxima ação e avançar o processo.",
    },
    {
      question: "Funciona para escolas pequenas ou só para grandes redes?",
      answer:
        "Funciona para os dois cenários. Em escolas menores, o CRM tira tudo da planilha e centraliza o atendimento com mais disciplina. Em operações maiores, ganha ainda mais valor com controle por equipe, histórico compartilhado, acompanhamento gerencial e padronização do processo comercial.",
    },
    {
      question: "Vou precisar mudar todos os processos de uma vez?",
      answer:
        "Não. Muitas escolas começam organizando o funil de matrículas, centralizando o WhatsApp e definindo as tarefas essenciais do atendimento. Depois disso, podem evoluir gradualmente a operação. O importante é sair logo do modelo improvisado e criar um fluxo comercial previsível.",
    },
    {
      question:
        "Como o F10 CRM ajuda o vendedor a não perder o timing do lead?",
      answer:
        "O sistema organiza tarefas, calendário, lembretes e notificações dentro da própria plataforma. Assim, o vendedor sabe o que precisa responder hoje, quais leads estão pendentes e quais retornos não podem passar. Isso reduz o risco de esquecer follow-up e aumenta a velocidade do atendimento.",
    },
    {
      question: "Como funciona a implantação e o suporte do F10?",
      answer:
        "Na implantação, o time ajuda a configurar o funil, etapas, perfis de usuários e rotina comercial de acordo com a realidade da sua escola. Depois disso, sua equipe recebe orientação prática para usar o CRM no dia a dia, com suporte contínuo para ajustes, dúvidas e evolução da operação.",
    },
  ];

  const breadcrumbItems = [
    { name: "Home", item: "https://f10.com.br/" },
    { name: "Soluções", item: "https://f10.com.br/solucoes" },
    { name: "CRM Escolar", item: canonicalUrl },
  ];

  const softwareApplicationData = {
    name: "F10 CRM Escolar",
    description:
      "CRM escolar com WhatsApp integrado para organizar captação de alunos, funil de matrículas, tarefas, notificações e atendimento comercial.",
    url: canonicalUrl,
    brandName: "F10",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "CRM Escolar",
    operatingSystem: "Web",
    providerName: "F10",
    publisherName: "F10",
    featureList: [
      "WhatsApp integrado ao CRM",
      "Funil de matrículas por etapa",
      "Tarefas e agenda comercial",
      "Notificações e lembretes",
      "Histórico completo do lead",
      "Atendimento colaborativo da equipe",
    ],
    screenshot: [
      "https://f10.com.br/screenshot_crm_f10.png",
      "https://f10.com.br/og/screenshot_crm_f10.png",
    ],
    image: [ogImageUrl],
  };

  const featureItems = [
    {
      title: "Kanban de leads por etapa",
      description:
        "Visualize todo o funil de matrículas em etapas claras, do primeiro contato até o fechamento, com total visibilidade do que está acontecendo.",
      icon: MessageCircleMore,
    },
    {
      title: "WhatsApp integrado ao CRM",
      description:
        "Converse com leads sem sair do sistema, com histórico salvo, contexto preservado e atendimento muito mais organizado.",
      icon: MessagesSquare,
    },
    {
      title: "Fluxos e cadências comerciais",
      description:
        "Padronize o processo com atividades obrigatórias por etapa, reduzindo improviso e aumentando a consistência do time.",
      icon: Workflow,
    },
    {
      title: "Tarefas, calendário e notificações",
      description:
        "Acompanhe prazos, retornos, follow-ups e alertas dentro da plataforma para que nenhum lead esfrie por falta de ação.",
      icon: CalendarClock,
    },
    {
      title: "Histórico completo do lead",
      description:
        "Mensagens, anotações, tarefas concluídas, próxima ação e responsável em uma única tela para atendimento com contexto real.",
      icon: ClipboardList,
    },
    {
      title: "Mesmo número para toda a equipe",
      description:
        "Atendimento colaborativo no mesmo WhatsApp, com organização, transparência e controle gerencial para a escola.",
      icon: Users2,
    },
  ];

  const stepItems = [
    {
      label: "1",
      title: "Lead entra no CRM",
      description:
        "Cada contato entra com origem, responsável e contexto inicial organizados.",
    },
    {
      label: "2",
      title: "Etapa define a ação",
      description:
        "Cada fase orienta a próxima ação do vendedor no processo comercial.",
    },
    {
      label: "3",
      title: "Sistema organiza tarefas",
      description:
        "Tarefas, agenda diária e prioridades ficam visíveis para execução.",
    },
    {
      label: "4",
      title: "Time recebe alertas",
      description:
        "Notificações mostram retornos do dia e leads que exigem atenção.",
    },
    {
      label: "5",
      title: "Histórico sustenta a matrícula",
      description:
        "O contexto permanece completo até o fechamento, mesmo com troca de atendente.",
    },
  ];

  function openCrmDemoModal(): void {
    contactModalConfig.set({
      defaultMessage: "Quero agendar uma demonstração do F10 CRM",
      product: "F10 CRM Escolar",
      subSource: "Landing Page CRM Escolar - Hero",
      leadDescription:
        "Contato iniciado pela landing page do CRM escolar com WhatsApp integrado.",
    });

    showForm.set(true);
  }

  function openCrmPresentationModal(): void {
    contactModalConfig.set({
      defaultMessage: "Quero ver o F10 CRM funcionando na prática",
      product: "F10 CRM Escolar",
      subSource: "Landing Page CRM Escolar - CTA Final",
      leadDescription:
        "Contato iniciado pela CTA final da landing page do CRM escolar.",
    });

    showForm.set(true);
  }
</script>

<SeoHead
  title="CRM Escolar com WhatsApp Integrado para Captação e Matrículas | F10 CRM"
  description="CRM escolar com WhatsApp integrado para organizar captação de alunos, funil de matrículas, tarefas, notificações e atendimento comercial em um só lugar. Veja como o F10 CRM ajuda sua escola a responder no tempo certo e matricular mais."
  canonical={canonicalUrl}
  ogImage={ogImageUrl}
  {faqItems}
  {breadcrumbItems}
  {softwareApplicationData}
/>

<!-- HERO -->
<section class="relative overflow-hidden bg-white/40">
  <div class="pb-3 pt-4">
    <Breadcrumb
      baseUrl="https://f10.com.br"
      items={[
        { label: "HOME", href: "/" },
        { label: "SOLUÇÕES", href: "/solucoes" },
        { label: "CRM ESCOLAR" },
      ]}
    />
  </div>

  <div class="mx-auto max-w-6xl px-5 text-center pt-8 pb-10 md:pb-12 lg:pb-14">
    <h1
      class="mx-auto max-w-5xl text-4xl md:text-[42px] lg:text-[48px] font-semibold leading-[1.08] tracking-[-0.03em] text-[#010D28]"
    >
      CRM escolar com <span class="text-[#EA6D0B]">WhatsApp integrado</span>.<br
      />
      Mais controle. Mais velocidade. Mais matrículas.
    </h1>

    <p
      class="mt-6 max-w-[820px] mx-auto text-[17px] leading-relaxed text-[#000A57]/85"
    >
      Centralize leads, conversas, tarefas, notificações e próximas ações em um
      único sistema para sua equipe responder no tempo certo e vender com mais
      disciplina.
    </p>

    <div class="mt-8 flex justify-center">
      <button
        on:click={openCrmDemoModal}
        class="inline-flex items-center justify-center gap-3 rounded-full bg-[#EA6D0B] px-10 py-4 text-[17px] font-semibold text-white shadow-[0_14px_40px_rgba(234,109,11,0.45)] hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/60"
      >
        <span>Agendar demonstração gratuita</span>
        <ArrowRight size={22} />
      </button>
    </div>
  </div>

  <CrmKanbanDemo />
</section>

<!-- O QUE É O F10 CRM ESCOLAR / CTA -->
<section
  class="relative mt-[-150px] z-10 bg-stone-100 py-12 md:py-16 shadow-[0_-18px_40px_rgba(1,13,40,0.10)]"
>
  <div class="container px-5 md:px-8 lg:px-20">
    <div
      class="overflow-hidden rounded-[28px] bg-[#010D28] px-6 py-8 md:px-10 md:py-10"
    >
      <div class="grid items-center gap-10 lg:grid-cols-12">
        <div class="lg:col-span-7">
          <p
            class="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#EA6D0B]"
          >
            O que é o F10 CRM Escolar
          </p>

          <h2
            class="mt-4 text-[32px] font-semibold leading-[1.12] tracking-[-0.02em] text-white md:text-[40px]"
          >
            Um CRM escolar com WhatsApp integrado para organizar captação,
            atendimento comercial e matrículas
          </h2>

          <p
            class="mt-4 max-w-[720px] text-[16px] leading-[1.85] text-white/75"
          >
            O F10 CRM Escolar centraliza leads, histórico, tarefas,
            notificações, próximas ações e rotina comercial em um único sistema.
            Sua escola ganha mais controle, mais velocidade no atendimento e
            mais previsibilidade no processo de matrícula.
          </p>
        </div>

        <div class="lg:col-span-5">
          <div class="flex flex-col gap-4 lg:items-end">
            <button
              type="button"
              on:click={openCrmPresentationModal}
              class="inline-flex items-center justify-center gap-3 rounded-[999px] bg-[#EA6D0B] px-8 py-4 text-[16px] font-bold text-white transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
            >
              <span>Quero ver o F10 CRM agora</span>
              <IconArrowRight size={24} />
            </button>

            <p
              class="max-w-[340px] text-[13px] leading-[1.7] text-white/65 lg:text-right"
            >
              Demonstração personalizada • Funil • Tarefas • Notificações •
              WhatsApp integrado
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- WHATSAPP INTEGRADO -->
<section class="relative overflow-hidden bg-white py-16 md:py-24">
  <div class="absolute inset-0 pointer-events-none">
    <div
      class="absolute left-[-120px] top-[60px] h-[260px] w-[260px] rounded-full bg-[#EA6D0B]/[0.05] blur-3xl"
    ></div>
    <div
      class="absolute right-[-120px] bottom-[20px] h-[320px] w-[320px] rounded-full bg-[#071133]/[0.04] blur-3xl"
    ></div>
  </div>

  <div class="container relative px-5 md:px-8 lg:px-20">
    <div
      class="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-16"
    >
      <div class="relative">
        <div
          class="absolute inset-0 rounded-[36px] bg-gradient-to-br from-[#EA6D0B]/10 via-transparent to-[#071133]/6 blur-2xl"
        ></div>

        <div class="relative">
          <CrmWhatsAppDemo />
        </div>

        <div
          class="z-10 absolute -bottom-4 -right-6 hidden max-w-[260px] rounded-[18px] border border-white/70 bg-white/88 px-3.5 py-3 shadow-[0_14px_30px_rgba(1,13,40,0.10)] backdrop-blur-md lg:block"
        >
          <div class="flex items-start gap-3">
            <div
              class="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-[#FFF1E6]"
            >
              <ClipboardList class="h-[18px] w-[18px] text-[#EA6D0B]" />
            </div>

            <div class="min-w-0">
              <p
                class="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#EA6D0B]"
              >
                Atendimento com contexto
              </p>

              <p
                class="mt-1 text-[13px] font-semibold leading-[1.35] tracking-[-0.01em] text-[#071133]"
              >
                Histórico e próxima ação no mesmo fluxo
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-[620px]">
        <p
          class="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#EA6D0B]"
        >
          WhatsApp integrado ao CRM
        </p>

        <h2
          class="mt-4 text-[34px] md:text-[42px] lg:text-[52px] font-semibold leading-[1.02] tracking-[-0.04em] text-[#071133]"
        >
          Converse com leads pelo WhatsApp sem sair do sistema
        </h2>

        <p
          class="mt-6 text-[16px] md:text-[17px] leading-[1.9] text-[#24345F]/78"
        >
          Transforme o WhatsApp em uma ferramenta comercial de verdade.
          Histórico completo, continuidade de atendimento e visibilidade real
          para a gestão.
        </p>

        <div class="mt-8 space-y-3">
          <article
            class="group rounded-[22px] border border-[#E5EBF2] bg-white px-5 py-4 shadow-[0_10px_26px_rgba(1,13,40,0.03)] transition duration-300 hover:border-[#D3DCE8] hover:shadow-[0_14px_30px_rgba(1,13,40,0.05)]"
          >
            <div class="flex items-start gap-4">
              <div
                class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[#EEF2FF]"
              >
                <ClipboardList class="h-5 w-5 text-[#071133]" />
              </div>

              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-3">
                  <h3
                    class="text-[18px] font-semibold tracking-[-0.03em] text-[#071133]"
                  >
                    Histórico centralizado
                  </h3>
                  <span
                    class="inline-flex items-center rounded-full bg-[#F8FAFC] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#071133]/58 ring-1 ring-[#E8EDF3]"
                  >
                    Tudo salvo
                  </span>
                </div>

                <p class="mt-2 text-[14.5px] leading-[1.8] text-[#314372]/78">
                  Todas as mensagens, ligações e anotações ficam dentro do CRM,
                  sem depender de memória ou conversa solta.
                </p>
              </div>
            </div>
          </article>

          <article
            class="group rounded-[22px] border border-[#E5EBF2] bg-white px-5 py-4 shadow-[0_10px_26px_rgba(1,13,40,0.03)] transition duration-300 hover:border-[#D3DCE8] hover:shadow-[0_14px_30px_rgba(1,13,40,0.05)]"
          >
            <div class="flex items-start gap-4">
              <div
                class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[#FFF2E7]"
              >
                <MessagesSquare class="h-5 w-5 text-[#EA6D0B]" />
              </div>

              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-3">
                  <h3
                    class="text-[18px] font-semibold tracking-[-0.03em] text-[#071133]"
                  >
                    Continuidade perfeita
                  </h3>
                  <span
                    class="inline-flex items-center rounded-full bg-[#FFF7F1] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B85A0A] ring-1 ring-[#F6E0CC]"
                  >
                    Sem perder contexto
                  </span>
                </div>

                <p class="mt-2 text-[14.5px] leading-[1.8] text-[#314372]/78">
                  O lead pode trocar de atendente sem perder histórico, próxima
                  ação ou andamento da matrícula.
                </p>
              </div>
            </div>
          </article>

          <article
            class="group rounded-[22px] border border-[#E5EBF2] bg-white px-5 py-4 shadow-[0_10px_26px_rgba(1,13,40,0.03)] transition duration-300 hover:border-[#D3DCE8] hover:shadow-[0_14px_30px_rgba(1,13,40,0.05)]"
          >
            <div class="flex items-start gap-4">
              <div
                class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[#EEF8F2]"
              >
                <Users2 class="h-5 w-5 text-[#2F8F57]" />
              </div>

              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-3">
                  <h3
                    class="text-[18px] font-semibold tracking-[-0.03em] text-[#071133]"
                  >
                    Equipe alinhada e organizada
                  </h3>
                  <span
                    class="inline-flex items-center rounded-full bg-[#F4FBF6] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2F8F57] ring-1 ring-[#D9EEE0]"
                  >
                    Operação colaborativa
                  </span>
                </div>

                <p class="mt-2 text-[14.5px] leading-[1.8] text-[#314372]/78">
                  Ligações, mensagens, follow-ups e tarefas ficam conectados ao
                  mesmo lead para vender com mais controle.
                </p>
              </div>
            </div>
          </article>
        </div>

        <div class="mt-7 flex flex-wrap items-center gap-4">
          <button
            type="button"
            on:click={openCrmPresentationModal}
            class="inline-flex items-center justify-center gap-2 rounded-full bg-[#071133] px-5 py-3 text-[14px] font-semibold text-white shadow-[0_12px_26px_rgba(1,13,40,0.10)] transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#071133]/20"
          >
            <span>Quero ver o WhatsApp no CRM</span>
            <ArrowRight size={18} />
          </button>

          <p class="text-[13px] leading-[1.7] text-[#24345F]/58">
            Menos conversa espalhada. Mais continuidade comercial.
          </p>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- TAREFAS E NOTIFICAÇÕES -->
<section class="relative overflow-hidden bg-stone-100 py-16 md:py-24">
  <div class="absolute inset-0 pointer-events-none">
    <div
      class="absolute left-[-120px] top-[80px] h-[320px] w-[320px] rounded-full bg-[#EA6D0B]/[0.06] blur-3xl"
    ></div>
    <div
      class="absolute right-[-120px] bottom-[40px] h-[360px] w-[360px] rounded-full bg-[#010D28]/[0.05] blur-3xl"
    ></div>
  </div>

  <div class="container relative px-5 md:px-8 lg:px-20">
    <div
      class="grid items-center gap-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)]"
    >
      <div class="max-w-[560px]">
        <p
          class="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#EA6D0B]"
        >
          Tarefas, agenda e notificações
        </p>

        <h2
          class="mt-4 text-[36px] md:text-[44px] lg:text-[52px] font-semibold leading-[1.02] tracking-[-0.035em] text-[#010D28]"
        >
          Seu vendedor não pode depender da memória para vender
        </h2>

        <p
          class="mt-6 max-w-[520px] text-[17px] leading-[1.9] text-[#000A57]/78"
        >
          O F10 CRM organiza a rotina comercial da escola com tarefas por lead,
          calendário de retornos e notificações dentro da plataforma para o time
          agir antes que o lead esfrie.
        </p>

        <div class="mt-10 space-y-4">
          <article
            class="group rounded-[28px] border border-[#E7EAF0] bg-white px-5 py-5 shadow-[0_12px_32px_rgba(1,13,40,0.04)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(1,13,40,0.08)]"
          >
            <div class="flex gap-4">
              <div
                class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#FFF3EA] ring-1 ring-[#EA6D0B]/10"
              >
                <ClipboardList class="h-5 w-5 text-[#EA6D0B]" />
              </div>

              <div>
                <h3
                  class="text-[24px] font-semibold tracking-[-0.02em] text-[#010D28]"
                >
                  Próxima ação visível em cada lead
                </h3>
                <p class="mt-2 text-[15.5px] leading-[1.8] text-[#000A57]/72">
                  O vendedor sabe exatamente o que fazer agora: responder,
                  ligar, agendar visita, cobrar documento ou avançar etapa.
                </p>
              </div>
            </div>
          </article>

          <article
            class="group rounded-[28px] border border-[#E7EAF0] bg-white px-5 py-5 shadow-[0_12px_32px_rgba(1,13,40,0.04)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(1,13,40,0.08)]"
          >
            <div class="flex gap-4">
              <div
                class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#FFF3EA] ring-1 ring-[#EA6D0B]/10"
              >
                <CalendarClock class="h-5 w-5 text-[#EA6D0B]" />
              </div>

              <div>
                <h3
                  class="text-[24px] font-semibold tracking-[-0.02em] text-[#010D28]"
                >
                  Agenda comercial organizada
                </h3>
                <p class="mt-2 text-[15.5px] leading-[1.8] text-[#000A57]/72">
                  Retornos do dia, tarefas pendentes, compromissos e follow-ups
                  em uma visão clara para a equipe não perder tempo.
                </p>
              </div>
            </div>
          </article>

          <article
            class="group rounded-[28px] border border-[#E7EAF0] bg-white px-5 py-5 shadow-[0_12px_32px_rgba(1,13,40,0.04)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(1,13,40,0.08)]"
          >
            <div class="flex gap-4">
              <div
                class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#FFF3EA] ring-1 ring-[#EA6D0B]/10"
              >
                <Workflow class="h-5 w-5 text-[#EA6D0B]" />
              </div>

              <div>
                <h3
                  class="text-[24px] font-semibold tracking-[-0.02em] text-[#010D28]"
                >
                  Alertas e disciplina operacional
                </h3>
                <p class="mt-2 text-[15.5px] leading-[1.8] text-[#000A57]/72">
                  Notificações dentro da plataforma mostram prioridades e ajudam
                  o comercial a manter ritmo, consistência e velocidade.
                </p>
              </div>
            </div>
          </article>
        </div>
      </div>

      <div class="relative">
        <div class="relative mx-auto max-w-[860px]">
          <div class="relative">
            <img
              src="/tarefas.webp"
              alt="Painel de atividades do F10 CRM com tarefas, agenda e notificações comerciais"
              class="relative z-10 block w-full h-auto object-contain align-top rounded-[20px] border border-white/70 shadow-[0_18px_40px_rgba(1,13,40,0.10)]"
              loading="lazy"
            />

            <div
              class="absolute right-[-50px] bottom-12 z-20 hidden max-w-[300px] rounded-[20px] border border-white/70 bg-white/50 px-4 py-3 shadow-[0_18px_40px_rgba(1,13,40,0.10)] backdrop-blur-md md:block"
            >
              <div class="flex items-start gap-3">
                <div
                  class="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[#FFF3EA]"
                >
                  <CalendarClock class="h-5 w-5 text-[#EA6D0B]" />
                </div>

                <div class="min-w-0">
                  <p
                    class="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#EA6D0B]"
                  >
                    Execução comercial
                  </p>

                  <h3
                    class="mt-1 text-[16px] font-semibold leading-tight tracking-[-0.02em] text-[#010D28]"
                  >
                    O time sabe o que fazer e quando agir
                  </h3>

                  <p class="mt-2 text-[13px] leading-[1.65] text-[#000A57]/68">
                    Tarefas, agenda e follow-ups conectados ao funil de
                    matrículas.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-8 max-w-[620px]">
            <p
              class="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#EA6D0B]"
            >
              Painel de atividades
            </p>

            <h3
              class="mt-3 text-[28px] md:text-[32px] font-semibold leading-[1.08] tracking-[-0.03em] text-[#010D28]"
            >
              Menos esquecimento. Mais execução comercial.
            </h3>

            <p class="mt-4 text-[15.5px] leading-[1.9] text-[#000A57]/75">
              O vendedor acompanha retornos do dia, tarefas pendentes,
              prioridades e próximas ações em uma única visão, sem depender de
              memória ou anotações soltas.
            </p>

            <div class="mt-6 flex flex-wrap items-center gap-4">
              <button
                type="button"
                on:click={openCrmPresentationModal}
                class="inline-flex items-center justify-center gap-2 rounded-full bg-[#010D28] px-5 py-3 text-[14px] font-semibold text-white transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#010D28]/20"
              >
                <span>Quero ver o F10 CRM funcionando</span>
                <ArrowRight size={18} />
              </button>

              <p class="text-[13px] leading-[1.7] text-[#000A57]/55">
                Rotina comercial organizada para responder no tempo certo e
                avançar mais matrículas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- DIFERENCIAIS -->
<section class="relative z-10 overflow-hidden py-14 md:py-16">
  <div
    class="absolute inset-0"
    style="background-image:url('/booble_bg.webp'); background-size:200%; background-position:left bottom; background-repeat:no-repeat;"
  ></div>
  <div class="absolute inset-0 bg-[#010D28]/90"></div>

  <div class="container relative px-5 md:px-8 lg:px-20">
    <div class="max-w-[960px]">
      <p
        class="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#EA6D0B]"
      >
        Principais diferenciais
      </p>

      <h2
        class="mt-4 text-[32px] font-semibold leading-[1.15] tracking-[-0.02em] text-white md:text-[40px] lg:text-[48px]"
      >
        O CRM escolar que transforma conversas em matrículas
      </h2>

      <p class="mt-5 max-w-[760px] text-[16px] leading-[1.85] text-white/72">
        Não é só um lugar para guardar contatos. É uma operação comercial mais
        disciplinada, com WhatsApp integrado, tarefas, notificações, histórico e
        visibilidade real para a gestão.
      </p>
    </div>

    <div class="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {#each featureItems as feature}
        <article
          class="rounded-3xl border border-white/10 bg-white/5 px-7 py-8 backdrop-blur-sm transition hover:bg-white/10"
        >
          <div
            class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EA6D0B]/10 ring-1 ring-white/10"
          >
            <svelte:component
              this={feature.icon}
              class="h-6 w-6 text-[#EA6D0B]"
            />
          </div>

          <h3 class="mt-6 text-xl font-semibold text-white">{feature.title}</h3>

          <p class="mt-3 text-[15.5px] leading-relaxed text-white/75">
            {feature.description}
          </p>
        </article>
      {/each}
    </div>
  </div>
</section>

<!-- COMO FUNCIONA -->
<section class="relative overflow-hidden bg-stone-100 py-16 md:py-24">
  <div class="absolute inset-0 pointer-events-none">
    <div
      class="absolute left-[-120px] top-[100px] h-[220px] w-[220px] rounded-full bg-[#EA6D0B]/[0.04] blur-3xl"
    ></div>
    <div
      class="absolute right-[-120px] bottom-[20px] h-[260px] w-[260px] rounded-full bg-[#071133]/[0.035] blur-3xl"
    ></div>
  </div>

  <div class="container relative px-5 md:px-8 lg:px-20">
    <div class="mx-auto max-w-4xl text-center">
      <p
        class="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#EA6D0B]"
      >
        Como funciona
      </p>

      <h2
        class="mt-4 text-[34px] md:text-[42px] lg:text-[52px] font-semibold leading-[1.03] tracking-[-0.04em] text-[#071133]"
      >
        Do primeiro contato à matrícula com processo claro e previsível
      </h2>

      <p
        class="mt-5 mx-auto max-w-3xl text-[16px] leading-[1.9] text-[#24345F]/82"
      >
        O lead entra, a etapa define a ação, o time executa com tarefa e o
        sistema ajuda a manter ritmo com lembretes, prioridades e visibilidade.
      </p>
    </div>

    <div class="mt-14 xl:mt-16">
      <div class="xl:relative">
        <div
          class="hidden xl:block absolute left-[10%] right-[10%] top-5 border-t border-dashed border-[#E7AE7A]"
        ></div>

        <div
          class="flex gap-3 overflow-x-auto pb-4 xl:grid xl:grid-cols-5 xl:gap-3 xl:overflow-visible"
        >
          {#each stepItems as step, index}
            <article
              class="relative min-w-[210px] max-w-[210px] flex-shrink-0 pt-10 xl:min-w-0 xl:max-w-none"
            >
              <div
                class={`absolute left-5 top-0 z-10 flex h-10 w-10 items-center justify-center rounded-full text-[14px] font-semibold shadow-[0_8px_18px_rgba(1,13,40,0.04)] xl:left-1/2 xl:-translate-x-1/2 ${
                  index === 0
                    ? "border border-[#071133] bg-[#071133] text-white"
                    : "border border-[#F0C9A6] bg-[#FFF7F0] text-[#C9650C]"
                }`}
              >
                {step.label}
              </div>

              <div
                class="h-full rounded-[20px] border border-[#E2E8F0] bg-white/92 px-4 py-4 shadow-[0_8px_24px_rgba(1,13,40,0.03)] transition duration-300 hover:-translate-y-0.5 hover:border-[#D4DDE8] hover:shadow-[0_12px_28px_rgba(1,13,40,0.05)]"
              >
                <span
                  class={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                    index === 0
                      ? "bg-[#EEF2FF] text-[#071133]"
                      : "bg-[#FFF1E6] text-[#B85A0A]"
                  }`}
                >
                  Etapa {step.label}
                </span>

                <h3
                  class="mt-3 text-[18px] md:text-[19px] font-semibold leading-[1.18] tracking-[-0.03em] text-[#071133]"
                >
                  {step.title}
                </h3>

                <p class="mt-2 text-[13.5px] leading-[1.75] text-[#314372]/78">
                  {step.description}
                </p>
              </div>
            </article>
          {/each}
        </div>
      </div>
    </div>

    <div class="mt-8 flex justify-center">
      <button
        type="button"
        on:click={openCrmPresentationModal}
        class="inline-flex items-center justify-center gap-2 rounded-full bg-[#071133] px-5 py-3 text-[14px] font-semibold text-white shadow-[0_12px_26px_rgba(1,13,40,0.10)] transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#071133]/20"
      >
        <span>Quero ver esse processo funcionando</span>
        <ArrowRight size={18} />
      </button>
    </div>
  </div>
</section>

<!-- SEÇÃO LAPTOP -->
<section class="bg-[#F8FAFC] py-14 md:py-20">
  <div class="container mx-auto px-5 md:px-8 lg:px-20">
    <div class="flex justify-center mb-12 lg:mb-16">
      <div class="w-full max-w-3xl">
        <img
          src="/atividades-laptop.webp"
          alt="Tela do F10 CRM escolar mostrando fluxo de atividades e mensagem WhatsApp integrada"
          class="w-full h-auto object-cover"
          loading="lazy"
        />
      </div>
    </div>

    <div class="max-w-4xl mx-auto">
      <div class="text-center">
        <p
          class="inline-flex items-center justify-center rounded-3xl bg-[#EA6D0B]/10 px-7 py-2.5 text-[13px] font-semibold uppercase tracking-[0.18em] text-[#EA6D0B]"
        >
          Rotina comercial organizada
        </p>

        <h2
          class="mt-6 text-[32px] font-semibold leading-[1.12] tracking-[-0.02em] text-[#000A57] md:text-[40px] lg:text-[44px]"
        >
          Pare de perder leads em conversas soltas e processos improvisados
        </h2>

        <p
          class="mt-6 text-[17px] leading-relaxed text-[#000A57]/80 max-w-2xl mx-auto"
        >
          O F10 CRM coloca o WhatsApp e a execução comercial dentro da operação
          da sua escola. Todo histórico preservado, tarefas claras, equipe
          alinhada e atendimento confiável.
        </p>
      </div>

      <div class="mt-14 grid md:grid-cols-3 gap-6 lg:gap-8">
        <div
          class="group rounded-3xl bg-white px-7 py-8 ring-1 ring-gray-100 shadow-sm transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
        >
          <div class="flex flex-col items-start">
            <div
              class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#EA6D0B]/10 transition-colors group-hover:bg-[#EA6D0B]/20"
            >
              <MessagesSquare class="h-6 w-6 text-[#EA6D0B]" />
            </div>

            <h3 class="mt-8 text-xl font-semibold text-[#000A57]">
              Histórico centralizado
            </h3>

            <p class="mt-3 text-[15.5px] leading-relaxed text-[#000A57]/75">
              Todas as interações ficam registradas no CRM. Menos dependência de
              memória e anotações pessoais.
            </p>
          </div>
        </div>

        <div
          class="group rounded-3xl bg-white px-7 py-8 ring-1 ring-gray-100 shadow-sm transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
        >
          <div class="flex flex-col items-start">
            <div
              class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#EA6D0B]/10 transition-colors group-hover:bg-[#EA6D0B]/20"
            >
              <Workflow class="h-6 w-6 text-[#EA6D0B]" />
            </div>

            <h3 class="mt-8 text-xl font-semibold text-[#000A57]">
              Fluxos e respostas automáticas
            </h3>

            <p class="mt-3 text-[15.5px] leading-relaxed text-[#000A57]/75">
              Cadências em WhatsApp, e-mail e SMS ajudam a equipe a manter ritmo
              desde o primeiro contato.
            </p>
          </div>
        </div>

        <div
          class="group rounded-3xl bg-white px-7 py-8 ring-1 ring-gray-100 shadow-sm transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
        >
          <div class="flex flex-col items-start">
            <div
              class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#EA6D0B]/10 transition-colors group-hover:bg-[#EA6D0B]/20"
            >
              <Users2 class="h-6 w-6 text-[#EA6D0B]" />
            </div>

            <h3 class="mt-8 text-xl font-semibold text-[#000A57]">
              Mesmo número para toda a equipe
            </h3>

            <p class="mt-3 text-[15.5px] leading-relaxed text-[#000A57]/75">
              Atendimento colaborativo com visibilidade total para a gestão
              comercial da escola.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- O QUE A ESCOLA GANHA -->
<section class="bg-white py-14 md:py-16">
  <div class="container px-5 md:px-8 lg:px-20">
    <div class="grid gap-10 lg:grid-cols-12">
      <div class="lg:col-span-5">
        <p
          class="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#EA6D0B]"
        >
          O que sua escola ganha
        </p>

        <h2
          class="mt-4 text-[32px] font-semibold leading-[1.15] tracking-[-0.015em] text-[#000A57] md:text-[38px] lg:text-[44px]"
        >
          Um comercial mais disciplinado, visível e preparado para converter
        </h2>

        <p
          class="mt-5 max-w-[460px] text-[16px] leading-[1.85] text-[#000A57]/75"
        >
          Quando a equipe sabe quem atender, o que fazer e quando agir, a
          matrícula deixa de depender da sorte.
        </p>
      </div>

      <div class="lg:col-span-7">
        <div class="grid gap-4 sm:grid-cols-2">
          <article
            class="rounded-3xl bg-[#F8FAFC] px-7 py-7 ring-1 ring-[#E5E7EB]"
          >
            <Target class="h-6 w-6 text-[#EA6D0B]" />
            <h3 class="mt-4 text-[19px] font-semibold text-[#000A57]">
              Mais velocidade no atendimento
            </h3>
            <p class="mt-2 text-[15.5px] leading-relaxed text-[#000A57]/75">
              Respostas mais rápidas, follow-ups consistentes e leads que não
              esfriam por falta de retorno.
            </p>
          </article>

          <article
            class="rounded-3xl bg-[#F8FAFC] px-7 py-7 ring-1 ring-[#E5E7EB]"
          >
            <CalendarClock class="h-6 w-6 text-[#EA6D0B]" />
            <h3 class="mt-4 text-[19px] font-semibold text-[#000A57]">
              Rotina comercial controlada
            </h3>
            <p class="mt-2 text-[15.5px] leading-relaxed text-[#000A57]/75">
              Tarefas diárias, calendário e notificações que transformam
              intenção em execução.
            </p>
          </article>

          <article
            class="rounded-3xl bg-[#F8FAFC] px-7 py-7 ring-1 ring-[#E5E7EB]"
          >
            <Workflow class="h-6 w-6 text-[#EA6D0B]" />
            <h3 class="mt-4 text-[19px] font-semibold text-[#000A57]">
              Processo padronizado
            </h3>
            <p class="mt-2 text-[15.5px] leading-relaxed text-[#000A57]/75">
              Menos improviso e mais previsibilidade na captação de novos
              alunos.
            </p>
          </article>

          <article
            class="rounded-3xl bg-[#F8FAFC] px-7 py-7 ring-1 ring-[#E5E7EB]"
          >
            <ClipboardList class="h-6 w-6 text-[#EA6D0B]" />
            <h3 class="mt-4 text-[19px] font-semibold text-[#000A57]">
              Gestão com contexto real
            </h3>
            <p class="mt-2 text-[15.5px] leading-relaxed text-[#000A57]/75">
              Histórico completo, próxima ação e desempenho da equipe em tempo
              real para a gestão comercial.
            </p>
          </article>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- FAQ -->
<section
  id="faq"
  class="relative py-12 md:py-16 bg-white/80"
  aria-label="Perguntas frequentes sobre CRM escolar e captação no F10"
>
  <div class="container px-5 md:px-8 lg:px-20">
    <div
      class="flex flex-col md:flex-row md:items-center md:justify-between gap-6"
    >
      <div>
        <h2
          class="text-[26px] md:text-[32px] font-semibold leading-tight text-[#010D28]"
        >
          Perguntas frequentes de quem
          <span class="text-primary">ainda não usa o F10</span>
          no comercial
        </h2>

        <p class="mt-2 text-[14px] md:text-[15px] text-[#4B5563] max-w-[520px]">
          Reunimos as principais dúvidas de gestores e equipes que saíram de
          planilhas, WhatsApp solto e processos improvisados para organizar a
          captação e o atendimento comercial dentro do F10 CRM Escolar.
        </p>
      </div>

      <a
        href="/solucoes/vendas"
        class="hidden md:inline-flex items-center rounded-full border border-[#EA6D0B] px-4 py-2 text-[14px] font-semibold text-[#010D28] hover:bg-[#EA6D0B]/10 focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
      >
        Ver módulo Vendas / CRM
      </a>
    </div>

    <div class="mt-8">
      <FaqAccordion items={faqItems} />
    </div>

    <div class="mt-6 md:hidden">
      <a
        href="/solucoes/vendas"
        class="inline-flex items-center rounded-full border border-[#EA6D0B] px-4 py-2 text-[14px] font-semibold text-[#010D28] hover:bg-[#EA6D0B]/10 focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
      >
        Ver módulo Vendas / CRM
      </a>
    </div>
  </div>
</section>
