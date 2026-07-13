<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import FaqAccordion from "$lib/components/FaqAccordion.svelte";
  import SeoHead from "$lib/components/SeoHead.svelte";
  import IconArrowRight from "$lib/icons/IconArrowRight.svelte";
  import type { FaqItem } from "$lib/seo/schema";
  import {
    DEFAULT_OG_IMAGE,
    ORGANIZATION_DATA,
    ORGANIZATION_ID,
    SITE_URL,
    SOFTWARE_APPLICATION_DATA,
    WEBSITE_DATA,
    buildWebPageData,
  } from "$lib/seo/site";
  import { contactModalConfig } from "$lib/stores/contactModals";
  import { showForm } from "$lib/stores/formPopup";
  import {
    BarChart3,
    CircleDollarSign,
    FileSignature,
    Gauge,
    Megaphone,
    MessageSquareText,
    MousePointerClick,
    Target,
    UsersRound,
    Workflow,
  } from "lucide-svelte";

  type IconComponent = typeof Megaphone;

  type Challenge = {
    title: string;
    description: string;
    icon: IconComponent;
  };

  type JourneyStep = {
    number: string;
    title: string;
    description: string;
    detail: string;
  };

  type Indicator = {
    title: string;
    description: string;
    icon: IconComponent;
  };

  const canonicalUrl = `${SITE_URL}/inovacao-na-escola/marketing-educacional`;
  const ogImageUrl = `${SITE_URL}/inovacao_marketing_hero.webp`;
  const seoTitle = "Marketing Educacional para Escolas | Captação e CRM F10";
  const seoDescription =
    "Marketing educacional para captar alunos, organizar leads no CRM, acompanhar o funil de matrículas e medir conversões por campanha, curso e unidade.";

  const serviceId = `${canonicalUrl}#service`;

  const challenges: Challenge[] = [
    {
      title: "Leads espalhados em vários canais",
      description:
        "Contatos chegam pelo site, WhatsApp, campanhas, eventos e indicações, mas ficam separados e sem histórico comum.",
      icon: MousePointerClick,
    },
    {
      title: "Atendimento sem próxima ação",
      description:
        "A equipe responde, mas não registra tarefas, prazos e retornos. O interessado esfria sem que a gestão perceba.",
      icon: MessageSquareText,
    },
    {
      title: "Campanhas medidas apenas por cliques",
      description:
        "Sem conectar marketing e comercial, a escola não sabe quais fontes realmente geram oportunidades e matrículas.",
      icon: BarChart3,
    },
    {
      title: "Fechamento com atrito",
      description:
        "Documentos, contratos e assinaturas manuais tornam a última etapa lenta e aumentam a chance de desistência.",
      icon: FileSignature,
    },
  ];

  const journeySteps: JourneyStep[] = [
    {
      number: "01",
      title: "Capture o lead com origem identificada",
      description:
        "Formulários, WhatsApp, campanhas, eventos e listas alimentam a base com canal, curso e unidade de interesse.",
      detail: "Origem, campanha e interesse preservados",
    },
    {
      number: "02",
      title: "Organize o atendimento no CRM escolar",
      description:
        "Cada oportunidade entra no funil correto, recebe um responsável e mantém mensagens, tarefas e histórico centralizados.",
      detail: "Kanban, responsáveis e próximas ações",
    },
    {
      number: "03",
      title: "Acompanhe conversão e gargalos",
      description:
        "A direção visualiza volume, velocidade de atendimento e avanço por etapa, campanha, curso, equipe e unidade.",
      detail: "Indicadores de captação e vendas",
    },
    {
      number: "04",
      title: "Conclua a matrícula digitalmente",
      description:
        "A oportunidade pode avançar para matrícula online, envio de documentos, contrato e assinatura digital no mesmo ecossistema.",
      detail: "Menos etapas manuais no fechamento",
    },
  ];

  const indicators: Indicator[] = [
    {
      title: "Leads por origem e campanha",
      description:
        "Compare site, mídia paga, WhatsApp, eventos, indicações e outras fontes de captação.",
      icon: Megaphone,
    },
    {
      title: "Tempo até o primeiro atendimento",
      description:
        "Identifique oportunidades que ainda não receberam retorno e reduza atrasos comerciais.",
      icon: Gauge,
    },
    {
      title: "Conversão por etapa do funil",
      description:
        "Descubra onde os interessados avançam, param ou são perdidos durante a jornada.",
      icon: Workflow,
    },
    {
      title: "Desempenho por curso e unidade",
      description:
        "Acompanhe quais ofertas, equipes e unidades transformam mais oportunidades em matrículas.",
      icon: Target,
    },
    {
      title: "Custo por lead e por matrícula",
      description:
        "Relacione investimento, volume captado e resultado comercial para orientar o orçamento.",
      icon: CircleDollarSign,
    },
    {
      title: "Produtividade da equipe",
      description:
        "Visualize atendimentos, tarefas, retornos pendentes e resultados por responsável.",
      icon: UsersRound,
    },
  ];

  const faqItems: FaqItem[] = [
    {
      question: "O que é marketing educacional?",
      answer:
        "Marketing educacional é o conjunto de estratégias usadas por instituições de ensino para atrair interessados, comunicar seus diferenciais, gerar oportunidades e apoiar a conversão em matrículas. Na F10, essas ações são conectadas ao CRM escolar e aos dados da operação.",
    },
    {
      question: "Como saber qual campanha realmente gera matrículas?",
      answer:
        "Os leads entram com a origem identificada e seguem pelo funil comercial. Assim, a escola consegue comparar volume, avanço, perdas e matrículas por campanha, canal, curso e unidade.",
    },
    {
      question: "A F10 integra marketing, CRM e WhatsApp?",
      answer:
        "Sim. A plataforma conecta captação, CRM escolar e atendimento por WhatsApp, mantendo o histórico do interessado e as próximas ações em um único ambiente.",
    },
    {
      question: "É possível organizar leads de diferentes unidades?",
      answer:
        "Sim. Redes e operações multiunidades podem direcionar oportunidades por unidade, curso, equipe ou região e acompanhar os resultados de forma consolidada e individual.",
    },
    {
      question: "A matrícula online faz parte do mesmo processo?",
      answer:
        "Sim. Depois da negociação, a oportunidade pode seguir para matrícula online, documentos, contrato e assinatura digital, reduzindo controles paralelos na etapa final.",
    },
    {
      question: "A F10 substitui planilhas de captação de alunos?",
      answer:
        "A F10 centraliza os dados que normalmente ficam espalhados em planilhas, conversas e formulários. Além do cadastro, organiza funil, tarefas, histórico, responsáveis e indicadores de conversão.",
    },
  ];

  const breadcrumbItems = [
    { name: "Início", item: `${SITE_URL}/` },
    { name: "Inovação na escola", item: `${SITE_URL}/inovacao-na-escola` },
    { name: "Marketing educacional", item: canonicalUrl },
  ];

  const serviceData = {
    "@type": "Service",
    "@id": serviceId,
    name: "Marketing educacional e captação de alunos F10",
    serviceType: "Marketing educacional, CRM escolar e captação de alunos",
    description: seoDescription,
    url: canonicalUrl,
    provider: { "@id": ORGANIZATION_ID },
    areaServed: "BR",
    audience: {
      "@type": "EducationalAudience",
      educationalRole: "Gestores de escolas e redes educacionais",
    },
  };

  const journeySchema = {
    "@type": "ItemList",
    "@id": `${canonicalUrl}#journey`,
    name: "Etapas do marketing educacional conectado à matrícula",
    numberOfItems: journeySteps.length,
    itemListElement: journeySteps.map((step, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: step.title,
      description: step.description,
    })),
  };

  const webPageData = buildWebPageData({
    path: "/inovacao-na-escola/marketing-educacional",
    title: seoTitle,
    description: seoDescription,
    mainEntityId: serviceId,
    imageUrl: ogImageUrl,
  });

  function openMarketingDemo(): void {
    contactModalConfig.set({
      defaultMessage:
        "Quero conhecer o marketing educacional, o CRM e o funil de matrículas da F10",
      product: "F10 – Marketing Educacional",
      subSource: "Landing Page Marketing Educacional",
      leadDescription:
        "Contato iniciado pela página de marketing educacional e captação de alunos.",
    });

    showForm.set(true);
  }
