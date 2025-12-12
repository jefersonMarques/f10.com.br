<script lang="ts">
  // ===== Imports =====
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import IconArrowRight from "$lib/icons/IconArrowRight.svelte";
  import FaqAccordion from "$lib/components/FaqAccordion.svelte";
  import KpiPanel from "$lib/components/KpiPanel.svelte";

  // Ícones Lucide
  import {
    GraduationCap,
    FileText,
    CreditCard,
    ShieldCheck,
    PlayCircle,
    ClipboardList,
  } from "lucide-svelte";
  import { contactModalConfig } from "$lib/stores/contactModals";
  import { showForm } from "$lib/stores/formPopup";

  // ===== Tipos =====
  type IconComponent = typeof GraduationCap;

  type Pillar = {
    title: string; // aceita <br> via {@html}
    description: string;
    icon: IconComponent;
  };

  type StepItem = {
    label: string;
    title: string;
    description: string;
  };

  type BenefitItem = {
    title: string;
    description: string;
  };

  type SmartAlunoHighlight = {
    title: string;
    description: string;
  };

  // ===== Pilares do AVA =====
  const pillars: Pillar[] = [
    {
      title: "Videoaulas e conteúdos<br/>em trilhas de EAD",
      description:
        "Cursos organizados por módulos, aulas, conteúdos programáticos e atividades, com controle de acesso por turma e curso.",
      icon: GraduationCap,
    },
    {
      title: "Atividades, questionários<br/>e correção online",
      description:
        "Envio de atividades por upload/download, questionários com peso de nota, prazos, status e feedbacks dos professores.",
      icon: FileText,
    },
    {
      title: "Financeiro, contratos<br/>e pagamentos online",
      description:
        "Visualização de parcelas, boletos em PDF, Pix integrado e aceite online de contratos direto pelo Portal do Aluno.",
      icon: CreditCard,
    },
    {
      title: "Controle de acesso<br/>e personalização por escola",
      description:
        "Subdomínio próprio por escola, menus e cards configuráveis, bloqueio de acesso ao AVA e regras de uso por contrato.",
      icon: ShieldCheck,
    },
  ];

  // ===== Etapas – como o AVA entra na operação =====
  const steps: StepItem[] = [
    {
      label: "1",
      title: "Configure cursos, turmas e trilhas de estudo",
      description:
        "No F10, a escola organiza cursos, turmas, matérias, aulas e conteúdos. O AVA reflete essa estrutura para que o aluno encontre tudo em ordem.",
    },
    {
      label: "2",
      title: "Publique videoaulas, conteúdos e atividades",
      description:
        "Professores criam videoaulas, anexos, atividades por upload/download e questionários com peso, prazo e status de entrega.",
    },
    {
      label: "3",
      title: "Aluno acessa pelo subdomínio da escola",
      description:
        "Cada escola tem seu próprio endereço de Portal do Aluno. O estudante faz login, acompanha o curso, responde atividades e realiza pagamentos.",
    },
  ];

  // ===== Benefícios do AVA =====
  const benefits: BenefitItem[] = [
    {
      title: "EAD com cara de curso profissional, não “gambiarra online”",
      description:
        "Estrutura de aulas, atividades e avaliações pensada para cursos 100% online, híbridos e complementares ao presencial.",
    },
    {
      title: "Menos suporte, mais autonomia do aluno",
      description:
        "Videoaulas, atividades, financeiro e contratos ficam centralizados. O aluno resolve sozinho o que antes virava ligação para a secretaria.",
    },
    {
      title: "Mais controle pedagógico e indicadores claros",
      description:
        "Professores e coordenação acompanham atividades entregues, notas, presença em videoaulas e progresso por aluno, turma e curso.",
    },
    {
      title: "Processos digitais: aceite, documentos, Pix e bloqueios",
      description:
        "Aceite online, envio de documentos obrigatórios, registro automático de Pix e regras de bloqueio de acesso tornam a operação mais segura.",
    },
  ];

  // ===== KPIs sugeridos =====
  const kpis = [
    { value: "3x", label: "mais engajamento em cursos EAD*" },
    { value: "40%", label: "redução média em chamadas de suporte do aluno*" },
    { value: "25%", label: "mais conclusão de cursos online*" },
  ];

  // ===== Destaque Smart Aluno em conjunto =====
  const smartAlunoHighlights: SmartAlunoHighlight[] = [
    {
      title: "Portal no notebook, app no bolso",
      description:
        "O AVA concentra videoaulas, atividades e avaliações. O Smart Aluno reforça notificações, lembretes e acesso rápido a conteúdos e financeiro pelo celular.",
    },
    {
      title: "Mesma base F10, experiências diferentes",
      description:
        "Os dados são os mesmos: notas, conteúdos, contratos, financeiro. O que muda é a forma de consumir: AVA para estudo aprofundado e app para o dia a dia.",
    },
    {
      title: "Presencial + online em um único ecossistema",
      description:
        "Cursos presenciais, híbridos e EAD convivem no mesmo ambiente, com relatórios centralizados e comunicação integrada.",
    },
  ];

  // ===== FAQ do AVA / Portal do Aluno =====
  const faqItems = [
    {
      question: "O que é o AVA / Portal do Aluno da F10?",
      answer:
        "É o ambiente virtual de aprendizagem da F10: o aluno acessa videoaulas, conteúdos, atividades, questionários, notas, faltas, financeiro e contratos pelo navegador, usando o subdomínio da escola.",
    },
    {
      question: "Funciona para EAD, híbrido e cursos presenciais?",
      answer:
        "Sim. O AVA atende tanto cursos 100% online quanto modelos híbridos e presenciais que usam videoaulas, reforço e trilhas de estudo complementares.",
    },
    {
      question: "Como funciona o pagamento online (Pix, boletos, etc.)?",
      answer:
        "No Portal do Aluno, o estudante visualiza parcelas, gera boletos em PDF, realiza pagamento por Pix e acompanha o status das mensalidades. Quando integrado, o registro do Pix é feito automaticamente nas parcelas.",
    },
    {
      question: "O AVA grava o progresso dos conteúdos?",
      answer:
        "Sim. Em videoaulas, áudios e PDFs, o AVA registra até onde o aluno assistiu ou leu e retoma a partir daquele ponto ao retornar ao conteúdo.",
    },
    {
      question: "Qual a diferença entre o AVA e o aplicativo Smart Aluno?",
      answer:
        "O AVA é o ambiente principal para estudo online (videoaulas, atividades, trilhas). O Smart Aluno é o app que leva para o celular notificações, conteúdos, podcasts, financeiro, Clube do Aluno e comunicação rápida. Ambos usam os mesmos dados dentro da F10.",
    },
  ];

  function openAvaModal() {
    contactModalConfig.set({
      defaultMessage: "Quero agendar uma demonstração do aplicativo AVA",
      product: "F10 – AVA",
      subSource: "Modal AVA – dobra 1",
      leadDescription: "Contato iniciado pelo formulário do AVA.",
    });

    showForm.set(true);
  }
  function openAvaPresentationModal() {
    contactModalConfig.set({
      defaultMessage: "Quero agendar uma demonstração do aplicativo AVA",
      product: "F10 – AVA",
      subSource: "Modal AVA – Final da página",
      leadDescription: "Contato iniciado pelo formulário do AVA.",
    });

    showForm.set(true);
  }
