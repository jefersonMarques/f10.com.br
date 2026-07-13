<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import FaqAccordion from "$lib/components/FaqAccordion.svelte";
  import SeoHead from "$lib/components/SeoHead.svelte";
  import IconArrowRight from "$lib/icons/IconArrowRight.svelte";
  import type { FaqItem } from "$lib/seo/schema";
  import {
    DEFAULT_OG_IMAGE,
    ORGANIZATION_DATA,
    SITE_URL,
    SOFTWARE_APPLICATION_DATA,
    WEBSITE_DATA,
    buildWebPageData,
  } from "$lib/seo/site";

  const canonicalUrl = `${SITE_URL}/software-para-escolas`;
  const seoTitle = "Software para Escolas | Gestão Escolar Completa F10";
  const seoDescription =
    "Software para escolas com gestão pedagógica, financeira, CRM, WhatsApp, aplicativo, AVA, matrículas e indicadores integrados em uma única plataforma.";

  const breadcrumbItems = [
    { name: "Início", item: `${SITE_URL}/` },
    { name: "Software para escolas", item: canonicalUrl },
  ];

  const faqItems: FaqItem[] = [
    {
      question: "O que é um software para escolas?",
      answer:
        "É uma plataforma que centraliza informações e processos acadêmicos, financeiros, administrativos e comerciais da instituição, reduzindo o uso de planilhas e sistemas desconectados.",
    },
    {
      question: "Quais áreas da escola podem ser controladas pela F10?",
      answer:
        "A F10 integra gestão pedagógica, secretaria, financeiro, cobranças, CRM, captação de alunos, WhatsApp, aplicativo, Portal do Aluno, AVA, documentos, contratos e indicadores.",
    },
    {
      question: "A F10 atende cursos livres e escolas de idiomas?",
      answer:
        "Sim. A plataforma foi desenvolvida para cursos livres, escolas de idiomas, ensino profissionalizante, cursos técnicos, redes de ensino e franquias educacionais.",
    },
    {
      question: "O software escolar possui CRM com Kanban?",
      answer:
        "Sim. O CRM escolar da F10 organiza interessados por etapas do funil de matrículas, com tarefas, histórico, responsáveis, origem dos leads e acompanhamento em Kanban.",
    },
    {
      question: "A F10 possui integração com WhatsApp?",
      answer:
        "Sim. A integração permite centralizar conversas, distribuir atendimentos entre usuários, registrar históricos e conectar comunicação, cobranças e captação ao restante da gestão escolar.",
    },
    {
      question: "É possível usar a F10 em redes e franquias educacionais?",
      answer:
        "Sim. A F10 oferece gestão por unidade e visão consolidada, permitindo acompanhar indicadores, processos, padrões operacionais e resultados de toda a rede.",
    },
  ];

  const modules = [
    {
      title: "Gestão pedagógica",
      description:
        "Organize cursos, turmas, calendários, presença, notas, documentos e certificados.",
      href: "/solucoes/pedagogico",
      linkLabel: "Conhecer a gestão pedagógica",
    },
    {
      title: "Financeiro escolar",
      description:
        "Controle mensalidades, cobranças, boletos, Pix, inadimplência e fluxo de caixa.",
      href: "/solucoes/financeiro",
      linkLabel: "Conhecer o financeiro escolar",
    },
    {
      title: "CRM escolar",
      description:
        "Acompanhe leads, tarefas, contatos e matrículas em um funil visual com Kanban.",
      href: "/solucoes/crm-escolar",
      linkLabel: "Conhecer o CRM escolar",
    },
    {
      title: "WhatsApp integrado",
      description:
        "Centralize atendimentos, históricos, avisos, cobranças e conversas comerciais.",
      href: "/solucoes/whatsapp",
      linkLabel: "Conhecer o WhatsApp para escolas",
    },
    {
      title: "App, Portal do Aluno e AVA",
      description:
        "Conecte alunos e responsáveis a conteúdos, avisos, financeiro e informações acadêmicas.",
      href: "/solucoes/aplicativo-smart-aluno",
      linkLabel: "Conhecer o aplicativo do aluno",
    },
    {
      title: "Indicadores e BI",
      description:
        "Acompanhe dados financeiros, pedagógicos, comerciais e operacionais em tempo real.",
      href: "/solucoes/indicadores-e-bi",
      linkLabel: "Conhecer os indicadores",
    },
  ];

  const audiences = [
    "Cursos livres e escolas profissionalizantes",
    "Escolas de idiomas",
    "Instituições de ensino técnico",
    "Escolas independentes com uma ou mais unidades",
    "Redes de ensino e franquias educacionais",
    "Empresas que oferecem treinamentos e capacitações",
  ];

  const moduleListSchema = {
    "@type": "ItemList",
    "@id": `${canonicalUrl}#modules`,
    name: "Módulos do software para escolas F10",
    numberOfItems: modules.length,
    itemListElement: modules.map((module, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "WebPage",
        name: module.title,
        description: module.description,
        url: `${SITE_URL}${module.href}`,
      },
    })),
  };

  const webPageData = buildWebPageData({
    path: "/software-para-escolas",
    title: seoTitle,
    description: seoDescription,
  });
