<script lang="ts">
    import IconArrowRight from "$lib/icons/IconArrowRight.svelte";
    import FaqAccordion from "$lib/components/FaqAccordion.svelte";
    import { ExternalLink } from "lucide-svelte";
    import ComparisonPlans from "$lib/components/ComparisonPlans.svelte";
    import Plans from "$lib/components/Plans.svelte";
    import Testimonial from "$lib/components/Testimonial.svelte";

    type FaqItem = {
        question: string;
        answer: string;
    };

    const faqItems: FaqItem[] = [
        {
            question: "Os valores são por aluno, por usuário ou por unidade?",
            answer: "A cobrança é por unidade escolar. Você tem faixas confortáveis de alunos e usuários internos incluídos em cada plano, sem cobrança por login a cada novo colaborador. Para redes com várias unidades, avaliamos um formato específico no contato comercial.",
        },
        {
            question: "Os módulos precisam ser contratados separados?",
            answer: "Não. No F10 os módulos são integrados de forma nativa. Dependendo do plano, você já terá Marketing, Comercial/CRM, Pedagógico, Financeiro, Indicadores e App juntos, sem precisar montar um quebra-cabeça de sistemas soltos.",
        },
        {
            question: "Consigo começar pequeno e depois migrar de plano?",
            answer: "Sim. Muitas escolas começam em um plano mais enxuto e, conforme o volume de leads, campanhas e unidades cresce, migram para planos com mais automações e relatórios. A troca de plano é simples e feita sem perder histórico de alunos, matrículas ou atendimentos.",
        },
        {
            question: "Qual é o prazo de contrato?",
            answer: "Trabalhamos com planos mensais e anuais. No mensal, não há fidelidade: você pode pausar quando precisar. No anual, você garante desconto e um acompanhamento mais próximo na implantação para acelerar resultados em matrículas e gestão.",
        },
        {
            question: "Existe taxa de implantação?",
            answer: "Para a maioria dos planos existe uma taxa única de implantação, que cobre configuração inicial, importação de dados essenciais e desenho dos funis de atendimento e matrículas. Em projetos menores, podemos reduzir ou até zerar essa taxa; em redes maiores, o valor é ajustado ao nível de complexidade.",
        },
        {
            question: "Vocês ajudam a configurar e treinar a equipe?",
            answer: "Sim. A implantação inclui configuração inicial do ambiente, perfis de usuários, funis de atendimento e exemplos práticos adaptados à sua escola. Depois disso, você conta com suporte contínuo para ajustes, novas campanhas e dúvidas do dia a dia, sem custo extra por chamada.",
        },
    ];
</script>

<svelte:head>
    <title>Planos e preços — Marketing e CRM educacional | F10 Software</title>
    <meta
        name="description"
        content="Compare os planos da F10 para marketing, captação de alunos e CRM educacional. Escolha o plano ideal para a sua escola e tenha previsibilidade de matrículas com funis organizados e indicadores de conversão."
    />
    <link rel="canonical" href="https://f10.com.br/precos" />
</svelte:head>

<!-- HERO / TOGGLE -->
<section
    class="relative overflow-hidden border-b border-slate-200 bg-white/80"
    aria-label="Planos e preços F10"
>
    <div class="container relative z-10 py-16 md:py-20 lg:py-24">
        <div class="mx-auto text-center">
            <p
                class="text-[12px] md:text-[13px] font-semibold tracking-[0.18em] text-[#7E82A2] uppercase"
            >
                PLANOS SIMPLES E TRANSPARENTES
            </p>
            <h1
                class="mt-3 text-[28px] md:text-[36px] lg:text-[42px] font-semibold leading-tight tracking-[-0.04em] text-[#010D28]"
            >
                Escolha o plano certo para
                <span class="text-primary">prever matrículas</span>, não só
                cliques.
            </h1>
            <p
                class="mt-4 text-[14px] md:text-[16px] leading-relaxed text-[#4B5563] max-w-3xl mx-auto"
            >
                Todos os planos conectam campanhas ao funil de vendas
                educacional. O que muda é o nível de automação, relatórios e
                acompanhamento que a sua escola precisa no dia a dia.
            </p>
        </div>

        <!-- aqui entram toggle + cards + enterprise -->
        <Plans />
    </div>
