<script lang="ts">
  import SolutionCard from "$lib/components/SolutionCard.svelte";
  import bubbleBackgroundUrl from "$lib/assets/home/bubble-background-1600.webp?url&no-inline";

  type TabId = "finance" | "pedagogy" | "sales" | "marketing";
  type Tab = { id: TabId; label: string; el?: HTMLButtonElement | null };

  let tabs: Tab[] = [
    { id: "finance", label: "Financeiro" },
    { id: "pedagogy", label: "Pedagógico" },
    { id: "sales", label: "Comercial" },
    { id: "marketing", label: "Marketing" },
  ];

  let activeTab: TabId = "pedagogy";

  function handleTabKeydown(event: KeyboardEvent, index: number) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

    event.preventDefault();

    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + direction + tabs.length) % tabs.length;

    activeTab = tabs[nextIndex].id;
    tabs[nextIndex].el?.focus();
  }

  type CardData = {
    image?: string;
    highlight: string;
    title: string;
    buttonText: string;
    href: string;
  };

  const content: Record<TabId, CardData[]> = {
    pedagogy: [
      {
        image: "/solucoes_pedagogico_app.webp",
        highlight: "APP Smart Aluno",
        title: "Aulas, avisos e financeiro reunidos no app Smart Aluno",
        buttonText: "Conheça o App",
        href: "/solucoes/aplicativo-smart-aluno",
      },
      {
        image: "/solucoes_pedagogico_portal.webp",
        highlight: "Portal do Aluno",
        title: "Aulas ao vivo, matrícula online e assinatura digital F10",
        buttonText: "Conheça o AVA",
        href: "/solucoes/ambiente-virtual-de-aprendizado-ava",
      },
      {
        image: "/solucoes_pedagogico_lista_presenca.webp",
        highlight: "Listagem de presença",
        title: "Chamada rápida pelo app do professor ou tablet na sala",
        buttonText: "Ver Pedagógico",
        href: "/solucoes/pedagogico",
      },
      {
        image: "",
        highlight: "Biblioteca Digital",
        title: "Materiais, provas e tarefas em trilhas por turma e curso",
        buttonText: "Ver Biblioteca",
        href: "/solucoes/ambiente-virtual-de-aprendizado-ava",
      },
    ],
    finance: [
      {
        image: "/solucoes_financeiro_pix.webp",
        highlight: "Cobrança",
        title: "Boletos e Pix automáticos com conciliação em tempo real",
        buttonText: "Ver Financeiro",
        href: "/solucoes/financeiro",
      },
      {
        image: "/solucoes_financeiro_renegociacao.webp",
        highlight: "Inadimplência",
        title: "Renegociação, régua automática e cobranças por WhatsApp",
        buttonText: "Ver Cobranças",
        href: "/solucoes/financeiro",
      },
      {
        image: "/solucoes_financeiro_fluxo.webp",
        highlight: "Financeiro 360",
        title: "Fluxo de caixa, DRE gerencial e metas por unidade e curso",
        buttonText: "Ver Financeiro",
        href: "/solucoes/financeiro",
      },
      {
        image: "",
        highlight: "Centro de Custos",
        title: "Lançamentos por projeto, turma e unidade com rateios ágeis",
        buttonText: "Ver Financeiro",
        href: "/solucoes/financeiro",
      },
    ],
    sales: [
      {
        image: "/comercial_solucoes_matricula.webp",
        highlight: "Matrícula online",
        title: "Landing page e assinatura eletrônica integradas ao CRM",
        buttonText: "Ver Matrícula",
        href: "/solucoes/vendas",
      },
      {
        image: "/solucoes_comercial_crm.webp",
        highlight: "CRM Comercial",
        title: "Pipeline por turma, metas de vendas e ações de WhatsApp",
        buttonText: "Ver CRM Escolar",
        href: "/solucoes/crm-escolar",
      },
      {
        image: "/solucoes_comercial_dashboards.webp",
        highlight: "Relatórios",
        title: "Dashboards de conversão por campanha, curso e vendedor",
        buttonText: "Ver Indicadores",
        href: "/solucoes/indicadores-e-bi",
      },
      {
        image: "",
        highlight: "Campanhas",
        title: "UTM tracking, metas por consultor e funis segmentados",
        buttonText: "Ver Marketing",
        href: "/solucoes/marketing-captacao-de-alunos",
      },
    ],
    marketing: [
      {
        image: "/solucoes_marketing_funil.webp",
        highlight: "Funil",
        title: "Leads gerados nas campanhas chegam direto no funil certo",
        buttonText: "Ver CRM Escolar",
        href: "/solucoes/crm-escolar",
      },
      {
        image: "/solucoes_marketing_telemarketing.webp",
        highlight: "Marketing e comercial",
        title: "Áreas integradas para organizar e fechar mais matrículas",
        buttonText: "Ver Captação",
        href: "/solucoes/marketing-captacao-de-alunos",
      },
      {
        image: "/solucoes_marketing_api.webp",
        highlight: "API de Integração",
        title: "API disponível para receber leads de campanhas externas",
        buttonText: "Ver Integrações",
        href: "/solucoes/marketing-captacao-de-alunos",
      },
      {
        image: "",
        highlight: "Templates & Fluxos",
        title: "Padronize campanhas com fluxos e modelos reutilizáveis",
        buttonText: "Ver Automações",
        href: "/solucoes/marketing-captacao-de-alunos",
      },
    ],
  };

  $: cards = content[activeTab] || [];
  $: visibleCards = cards.slice(0, 3);

  function toSlug(value: string): string {
    return (value ?? "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/&/g, " e ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
</script>

<section
  class="deferred-section mt-12 flex min-h-screen items-center justify-center bg-white/50 lg:mt-0 lg:p-12"
  aria-label="Soluções de gestão escolar da F10"
>
  <div
    class="container relative mx-0 overflow-hidden bg-[#010D28] px-0 text-white lg:rounded-[28px]"
  >
    <div class="absolute inset-0 z-0 overflow-hidden">
      <img
        src={bubbleBackgroundUrl}
        alt=""
        width="1600"
        height="1067"
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 left-[280px] top-[400px] h-full w-full rotate-[-250deg] scale-[1.8] select-none object-cover opacity-[0.3] blur-[7px]"
      />

      <div
        class="absolute inset-0 z-10 pointer-events-none mix-blend-overlay opacity-[0.08]"
        style="background-image: url('/noise.svg'); background-repeat: repeat; background-size: 250px 250px;"
      ></div>
    </div>

    <div
      class="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.08),transparent_70%)] opacity-20"
    ></div>
    <div
      class="absolute -top-[15%] right-0 h-[65%] w-[70%] rotate-[-16deg] bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.10)_40%,rgba(255,255,255,0)_80%)] opacity-[0.18]"
    ></div>
    <div
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_0%,rgba(0,0,0,0)_0%,rgba(0,0,0,0.25)_80%)] opacity-40"
    ></div>

    <div class="relative z-10 py-12 md:py-16">
      <div
        class="flex items-center justify-center gap-4 pb-6 text-[17px] text-[#AEB3D9]"
      >
        <span class="inline-block h-px w-12 bg-[#AEB3D9]"></span>
        <span>Nossas Soluções</span>
        <span class="inline-block h-px w-12 bg-[#AEB3D9]"></span>
      </div>

      <h2
        class="mt-6 px-4 text-center text-[34px] font-semibold leading-tight tracking-tight md:text-[48px]"
      >
        Conheça nossas soluções prontas para melhorar<br
          class="hidden md:block"
        />
        toda a <span class="text-[#EA6D0B]">gestão</span> da sua escola
      </h2>

      <div
        class="mt-8 flex flex-wrap items-center justify-center gap-3 md:gap-4"
      >
        {#each tabs as tab, index}
          <button
            bind:this={tab.el}
            type="button"
            data-track="1"
            data-event="tab_click"
            data-page="main_page"
            data-cta={`tab_${toSlug(tab.label)}`}
            data-location="solutions_section"
            class="h-[48px] w-[236px] rounded-full border text-[16px] tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 {activeTab === tab.id
              ? 'border-transparent bg-[#EA6D0B] font-semibold text-[#010D28]'
              : 'border-white/30 bg-transparent text-white hover:border-white/60'}"
            on:click={() => (activeTab = tab.id)}
            on:keydown={(event) => handleTabKeydown(event, index)}
            aria-pressed={activeTab === tab.id}
          >
            {tab.label}
          </button>
        {/each}
      </div>

      <div class="mt-8 px-6 md:px-12 lg:px-20">
        <p
          class="mx-auto max-w-3xl text-center text-sm text-[#AEB3D9]/90 md:text-base"
        >
          Cada módulo do F10 foi pensado para resolver problemas reais da rotina
          escolar: organização pedagógica, saúde financeira, aumento de
          matrículas e gestão administrativa com indicadores claros.
        </p>
      </div>

      <div class="mt-10 px-4 md:px-8 lg:px-16">
        <div
          class="grid gap-6 md:grid-cols-3 md:gap-8"
          role="region"
          aria-label={`Soluções do módulo ${activeTab}`}
        >
          {#each visibleCards as card}
            <div class="h-full">
              <SolutionCard
                className="w-full h-full"
                height={420}
                image={card.image}
                highlight={card.highlight}
                title={card.title}
                buttonText={card.buttonText}
                href={card.href}
              />
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
</section>
