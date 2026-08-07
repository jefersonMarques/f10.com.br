<script lang="ts">
  import { ArrowDown, CheckCircle2, Clock3, LifeBuoy, Route } from "lucide-svelte";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import FaqAccordion from "$lib/components/FaqAccordion.svelte";
  import GettingStartedJourney from "$lib/components/onboarding/GettingStartedJourney.svelte";
  import SupportGuide from "$lib/components/onboarding/SupportGuide.svelte";
  import SeoHead from "$lib/components/SeoHead.svelte";
  import {
    getYoutubeUrl,
    trainingVideos,
  } from "$lib/onboarding/trainingCatalog";
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
  const seoTitle = "Primeiros Passos no F10 | Guia e Treinamentos";
  const seoDescription =
    "Siga a trilha de primeiros passos no F10: instalação, primeiro acesso, cadastro de usuários, direitos de acesso e treinamentos em vídeo.";

  const journeySteps = [
    {
      title: "Baixar e instalar o F10",
      description: "Baixe o instalador oficial no computador Windows.",
    },
    {
      title: "Fazer o primeiro acesso",
      description: "Entre com o usuário e a senha recebidos por e-mail.",
    },
    {
      title: "Criar usuários e funcionários",
      description: "Assista ao treinamento essencial e cadastre sua equipe.",
    },
    {
      title: "Definir os direitos dos usuários",
      description: "Configure o que cada pessoa poderá acessar no sistema.",
    },
    {
      title: "Escolher uma rotina para aprender",
      description: "Selecione entre 16 treinamentos e assista sem sair da página.",
    },
  ];

  const faqItems: FaqItem[] = [
    {
      question: "Onde posso baixar o F10?",
      answer:
        'Utilize o botão da primeira etapa ou acesse <a href="/download">f10.com.br/download</a>. O instalador oficial está disponível para computadores Windows.',
    },
    {
      question: "Onde encontro meu usuário e minha senha?",
      answer:
        "Os dados do primeiro acesso são enviados por e-mail durante a implantação. Procure também nas pastas Spam, Lixo eletrônico ou Promoções. Esta página nunca solicita sua senha.",
    },
    {
      question: "Preciso assistir a todos os treinamentos?",
      answer:
        "Comece pelos treinamentos de cadastro de usuários e direitos de acesso. Depois, escolha apenas as rotinas relacionadas ao trabalho que deseja realizar no F10.",
    },
    {
      question: "Posso parar e continuar a trilha depois?",
      answer:
        "Sim. O progresso fica salvo neste navegador. Ao retornar usando o mesmo dispositivo e navegador, a página abre na última etapa acessada.",
    },
    {
      question: "Como pedir ajuda ao suporte F10?",
      answer:
        'Clique no botão azul de suporte no canto inferior direito ou acesse a <a href="https://f10.movidesk.com/kb" target="_blank" rel="noopener noreferrer">Central de Ajuda F10</a>. Informe seu nome, sua escola e a rotina em que surgiu a dúvida.',
    },
  ];

  const breadcrumbItems = [
    { name: "Início", item: `${SITE_URL}/` },
    { name: "Primeiros passos no F10", item: canonicalUrl },
  ];

  const quickStartSchema = {
    "@type": "ItemList",
    "@id": `${canonicalUrl}#steps`,
    name: "Trilha de primeiros passos no F10",
    numberOfItems: journeySteps.length,
    itemListElement: journeySteps.map((step, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: step.title,
      description: step.description,
      url: `${canonicalUrl}#onboarding-journey`,
    })),
  };

  const trainingLibrarySchema = {
    "@type": "ItemList",
    "@id": `${canonicalUrl}#training-library`,
    name: "Treinamentos em vídeo do F10",
    numberOfItems: trainingVideos.length,
    itemListElement: trainingVideos.map((training, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "LearningResource",
        name: training.title,
        description: training.description,
        learningResourceType: "Video",
        inLanguage: "pt-BR",
        url: getYoutubeUrl(training.videoId),
      },
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
  ogImageAlt="Trilha guiada de primeiros passos no F10 Software"
  ogImageType="image/png"
  ogImageWidth={1200}
  ogImageHeight={630}
  organizationData={ORGANIZATION_DATA}
  websiteData={WEBSITE_DATA}
  {webPageData}
  softwareApplicationData={SOFTWARE_APPLICATION_DATA}
  {faqItems}
  {breadcrumbItems}
  additionalStructuredData={[quickStartSchema, trainingLibrarySchema]}
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

  <div class="container pb-14 pt-2 md:pb-20">
    <div class="mx-auto max-w-4xl text-center">
      <p class="text-[13px] font-semibold uppercase tracking-[0.2em] text-[#EA6D0B]">
        Onboarding guiado para novos clientes
      </p>

      <h1 class="mt-5 text-[38px] font-semibold leading-[1.06] tracking-[-0.04em] text-[#010D28] sm:text-[50px] lg:text-[60px]">
        Vamos dar os primeiros passos no F10 juntos
      </h1>

      <p class="mx-auto mt-7 max-w-3xl text-[17px] leading-[1.8] text-[#5F6475] sm:text-[18px]">
        Siga uma etapa por vez: instale o F10, faça seu primeiro acesso,
        configure os usuários e aprenda as rotinas que fazem parte do seu trabalho.
      </p>

      <div class="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <a
          href="#onboarding-journey"
          class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#EA6D0B] px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_16px_38px_rgba(234,109,11,0.3)] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40 sm:w-auto"
        >
          Iniciar trilha guiada
          <ArrowDown size={18} aria-hidden="true" />
        </a>

        <a
          href="https://f10.movidesk.com/kb"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-7 py-3.5 text-[15px] font-semibold text-[#010D28] transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300/60 sm:w-auto"
        >
          <LifeBuoy size={18} aria-hidden="true" />
          Preciso de ajuda
        </a>
      </div>

      <div class="mx-auto mt-10 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
        <div class="flex items-center gap-3 rounded-2xl border border-[#E7EAF3] bg-white/85 p-4 shadow-sm">
          <Route class="min-w-5 text-[#EA6D0B]" size={20} aria-hidden="true" />
          <span class="text-[13px] font-semibold text-[#010D28]">5 etapas simples</span>
        </div>
        <div class="flex items-center gap-3 rounded-2xl border border-[#E7EAF3] bg-white/85 p-4 shadow-sm">
          <CheckCircle2 class="min-w-5 text-emerald-600" size={20} aria-hidden="true" />
          <span class="text-[13px] font-semibold text-[#010D28]">16 vídeos práticos</span>
        </div>
        <div class="flex items-center gap-3 rounded-2xl border border-[#E7EAF3] bg-white/85 p-4 shadow-sm">
          <Clock3 class="min-w-5 text-[#000A57]" size={20} aria-hidden="true" />
          <span class="text-[13px] font-semibold text-[#010D28]">Continue quando quiser</span>
        </div>
      </div>
    </div>
  </div>
</section>

<GettingStartedJourney />
<SupportGuide />

<section class="bg-[#F7F8FE] py-16 md:py-24">
  <div class="container">
    <div class="mx-auto max-w-3xl text-center">
      <p class="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#EA6D0B]">
        Dúvidas frequentes
      </p>
      <h2 class="mt-4 text-[30px] font-semibold tracking-[-0.03em] text-[#010D28] sm:text-[38px]">
        Respostas rápidas para continuar
      </h2>
      <p class="mt-4 text-[15px] leading-[1.75] text-[#5F6475]">
        Consulte as orientações sobre instalação, primeiro acesso, treinamentos e suporte.
      </p>
    </div>

    <div class="mx-auto mt-10 max-w-4xl">
      <FaqAccordion items={faqItems} />
    </div>
  </div>
</section>