</section>

<ComparisonPlans />
<section
    class="relative py-12 md:py-14 bg-white"
    aria-label="Falar com a equipe F10 sobre planos"
>
    <div class="container">
        <div class="flex justify-center">
            <article
                class="relative w-full rounded-3xl bg-[#010D28] px-6 py-8 md:px-10 md:py-9 text-center text-white border border-slate-900/70 shadow-[0_18px_40px_rgba(1,13,40,0.35)] overflow-hidden"
            >
                <!-- Fundo com textura -->
                <div
                    class="pointer-events-none absolute inset-0 bg-[url('/booble_bg.webp')] bg-cover bg-center opacity-40"
                    aria-hidden="true"
                ></div>

                <!-- Overlay leve pra reforçar contraste -->
                <div
                    class="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#010D28]/90 via-[#010D28]/85 to-[#010D28]/92"
                    aria-hidden="true"
                ></div>

                <!-- Conteúdo -->
                <div class="relative z-10">
                    <h2
                        class="text-[20px] md:text-[22px] font-semibold leading-snug"
                    >
                        Ainda não encontrou um plano com a cara da sua escola?
                    </h2>
                    <p
                        class="mt-3 text-[14px] md:text-[15px] text-slate-100/90 max-w-3xl mx-auto"
                    >
                        Se você precisa de algo mais enxuto — nossa equipe pode
                        montar uma proposta alinhada à sua realidade, sem
                        complicação.
                    </p>

                    <div class="mt-6 flex justify-center">
                        <a
                            href="/contato"
                            class="inline-flex items-center justify-center gap-2 rounded-full bg-[#EA6D0B] px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm hover:bg-[#EA6D0B]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA6D0B]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#010D28] transition"
                        >
                            Falar com um especialista
                            <IconArrowRight size={20} />
                        </a>
                    </div>
                </div>
            </article>
        </div>
    </div>
</section>

<!-- FAQ -->
<section
    class="relative py-16 md:py-20 bg-white"
    aria-label="Perguntas frequentes sobre planos e preços"
>
    <div class="container">
        <div
            class="flex flex-col md:flex-row md:items-center md:justify-between gap-6"
        >
            <div>
                <h2
                    class="text-[24px] md:text-[30px] font-semibold leading-tight text-[#010D28]"
                >
                    Perguntas frequentes sobre
                    <span class="text-primary">planos e contratação</span>.
                </h2>
                <p
                    class="mt-2 text-[14px] md:text-[15px] text-[#4B5563] max-w-[520px]"
                >
                    Respondemos as dúvidas mais comuns de gestores e times
                    comerciais antes de começar a usar o F10 no dia a dia.
                </p>
            </div>
            <div class="hidden md:block text-[13px] text-[#6B7280] max-w-xs">
                Precisa de algo fora da tabela? Na conversa comercial avaliamos
                modelos especiais para redes, franquias e grupos educacionais.
            </div>
        </div>

        <div class="mt-8">
            <FaqAccordion items={faqItems} />
        </div>
    </div>
</section>

<!-- CARD: PERGUNTE PARA UMA IA -->
<section
    class="relative py-16 md:py-20 bg-white"
    aria-label="Use uma IA para avaliar os planos F10"
