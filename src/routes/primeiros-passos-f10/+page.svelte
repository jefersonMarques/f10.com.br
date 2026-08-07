<script lang="ts">
  import { ArrowDown, Check, Download, GraduationCap, LifeBuoy } from "lucide-svelte";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import FaqAccordion from "$lib/components/FaqAccordion.svelte";
  import SeoHead from "$lib/components/SeoHead.svelte";
  import DownloadGuide from "$lib/components/onboarding/DownloadGuide.svelte";
  import SupportGuide from "$lib/components/onboarding/SupportGuide.svelte";
  import TrainingGuide from "$lib/components/onboarding/TrainingGuide.svelte";
  import type { FaqItem } from "$lib/seo/schema";
  import {
    DEFAULT_OG_IMAGE,
    ORGANIZATION_DATA,
    SITE_URL,
    SOFTWARE_APPLICATION_DATA,
    WEBSITE_DATA,
    buildWebPageData,
  } from "$lib/seo/site";

  const canonicalUrl = `${SITE_URL}/primeiros-passos-f10`;
  const seoTitle = "Primeiros Passos no F10 | Download, Treinamentos e Suporte";
  const seoDescription =
    "Comece a usar o F10: baixe o instalador, acesse os treinamentos para novos clientes e aprenda a solicitar ajuda ao suporte F10.";

  const journeySteps = [
    {
      number: "01",
      title: "Instale o F10",
      description: "Baixe o instalador oficial para Windows e siga o passo a passo.",
      href: "#download",
      icon: Download,
    },
    {
      number: "02",
      title: "Faça os treinamentos",
      description: "Aprenda primeiro as rotinas essenciais para sua função na escola.",
      href: "#training",
      icon: GraduationCap,
    },
    {
      number: "03",
      title: "Conte com o suporte",
      description: "Saiba como explicar sua dúvida para receber ajuda mais rapidamente.",
      href: "#support",
      icon: LifeBuoy,
    },
  ];

  const faqItems: FaqItem[] = [
    {
      question: "Onde posso baixar o F10?",
      answer:
        'O instalador oficial está disponível em <a href="/download">f10.com.br/download</a>. Você pode retornar a essa página sempre que precisar instalar o F10 novamente.',
    },
    {
      question: "Onde encontro os treinamentos para novos clientes?",
      answer:
        'Acesse a página de <a href="/treinamentos">treinamentos do novo cliente F10</a> e siga a sequência recomendada para aprender as principais rotinas do sistema.',
    },
    {
      question: "Como entrar em contato com o suporte F10?",
      answer:
        'Clique no botão azul de suporte exibido no canto inferior direito desta página ou acesse a <a href="https://f10.movidesk.com/kb" target="_blank" rel="noopener noreferrer">Central de Ajuda F10</a>.',
    },
    {
      question: "Quais informações devo enviar ao suporte?",
      answer:
        "Informe seu nome, a escola ou unidade, o menu acessado, o que estava tentando fazer e a mensagem apresentada. Uma captura da tela pode acelerar a análise. Nunca envie sua senha.",
    },
  ];

  const breadcrumbItems = [
    { name: "Início", item: `${SITE_URL}/` },
    { name: "Primeiros passos no F10", item: canonicalUrl },
  ];

  const quickStartSchema = {
    "@type": "ItemList",
    "@id": `${canonicalUrl}#steps`,
    name: "Primeiros passos para começar a usar o F10",
    numberOfItems: journeySteps.length,
    itemListElement: journeySteps.map((step, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: step.title,
      description: step.description,
      url: `${canonicalUrl}${step.href}`,
    })),
  };

  const webPageData = buildWebPageData({
    path: "/primeiros-passos-f10",
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
  ogImageAlt="Guia de primeiros passos para clientes F10 Software"
  ogImageType="image/png"
  ogImageWidth={1200}
  ogImageHeight={630}
  organizationData={ORGANIZATION_DATA}
  websiteData={WEBSITE_DATA}
  {webPageData}
  softwareApplicationData={SOFTWARE_APPLICATION_DATA}
  {faqItems}
  {breadcrumbItems}
  additionalStructuredData={[quickStartSchema]}
/>

<section class="relative isolate overflow-hidden bg-white">
  <div
    class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[620px] bg-[radial-gradient(circle_at_78%_12%,rgba(234,109,11,0.13),transparent_34%),radial-gradient(circle_at_15%_30%,rgba(0,10,87,0.08),transparent_32%)]"
    aria-hidden="true"
  ></div>

  <Breadcrumb
    baseUrl={SITE_URL}
    items={[{ label: "INÍCIO", href: "/" }, { label: "PRIMEIROS PASSOS NO F10" }]}
  />

  <div class="container pb-16 pt-2 md:pb-24">
    <div class="mx-auto max-w-4xl text-center">
      <p class="text-[13px] font-semibold uppercase tracking-[0.2em] text-[#EA6D0B]">
        Guia para novos clientes
      </p>

      <h1
        class="mt-5 text-[40px] font-semibold leading-[1.06] tracking-[-0.04em] text-[#010D28] sm:text-[52px] lg:text-[64px]"
      >
        Primeiros passos para começar bem com o F10
      </h1>

      <p class="mx-auto mt-7 max-w-3xl text-[17px] leading-[1.8] text-[#5F6475] sm:text-[18px]">
        Nesta página você encontra o instalador oficial, os treinamentos para
        novos clientes e o caminho mais rápido para solicitar ajuda ao suporte
        F10.
      </p>

      <div class="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <a
          href="#download"
          class="inline-flex items-center justify-center gap-2 rounded-full bg-[#EA6D0B] px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_16px_38px_rgba(234,109,11,0.3)] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
        >
          Começar agora
          <ArrowDown size={18} aria-hidden="true" />
        </a>

        <a
          href="https://f10.movidesk.com/kb"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-7 py-3.5 text-[15px] font-semibold text-[#010D28] transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300/60"
        >
          Consultar Central de Ajuda
        </a>
      </div>
    </div>

    <nav class="mx-auto mt-14 grid max-w-6xl gap-4 md:grid-cols-3" aria-label="Etapas dos primeiros passos">
      {#each journeySteps as step}
        <a
          href={step.href}
          class="group rounded-[24px] border border-[#E7EAF8] bg-white/90 p-6 shadow-[0_18px_50px_rgba(1,13,40,0.07)] backdrop-blur transition hover:-translate-y-1 hover:border-[#EA6D0B]/25 hover:shadow-[0_24px_55px_rgba(1,13,40,0.1)]"
        >
          <div class="flex items-center justify-between gap-4">
            <span class="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F3F4FD] text-[#000A57] transition group-hover:bg-[#EA6D0B]/10 group-hover:text-[#EA6D0B]">
              <svelte:component this={step.icon} size={22} aria-hidden="true" />
            </span>
            <span class="text-[12px] font-bold tracking-[0.16em] text-[#000A57]/35">{step.number}</span>
          </div>

          <h2 class="mt-5 text-[19px] font-semibold text-[#010D28]">{step.title}</h2>
          <p class="mt-2 text-[14px] leading-[1.65] text-[#5F6475]">{step.description}</p>

          <span class="mt-5 inline-flex items-center gap-2 text-[13px] font-semibold text-[#EA6D0B]">
            Ver esta etapa
            <Check size={15} aria-hidden="true" />
          </span>
        </a>
      {/each}
    </nav>
  </div>
</section>

<DownloadGuide />
<TrainingGuide />
<SupportGuide />

<section class="bg-[#F7F8FE] py-16 md:py-24">
  <div class="container">
    <div class="mx-auto max-w-3xl text-center">
      <p class="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#EA6D0B]">
        Dúvidas frequentes
      </p>
      <h2 class="mt-4 text-[30px] font-semibold tracking-[-0.03em] text-[#010D28] sm:text-[38px]">
        Respostas rápidas para começar
      </h2>
      <p class="mt-4 text-[15px] leading-[1.75] text-[#5F6475]">
        Consulte as orientações essenciais sobre instalação, treinamentos e
        atendimento.
      </p>
    </div>

    <div class="mx-auto mt-10 max-w-4xl">
      <FaqAccordion items={faqItems} />
    </div>
  </div>
</section>
