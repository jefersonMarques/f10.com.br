<script lang="ts">
  import SolutionCard from "$lib/components/SolutionCard.svelte";

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
        highlight: "Nota Fiscal",
        title: "Verifique a cidade e inicie a tratativa de emissão fiscal",
        buttonText: "Ver Nota Fiscal",
        href: "/solucoes/nota-fiscal",
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
  $: visibleCards = cards.slice(0, 4);
</script>

<section
  class="flex items-center justify-center bg-[#F3F4FD]"
  aria-label="Módulos e soluções da F10 Software"
>
  <div class="container mx-auto px-4 py-12 md:px-6 md:py-16 lg:px-8 lg:py-20">
    <div
      class="flex items-center justify-center gap-4 text-[15px] text-[#9AA0C4] md:text-[16px]"
    >
      <span class="inline-block h-px w-12 bg-[#D1D4EB]"></span>
      <span>Nossas soluções</span>
      <span class="inline-block h-px w-12 bg-[#D1D4EB]"></span>
    </div>

    <div
      class="mt-10 flex flex-wrap items-center justify-center gap-3 md:gap-4"
    >
      {#each tabs as tab, index}
        <button
          bind:this={tab.el}
          type="button"
          class="h-[44px] w-[220px] rounded-full border text-[15px] tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA6D0B]/70 md:h-[48px] md:w-[236px] md:text-[16px] {activeTab === tab.id
            ? 'border-transparent bg-[#EA6D0B] font-semibold text-white'
            : 'border-[#181B3A]/40 bg-white text-[#181B3A] hover:bg-[#181B3A]/5'}"
          on:click={() => (activeTab = tab.id)}
          on:keydown={(event) => handleTabKeydown(event, index)}
          aria-pressed={activeTab === tab.id}
        >
          {tab.label}
        </button>
      {/each}
    </div>

    <p
      class="mx-auto mt-8 max-w-3xl text-center text-sm text-[#4B4F75] md:text-base"
    >
      Cada módulo do F10 organiza uma parte crítica da operação da sua escola:
      controle pedagógico, financeiro, comercial e marketing, sempre com foco em
      produtividade, previsibilidade e crescimento sustentável.
    </p>

    <div class="mt-10">
      <div
        class="grid gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-4"
        role="region"
        aria-label={`Soluções do módulo ${activeTab}`}
      >
        {#each visibleCards as card}
          <div class="h-full">
            <div
              class="h-full overflow-hidden rounded-3xl bg-white/50 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
            >
              <SolutionCard
                className="w-full h-full"
                height={415}
                image={card.image}
                highlight={card.highlight}
                title={card.title}
                buttonText={card.buttonText}
                href={card.href}
              />
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</section>