>
    <div class="container">
        <article
            class="relative overflow-hidden rounded-3xl border border-slate-200 bg-[#010D28] px-6 py-8 md:px-10 md:py-10 text-white"
        >
            <div
                class="pointer-events-none absolute inset-0 opacity-[0.3]"
                aria-hidden="true"
            >
                <div
                    class="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(234,109,11,0.55),transparent_65%)]"
                ></div>
            </div>

            <div
                class="relative z-10 grid gap-8 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-center"
            >
                <div>
                    <p
                        class="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase"
                    >
                        TIRE A PROVA
                    </p>
                    <h2
                        class="mt-3 text-[24px] md:text-[30px] font-semibold leading-tight"
                    >
                        Peça para uma IA analisar os planos<br
                            class="hidden md:block"
                        />
                        <span class="text-primary">usando esta página.</span>
                    </h2>
                    <p
                        class="mt-3 text-[14px] md:text-[15px] text-slate-100 max-w-xl"
                    >
                        Se você já utiliza ferramentas de IA no dia a dia, pode
                        enviar esta página para elas e pedir uma análise
                        imparcial. Preparamos alguns atalhos para você testar.
                    </p>
                    <p class="mt-2 text-[12px] text-slate-200/90">
                        Dica: depois de abrir o link, substitua a URL pelo
                        endereço da sua proposta ou da página de preços da sua
                        escola para comparar.
                    </p>
                </div>

                <div class="space-y-3">
                    <!-- IMPORTANTE: troque a URL "https://f10.com.br/precos" depois que a página estiver publicada -->
                    <a
                        href="https://chatgpt.com/?prompt=Usando+esta+p%C3%A1gina%2C+me+diga+por+que+o+F10+%C3%A9+uma+boa+escolha+para+o+meu+col%C3%A9gio%3A+https%3A%2F%2Ff10.com.br%2Fprecos"
                        target="_blank"
                        class="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-[14px] hover:bg-white/15"
                    >
                        <div class="flex items-center gap-3">
                            <span
                                class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10"
                            >
                                <svg
                                    width="24px"
                                    height="24px"
                                    fill="white"
                                    viewBox="0 0 24 24"
                                    role="img"
                                    xmlns="http://www.w3.org/2000/svg"
                                    ><title>OpenAI icon</title><path
                                        d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"
                                    /></svg
                                >
                            </span>
                            <div class="text-left">
                                <p class="font-semibold">
                                    Perguntar no ChatGPT
                                </p>
                                <p class="text-[12px] text-slate-100/90">
                                    “Usando esta página, me diga por que o F10 é
                                    uma boa escolha para o meu colégio.”
                                </p>
                            </div>
                        </div>
                        <ExternalLink
                            size={18}
                            class="hidden md:inline-block text-slate-200"
                        />
                    </a>

                    <a
                        href="https://www.perplexity.ai/search/new?q=usando-esta-pagina-me-diga-por-que-o-F10-e-uma-boa-escolha-para-a-minha-escola-https-f10-com-br-precos"
                        target="_blank"
                        class="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-[14px] hover:bg-white/15"
                    >
                        <div class="flex items-center gap-3">
                            <span
                                class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10"
                            >
                                <svg
                                    class="p-1"
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="32"
                                    height="32"
                                    viewBox="0 0 24 24"
                                    ><path
                                        fill="white"
                                        d="M22.398 7.09h-2.31V.068l-7.51 6.354V.158h-1.156v6.196L4.49 0v7.09H1.602v10.397H4.49V24l6.933-6.36v6.201h1.155v-6.047l6.932 6.181v-6.488h2.888zm-3.466-4.531v4.53h-5.355zm-13.286.067l4.869 4.464h-4.87zM2.758 16.332V8.245h7.847L4.49 14.36v1.972zm2.888 5.04v-6.534l5.776-5.776v7.011zm12.708.025l-5.776-5.15V9.061l5.776 5.776zm2.889-5.065H19.51V14.36l-6.115-6.115h7.848z"
                                    /></svg
                                >
                            </span>
                            <div class="text-left">
                                <p class="font-semibold">
                                    Perguntar no Perplexity
                                </p>
                                <p class="text-[12px] text-slate-100/90">
                                    Envie a página de preços e peça uma
                                    comparação com outras soluções.
                                </p>
                            </div>
                        </div>
                        <ExternalLink
                            size={18}
                            class="hidden md:inline-block text-slate-200"
                        />
                    </a>

                    <a
                        href="https://claude.ai/new?q=usando-esta-pagina-me-diga-por-que-o-F10-e-uma-boa-escolha-para-a-minha-escola-https-f10-com-br-precos"
                        target="_blank"
                        rel="noreferrer"
                        class="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-[14px] hover:bg-white/15"
                    >
                        <div class="flex items-center gap-3">
                            <span
                                class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10"
                            >
                                <svg
                                    class="p-1"
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="32"
                                    height="32"
                                    viewBox="0 0 24 24"
                                    ><path
                                        fill="white"
                                        d="m4.714 15.956l4.718-2.648l.079-.23l-.08-.128h-.23l-.79-.048l-2.695-.073l-2.337-.097l-2.265-.122l-.57-.121l-.535-.704l.055-.353l.48-.321l.685.06l1.518.104l2.277.157l1.651.098l2.447.255h.389l.054-.158l-.133-.097l-.103-.098l-2.356-1.596l-2.55-1.688l-1.336-.972l-.722-.491L2 6.223l-.158-1.008l.656-.722l.88.06l.224.061l.893.686l1.906 1.476l2.49 1.833l.364.304l.146-.104l.018-.072l-.164-.274l-1.354-2.446l-1.445-2.49l-.644-1.032l-.17-.619a3 3 0 0 1-.103-.729L6.287.133L6.7 0l.995.134l.42.364l.619 1.415L9.735 4.14l1.555 3.03l.455.898l.243.832l.09.255h.159V9.01l.127-1.706l.237-2.095l.23-2.695l.08-.76l.376-.91l.747-.492l.583.28l.48.685l-.067.444l-.286 1.851l-.558 2.903l-.365 1.942h.213l.243-.242l.983-1.306l1.652-2.064l.728-.82l.85-.904l.547-.431h1.032l.759 1.129l-.34 1.166l-1.063 1.347l-.88 1.142l-1.263 1.7l-.79 1.36l.074.11l.188-.02l2.853-.606l1.542-.28l1.84-.315l.832.388l.09.395l-.327.807l-1.967.486l-2.307.462l-3.436.813l-.043.03l.049.061l1.548.146l.662.036h1.62l3.018.225l.79.522l.473.638l-.08.485l-1.213.62l-1.64-.389l-3.825-.91l-1.31-.329h-.183v.11l1.093 1.068l2.003 1.81l2.508 2.33l.127.578l-.321.455l-.34-.049l-2.204-1.657l-.85-.747l-1.925-1.62h-.127v.17l.443.649l2.343 3.521l.122 1.08l-.17.353l-.607.213l-.668-.122l-1.372-1.924l-1.415-2.168l-1.141-1.943l-.14.08l-.674 7.254l-.316.37l-.728.28l-.607-.461l-.322-.747l.322-1.476l.388-1.924l.316-1.53l.285-1.9l.17-.632l-.012-.042l-.14.018l-1.432 1.967l-2.18 2.945l-1.724 1.845l-.413.164l-.716-.37l.066-.662l.401-.589l2.386-3.036l1.439-1.882l.929-1.086l-.006-.158h-.055L4.138 18.56l-1.13.146l-.485-.456l.06-.746l.231-.243l1.907-1.312Z"
                                    /></svg
                                >
                            </span>
                            <div class="text-left">
                                <p class="font-semibold">Claude AI</p>
                                <p class="text-[12px] text-slate-100/90">
                                    Cole o link desta página e peça um resumo
                                    dos pontos fortes e fracos.
                                </p>
                            </div>
                        </div>
                        <ExternalLink
                            size={18}
                            class="hidden md:inline-block text-slate-200"
                        />
                    </a>
                </div>
            </div>
        </article>
    </div>
</section>

<section class="container pb-12">
    <Testimonial />
</section>