</script>

<SeoHead
  title={seoTitle}
  description={seoDescription}
  canonical={canonicalUrl}
  ogImage={ogImageUrl}
  ogTitle={seoTitle}
  ogDescription={seoDescription}
  ogImageAlt="Marketing educacional conectado ao CRM e ao funil de matrículas F10"
  ogImageType="image/webp"
  organizationData={ORGANIZATION_DATA}
  websiteData={WEBSITE_DATA}
  {webPageData}
  softwareApplicationData={SOFTWARE_APPLICATION_DATA}
  {faqItems}
  {breadcrumbItems}
  additionalStructuredData={[serviceData, journeySchema]}
/>

<section class="relative isolate overflow-hidden bg-white">
  <div
    class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[720px] bg-[radial-gradient(circle_at_78%_16%,rgba(234,109,11,0.12),transparent_34%),radial-gradient(circle_at_20%_10%,rgba(0,10,87,0.08),transparent_32%)]"
    aria-hidden="true"
  ></div>

  <Breadcrumb
    baseUrl={SITE_URL}
    items={[
      { label: "INÍCIO", href: "/" },
      { label: "INOVAÇÃO NA ESCOLA", href: "/inovacao-na-escola" },
      { label: "MARKETING EDUCACIONAL" },
    ]}
  />

  <div class="container grid gap-12 pb-16 pt-5 lg:grid-cols-12 lg:items-center lg:pb-24">
    <div class="lg:col-span-7">
      <p class="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#EA6D0B]">
        Marketing educacional orientado a matrículas
      </p>

      <h1
        class="mt-5 max-w-[900px] text-[42px] font-semibold leading-[1.06] tracking-[-0.04em] text-[#010D28] sm:text-[50px] lg:text-[62px]"
      >
        Pare de medir apenas cliques. Conecte cada campanha à matrícula.
      </h1>

      <p class="mt-7 max-w-[760px] text-[18px] leading-[1.75] text-[#5F6475]">
        A F10 reúne captação de alunos, CRM escolar, WhatsApp, funil de matrículas
        e fechamento digital. Assim, marketing, comercial e direção acompanham a
        mesma jornada, do primeiro contato até a confirmação da vaga.
      </p>

      <div class="mt-9 flex flex-wrap gap-4">
        <button
          type="button"
          on:click={openMarketingDemo}
          class="inline-flex items-center gap-3 rounded-full bg-[#EA6D0B] px-7 py-3.5 text-[15px] font-bold text-white transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
        >
          Ver a F10 em uma demonstração
          <IconArrowRight size={21} />
        </button>

        <a
          href="/solucoes/marketing-captacao-de-alunos"
          class="inline-flex items-center rounded-full border border-[#010D28]/20 bg-white px-7 py-3.5 text-[15px] font-semibold text-[#010D28] transition hover:border-[#EA6D0B] hover:text-[#EA6D0B]"
        >
          Conhecer o módulo de Marketing
        </a>
      </div>

      <div class="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-[14px] font-medium text-[#5F6475]">
        <span class="inline-flex items-center gap-2">
          <span class="h-2 w-2 rounded-full bg-[#EA6D0B]"></span>
          Origem dos leads identificada
        </span>
        <span class="inline-flex items-center gap-2">
          <span class="h-2 w-2 rounded-full bg-[#EA6D0B]"></span>
          Funil em Kanban
        </span>
        <span class="inline-flex items-center gap-2">
          <span class="h-2 w-2 rounded-full bg-[#EA6D0B]"></span>
          Indicadores por campanha e unidade
        </span>
      </div>
    </div>

    <div class="lg:col-span-5">
      <div
        class="relative overflow-hidden rounded-[30px] border border-[#DDE1EF] bg-[#F7F8FC] p-4 shadow-[0_28px_80px_rgba(1,13,40,0.14)] md:p-5"
        aria-label="Exemplo visual de painel de marketing educacional e funil de matrículas"
      >
        <div class="rounded-[24px] bg-[#010D28] p-5 text-white md:p-6">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                Painel de captação
              </p>
              <p class="mt-1 text-[20px] font-semibold">Jornada até a matrícula</p>
            </div>
            <div class="rounded-full bg-[#EA6D0B]/15 p-3 text-[#EA6D0B]">
              <Target size={24} />
            </div>
          </div>

          <div class="mt-6 grid grid-cols-2 gap-3">
            <div class="rounded-[16px] bg-white/8 p-4">
              <p class="text-[11px] uppercase tracking-[0.12em] text-white/45">Fontes</p>
              <p class="mt-2 text-[14px] font-semibold">Site · Ads · WhatsApp</p>
            </div>
            <div class="rounded-[16px] bg-white/8 p-4">
              <p class="text-[11px] uppercase tracking-[0.12em] text-white/45">Gestão</p>
              <p class="mt-2 text-[14px] font-semibold">CRM F10 centralizado</p>
            </div>
          </div>

          <div class="mt-5 space-y-3">
            <div class="rounded-[17px] border border-white/10 bg-white/5 p-4">
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <span class="flex h-8 w-8 items-center justify-center rounded-full bg-[#EA6D0B] text-[12px] font-bold">1</span>
                  <div>
                    <p class="text-[13px] font-semibold">Novo lead</p>
                    <p class="text-[11px] text-white/50">Origem e curso identificados</p>
                  </div>
                </div>
                <span class="text-[12px] text-[#EA6D0B]">Entrada</span>
              </div>
            </div>

            <div class="rounded-[17px] border border-white/10 bg-white/5 p-4">
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <span class="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[12px] font-bold">2</span>
                  <div>
                    <p class="text-[13px] font-semibold">Atendimento e follow-up</p>
                    <p class="text-[11px] text-white/50">WhatsApp, tarefas e histórico</p>
                  </div>
                </div>
                <span class="text-[12px] text-white/50">CRM</span>
              </div>
            </div>

            <div class="rounded-[17px] border border-[#EA6D0B]/35 bg-[#EA6D0B]/10 p-4">
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <span class="flex h-8 w-8 items-center justify-center rounded-full bg-[#EA6D0B] text-[12px] font-bold">3</span>
                  <div>
                    <p class="text-[13px] font-semibold">Matrícula confirmada</p>
                    <p class="text-[11px] text-white/55">Contrato e assinatura digital</p>
                  </div>
                </div>
                <span class="text-[12px] font-semibold text-[#EA6D0B]">Resultado</span>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-3 gap-3">
          <div class="rounded-[15px] border border-[#E2E5F0] bg-white px-3 py-4 text-center">
            <p class="text-[11px] uppercase tracking-[0.1em] text-[#8B90A5]">Origem</p>
            <p class="mt-1 text-[13px] font-semibold text-[#010D28]">Rastreável</p>
          </div>
          <div class="rounded-[15px] border border-[#E2E5F0] bg-white px-3 py-4 text-center">
            <p class="text-[11px] uppercase tracking-[0.1em] text-[#8B90A5]">Equipe</p>
            <p class="mt-1 text-[13px] font-semibold text-[#010D28]">Organizada</p>
          </div>
          <div class="rounded-[15px] border border-[#E2E5F0] bg-white px-3 py-4 text-center">
            <p class="text-[11px] uppercase tracking-[0.1em] text-[#8B90A5]">Gestão</p>
            <p class="mt-1 text-[13px] font-semibold text-[#010D28]">Com dados</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="border-y border-[#E8EAF2] bg-[#F8F9FC] py-16 md:py-24" aria-labelledby="marketing-educacional-definition">
  <div class="container grid gap-10 lg:grid-cols-12">
    <div class="lg:col-span-5">
      <p class="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#EA6D0B]">
        Definição direta
      </p>
      <h2
        id="marketing-educacional-definition"
        class="mt-4 text-[34px] font-semibold leading-tight tracking-[-0.03em] text-[#010D28] md:text-[44px]"
      >
        O que é marketing educacional?
      </h2>
    </div>

    <div class="space-y-5 text-[17px] leading-[1.8] text-[#5F6475] lg:col-span-7">
      <p>
        <strong class="text-[#010D28]">Marketing educacional</strong> é a estratégia
        usada por escolas e instituições de ensino para atrair interessados,
        apresentar seus diferenciais, gerar oportunidades e apoiar a conversão em
        matrículas.
      </p>
      <p>
        O trabalho não termina quando o lead preenche um formulário. Para gerar
        resultado, marketing, atendimento e gestão precisam compartilhar a origem,
        o histórico, a próxima ação e o resultado de cada oportunidade. É essa
        conexão que a F10 organiza.
      </p>
    </div>
  </div>
