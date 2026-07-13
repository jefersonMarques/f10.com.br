<script lang="ts">
  import {
    AlertTriangle,
    BarChart3,
    CalendarCheck,
    History,
    Image as ImageIcon,
    PhoneCall,
    ShieldCheck,
    Target,
    TrendingUp,
    Users,
    Workflow,
  } from "lucide-svelte";

  const presentationBenefits = [
    {
      label: "Mais organização",
      description: "Processos claros para toda a unidade",
      icon: Target,
      tone: "text-[#ff7900] bg-orange-50 ring-orange-100",
    },
    {
      label: "Mais produtividade",
      description: "Menos tarefas manuais e retrabalho",
      icon: CalendarCheck,
      tone: "text-blue-600 bg-blue-50 ring-blue-100",
    },
    {
      label: "Mais matrículas",
      description: "Nenhuma oportunidade sem acompanhamento",
      icon: TrendingUp,
      tone: "text-emerald-600 bg-emerald-50 ring-emerald-100",
    },
    {
      label: "Mais previsibilidade",
      description: "Indicadores para orientar decisões",
      icon: BarChart3,
      tone: "text-violet-600 bg-violet-50 ring-violet-100",
    },
  ];

  const objectives = [
    {
      title: "Padronizar o método comercial",
      description:
        "Unificar o processo de gestão de leads e atendimentos em toda a rede, com etapas, critérios e responsabilidades claras.",
      icon: Workflow,
      tone: "text-[#ff7900] bg-orange-50 ring-orange-100",
    },
    {
      title: "Reduzir perdas invisíveis",
      description:
        "Garantir que nenhum lead fique sem retorno e que todas as oportunidades sejam acompanhadas até uma definição.",
      icon: Target,
      tone: "text-blue-600 bg-blue-50 ring-blue-100",
    },
    {
      title: "Preservar o histórico",
      description:
        "Centralizar interações, decisões, tarefas e próximos passos para que qualquer pessoa autorizada continue o atendimento.",
      icon: History,
      tone: "text-emerald-600 bg-emerald-50 ring-emerald-100",
    },
    {
      title: "Dar escala à operação",
      description:
        "Permitir crescimento com qualidade, mantendo controle, visibilidade e eficiência em todas as unidades da rede.",
      icon: BarChart3,
      tone: "text-violet-600 bg-violet-50 ring-violet-100",
    },
  ];

  const challenges = [
    {
      number: "01",
      title: "Leads esquecidos",
      description:
        "Leads sem retorno ou sem acompanhamento deixam de avançar e acabam se perdendo ao longo da jornada comercial.",
      icon: AlertTriangle,
      tone: "text-rose-600 bg-rose-50 ring-rose-100",
    },
    {
      number: "02",
      title: "Falta de acompanhamento",
      description:
        "A ausência de follow-ups e tarefas programadas gera oportunidades perdidas e reduz a taxa de conversão.",
      icon: PhoneCall,
      tone: "text-blue-600 bg-blue-50 ring-blue-100",
    },
    {
      number: "03",
      title: "Perda de conhecimento",
      description:
        "Informações ficam concentradas em pessoas e se perdem quando há troca de equipe, férias ou afastamentos.",
      icon: Users,
      tone: "text-emerald-600 bg-emerald-50 ring-emerald-100",
    },
    {
      number: "04",
      title: "Baixa visibilidade dos indicadores",
      description:
        "Sem dados consolidados, fica difícil acompanhar resultados, identificar gargalos e tomar decisões rapidamente.",
      icon: BarChart3,
      tone: "text-violet-600 bg-violet-50 ring-violet-100",
    },
  ];
</script>

<svelte:head>
  <title>Cebrac + F10 | Evolução da gestão comercial da rede</title>
  <meta
    name="description"
    content="Apresentação interna sobre a implantação do CRM de Leads e do WhatsApp integrado ao F10 para as unidades Cebrac."
  />
  <meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />
  <meta name="googlebot" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />
  <meta name="bingbot" content="noindex, nofollow, noarchive, nosnippet" />
</svelte:head>