</script>

<SeoHead
  title={seoTitle}
  description={seoDescription}
  canonical={canonicalUrl}
  ogImage={DEFAULT_OG_IMAGE}
  ogTitle={seoTitle}
  ogDescription={seoDescription}
  ogImageAlt="Software para escolas F10 com gestão escolar integrada"
  ogImageType="image/png"
  ogImageWidth={1200}
  ogImageHeight={630}
  organizationData={ORGANIZATION_DATA}
  websiteData={WEBSITE_DATA}
  {webPageData}
  softwareApplicationData={SOFTWARE_APPLICATION_DATA}
  {faqItems}
  {breadcrumbItems}
  additionalStructuredData={[moduleListSchema]}
/>

<section class="relative isolate overflow-hidden bg-white/70">
  <Breadcrumb
    baseUrl={SITE_URL}
    items={[{ label: "INÍCIO", href: "/" }, { label: "SOFTWARE PARA ESCOLAS" }]}
  />

  <div class="container grid gap-12 pb-16 pt-4 lg:grid-cols-12 lg:items-center lg:pb-24">
    <div class="lg:col-span-7">
      <p class="text-[13px] font-semibold uppercase tracking-[0.2em] text-[#EA6D0B]">
        Gestão escolar integrada
      </p>

      <h1
        class="mt-5 max-w-[850px] text-[40px] font-semibold leading-[1.08] tracking-[-0.035em] text-[#010D28] sm:text-[48px] lg:text-[58px]"
      >
        Software para escolas que integra toda a operação em um único sistema
      </h1>

      <p class="mt-7 max-w-[760px] text-[18px] leading-[1.75] text-[#5F6475]">
        A F10 Software reúne gestão pedagógica, financeira, administrativa,
        comercial e de marketing para que escolas reduzam tarefas manuais,
        centralizem informações e acompanhem resultados com mais clareza.
      </p>

      <p class="mt-4 max-w-[760px] text-[16px] leading-[1.75] text-[#7E82A2]">
        A plataforma atende cursos livres, idiomas, ensino profissionalizante,
        cursos técnicos, escolas independentes, redes e franquias educacionais.
      </p>

      <div class="mt-9 flex flex-wrap gap-4">
        <a
          href="/contato"
          class="inline-flex items-center gap-3 rounded-full bg-[#EA6D0B] px-7 py-3.5 text-[15px] font-bold text-white transition hover:brightness-110"
        >
          Solicitar uma demonstração
          <IconArrowRight size={21} />
        </a>

        <a
          href="/solucoes"
          class="inline-flex items-center rounded-full border border-[#010D28]/20 px-7 py-3.5 text-[15px] font-semibold text-[#010D28] transition hover:border-[#EA6D0B] hover:text-[#EA6D0B]"
        >
          Ver todas as soluções
        </a>
      </div>
    </div>

    <div class="lg:col-span-5">
      <div
        class="relative overflow-hidden rounded-[30px] bg-[#010D28] p-8 text-white shadow-[0_24px_70px_rgba(1,13,40,0.22)] md:p-10"
      >
        <p class="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#EA6D0B]">
          Um sistema, todas as áreas
        </p>

        <ul class="mt-7 space-y-4 text-[16px] leading-relaxed text-white/85">
          <li class="border-b border-white/10 pb-4">Pedagógico e secretaria escolar</li>
          <li class="border-b border-white/10 pb-4">Financeiro, cobranças, boletos e Pix</li>
          <li class="border-b border-white/10 pb-4">CRM, captação e funil de matrículas</li>
          <li class="border-b border-white/10 pb-4">WhatsApp, aplicativo, portal e AVA</li>
          <li>Indicadores para escolas, redes e franquias</li>
        </ul>
      </div>
    </div>
  </div>