</script>

<svelte:head>
  <title
    >AVA F10 — Ambiente virtual de aprendizagem e Portal do Aluno | F10 Software</title
  >
  <meta
    name="description"
    content="O AVA F10 é o ambiente virtual de aprendizagem e Portal do Aluno para EAD, híbrido e ensino online: videoaulas, atividades, questionários, financeiro, contratos e progresso de estudo em um só lugar, integrado ao app Smart Aluno."
  />
  <meta
    property="og:title"
    content="AVA F10 — Ambiente virtual de aprendizagem e Portal do Aluno | F10 Software"
  />
  <meta
    property="og:description"
    content="Ambiente virtual de aprendizagem com videoaulas, atividades, avaliações, financeiro e contratos, usando subdomínio próprio da escola e integração com o aplicativo Smart Aluno."
  />
  <link
    rel="canonical"
    href="https://f10.com.br/solucoes/ambiente-virtual-de-aprendizado-ava"
  />

  <!-- JSON-LD: SoftwareApplication -->
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "AVA F10 / Portal do Aluno",
      "applicationCategory": "EducationalApplication",
      "operatingSystem": "Web",
      "description": "Ambiente virtual de aprendizagem integrado ao F10: videoaulas, conteúdos, atividades, questionários, financeiro, contratos e progresso de estudo, com subdomínio próprio por escola.",
      "provider": {
        "@type": "Organization",
        "name": "F10 Software"
      }
    }
  </script>

  <!-- JSON-LD: BreadcrumbList -->
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Início",
          "item": "https://f10.com.br/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Soluções",
          "item": "https://f10.com.br/solucoes"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Ambiente Virtual de Aprendizagem (AVA)",
          "item": "https://f10.com.br/solucoes/ambiente-virtual-de-aprendizado-ava"
        }
      ]
    }
  </script>

  <!-- JSON-LD: FAQPage (mesmas perguntas do FaqAccordion) -->
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "O que é o AVA / Portal do Aluno da F10?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "É o ambiente virtual de aprendizagem da F10: o aluno acessa videoaulas, conteúdos, atividades, questionários, notas, faltas, financeiro e contratos pelo navegador, usando o subdomínio da escola."
          }
        },
        {
          "@type": "Question",
          "name": "Funciona para EAD, híbrido e cursos presenciais?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Sim. O AVA atende tanto cursos 100% online quanto modelos híbridos e presenciais que usam videoaulas, reforço e trilhas de estudo complementares."
          }
        },
        {
          "@type": "Question",
          "name": "Como funciona o pagamento online (Pix, boletos, etc.)?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No Portal do Aluno, o estudante visualiza parcelas, gera boletos em PDF, realiza pagamento por Pix e acompanha o status das mensalidades. Quando integrado, o registro do Pix é feito automaticamente nas parcelas."
          }
        },
        {
          "@type": "Question",
          "name": "O AVA grava o progresso dos conteúdos?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Sim. Em videoaulas, áudios e PDFs, o AVA registra até onde o aluno assistiu ou leu e retoma a partir daquele ponto ao retornar ao conteúdo."
          }
        },
        {
          "@type": "Question",
          "name": "Qual a diferença entre o AVA e o aplicativo Smart Aluno?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "O AVA é o ambiente principal para estudo online (videoaulas, atividades, trilhas). O Smart Aluno é o app que leva para o celular notificações, conteúdos, podcasts, financeiro, Clube do Aluno e comunicação rápida. Ambos usam os mesmos dados dentro da F10."
          }
        }
      ]
    }
  </script>
