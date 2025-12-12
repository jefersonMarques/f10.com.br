<script lang="ts">
  import SolutionCard from "$lib/components/SolutionCard.svelte";

  // ===== Tabs =====
  type TabId = "finance" | "pedagogy" | "sales" | "marketing";
  type Tab = { id: TabId; label: string; el?: HTMLButtonElement | null };

  let tabs: Tab[] = [
    { id: "finance", label: "Financeiro" },
    { id: "pedagogy", label: "Pedagógico" },
    { id: "sales", label: "Comercial" },
    { id: "marketing", label: "Marketing" },
  ];
  let activeTab: TabId = "pedagogy";

  function handleTabKeydown(e: KeyboardEvent, idx: number) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const next = (idx + dir + tabs.length) % tabs.length;
    activeTab = tabs[next].id;
    tabs[next].el?.focus();
  }

  // ===== Dados =====
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
        buttonText: "Conheça +",
        href: "/solucoes/aplicativo-smart-aluno",
      },
      {
        image: "/solucoes_pedagogico_portal.webp",
        highlight: "Portal do Aluno",
        title: "Aulas ao vivo, matrícula online e assinatura digital F10",
        buttonText: "Conheça +",
        href: "/solucoes/aplicativo-smart-aluno",
      },
      {
        image: "/solucoes_pedagogico_lista_presenca.webp",
        highlight: "Listagem de presença",
        title: "Chamada rápida pelo app do professor ou tablet na sala",
        buttonText: "Conheça +",
        href: "/solucoes/aplicativo-smart-aluno",
      },
      {
        image: "",
        highlight: "Biblioteca Digital",
        title: "Materiais, provas e tarefas em trilhas por turma e curso",
        buttonText: "Conheça +",
        href: "/solucoes/aplicativo-smart-aluno",
      },
    ],
    finance: [
      {
        image: "/solucoes_financeiro_pix.webp",
        highlight: "Cobrança",
        title: "Boletos e Pix automáticos com conciliação em tempo real",
        buttonText: "Conheça +",
        href: "/solucoes/financeiro",
      },
      {
        image: "/solucoes_financeiro_renegociacao.webp",
        highlight: "Inadimplência",
        title: "Renegociação, régua automática e cobranças por WhatsApp",
        buttonText: "Conheça +",
        href: "/solucoes/financeiro",
      },
      {
        image: "/solucoes_financeiro_fluxo.webp",
        highlight: "Financeiro 360",
        title: "Fluxo de caixa, DRE gerencial e metas por unidade e curso",
        buttonText: "Conheça +",
        href: "/solucoes/financeiro",
      },
      {
        image: "",
        highlight: "Centro de Custos",
        title: "Lançamentos por projeto, turma e unidade com rateios ágeis",
        buttonText: "Conheça +",
        href: "/solucoes/financeiro",
      },
    ],
    sales: [
      {
        image: "/comercial_solucoes_matricula.webp",
        highlight: "Matrícula online",
        title: "Landing page e assinatura eletrônica integradas ao CRM",
        buttonText: "Conheça +",
        href: "/solucoes/comercial",
      },
      {
        image: "/solucoes_comercial_crm.webp",
        highlight: "CRM Comercial",
        title: "Pipeline por turma, metas de vendas e ações de WhatsApp",
        buttonText: "Conheça +",
        href: "/solucoes/comercial",
      },
      {
        image: "/solucoes_comercial_dashboards.webp",
        highlight: "Relatórios",
        title: "Dashboards de conversão por campanha, curso e vendedor",
        buttonText: "Conheça +",
        href: "/solucoes/comercial",
      },
      {
        image: "",
        highlight: "Campanhas",
        title: "UTM tracking, metas por consultor e funis segmentados",
        buttonText: "Conheça +",
        href: "/solucoes/comercial",
      },
    ],
    marketing: [
      {
        image: "/solucoes_marketing_funil.webp",
        highlight: "Funil",
        title: "Leads gerados nas campanhas chegam direto no funil certo",
        buttonText: "Conheça +",
        href: "/solucoes/marketing",
      },
      {
        image: "/solucoes_marketing_telemarketing.webp",
        highlight: "Marketing e comercial",
        title: "Áreas integradas para organizar e fechar mais matrículas",
        buttonText: "Conheça +",
        href: "/solucoes/marketing",
      },
      {
        image: "/solucoes_marketing_api.webp",
        highlight: "API de Integração",
        title: "API disponível para receber leads de campanhas externas",
        buttonText: "Conheça +",
        href: "/solucoes/marketing",
      },
      {
        image: "",
        highlight: "Templates & Fluxos",
        title: "Padronize campanhas com fluxos e modelos reutilizáveis",
        buttonText: "Conheça +",
        href: "/solucoes/marketing",
      },
    ],
  };

  $: cards = content[activeTab] || [];
  $: visibleCards = cards.slice(0, 3);
</script>

<section class="bg-[#F3F4FD] flex items-center justify-center">
  <div class="container px-4 md:px-6 lg:px-8 py-12 md:py-16 lg:py-20 mx-auto">
    <!-- Linha “Nossas soluções” -->
    <div
      class="flex items-center justify-center gap-4 text-[#9AA0C4] text-[15px] md:text-[16px]"
    >
      <span class="inline-block h-px w-12 bg-[#D1D4EB]"></span>
      <span>Nossas soluções</span>
      <span class="inline-block h-px w-12 bg-[#D1D4EB]"></span>
    </div>

    <!-- Tabs -->
    <div
      class="mt-10 flex flex-wrap items-center justify-center gap-3 md:gap-4"
    >
      {#each tabs as t, i}
        <button
          bind:this={t.el}
          type="button"
          class="w-[220px] md:w-[236px] h-[44px] md:h-[48px] rounded-full border text-[15px] md:text-[16px] tracking-wide transition
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA6D0B]/70
                 {activeTab === t.id
            ? 'bg-[#EA6D0B] border-transparent text-white font-semibold'
            : 'bg-white border-[#181B3A]/40 text-[#181B3A] hover:bg-[#181B3A]/5'}"
          on:click={() => (activeTab = t.id)}
          on:keydown={(e) => handleTabKeydown(e, i)}
          aria-pressed={activeTab === t.id}
        >
          {t.label}
        </button>
      {/each}
    </div>

    <!-- Texto explicativo -->
    <div
      class="mt-8 max-w-3xl mx-auto text-center text-sm md:text-base text-[#4B4F75]"
    >
      Cada módulo do F10 organiza uma parte crítica da operação da sua escola:
      controle pedagógico, financeiro, comercial e marketing, sempre com foco em
      produtividade, previsibilidade e crescimento sustentável.
    </div>

    <!-- Grid fixo de 3 cards com borda -->
    <div class="mt-10">
      <div
        class="grid gap-6 md:gap-8 md:grid-cols-3"
        role="region"
        aria-label={`Soluções do módulo ${activeTab}`}
      >
        {#each visibleCards as c}
          <div class="h-full">
            <div
              class="h-full rounded-3xl bg-white/50 shadow-[0_16px_40px_rgba(15,23,42,0.06)] overflow-hidden"
            >
              <SolutionCard
                className="w-full h-full"
                height={415}
                image={c.image}
                highlight={c.highlight}
                title={c.title}
                buttonText={c.buttonText}
                href={c.href}
              />
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</section>