</section>

<section class="bg-white py-16 md:py-24" aria-labelledby="what-is-school-software">
  <div class="container grid gap-10 lg:grid-cols-12">
    <div class="lg:col-span-5">
      <p class="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#EA6D0B]">
        Definição direta
      </p>
      <h2
        id="what-is-school-software"
        class="mt-4 text-[34px] font-semibold leading-tight tracking-[-0.025em] text-[#010D28] md:text-[44px]"
      >
        O que é um software para escolas?
      </h2>
    </div>

    <div class="space-y-5 text-[17px] leading-[1.8] text-[#5F6475] lg:col-span-7">
      <p>
        Um <strong class="text-[#010D28]">software para escolas</strong> é uma
        plataforma criada para organizar processos, pessoas, dados e atividades da
        instituição de ensino. Ele substitui controles dispersos em planilhas,
        aplicativos e sistemas isolados por uma gestão centralizada.
      </p>

      <p>
        Com a F10, as informações de alunos, responsáveis, cursos, turmas,
        contratos, mensalidades, atendimentos e campanhas ficam conectadas. Isso
        permite que cada área trabalhe com o mesmo histórico e que a direção tenha
        uma visão confiável da operação.
      </p>
    </div>
  </div>
</section>

<section class="bg-[#F5F6FB] py-16 md:py-24" aria-labelledby="school-software-modules">
  <div class="container">
    <div class="max-w-3xl">
      <p class="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#EA6D0B]">
        Plataforma completa
      </p>
      <h2
        id="school-software-modules"
        class="mt-4 text-[34px] font-semibold leading-tight tracking-[-0.025em] text-[#010D28] md:text-[44px]"
      >
        Recursos essenciais para administrar e desenvolver a escola
      </h2>
      <p class="mt-5 text-[17px] leading-relaxed text-[#5F6475]">
        Os módulos compartilham dados entre si, evitando retrabalho e permitindo
        acompanhar toda a jornada, da captação do interessado até a conclusão do
        curso.
      </p>
    </div>

    <div class="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {#each modules as module}
        <article
          class="flex h-full flex-col rounded-[24px] border border-[#E6E8F2] bg-white p-7 shadow-[0_12px_34px_rgba(1,13,40,0.05)]"
        >
          <h3 class="text-[21px] font-semibold text-[#010D28]">{module.title}</h3>
          <p class="mt-3 flex-1 text-[15px] leading-relaxed text-[#6D7184]">
            {module.description}
          </p>
          <a
            href={module.href}
            class="mt-6 inline-flex items-center gap-2 text-[14px] font-semibold text-[#EA6D0B]"
            aria-label={module.linkLabel}
          >
            {module.linkLabel}
            <span aria-hidden="true">→</span>
          </a>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="bg-white py-16 md:py-24" aria-labelledby="who-uses-school-software">
  <div class="container grid gap-10 lg:grid-cols-12 lg:items-start">
    <div class="lg:col-span-6">
      <p class="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#EA6D0B]">
        Para diferentes modelos de ensino
      </p>
      <h2
        id="who-uses-school-software"
        class="mt-4 text-[34px] font-semibold leading-tight tracking-[-0.025em] text-[#010D28] md:text-[44px]"
      >
        Para quais instituições a F10 é indicada?
      </h2>
      <p class="mt-5 text-[17px] leading-relaxed text-[#5F6475]">
        A estrutura flexível da plataforma permite configurar cursos, unidades,
        equipes, regras financeiras e processos de atendimento conforme a realidade
        de cada instituição.
      </p>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 lg:col-span-6">
      {#each audiences as audience}
        <div
          class="rounded-[18px] border border-[#E7EAF8] bg-[#F9FAFD] px-5 py-4 text-[15px] font-medium leading-relaxed text-[#010D28]"
        >
          {audience}
        </div>
      {/each}
    </div>
  </div>
</section>

<section class="bg-[#010D28] py-16 text-white md:py-24" aria-labelledby="why-f10-software">
  <div class="container grid gap-12 lg:grid-cols-12">
    <div class="lg:col-span-5">
      <p class="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#EA6D0B]">
        Gestão conectada
      </p>
      <h2
        id="why-f10-software"
        class="mt-4 text-[34px] font-semibold leading-tight tracking-[-0.025em] md:text-[44px]"
      >
        Por que escolher a F10 como software para sua escola?
      </h2>
    </div>

    <div class="grid gap-6 md:grid-cols-2 lg:col-span-7">
      <article class="border-t border-white/20 pt-5">
        <h3 class="text-[19px] font-semibold text-[#EA6D0B]">Dados centralizados</h3>
        <p class="mt-3 text-[15px] leading-relaxed text-white/70">
          Todos os setores consultam informações consistentes e atualizadas da mesma
          instituição, aluno ou oportunidade.
        </p>
      </article>

      <article class="border-t border-white/20 pt-5">
        <h3 class="text-[19px] font-semibold text-[#EA6D0B]">Menos tarefas manuais</h3>
        <p class="mt-3 text-[15px] leading-relaxed text-white/70">
          Automações, integrações e fluxos reduzem lançamentos repetitivos e controles
          paralelos.
        </p>
      </article>

      <article class="border-t border-white/20 pt-5">
        <h3 class="text-[19px] font-semibold text-[#EA6D0B]">Jornada completa</h3>
        <p class="mt-3 text-[15px] leading-relaxed text-white/70">
          Acompanhe o interessado, a matrícula, a vida acadêmica, o relacionamento e
          o financeiro no mesmo ecossistema.
        </p>
      </article>

      <article class="border-t border-white/20 pt-5">
        <h3 class="text-[19px] font-semibold text-[#EA6D0B]">Visão para decisões</h3>
        <p class="mt-3 text-[15px] leading-relaxed text-white/70">
          Indicadores mostram desempenho por unidade, curso, equipe, campanha e área
          da gestão.
        </p>
      </article>
    </div>
  </div>
</section>

<section class="bg-white py-16 md:py-24" aria-labelledby="school-software-faq">
  <div class="container">
    <div class="max-w-3xl">
      <p class="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#EA6D0B]">
        Dúvidas frequentes
      </p>
      <h2
        id="school-software-faq"
        class="mt-4 text-[34px] font-semibold leading-tight tracking-[-0.025em] text-[#010D28] md:text-[44px]"
      >
        Perguntas sobre software para escolas
      </h2>
    </div>

    <div class="mt-9">
      <FaqAccordion items={faqItems} />
    </div>
  </div>
</section>

<section class="bg-white pb-16 md:pb-24">
  <div class="container">
    <div
      class="rounded-[30px] bg-[#F3F4FD] px-7 py-12 text-center md:px-12 md:py-16"
    >
      <h2 class="text-[30px] font-semibold leading-tight text-[#010D28] md:text-[40px]">
        Conheça o software para escolas da F10 na prática
      </h2>
      <p class="mx-auto mt-4 max-w-2xl text-[16px] leading-relaxed text-[#5F6475]">
        Converse com nossa equipe e veja como integrar gestão, comunicação,
        captação, ensino e financeiro em uma única plataforma.
      </p>
      <a
        href="/contato"
        class="mt-8 inline-flex items-center gap-3 rounded-full bg-[#EA6D0B] px-8 py-3.5 text-[15px] font-bold text-white transition hover:brightness-110"
      >
        Falar com um especialista
        <IconArrowRight size={21} />
      </a>
    </div>
  </div>
</section>