</section>

<section class="bg-white py-16 md:py-24" aria-labelledby="marketing-challenges-title">
  <div class="container">
    <div class="max-w-3xl">
      <p class="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#EA6D0B]">
        Onde as matrículas se perdem
      </p>
      <h2
        id="marketing-challenges-title"
        class="mt-4 text-[34px] font-semibold leading-tight tracking-[-0.03em] text-[#010D28] md:text-[44px]"
      >
        Gerar interesse não basta quando a jornada fica desconectada
      </h2>
      <p class="mt-5 text-[17px] leading-relaxed text-[#5F6475]">
        A escola pode investir em divulgação e ainda perder oportunidades por falta
        de processo, velocidade e visibilidade entre marketing e comercial.
      </p>
    </div>

    <div class="mt-12 divide-y divide-[#E7E9F1] border-y border-[#E7E9F1] lg:grid lg:grid-cols-2 lg:divide-x lg:divide-y-0">
      {#each challenges as challenge, index}
        <article
          class="grid grid-cols-[52px_1fr] gap-5 py-8 lg:p-9 {index >= 2 ? 'lg:border-t lg:border-[#E7E9F1]' : ''}"
        >
          <div class="flex h-12 w-12 items-center justify-center rounded-[15px] bg-[#F3F4FD] text-[#EA6D0B]">
            <svelte:component this={challenge.icon} size={23} />
          </div>
          <div>
            <h3 class="text-[20px] font-semibold text-[#010D28]">{challenge.title}</h3>
            <p class="mt-2 text-[15px] leading-relaxed text-[#6D7184]">
              {challenge.description}
            </p>
          </div>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="bg-[#010D28] py-16 text-white md:py-24" aria-labelledby="marketing-journey-title">
  <div class="container">
    <div class="max-w-4xl">
      <p class="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#EA6D0B]">
        Processo conectado
      </p>
      <h2
        id="marketing-journey-title"
        class="mt-4 text-[34px] font-semibold leading-tight tracking-[-0.03em] md:text-[46px]"
      >
        Da campanha à matrícula em quatro etapas visíveis
      </h2>
      <p class="mt-5 max-w-3xl text-[17px] leading-relaxed text-white/65">
        A F10 preserva o contexto do interessado durante toda a jornada e oferece
        informação para a equipe executar e para a direção decidir.
      </p>
    </div>

    <div class="mt-12 grid gap-4 lg:grid-cols-4">
      {#each journeySteps as step}
        <article class="relative rounded-[22px] border border-white/10 bg-white/[0.045] p-6">
          <p class="text-[12px] font-semibold tracking-[0.18em] text-[#EA6D0B]">
            {step.number}
          </p>
          <h3 class="mt-5 text-[20px] font-semibold leading-snug">{step.title}</h3>
          <p class="mt-3 text-[14px] leading-relaxed text-white/65">
            {step.description}
          </p>
          <p class="mt-6 border-t border-white/10 pt-4 text-[12px] font-semibold uppercase tracking-[0.11em] text-white/45">
            {step.detail}
          </p>
        </article>
      {/each}
    </div>

    <div class="mt-10 flex flex-wrap gap-4">
      <a
        href="/solucoes/crm-escolar"
        class="inline-flex items-center gap-3 rounded-full bg-[#EA6D0B] px-7 py-3.5 text-[15px] font-bold text-white transition hover:brightness-110"
      >
        Conhecer o CRM escolar
        <IconArrowRight size={20} />
      </a>
      <a
        href="/solucoes/whatsapp"
        class="inline-flex items-center rounded-full border border-white/25 px-7 py-3.5 text-[15px] font-semibold text-white transition hover:border-[#EA6D0B] hover:text-[#EA6D0B]"
      >
        Ver o WhatsApp integrado
      </a>
    </div>
  </div>
</section>

<section class="bg-[#F5F6FB] py-16 md:py-24" aria-labelledby="marketing-indicators-title">
  <div class="container">
    <div class="grid gap-8 lg:grid-cols-12 lg:items-end">
      <div class="lg:col-span-7">
        <p class="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#EA6D0B]">
          Gestão orientada por dados
        </p>
        <h2
          id="marketing-indicators-title"
          class="mt-4 text-[34px] font-semibold leading-tight tracking-[-0.03em] text-[#010D28] md:text-[44px]"
        >
          O que marketing, comercial e direção passam a enxergar
        </h2>
      </div>
      <p class="text-[16px] leading-relaxed text-[#5F6475] lg:col-span-5">
        Em vez de relatórios isolados, a escola acompanha indicadores ligados ao
        processo real de atendimento e matrícula.
      </p>
    </div>

    <div class="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {#each indicators as indicator}
        <article class="rounded-[23px] border border-[#E2E5EF] bg-white p-7 shadow-[0_12px_35px_rgba(1,13,40,0.045)]">
          <div class="flex h-12 w-12 items-center justify-center rounded-[15px] bg-[#010D28] text-[#EA6D0B]">
            <svelte:component this={indicator.icon} size={23} />
          </div>
          <h3 class="mt-6 text-[20px] font-semibold text-[#010D28]">{indicator.title}</h3>
          <p class="mt-3 text-[15px] leading-relaxed text-[#6D7184]">
            {indicator.description}
          </p>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="bg-white py-16 md:py-24" aria-labelledby="marketing-integration-title">
  <div class="container grid gap-12 lg:grid-cols-12 lg:items-center">
    <div class="lg:col-span-6">
      <p class="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#EA6D0B]">
        Uma operação, não várias ferramentas soltas
      </p>
      <h2
        id="marketing-integration-title"
        class="mt-4 text-[34px] font-semibold leading-tight tracking-[-0.03em] text-[#010D28] md:text-[44px]"
      >
        Marketing educacional conectado ao restante da escola
      </h2>
      <p class="mt-5 text-[17px] leading-[1.8] text-[#5F6475]">
        A oportunidade gerada pelo marketing pode seguir para atendimento,
        negociação, matrícula, contrato, financeiro e relacionamento sem perder o
        histórico construído no primeiro contato.
      </p>

      <div class="mt-8 space-y-4">
        <a
          href="/solucoes/marketing-captacao-de-alunos"
          class="flex items-center justify-between gap-4 border-b border-[#E5E7EF] py-4 text-[16px] font-semibold text-[#010D28] transition hover:text-[#EA6D0B]"
        >
          Marketing e captação de alunos
          <span aria-hidden="true">→</span>
        </a>
        <a
          href="/solucoes/crm-escolar"
          class="flex items-center justify-between gap-4 border-b border-[#E5E7EF] py-4 text-[16px] font-semibold text-[#010D28] transition hover:text-[#EA6D0B]"
        >
          CRM escolar e funil de matrículas
          <span aria-hidden="true">→</span>
        </a>
        <a
          href="/solucoes/indicadores-e-bi"
          class="flex items-center justify-between gap-4 border-b border-[#E5E7EF] py-4 text-[16px] font-semibold text-[#010D28] transition hover:text-[#EA6D0B]"
        >
          Indicadores e Business Intelligence
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </div>

    <div class="lg:col-span-6">
      <div class="rounded-[30px] bg-[#F3F4FD] p-7 md:p-10">
        <p class="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#7E82A2]">
          Dados que acompanham o lead
        </p>
        <div class="mt-7 space-y-3">
          {#each [
            "Canal, campanha e anúncio de origem",
            "Curso, unidade e interesse informado",
            "Mensagens e histórico de atendimento",
            "Responsável, tarefas e próxima ação",
            "Etapa do funil e motivo de perda",
            "Matrícula, contrato e resultado final",
          ] as item, index}
            <div class="flex items-center gap-4 rounded-[16px] border border-[#E1E4EF] bg-white px-5 py-4">
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#010D28] text-[12px] font-bold text-white">
                {index + 1}
              </span>
              <span class="text-[14px] font-medium text-[#010D28]">{item}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
</section>

<section class="border-t border-[#E8EAF1] bg-white py-16 md:py-24" aria-labelledby="marketing-faq-title">
  <div class="container grid gap-10 lg:grid-cols-12">
    <div class="lg:col-span-4">
      <p class="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#EA6D0B]">
        Perguntas frequentes
      </p>
      <h2
        id="marketing-faq-title"
        class="mt-4 text-[34px] font-semibold leading-tight tracking-[-0.03em] text-[#010D28] md:text-[42px]"
      >
        Dúvidas sobre marketing educacional e captação
      </h2>
      <p class="mt-5 text-[15px] leading-relaxed text-[#6D7184]">
        Entenda como a F10 conecta divulgação, atendimento e matrícula em uma única
        jornada.
      </p>
    </div>

    <div class="lg:col-span-8">
      <FaqAccordion items={faqItems} />
    </div>
  </div>
</section>

<section class="bg-white pb-16 md:pb-24">
  <div class="container">
    <div class="relative overflow-hidden rounded-[32px] bg-[#010D28] px-7 py-12 text-white md:px-12 md:py-16 lg:px-16">
      <div
        class="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[#EA6D0B]/15 blur-3xl"
        aria-hidden="true"
      ></div>

      <div class="relative grid gap-8 lg:grid-cols-12 lg:items-center">
        <div class="lg:col-span-8">
          <p class="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#EA6D0B]">
            Da divulgação ao resultado
          </p>
          <h2 class="mt-4 text-[32px] font-semibold leading-tight tracking-[-0.03em] md:text-[44px]">
            Veja como a F10 organiza o marketing educacional da sua escola
          </h2>
          <p class="mt-5 max-w-3xl text-[16px] leading-relaxed text-white/65">
            Apresente seu cenário para nossa equipe e conheça um fluxo integrado para
            captar, atender, acompanhar e converter oportunidades em matrículas.
          </p>
        </div>

        <div class="lg:col-span-4 lg:text-right">
          <button
            type="button"
            on:click={openMarketingDemo}
            class="inline-flex items-center gap-3 rounded-full bg-[#EA6D0B] px-8 py-4 text-[15px] font-bold text-white transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
          >
            Agendar uma demonstração
            <IconArrowRight size={21} />
          </button>
        </div>
      </div>
    </div>
  </div>
</section>
