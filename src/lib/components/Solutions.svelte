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

  // Navegação por teclado nas abas (acessibilidade)
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

  // Cards da aba ativa
  $: cards = content[activeTab] || [];
  // Mantém apenas 3 cards em destaque
  $: visibleCards = cards.slice(0, 3);
</script>

<section
  class="mt-12 lg:mt-0 lg:p-12 bg-white/50 flex items-center justify-center min-h-screen"
>
  <div
    class="container px-0 mx-0 relative overflow-hidden lg:rounded-[28px] bg-[#010D28] text-white"
  >
    <!-- Fundo e efeitos -->
    <div class="absolute inset-0 z-0 overflow-hidden">
      <img
        src="/booble_bg.webp"
        alt=""
        aria-hidden="true"
        class="pointer-events-none select-none absolute inset-0 w-full h-full
           object-cover opacity-[0.3] rotate-[-250deg] left-[280px] top-[400px] scale-[1.8] blur-[7px]"
      />

      <div
        class="absolute inset-0 z-10 pointer-events-none mix-blend-overlay opacity-[0.08]"
        style="
          background-image: url('/noise.svg');
          background-repeat: repeat;
          background-size: 250px 250px;
        "
      ></div>
    </div>

    <div
      class="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full
                bg-[radial-gradient(closest-side,rgba(255,255,255,0.08),transparent_70%)] opacity-20"
    ></div>
    <div
      class="absolute -top-[15%] right-0 w-[70%] h-[65%] rotate-[-16deg]
                bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.10)_40%,rgba(255,255,255,0)_80%)]
                opacity-[0.18]"
    ></div>
    <div
      class="absolute inset-0 pointer-events-none
                bg-[radial-gradient(120%_100%_at_50%_0%,rgba(0,0,0,0)_0%,rgba(0,0,0,0.25)_80%)] opacity-40"
    ></div>

    <div class="relative z-10 py-12 md:py-16">
      <!-- Subtítulo -->
      <div
        class="flex items-center justify-center gap-4 pb-6 text-[#AEB3D9] text-[17px]"
      >
        <span class="inline-block h-px w-12 bg-[#AEB3D9]"></span>
        <span>Nossas Soluções</span>
        <span class="inline-block h-px w-12 bg-[#AEB3D9]"></span>
      </div>

      <!-- Título principal -->
      <h2
        class="mt-6 text-center px-4 text-[34px] md:text-[48px] leading-tight font-semibold tracking-tight"
      >
        Conheça nossas soluções prontas para melhorar<br
          class="hidden md:block"
        />
        toda a <span class="text-[#EA6D0B]">gestão</span> da sua escola
      </h2>

      <!-- Tabs -->
      <div
        class="mt-8 flex flex-wrap items-center justify-center gap-3 md:gap-4"
      >
        {#each tabs as t, i}
          <button
            bind:this={t.el}
            type="button"
            class="w-[236px] h-[48px] rounded-full border text-[16px] tracking-wide transition
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60
                   {activeTab === t.id
              ? 'bg-[#EA6D0B] border-transparent text-[#010D28] font-semibold'
              : 'bg-transparent border-white/30 text-white hover:border-white/60'}"
            on:click={() => (activeTab = t.id)}
            on:keydown={(e) => handleTabKeydown(e, i)}
            aria-pressed={activeTab === t.id}
          >
            {t.label}
          </button>
        {/each}
      </div>

      <!-- Descritivo curto para SEO/clareza -->
      <div class="mt-8 px-6 md:px-12 lg:px-20">
        <p
          class="max-w-3xl mx-auto text-center text-sm md:text-base text-[#AEB3D9]/90"
        >
          Cada módulo do F10 foi pensado para resolver problemas reais da rotina
          escolar: organização pedagógica, saúde financeira, aumento de
          matrículas e gestão administrativa com indicadores claros.
        </p>
      </div>

      <!-- Grid de 3 cards fixos -->
      <div class="mt-10 px-4 md:px-8 lg:px-16">
        <div
          class="grid gap-6 md:gap-8 md:grid-cols-3"
          role="region"
          aria-label={`Soluções do módulo ${activeTab}`}
        >
          {#each visibleCards as c}
            <div class="h-full">
              <SolutionCard
                className="w-full h-full"
                height={420}
                image={c.image}
                highlight={c.highlight}
                title={c.title}
                buttonText={c.buttonText}
                href={c.href}
              />
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
</section>