</svelte:head>

<!-- ===== HERO ===== -->
<section class="relative isolate overflow-hidden bg-white/60">
  <!-- Breadcrumb -->
  <div class="pt-4">
    <Breadcrumb
      baseUrl="https://f10.com.br"
      items={[
        { label: "HOME", href: "/" },
        { label: "SOLUÇÕES", href: "/solucoes" },
        { label: "AMBIENTE VIRTUAL DE APRENDIZAGEM (AVA)" },
      ]}
    />
  </div>

  <div class="container">
    <div class="grid gap-10 lg:grid-cols-12 items-start">
      <!-- Texto -->
      <div class="lg:col-span-6">
        <h1
          class="max-w-[800px] text-[#010D28] tracking-[-0.03em] leading-[1.08]
                 text-[34px] sm:text-[42px] md:text-[50px] font-semibold"
        >
          AVA F10: o Portal do Aluno
          <span class="text-[#EA6D0B]">para EAD e ensino online</span>
        </h1>

        <p class="mt-6 text-[18px] leading-[1.8] text-[#000A57] max-w-[640px]">
          Um ambiente virtual de aprendizagem completo, integrado ao F10, para
          cursos presenciais, híbridos e 100% EAD: videoaulas, atividades,
          avaliações, financeiro e contratos em um só lugar.
        </p>

        <p
          class="mt-4 text-[16px] leading-[1.8] text-[#000A57]/80 max-w-[640px]"
        >
          Cada escola acessa o AVA por um <strong>subdomínio próprio</strong> e
          pode personalizar menus, cards e regras de acesso. No celular, o
          <strong>aplicativo Smart Aluno</strong> complementa com notificações e
          acesso rápido.
        </p>

        <div class="mt-8 flex flex-wrap items-center gap-4">
          <button
            type="button"
            on:click={openAvaModal}
            class="inline-flex items-center justify-center gap-3 rounded-[999px]
                   bg-[#EA6D0B] px-8 md:px-10 py-3.5 text-white text-[16px] font-bold
                   transition hover:brightness-110 focus:outline-none focus:ring-2
                   focus:ring-[#EA6D0B]/40"
          >
            <span>Ver AVA em funcionamento</span>
            <IconArrowRight size={22} />
          </button>
        </div>
      </div>

      <!-- Imagem HERO -->
      <div class="lg:col-span-6 ml-[-50px] mr-[-50px]">
        <div class="relative h-auto">
          <img
            src="/bg_hero_ava_f10.webp"
            alt="Telas do AVA F10, Portal do Aluno em notebook e smartphone."
            class="h-full w-full object-cover object-bottom mt-[-80px]"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ===== SEÇÃO ESCURA — Pilares do AVA ===== -->
<section class="relative py-12 md:py-16 bg-white/80">
  <div class="lg:container lg:px-20">
    <div
      class="relative overflow-hidden lg:rounded-[28px]
             bg-[#0A1533] text-white ring-1 ring-white/5"
    >
      <div class="px-6 md:px-10 lg:px-14 py-12 md:py-16">
        <p
          class="flex items-center justify-center gap-4 pb-4 text-[#AEB3D9] text-[15px]"
        >
          <span class="inline-block h-px w-10 bg-[#AEB3D9]"></span>
          <span>O que o AVA entrega na prática</span>
          <span class="inline-block h-px w-10 bg-[#AEB3D9]"></span>
        </p>

        <h2
          class="mt-2 text-center text-[26px] sm:text-[32px] md:text-[38px]
                 leading-[1.15] font-semibold"
        >
          Seu EAD com <span class="text-[#EA6D0B]">estrutura</span>,
          <span class="text-[#EA6D0B]">progresso</span> e
          <span class="text-[#EA6D0B]">controle</span>
        </h2>

        <!-- Pilares em grade -->
        <div class="mt-10 grid gap-8 md:grid-cols-2">
          {#each pillars as pillar}
            <article
              class="rounded-[22px] bg-white/5 border border-white/10
                     px-6 py-6 md:px-7 md:py-7 flex gap-4"
            >
              <div
                class="flex-shrink-0 flex h-[60px] w-[60px] items-center
                       justify-center rounded-full bg-[#7E82A2]/40
                       ring-1 ring-white/20 text-white"
                aria-hidden="true"
              >
                <svelte:component this={pillar.icon} class="w-8 h-8" />
              </div>

              <div>
                <h3
                  class="text-[19px] md:text-[20px] font-semibold
                         text-white leading-snug"
                >
                  {@html pillar.title}
                </h3>
                <p
                  class="mt-2 text-[15px] md:text-[16px] leading-relaxed
                         text-white/80"
                >
                  {pillar.description}
                </p>
              </div>
            </article>
          {/each}
        </div>

        <p class="mt-6 text-[13px] text-[#CBD0FF]/80 text-center">
          Configurações, menus, cards e regras de acesso são definidos no F10 e
          refletidos automaticamente no AVA.
        </p>

        <div
          class="pointer-events-none absolute inset-0 lg:rounded-[28px]
                 ring-1 ring-inset ring-white/10"
        ></div>
      </div>
    </div>
  </div>
</section>

<!-- ===== FUNCIONALIDADES EM DETALHE ===== -->
<section class="relative py-14 md:py-16 bg-white">
  <div class="container px-5 md:px-8 lg:px-20">
    <!-- CABEÇALHO EM 2 COLUNAS -->
    <div class="grid gap-8 lg:grid-cols-12 items-start">
      <div class="lg:col-span-7">
        <p
          class="text-[13px] font-semibold tracking-[0.22em] text-[#7E82A2] uppercase"
        >
          AMBIENTE VIRTUAL DE APRENDIZAGEM
        </p>

        <h2
          class="mt-3 text-[30px] md:text-[36px] lg:text-[40px] font-semibold
                 leading-[1.13] tracking-[-0.02em] text-[#000A57]"
        >
          Um AVA pensado para cursos sérios, não só “vídeo gravado”
        </h2>
      </div>

      <div class="lg:col-span-5">
        <p class="text-[15px] md:text-[16px] leading-[1.9] text-[#000A57]/85">
          O <strong>AVA F10</strong> organiza videoaulas, atividades,
          avaliações, contratos e financeiro em um único
          <strong>Portal do Aluno</strong>, pronto para EAD, ensino híbrido e
          reforço online do presencial.
        </p>
        <p class="mt-3 text-[15px] leading-[1.9] text-[#000A57]/75">
          Abaixo, você vê como o ambiente virtual funciona na prática: da
          experiência de assistir às aulas até o controle de pagamentos e de
          acesso dos alunos.
        </p>
      </div>
    </div>

    <div class="mt-10 space-y-12">
      <!-- Bloco 1: Videoaulas e progresso -->
      <div class="grid gap-8 lg:grid-cols-12 items-start">
        <div class="lg:col-span-6 space-y-4">
          <div
            class="inline-flex items-center gap-2 text-[13px] font-medium text-[#7E82A2]"
          >
            <PlayCircle class="h-4 w-4 text-[#EA6D0B]" />
            <span>Videoaulas e trilhas de estudo</span>
          </div>

          <h3
            class="text-[22px] md:text-[24px] font-semibold text-[#000A57]
                   leading-snug"
          >
            Videoaulas com retomada de ponto e progresso por aula
          </h3>

          <p class="text-[15px] md:text-[16px] leading-[1.9] text-[#000A57]/90">
            O AVA grava automaticamente até onde o aluno assistiu em cada
            conteúdo. Quando ele volta, o vídeo continua exatamente daquele
            ponto, mesmo em aulas longas.
          </p>
          <p class="text-[15px] md:text-[16px] leading-[1.9] text-[#000A57]/80">
            A trilha exibe o percentual de conclusão por aula e módulo, ajudando
            o aluno a acompanhar o próprio progresso e a coordenação a enxergar
            engajamento real nos cursos EAD.
          </p>

          <ul
            class="mt-2 text-[14px] md:text-[15px] text-[#000A57]/80 space-y-1.5"
          >
            <li>• Progresso salvo em vídeos, áudios e PDFs</li>
            <li>• Percentual concluído por aula, módulo e curso</li>
          </ul>
        </div>

        <div class="lg:col-span-6 flex justify-end">
          <div class="relative w-full max-w-[690px]">
            <!-- FUNDO CINZA ROTACIONADO -->
            <div
              class="pointer-events-none absolute inset-0 rounded-[32px]
             bg-[#F3F4F6]/50 rotate-[10deg]"
              aria-hidden="true"
            ></div>

            <figure
              class="relative mx-auto rounded-[24px] overflow-hidden
             shadow-[0_18px_40px_rgba(1,13,40,0.12)]
             bg-[#020617] ring-1 ring-black/5"
            >
              <!-- NOISE DE FUNDO BEM SUTIL -->
              <div
                class="pointer-events-none absolute inset-0 opacity-[0.10] mix-blend-overlay
               bg-[url('/noise.svg')] bg-repeat [background-size:250px_250px]"
                aria-hidden="true"
              ></div>

              <!-- CONTEÚDO DA “JANELA” -->
              <div class="relative flex flex-col">
                <!-- BARRA SUPERIOR ESTILO SAFARI -->
                <div
                  class="relative flex items-center justify-center
                 px-4 md:px-6 pt-3 pb-2
                 bg-gradient-to-b from-[#020A24] via-[#020A24] to-[#020617]
                 border-b border-white/10"
                >
                  <!-- bolinhas estilo macOS (ESQUERDA) -->
                  <div class="absolute left-4 flex items-center gap-1.5">
                    <span class="h-2.5 w-2.5 rounded-full bg-[#FF5F57]"></span>
                    <span class="h-2.5 w-2.5 rounded-full bg-[#FEBB2E]"></span>
                    <span class="h-2.5 w-2.5 rounded-full bg-[#28C840]"></span>
                  </div>

                  <!-- BARRA DE ENDEREÇO CENTRALIZADA -->
                  <div
                    class="flex items-center justify-center
                   px-4 md:px-6 py-1.5
                   rounded-full bg-[#020817] border border-white/15
                   text-[11px] md:text-[12px] text-white/80 tracking-tight
                   shadow-[0_0_0_1px_rgba(15,23,42,0.3)]
                   max-w-[260px] md:max-w-[320px]"
                  >
                    <span class="truncate">
                      app.f10.com.br • Ambiente virtual do aluno
                    </span>
                  </div>
                </div>

                <!-- ÁREA DA TELA / PRINT DO SISTEMA -->
                <div class="relative bg-white">
                  <img
                    src="/nova_video_aula.webp"
                    alt="Tela de criação de videoaula no AVA F10, com formulário completo para configurar uma nova aula."
                    class="w-full h-auto object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
            </figure>
          </div>
        </div>
      </div>

      <!-- Bloco 2: Atividades e questionários -->
      <div class="grid gap-8 lg:grid-cols-12 items-start lg:flex-row-reverse">
        <div class="lg:col-span-6 lg:order-2 space-y-4">
          <div
            class="inline-flex items-center gap-2 text-[13px] font-medium text-[#7E82A2]"
          >
            <ClipboardList class="h-4 w-4 text-[#EA6D0B]" />
            <span>Atividades e avaliações</span>
          </div>

          <h3
            class="text-[22px] md:text-[24px] font-semibold text-[#000A57]
                   leading-snug"
          >
            Atividades, upload/download e questionários com nota
          </h3>

          <p class="text-[15px] md:text-[16px] leading-[1.9] text-[#000A57]/90">
            Professores disponibilizam exercícios em Word, PDF e outros formatos
            para o aluno baixar, responder e reenviar diretamente pelo Portal do
            Aluno, sem depender de e-mail ou grupos paralelos.
          </p>
          <p class="text-[15px] md:text-[16px] leading-[1.9] text-[#000A57]/80">
            Questionários com peso de nota, prazo e status (Pendente, Aberta,
            Faça de Novo, Entregue, Avaliada) deixam claro o que falta fazer em
            cada disciplina.
          </p>

          <ul
            class="mt-2 text-[14px] md:text-[15px] text-[#000A57]/80 space-y-1.5"
          >
            <li>• Lista de atividades por curso, matéria e aula</li>
            <li>• Upload/download de arquivos com controle de tamanho</li>
          </ul>
        </div>

        <!-- Imagem -->
        <div class="lg:col-span-6 flex justify-end">
          <div class="relative w-full max-w-[690px]">
            <!-- FUNDO CINZA ROTACIONADO -->
            <div
              class="pointer-events-none absolute inset-0 rounded-[32px]
             bg-[#F3F4F6]/50 rotate-[-10deg]"
              aria-hidden="true"
            ></div>

            <figure
              class="relative mx-auto rounded-[24px] overflow-hidden
             shadow-[0_18px_40px_rgba(1,13,40,0.12)]
             bg-[#020617] ring-1 ring-black/5"
            >
              <!-- NOISE DE FUNDO BEM SUTIL -->
              <div
                class="pointer-events-none absolute inset-0 opacity-[0.10] mix-blend-overlay
               bg-[url('/noise.svg')] bg-repeat [background-size:250px_250px]"
                aria-hidden="true"
              ></div>

              <!-- CONTEÚDO DA “JANELA” -->
              <div class="relative flex flex-col">
                <!-- BARRA SUPERIOR ESTILO SAFARI -->
                <div
                  class="relative flex items-center justify-center
                 px-4 md:px-6 pt-3 pb-2
                 bg-gradient-to-b from-[#020A24] via-[#020A24] to-[#020617]
                 border-b border-white/10"
                >
                  <!-- bolinhas estilo macOS (ESQUERDA) -->
                  <div class="absolute left-4 flex items-center gap-1.5">
                    <span class="h-2.5 w-2.5 rounded-full bg-[#FF5F57]"></span>
                    <span class="h-2.5 w-2.5 rounded-full bg-[#FEBB2E]"></span>
                    <span class="h-2.5 w-2.5 rounded-full bg-[#28C840]"></span>
                  </div>

                  <!-- BARRA DE ENDEREÇO CENTRALIZADA -->
                  <div
                    class="flex items-center justify-center
                   px-4 md:px-6 py-1.5
                   rounded-full bg-[#020817] border border-white/15
                   text-[11px] md:text-[12px] text-white/80 tracking-tight
                   shadow-[0_0_0_1px_rgba(15,23,42,0.3)]
                   max-w-[260px] md:max-w-[320px]"
                  >
                    <span class="truncate">
                      app.f10.com.br • Ambiente virtual do aluno
                    </span>
                  </div>
                </div>

                <!-- ÁREA DA TELA / PRINT DO SISTEMA -->
                <div class="relative bg-white">
                  <img
                    src="/upload_download_ava.webp"
                    alt="Tela de atividades do AVA F10 com upload e download de exercícios e controle de status."
                    class="w-full h-auto object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
            </figure>
          </div>
        </div>
      </div>

      <!-- Bloco 3: Financeiro, contratos e Pix -->
      <div class="grid gap-8 lg:grid-cols-12 items-start">
        <div class="lg:col-span-6 space-y-4">
          <div
            class="inline-flex items-center gap-2 text-[13px] font-medium text-[#7E82A2]"
          >
            <CreditCard class="h-4 w-4 text-[#EA6D0B]" />
            <span>Financeiro e contratos</span>
          </div>

          <h3
            class="text-[22px] md:text-[24px] font-semibold text-[#000A57]
                   leading-snug"
          >
            Financeiro completo: boletos, Pix e histórico de contratos
          </h3>

          <p class="text-[15px] md:text-[16px] leading-[1.9] text-[#000A57]/90">
            No Portal do Aluno, o estudante acompanha parcelas, gera boletos em
            PDF e paga por Pix. Quando integrado, o registro do pagamento é
            feito automaticamente no financeiro da escola.
          </p>
          <p class="text-[15px] md:text-[16px] leading-[1.9] text-[#000A57]/80">
            Contratos podem ter aceite online com registro de IP e geração de
            PDF completo, reduzindo papelada e trazendo mais segurança jurídica
            para o EAD.
          </p>

          <ul
            class="mt-2 text-[14px] md:text-[15px] text-[#000A57]/80 space-y-1.5"
          >
            <li>• Boletos em PDF, linha digitável e status das parcelas</li>
            <li>• Pagamento por Pix integrado ao F10</li>
          </ul>
        </div>

        <!-- Imagem -->
        <div class="lg:col-span-6 flex justify-end">
          <div class="relative w-full max-w-[690px]">
            <!-- FUNDO CINZA ROTACIONADO -->
            <div
              class="pointer-events-none absolute inset-0 rounded-[32px]
             bg-[#F3F4F6]/50 rotate-[10deg]"
              aria-hidden="true"
            ></div>

            <figure
              class="relative mx-auto rounded-[24px] overflow-hidden
             shadow-[0_18px_40px_rgba(1,13,40,0.12)]
             bg-[#020617] ring-1 ring-black/5"
            >
              <!-- NOISE DE FUNDO BEM SUTIL -->
              <div
                class="pointer-events-none absolute inset-0 opacity-[0.10] mix-blend-overlay
               bg-[url('/noise.svg')] bg-repeat [background-size:250px_250px]"
                aria-hidden="true"
              ></div>

              <!-- CONTEÚDO DA “JANELA” -->
              <div class="relative flex flex-col">
                <!-- BARRA SUPERIOR ESTILO SAFARI -->
                <div
                  class="relative flex items-center justify-center
                 px-4 md:px-6 pt-3 pb-2
                 bg-gradient-to-b from-[#020A24] via-[#020A24] to-[#020617]
                 border-b border-white/10"
                >
                  <!-- bolinhas estilo macOS (ESQUERDA) -->
                  <div class="absolute left-4 flex items-center gap-1.5">
                    <span class="h-2.5 w-2.5 rounded-full bg-[#FF5F57]"></span>
                    <span class="h-2.5 w-2.5 rounded-full bg-[#FEBB2E]"></span>
                    <span class="h-2.5 w-2.5 rounded-full bg-[#28C840]"></span>
                  </div>

                  <!-- BARRA DE ENDEREÇO CENTRALIZADA -->
                  <div
                    class="flex items-center justify-center
                   px-4 md:px-6 py-1.5
                   rounded-full bg-[#020817] border border-white/15
                   text-[11px] md:text-[12px] text-white/80 tracking-tight
                   shadow-[0_0_0_1px_rgba(15,23,42,0.3)]
                   max-w-[260px] md:max-w-[320px]"
                  >
                    <span class="truncate">
                      app.f10.com.br • Ambiente virtual do aluno
                    </span>
                  </div>
                </div>

                <!-- ÁREA DA TELA / PRINT DO SISTEMA -->
                <div class="relative bg-white">
                  <img
                    src="/financeiro_pagamento_f10.webp"
                    alt="Tela do financeiro do Portal do Aluno F10 com boletos, Pix e situação das parcelas."
                    class="w-full h-auto border border-slate-200 object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
            </figure>
          </div>
        </div>
      </div>

      <!-- Bloco 4: Controle de acesso e bloqueios -->
      <div class="grid gap-8 lg:grid-cols-12 items-start lg:flex-row-reverse">
        <div class="lg:col-span-6 lg:order-2 space-y-4">
          <div
            class="inline-flex items-center gap-2 text-[13px] font-medium text-[#7E82A2]"
          >
            <ShieldCheck class="h-4 w-4 text-[#EA6D0B]" />
            <span>Regras de acesso e segurança</span>
          </div>

          <h3
            class="text-[22px] md:text-[24px] font-semibold text-[#000A57]
                   leading-snug"
          >
            Controle de acesso e bloqueio inteligente de alunos
          </h3>

          <p class="text-[15px] md:text-[16px] leading-[1.9] text-[#000A57]/90">
            A escola define, pelo F10, se o aluno terá acesso completo ao AVA,
            acesso restrito apenas ao financeiro ou bloqueio total, conforme
            regras internas e contratos.
          </p>
          <p class="text-[15px] md:text-[16px] leading-[1.9] text-[#000A57]/80">
            Mesmo em bloqueio, é possível manter menus essenciais, como
            financeiro e contato, conduzindo o aluno à regularização sem perder
            o relacionamento.
          </p>

          <ul
            class="mt-2 text-[14px] md:text-[15px] text-[#000A57]/80 space-y-1.5"
          >
            <li>• Regras de acesso definidas pela própria escola</li>
            <li>• Bloqueio inteligente sem perder o canal de comunicação</li>
          </ul>
        </div>

        <!-- Imagem -->
        <div class="lg:col-span-6 flex justify-end">
          <div class="relative w-full max-w-[690px]">
            <!-- FUNDO CINZA ROTACIONADO -->
            <div
              class="pointer-events-none absolute inset-0 rounded-[32px]
             bg-[#F3F4F6]/50 rotate-[-10deg]"
              aria-hidden="true"
            ></div>

            <figure
              class="relative mx-auto rounded-[24px] overflow-hidden
             shadow-[0_18px_40px_rgba(1,13,40,0.12)]
             bg-[#020617] ring-1 ring-black/5"
            >
              <!-- NOISE DE FUNDO BEM SUTIL -->
              <div
                class="pointer-events-none absolute inset-0 opacity-[0.10] mix-blend-overlay
               bg-[url('/noise.svg')] bg-repeat [background-size:250px_250px]"
                aria-hidden="true"
              ></div>

              <!-- CONTEÚDO DA “JANELA” -->
              <div class="relative flex flex-col">
                <!-- BARRA SUPERIOR ESTILO SAFARI -->
                <div
                  class="relative flex items-center justify-center
                 px-4 md:px-6 pt-3 pb-2
                 bg-gradient-to-b from-[#020A24] via-[#020A24] to-[#020617]
                 border-b border-white/10"
                >
                  <!-- bolinhas estilo macOS (ESQUERDA) -->
                  <div class="absolute left-4 flex items-center gap-1.5">
                    <span class="h-2.5 w-2.5 rounded-full bg-[#FF5F57]"></span>
                    <span class="h-2.5 w-2.5 rounded-full bg-[#FEBB2E]"></span>
                    <span class="h-2.5 w-2.5 rounded-full bg-[#28C840]"></span>
                  </div>

                  <!-- BARRA DE ENDEREÇO CENTRALIZADA -->
                  <div
                    class="flex items-center justify-center
                   px-4 md:px-6 py-1.5
                   rounded-full bg-[#020817] border border-white/15
                   text-[11px] md:text-[12px] text-white/80 tracking-tight
                   shadow-[0_0_0_1px_rgba(15,23,42,0.3)]
                   max-w-[260px] md:max-w-[320px]"
                  >
                    <span class="truncate">
                      app.f10.com.br • Ambiente virtual do aluno
                    </span>
                  </div>
                </div>

                <!-- ÁREA DA TELA / PRINT DO SISTEMA -->
                <div class="relative bg-white">
                  <img
                    src="/pauta_de_chamada_f10_ava.webp"
                    alt="Pauta de chamada e acompanhamento de alunos no AVA F10."
                    class="w-full h-auto object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
            </figure>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ===== AVA + SMART ALUNO ===== -->
<section class="relative py-14 md:py-16 bg-[#F3F4FD]/50">
  <div class="container px-5 md:px-8 lg:px-20">
    <div class="grid gap-10 lg:grid-cols-12 items-center">
      <div class="lg:col-span-6">
        <p class="text-[14px] font-semibold tracking-[0.18em] text-[#7E82A2]">
          ECOSSISTEMA F10
        </p>
        <h2
          class="mt-3 text-[28px] md:text-[34px] font-semibold
                 leading-[1.15] text-[#000A57]"
        >
          AVA para estudar, Smart Aluno para acompanhar o dia a dia
        </h2>
        <p
          class="mt-4 text-[15px] md:text-[16px] leading-[1.8] text-[#000A57]/80"
        >
          O AVA é o ambiente completo de estudo online. O aplicativo Smart Aluno
          é o companheiro de bolso para reforçar o que importa: notificações,
          lembretes, conteúdos, podcasts e financeiro.
        </p>

        <ul class="mt-6 space-y-3 text-[15px] md:text-[16px] text-[#000A57]/90">
          {#each smartAlunoHighlights as highlight}
            <li>
              <strong>{highlight.title}</strong>
              <br />
              <span class="text-[#000A57]/80">
                {highlight.description}
              </span>
            </li>
          {/each}
        </ul>

        <div class="mt-5">
          <a
            href="/solucoes/aplicativo-smart-aluno"
            class="inline-flex items-center rounded-full border
                   border-[#EA6D0B] px-4 py-2 text-[14px] font-semibold
                   text-[#000A57] hover:bg-[#EA6D0B]/10
                   focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
          >
            Conhecer o aplicativo Smart Aluno
          </a>
        </div>
      </div>

      <div class="lg:col-span-6 mt-4 lg:mt-0">
        <div class="relative h-auto overflow-hidden">
          <img
            src="/smart_aluno.webp"
            alt="Telas do aplicativo F10 Smart Aluno em smartphones com conteúdos, notificações, notas e financeiro."
            class="h-full w-full object-cover object-center"
            loading="lazy"
          />
          <div
            class="pointer-events-none absolute inset-0 rounded-[20px] ring-1 ring-inset ring-white/30"
          ></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ===== COMO FUNCIONA NA ROTINA ===== -->
<section class="relative py-14 md:py-16 bg-white">
  <div class="container px-5 md:px-8 lg:px-20">
    <div class="grid gap-10 lg:grid-cols-12 items-start">
      <div class="lg:col-span-5">
        <p class="text-[14px] font-semibold tracking-[0.18em] text-[#7E82A2]">
          COMO FUNCIONA
        </p>
        <h2
          class="mt-3 text-[28px] md:text-[34px] font-semibold
                 leading-[1.15] text-[#000A57]"
        >
          Do F10 ao Portal: EAD pronto para o aluno usar
        </h2>
        <p
          class="mt-4 text-[15px] md:text-[16px] leading-[1.8] text-[#000A57]/80"
        >
          O AVA não é um sistema separado: ele nasce das configurações que você
          já faz no F10 (cursos, turmas, aulas, atividades e contratos).
        </p>
      </div>

      <div class="lg:col-span-7">
        <div class="grid gap-6 md:gap-7">
          {#each steps as step}
            <article
              class="relative rounded-[20px] bg-white px-5 py-5 md:px-6 md:py-6
                     ring-1 ring-[#E5E7EB]"
            >
              <div class="flex gap-4">
                <div
                  class="flex-shrink-0 h-[36px] w-[36px] rounded-full
                         bg-[#EA6D0B] text-white text-[18px] font-bold
                         flex items-center justify-center"
                >
                  {step.label}
                </div>
                <div>
                  <h3
                    class="text-[18px] md:text-[19px] font-semibold
                           text-[#000A57]"
                  >
                    {step.title}
                  </h3>
                  <p
                    class="mt-1.5 text-[14px] md:text-[15px] leading-[1.7]
                           text-[#000A57]/80"
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            </article>
          {/each}
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ===== BENEFÍCIOS E KPIs ===== -->
<section class="relative py-14 md:py-16 bg-[#F3F4FD]/50">
  <div class="container px-5 md:px-8 lg:px-20">
    <div class="grid gap-10 lg:grid-cols-12 items-start">
      <div class="lg:col-span-6">
        <h2
          class="text-[30px] md:text-[36px] lg:text-[40px] font-semibold
                 leading-[1.13] tracking-[-0.015em] text-[#000A57]"
        >
          Benefícios diretos para escola, coordenação e aluno
        </h2>
        <p
          class="mt-4 text-[15px] md:text-[16px] leading-[1.8] text-[#000A57]/80"
        >
          O AVA reduz atrito, organiza o EAD e melhora a percepção de valor da
          escola, principalmente em cursos online.
        </p>

        <ul class="mt-6 space-y-3 text-[15px] md:text-[16px] text-[#000A57]/90">
          {#each benefits as benefit}
            <li>
              <strong>{benefit.title}</strong>
              <br />
              <span class="text-[#000A57]/80">{benefit.description}</span>
            </li>
          {/each}
        </ul>
      </div>

      <div class="lg:col-span-6">
        <KpiPanel
          title="Impacto que o AVA costuma gerar"
          items={kpis}
          footnote="*Estimativas com base em resultados recorrentes de escolas que utilizam o AVA F10 de forma estruturada."
        />
      </div>
    </div>
  </div>
</section>

<!-- ===== FAQ ===== -->
<section class="relative py-12 md:py-16 bg-white/80">
  <div class="container px-5 md:px-8 lg:px-20">
    <div
      class="flex flex-col md:flex-row md:items-center md:justify-between gap-6"
    >
      <div>
        <h2
          class="text-[26px] md:text-[32px] font-semibold leading-tight
                 text-[#000A57]"
        >
          Perguntas frequentes sobre o AVA F10
        </h2>
        <p
          class="mt-2 text-[14px] md:text-[15px] text-[#000A57]/80 max-w-[520px]"
        >
          Como o Portal do Aluno funciona, quais recursos existem para EAD e
          como ele conversa com o restante da plataforma F10.
        </p>
      </div>

      <a
        href="/solucoes"
        class="hidden md:inline-flex items-center rounded-full border
               border-[#EA6D0B] px-4 py-2 text-[14px] font-semibold
               text-[#000A57] hover:bg-[#EA6D0B]/10
               focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
      >
        Ver todas as soluções F10
      </a>
    </div>

    <div class="mt-8">
      <FaqAccordion items={faqItems} />
    </div>

    <div class="mt-6 md:hidden">
      <a
        href="/solucoes"
        class="inline-flex items-center rounded-full border
               border-[#EA6D0B] px-4 py-2 text-[14px] font-semibold
               text-[#000A57] hover:bg-[#EA6D0B]/10
               focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
      >
        Ver todas as soluções F10
      </a>
    </div>
  </div>
</section>

<!-- ===== BLOCO FINAL (CTA) ===== -->
<section class="relative py-12 md:py-16 bg-white/90">
  <div class="container px-5 md:px-8 lg:px-20">
    <div class="grid gap-10 lg:grid-cols-12 items-center">
      <div class="lg:col-span-6 flex flex-col gap-5">
        <h2
          class="text-[#7E82A2] font-medium leading-[1.1] tracking-[-0.01em]
                 text-[32px] md:text-[40px]"
        >
          Seu EAD rodando dentro do F10, não em sistemas soltos
        </h2>

        <p
          class="text-[#000A57] text-[15px] md:text-[16px] leading-[1.8] max-w-[560px]"
        >
          Com o AVA F10, você integra videoaulas, atividades, financeiro e
          contratos em um único ambiente, com subdomínio da escola e visão
          completa para coordenação e direção.
        </p>

        <p class="text-[#000A57]/80 text-[14px] md:text-[15px] max-w-[560px]">
          Somado ao app Smart Aluno, sua escola entrega experiência profissional
          tanto no notebook quanto no celular.
        </p>

        <div class="pt-2">
          <button
            type="button"
            on:click={openAvaPresentationModal}
            class="inline-flex items-center justify-center gap-3 rounded-[999px]
                   bg-[#EA6D0B] px-8 md:px-10 py-4 text-white text-[16px]
                   font-bold transition hover:brightness-110
                   focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
          >
            <span>Agendar apresentação do AVA F10</span>
            <IconArrowRight size={24} />
          </button>
        </div>
      </div>

      <!-- Placeholder imagem final -->
      <div class="lg:col-span-6 mt-4 lg:mt-0">
        <div class="relative h-auto overflow-hidden">
          <img
            src="/video_aula_ava_f10.webp"
            alt="Videoaula do AVA F10 com player e conteúdos organizados em trilhas."
            class="h-full w-full rounded-[20px] ring-1 object-cover object-center"
            loading="lazy"
          />
          <div
            class="pointer-events-none absolute inset-0 rounded-[20px] ring-1 ring-inset ring-white/30"
          ></div>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  /* Mantido o padrão visual e tokens do projeto F10.
     Ajustes finos (cores, espaçamentos, breakpoints) podem ser feitos nas classes utilitárias. */
</style>