<div class="min-h-screen overflow-hidden bg-white text-[#071735]">
  <main>
    <section class="relative isolate min-h-[760px] overflow-hidden bg-[#f6f8fc] lg:min-h-screen">
      <div class="pointer-events-none absolute inset-0 -z-10">
        <div class="absolute -left-36 -top-40 h-[520px] w-[520px] rounded-full bg-orange-200/[0.35] blur-3xl"></div>
        <div class="absolute -right-32 top-10 h-[560px] w-[560px] rounded-full bg-blue-200/[0.35] blur-3xl"></div>
        <div class="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white to-transparent"></div>
      </div>

      <div class="mx-auto flex min-h-[760px] max-w-[1320px] flex-col px-5 pb-16 pt-6 sm:px-8 lg:min-h-screen lg:px-12 lg:pb-20 lg:pt-8">
        <div class="flex flex-col gap-5 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex min-w-0 items-center gap-4 sm:gap-6">
            <img src="/logo_f10.svg" alt="F10 Software" class="h-9 w-auto shrink-0 sm:h-11" />
            <span class="h-10 w-px shrink-0 bg-slate-300"></span>
            <div class="min-w-0">
              <p class="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Apresentação interna</p>
              <p class="mt-1 text-sm font-semibold text-[#071735]">Julho de 2026</p>
            </div>
            <span class="hidden rounded-full bg-[#071735] px-4 py-2 text-xs font-extrabold text-white shadow-sm md:inline-flex">
              Implantação CRM + WhatsApp
            </span>
          </div>

          <img src="/cebrac-logo.svg" alt="Cebrac" class="h-14 w-auto self-start object-contain sm:h-[68px] sm:self-auto" />
        </div>

        <div class="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16 lg:py-16">
          <div class="max-w-[640px]">
            <div class="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-blue-800 shadow-sm backdrop-blur">
              <ShieldCheck size={16} strokeWidth={2} />
              Evolução comercial da rede
            </div>

            <h1 class="mt-7 text-[44px] font-black leading-[1.02] tracking-[-0.045em] text-[#071735] sm:text-[56px] lg:text-[66px]">
              Cebrac + <span class="text-[#ff7900]">F10:</span><br />
              uma nova etapa na gestão comercial da rede
            </h1>

            <p class="mt-7 max-w-[590px] text-lg leading-8 text-slate-600 sm:text-xl">
              CRM de Leads e WhatsApp integrado ao F10 para trazer mais organização,
              continuidade, produtividade e matrículas para todas as unidades.
            </p>

            <div class="mt-9 grid gap-3 sm:grid-cols-2">
              {#each presentationBenefits as item}
                <article class="flex min-h-[90px] items-center gap-4 rounded-[20px] border border-white/90 bg-white/[0.85] p-4 shadow-[0_18px_50px_-38px_rgba(7,23,53,0.5)] backdrop-blur">
                  <span class={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${item.tone}`}>
                    <svelte:component this={item.icon} size={23} strokeWidth={2} />
                  </span>
                  <div>
                    <h2 class="text-sm font-black text-[#071735]">{item.label}</h2>
                    <p class="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
                  </div>
                </article>
              {/each}
            </div>
          </div>

          <div class="relative">
            <div class="absolute -inset-5 -z-10 rounded-[42px] bg-gradient-to-br from-white/80 to-blue-100/50 blur-xl"></div>
            <div class="flex aspect-[14/10] min-h-[420px] items-center justify-center overflow-hidden rounded-[34px] border border-slate-300/90 bg-gradient-to-br from-slate-100 via-white to-slate-200 p-8 text-center shadow-[0_35px_90px_-45px_rgba(7,23,53,0.5)] lg:min-h-[540px]">
              <div class="max-w-[360px] text-slate-500">
                <span class="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-slate-300 bg-white/70 text-slate-400 shadow-sm">
                  <ImageIcon size={30} strokeWidth={1.5} />
                </span>
                <p class="mt-6 text-base font-black text-slate-600">Imagem principal: CRM no notebook + WhatsApp no celular</p>
                <p class="mt-2 text-sm">Tamanho recomendado: 1400 × 900 px</p>
                <p class="mt-1 text-xs">Fundo transparente ou claro</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="relative min-h-[720px] bg-white">
      <div class="mx-auto flex min-h-[720px] max-w-[1320px] flex-col justify-center px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
        <div class="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div>
            <div class="flex items-center gap-4">
              <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#071735] text-lg font-black text-white shadow-lg">01</span>
              <p class="text-sm font-black uppercase tracking-[0.2em] text-[#ff7900]">Objetivo da implantação</p>
            </div>
            <h2 class="mt-6 max-w-[570px] text-3xl font-black leading-tight tracking-[-0.035em] sm:text-4xl lg:text-[48px]">
              Organizar o método comercial para que nenhuma oportunidade se perca
            </h2>
          </div>

          <div class="lg:justify-self-end">
            <p class="max-w-[650px] text-lg leading-8 text-slate-600">
              Esta apresentação esclarece o que está sendo implantado e mostra como a nova rotina
              funcionará nas unidades, com processos mais claros, histórico preservado e gestão baseada em dados.
            </p>
            <div class="mt-6 rounded-[22px] border border-blue-100 bg-blue-50/70 px-6 py-5">
              <p class="text-sm font-bold leading-7 text-[#071735]">
                O CRM não substitui o trabalho comercial. Ele organiza o método, registra o histórico
                e garante que cada oportunidade seja acompanhada até a matrícula.
              </p>
            </div>
          </div>
        </div>

        <div class="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {#each objectives as item}
            <article class="group min-h-[270px] rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_24px_65px_-48px_rgba(7,23,53,0.55)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_75px_-48px_rgba(7,23,53,0.6)]">
              <div class={`flex h-14 w-14 items-center justify-center rounded-[18px] ring-1 ${item.tone}`}>
                <svelte:component this={item.icon} size={27} strokeWidth={1.9} />
              </div>
              <h3 class="mt-6 text-xl font-black leading-7 tracking-[-0.02em] text-[#071735]">{item.title}</h3>
              <p class="mt-4 text-sm leading-7 text-slate-600">{item.description}</p>
            </article>
          {/each}
        </div>
      </div>
    </section>

    <section class="relative min-h-[700px] overflow-hidden border-y border-slate-200 bg-[#f6f8fc]">
      <div class="pointer-events-none absolute -right-28 top-20 h-80 w-80 rounded-full bg-blue-200/30 blur-3xl"></div>
      <div class="pointer-events-none absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-orange-200/25 blur-3xl"></div>

      <div class="relative mx-auto flex min-h-[700px] max-w-[1320px] flex-col justify-center px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
        <div class="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
          <div>
            <div class="flex items-center gap-4">
              <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff7900] text-lg font-black text-white shadow-lg">02</span>
              <p class="text-sm font-black uppercase tracking-[0.2em] text-[#ff7900]">Desafios que serão resolvidos</p>
            </div>
            <h2 class="mt-6 max-w-[620px] text-3xl font-black leading-tight tracking-[-0.035em] sm:text-4xl lg:text-[48px]">
              O problema não é apenas captar leads. É garantir continuidade no atendimento.
            </h2>
          </div>

          <p class="max-w-[650px] text-lg leading-8 text-slate-600 lg:justify-self-end">
            Sem processo, registro e acompanhamento, parte do investimento em captação se perde antes
            mesmo de a oportunidade chegar à matrícula.
          </p>
        </div>

        <div class="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {#each challenges as item}
            <article class="relative min-h-[290px] overflow-hidden rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_24px_65px_-48px_rgba(7,23,53,0.55)]">
              <span class="absolute right-6 top-5 text-5xl font-black tracking-[-0.06em] text-slate-100">{item.number}</span>
              <div class={`relative flex h-14 w-14 items-center justify-center rounded-[18px] ring-1 ${item.tone}`}>
                <svelte:component this={item.icon} size={27} strokeWidth={1.9} />
              </div>
              <h3 class="relative mt-6 text-xl font-black leading-7 tracking-[-0.02em] text-[#071735]">{item.title}</h3>
              <p class="relative mt-4 text-sm leading-7 text-slate-600">{item.description}</p>
            </article>
          {/each}
        </div>
      </div>
    </section>
  </main>
</div>
