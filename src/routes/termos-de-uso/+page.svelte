<script lang="ts">
    import Breadcrumb from "$lib/components/Breadcrumb.svelte";
    import { onMount } from "svelte";

    type MenuItem = {
        id: string;
        label: string;
    };

    const menuItems: MenuItem[] = [
        { id: "termos-uso", label: "Introdução · Termos de Uso" },
        { id: "aceite-termos", label: "Aceite dos Termos" },
        { id: "propriedade-intelectual", label: "1. Propriedade Intelectual" },
        { id: "declaracoes-licenciado", label: "2. Declarações do Licenciado" },
        { id: "licenca-uso-software", label: "3. Licença de Uso do Software" },
        { id: "restricoes", label: "4. Restrições" },
        { id: "prazo", label: "5. Prazo" },
        {
            id: "remuneracao-forma-pagamento",
            label: "6. Remuneração e Forma de Pagamento",
        },
        {
            id: "restituicao-informacoes",
            label: "7. Restituição das Informações",
        },
        {
            id: "obrigacoes-licenciado",
            label: "8. Obrigações do Licenciado",
        },
        {
            id: "obrigacoes-licenciante",
            label: "9. Obrigações do Licenciante",
        },
        { id: "nivel-servico", label: "10. Nível de Serviço" },
        {
            id: "isenção-responsabilidade-licenciante",
            label: "11. Isenção de Responsabilidade",
        },
        { id: "retomada-softwares", label: "12. Retomada dos Softwares" },
        { id: "garantias-limitadas", label: "13. Garantias Limitadas" },
        {
            id: "limitacao-responsabilidade",
            label: "14. Limitação de Responsabilidade",
        },
        { id: "rescisao", label: "15. Rescisão" },
        { id: "disposicoes-legais", label: "16. Disposições Legais" },
        { id: "lei-aplicavel", label: "17. Lei Aplicável" },
        { id: "definicoes", label: "18. Definições" },
        { id: "politica-privacidade", label: "19. Política de Privacidade" },
        { id: "lgpd-servicos", label: "20. LGPD" },
    ];

    let activeSectionId: string = menuItems[0].id;

    function handleMenuClick(id: string) {
        const target = document.getElementById(id);
        if (!target) return;

        const offset = 96; // ajuste conforme altura do header global

        const top =
            target.getBoundingClientRect().top + window.scrollY - offset;

        window.scrollTo({
            top,
            behavior: "smooth",
        });

        activeSectionId = id;
    }

    onMount(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        activeSectionId = entry.target.id;
                    }
                });
            },
            {
                root: null,
                threshold: 0.2,
                rootMargin: "-40% 0px -40% 0px",
            },
        );

        menuItems.forEach((item) => {
            const el = document.getElementById(item.id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    });
</script>

<section class="bg-white/60 pt-4 pb-16">
    <div>
        <Breadcrumb
            baseUrl="https://f10.com.br"
            items={[{ label: "INÍCIO", href: "/" }, { label: "TERMOS DE USO" }]}
        />
    </div>

    <!-- BREADCRUMB + TÍTULO -->
    <header class="container mb-8 md:mb-12 space-y-3">
        <div class="space-y-2">
            <h1
                class="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900"
            >
                Termos de Uso, Política de Privacidade e LGPD
            </h1>
            <p class="max-w-2xl text-sm md:text-[15px] text-slate-600">
                Este documento define as condições legais para utilização do
                F10, incluindo licenciamento de software, tratamento de dados,
                política de privacidade e observância à legislação vigente.
            </p>
        </div>
    </header>

    <div
        class="grid gap-8 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] lg:gap-10 container"
    >
        <!-- MENU LATERAL -->
        <aside class="md:sticky md:top-24 self-start">
            <div
                class="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-sm shadow-sm"
            >
                <div class="border-b border-slate-100 px-4 py-3">
                    <p
                        class="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500"
                    >
                        Navegação rápida
                    </p>
                    <p class="mt-1 text-[13px] text-slate-600">
                        Acesse diretamente cada cláusula dos Termos de Uso do
                        F10.
                    </p>
                </div>

                <nav
                    class="max-h-[70vh] space-y-0.5 overflow-y-auto px-2 py-3 text-sm"
                >
                    {#each menuItems as item}
                        <button
                            type="button"
                            class={`group flex w-full items-center gap-2 rounded-xl px-3.5 py-2.5 text-left transition ${
                                activeSectionId === item.id
                                    ? "bg-[#010D28] text-white shadow-sm"
                                    : "text-slate-600 hover:bg-slate-100"
                            }`}
                            on:click={() => handleMenuClick(item.id)}
                            aria-current={activeSectionId === item.id
                                ? "true"
                                : "false"}
                        >
                            <span
                                class={`h-1.5 w-1.5 rounded-full ${
                                    activeSectionId === item.id
                                        ? "bg-emerald-300"
                                        : "bg-slate-300 group-hover:bg-emerald-400"
                                }`}
                            />
                            <span
                                class="line-clamp-2 text-[12px] md:text-[13px]"
                            >
                                {item.label}
                            </span>
                        </button>
                    {/each}
                </nav>
            </div>
        </aside>

        <!-- Conteúdo principal -->
        <article
            class="bg-white/95 rounded-3xl border border-slate-200 shadow-[0_18px_45px_rgba(15,23,42,0.06)] px-5 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10 space-y-8"
        >
            <!-- Bloco inicial: Termos de Uso + texto introdutório -->
            <section id="termos-uso" class="space-y-3">
                <h2
                    class="text-[18px] md:text-[20px] font-semibold text-[#010D28]"
                >
                    Termos de Uso
                </h2>
                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    Estes são os termos que determinarão nossa relação. Antes de
                    utilizar o F10, é necessário que você leia, entenda e
                    concorde com estes termos.
                </p>
            </section>

            <!--  Aceite dos Termos -->
            <section id="aceite-termos" class="scroll-mt-28 space-y-4">
                <h2
                    class="text-[18px] md:text-[20px] font-semibold text-[#010D28]"
                >
                    Aceite dos Termos
                </h2>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    Este Contrato de Licença de Usuário Final (“EULA”) é um
                    acordo legal entre o licenciado (pessoa física ou jurídica)
                    (o “LICENCIADO”) e a F10 Comércio de Computadores de
                    Softwares Ltda, pessoa jurídica de direito privado, inscrita
                    no CNPJ sob n. 06.027.705/0001-89, com sede na R. Comendador
                    Araújo, 143 – Sala 31, 80420-900 na cidade de Curitiba – PR
                    – Brasil, (a “LICENCIANTE”) para uso do programa de
                    computador denominado F10, disponibilizado neste ato pela
                    LICENCIANTE (o “SOFTWARE”) por meio do site “www.f10.com.br”
                    (“Site”), pelo determinado pelo LICENCIADO no ato do
                    licenciamento do SOFTWARE, compreendendo o programa de
                    computador e podendo incluir os meios físicos associados,
                    bem como quaisquer materiais impressos e qualquer
                    documentação online ou eletrônica. Ao utilizar o SOFTWARE,
                    mesmo que parcialmente ou a título de teste, o LICENCIADO
                    estará vinculado aos termos deste EULA, concordando com suas
                    disposições, principalmente com relação ao CONSENTIMENTO
                    PARA o ACESSO, COLETA, USO, ARMAZENAMENTO, TRATAMENTO E
                    TÉCNICAS DE PROTEÇÃO ÀS INFORMAÇÕES do LICENCIADO pela
                    LICENCIANTE, necessárias para a integral execução das
                    funcionalidades ofertadas pelo SOFTWARE. Em caso de
                    discordância com os termos aqui apresentados, a utilização
                    do SOFTWARE deve ser imediatamente interrompida pelo
                    LICENCIADO.
                </p>

                <div
                    class="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 md:px-5 md:py-3.5"
                >
                    <p
                        class="text-[13px] md:text-[14px] text-amber-900 leading-relaxed"
                    >
                        Em resumo, nossa sede fica na cidade de Curitiba no
                        Paraná e ao usar o F10 você concorda com os termos
                        estabelecidos neste instrumento para a utilização de
                        nosso produto F10.
                    </p>
                </div>
            </section>

            <div
                class="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"
            />

            <!-- 1. Da Propriedade Intelectual -->
            <section
                id="propriedade-intelectual"
                class="scroll-mt-28 space-y-4"
            >
                <h2
                    class="text-[18px] md:text-[20px] font-semibold text-[#010D28]"
                >
                    1. Da Propriedade Intelectual
                </h2>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    O LICENCIADO não adquire, pelo presente instrumento ou pela
                    utilização do SOFTWARE, nenhum direito de propriedade
                    intelectual ou outros direitos exclusivos, incluindo
                    patentes, desenhos, marcas, direitos autorais ou quaisquer
                    direitos sobre informações confidenciais ou segredos de
                    negócio, bem como todo o conteúdo disponibilizado no Site,
                    incluindo, mas não se limitando a textos, gráficos, imagens,
                    logotipos, ícones, fotografias, conteúdo editorial,
                    notificações, softwares e qualquer outro material, sobre ou
                    relacionados ao SOFTWARE ou nenhuma parte dele. O LICENCIADO
                    também não adquire nenhum direito sobre ou relacionado ao
                    SOFTWARE ou qualquer componente dele, além dos direitos
                    expressamente licenciados ao LICENCIADO sob o presente EULA
                    ou em qualquer outro contrato mutuamente acordado por
                    escrito entre o LICENCIADO e a LICENCIANTE. Quaisquer
                    direitos não expressamente concedidos sob o presente
                    instrumento são reservados. Também será de propriedade
                    exclusiva da LICENCIANTE ou está devidamente licenciado,
                    todo o conteúdo disponibilizado no Site, incluindo, mas não
                    se limitando a, textos, gráficos, imagens, logos, ícones,
                    fotografias, conteúdo editorial, notificações, softwares e
                    qualquer outro material.
                </p>

                <div
                    class="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 md:px-5 md:py-3.5"
                >
                    <p
                        class="text-[13px] md:text-[14px] text-amber-900 leading-relaxed"
                    >
                        Em resumo, a propriedade do produto F10 é da empresa F10
                        que licencia o direito de você usá-lo para ajudá-lo a
                        gerir a sua empresa.
                    </p>
                </div>
            </section>

            <div
                class="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"
            />

            <!-- 2. Declarações do LICENCIADO -->
            <section id="declaracoes-licenciado" class="scroll-mt-28 space-y-4">
                <h2
                    class="text-[18px] md:text-[20px] font-semibold text-[#010D28]"
                >
                    2. Declarações do LICENCIADO
                </h2>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    O LICENCIADO declara ter pleno conhecimento dos direitos e
                    obrigações decorrentes do presente EULA, constituindo este
                    instrumento o acordo completo entre as partes. Declara,
                    ainda, ter lido, compreendido e aceito todos os seus termos
                    e condições. O LICENCIADO declara que foi devidamente
                    informado da política de confidencialidade e ambientes de
                    proteção de informações confidenciais, dados pessoais e
                    registros de acesso da LICENCIANTE, consentindo livre e
                    expressamente às ações de coleta, uso, armazenamento e
                    tratamento das referidas informações e dados. O LICENCIADO
                    declara estar ciente de que as operações que correspondam à
                    aceitação do presente EULA, de determinadas condições e
                    opções, bem como eventual rescisão do presente instrumento e
                    demais alterações, serão registradas nos bancos de dados da
                    LICENCIANTE, juntamente com a data e hora em que foram
                    realizadas pelo LICENCIADO, podendo tais informações serem
                    utilizadas como prova pelas partes, independentemente do
                    cumprimento de qualquer outra formalidade. O LICENCIADO
                    declara ainda que está ciente de que para usufruir de
                    algumas das funcionalidades do SOFTWARE, em especial, dos
                    serviços de integração com a rede bancária, deverá
                    disponibilizar à LICENCIANTE as INFORMAÇÕES DE CONTA para
                    que o SOFTWARE, de maneira automatizada, colete informações
                    diretamente nos sites e/ou outros meios virtuais
                    disponibilizados pelas instituições financeiras, com as
                    quais mantenha relacionamento, agindo a LICENCIANTE, neste
                    caso, como representante e mandatária do LICENCIADO nestes
                    atos.
                </p>

                <div
                    class="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 md:px-5 md:py-3.5"
                >
                    <p
                        class="text-[13px] md:text-[14px] text-amber-900 leading-relaxed"
                    >
                        Em resumo, aceitando os termos deste instrumento você
                        concorda com todas as suas cláusulas e reconhece que
                        seus dados e informações serão coletados pelo
                        LICENCIANTE e sempre tratados com confidencialidade.
                        Você compartilhará conosco certas informações
                        específicas e que são necessárias para proporcionarmos,
                        por meio de funcionalidades automáticas, a melhor
                        experiência F10 para você, nosso cliente.
                    </p>
                </div>
            </section>

            <div
                class="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"
            />

            <!-- 3. Licença de Uso do Software -->
            <section id="licenca-uso-software" class="scroll-mt-28 space-y-4">
                <h2
                    class="text-[18px] md:text-[20px] font-semibold text-[#010D28]"
                >
                    3. Licença de Uso do Software
                </h2>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    Sujeito aos termos e condições aqui estabelecidos, este EULA
                    concede ao LICENCIADO uma licença revogável, não exclusiva e
                    intransferível para uso do SOFTWARE. O LICENCIADO não poderá
                    utilizar e nem permitir que o SOFTWARE seja utilizado para
                    outra finalidade que não seja o processamento de suas
                    informações ou de pessoas jurídicas indicadas pelo
                    LICENCIADO no ato do cadastramento, exceto caso o LICENCIADO
                    seja empresa de contabilidade que utiliza o SOFTWARE para
                    processar informações de seus clientes, observados os
                    limites estabelecidos neste EULA. Esta licença não implica a
                    capacidade de acessar outros softwares além daqueles
                    originalmente localizados no SOFTWARE. Em nenhuma hipótese o
                    LICENCIADO terá acesso ao código fonte do SOFTWARE ora
                    licenciado, por este se tratar de propriedade intelectual da
                    LICENCIANTE.
                </p>

                <div
                    class="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 md:px-5 md:py-3.5"
                >
                    <p
                        class="text-[13px] md:text-[14px] text-amber-900 leading-relaxed"
                    >
                        Em resumo, nós poderemos celebrar o mesmo contrato com
                        inúmeras pessoas. Nós vamos disponibilizar para você
                        todas as funcionalidades adquiridas no ato da
                        contratação.
                    </p>
                </div>
            </section>

            <div
                class="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"
            />

            <!-- 4. Das Restrições -->
            <section id="restricoes" class="scroll-mt-28 space-y-4">
                <h2
                    class="text-[18px] md:text-[20px] font-semibold text-[#010D28]"
                >
                    4. Das Restrições
                </h2>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    Em hipótese alguma é permitido ao LICENCIADO ou a terceiros,
                    de forma geral: Copiar, ceder, sublicenciar, vender, dar em
                    locação ou em garantia, reproduzir, doar, alienar de
                    qualquer forma, transferir total ou parcialmente, sob
                    quaisquer modalidades, gratuita ou onerosamente, provisória
                    ou permanentemente, o SOFTWARE objeto deste EULA, assim como
                    seus módulos, partes, manuais ou quaisquer informações a ele
                    relativas; Retirar ou alterar, total ou parcialmente, os
                    avisos de reserva de direito existente no SOFTWARE e na
                    documentação; Praticar engenharia reversa, descompilação ou
                    desmontagem do SOFTWARE.
                </p>

                <div
                    class="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 md:px-5 md:py-3.5"
                >
                    <p
                        class="text-[13px] md:text-[14px] text-amber-900 leading-relaxed"
                    >
                        Em resumo, você não poderá dar, emprestar, vender ou
                        fazer cópia do F10 para ninguém (se desejar, você pode
                        indicar o F10 para seus amigos e conhecidos). Você
                        também não poderá mudar as características do F10 e nem
                        deve tentar desvendar o funcionamento técnico do
                        software.
                    </p>
                </div>
            </section>

            <div
                class="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"
            />

            <!-- 5. Do Prazo -->
            <section id="prazo" class="scroll-mt-28 space-y-4">
                <h2
                    class="text-[18px] md:text-[20px] font-semibold text-[#010D28]"
                >
                    5. Do Prazo
                </h2>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    O presente EULA entra em vigor na data de seu aceite pelo
                    LICENCIADO e vigorará pelo prazo do Plano contratado pelo
                    LICENCIADO. Este EULA será automaticamente renovado por
                    iguais períodos caso o LICENCIADO não se manifeste
                    expressamente em contrário. Este EULA poderá ser rescindido
                    conforme estabelecido abaixo nesse instrumento.
                </p>

                <div
                    class="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 md:px-5 md:py-3.5"
                >
                    <p
                        class="text-[13px] md:text-[14px] text-amber-900 leading-relaxed"
                    >
                        Em resumo, este contrato é valido pelo prazo do plano
                        contratado por você e será automaticamente renovado caso
                        você não nos comunique sua falta de interesse na
                        renovação, mas ele poderá ser terminado conforme
                        previsto abaixo neste instrumento.
                    </p>
                </div>
            </section>

            <div
                class="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"
            />

            <!-- 6. Da Remuneração e Forma de Pagamento -->
            <section
                id="remuneracao-forma-pagamento"
                class="scroll-mt-28 space-y-4"
            >
                <h2
                    class="text-[18px] md:text-[20px] font-semibold text-[#010D28]"
                >
                    6. Da Remuneração e Forma de Pagamento
                </h2>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    O LICENCIADO deverá pagar à LICENCIANTE o valor do plano de
                    licenciamento escolhido e de acordo com a periodicidade
                    definida entre as opções de pagamento disponibilizadas ao
                    LICENCIADO no ato da contratação. Caso o LICENCIADO, no
                    decorrer da vigência do presente instrumento, opte por outro
                    plano de licenciamento, os valores serão alterados de acordo
                    com o respectivo plano escolhido. A falta de pagamento de
                    quaisquer valores nas respectivas datas de vencimento não
                    acarretará na rescisão automática do EULA, mas causará a
                    suspensão imediata do acesso do LICENCIADO ao SOFTWARE até
                    que as pendências financeiras tenham sido regularizadas. O
                    acesso ao SOFTWARE somente será restabelecido após a
                    identificação pela LICENCIANTE do pagamento integral de
                    todos os valores devidos enquanto o mesmo esteve suspenso. A
                    identificação poderá ocorrer em até dois dias úteis após a
                    data de pagamento pelo LICENCIADO. Caso o LICENCIADO não
                    resolva a pendência financeira no prazo de 45 (quarenta e
                    cinco) dias contados do vencimento do valor não pago, a
                    LICENCIANTE se reserva o direito de rescindir o presente
                    EULA e apagar de forma definitiva e irrecuperável todas as
                    informações do LICENCIADO que por ventura estejam
                    armazenadas no SOFTWARE. Os valores dos planos de
                    licenciamento estabelecidos no ato do licenciamento do
                    SOFTWARE serão atualizados anualmente pelo IGPM-FGV
                    acumulado no período, ou no caso de extinção deste, de outro
                    índice oficial que venha a substituí-lo. Eventualmente
                    poderão ocorrer alterações nos preços dos planos e
                    adicionais contratados, caso isto ocorra você será informado
                    com no mínimo 30 dias de antecedência da sua próxima
                    renovação.
                </p>

                <div
                    class="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 md:px-5 md:py-3.5 space-y-3"
                >
                    <p
                        class="text-[13px] md:text-[14px] text-amber-900 leading-relaxed"
                    >
                        Em resumo, durante o Prazo contratado, você deverá nos
                        pagar o valor do pacote que você escolheu e que
                        confirmamos por meio de e-mail específico. A data de
                        vencimento será 5 dias após a data do ato de
                        contratação, com um novo pagamento a cada renovação da
                        periodicidade escolhida. A cada ano podemos atualizar o
                        valor deste pacote pelo IGPM-FGV. Poderão ocorrer
                        alterações nos preços dos nossos planos e adicionais,
                        caso isto ocorra você receberá uma comunicação no mínimo
                        30 dias antes do seu plano ser renovado.
                    </p>
                    <p
                        class="text-[13px] md:text-[14px] text-amber-900 leading-relaxed"
                    >
                        Se você precisar de outras funcionalidades que ainda não
                        contratou, você poderá mudar seu plano de licenciamento
                        e começaremos a cobrar o novo valor após você trocá-lo.
                        Se por algum motivo você deixar de realizar algum
                        pagamento na data acordada, seu acesso ao F10 será
                        suspenso. Caso você não resolva a pendência financeira
                        no prazo de 45 (quarenta e cinco) dias contados do
                        vencimento do valor não pago, nos reservamos o direito
                        de rescindir o EULA e apagar de forma definitiva e
                        irrecuperável todas as suas informações que por ventura
                        estejam armazenadas no F10.
                    </p>
                </div>
            </section>

            <div
                class="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"
            />

            <!-- 7. Restituição das Informações -->
            <section
                id="restituicao-informacoes"
                class="scroll-mt-28 space-y-4"
            >
                <h2
                    class="text-[18px] md:text-[20px] font-semibold text-[#010D28]"
                >
                    7. Restituição das Informações
                </h2>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    Suspenso o acesso do LICENCIADO ao SOFTWARE, a LICENCIANTE
                    manterá as informações do LICENCIADO armazenadas no SOFTWARE
                    pelo período de 90 (noventa) dias, contados da suspensão de
                    acesso. Durante este período, a LICENCIANTE tornará as
                    informações do LICENCIADO disponíveis para serem extraídas
                    do SOFTWARE em formato .csv. Conforme descrito na cláusula 6
                    acima, passados 90 (noventa) dias da suspensão do acesso do
                    LICENCIADO ao SOFTWARE, todas as INFORMAÇÕES do LICENCIADO,
                    incluindo as INFORMAÇÕES PESSOAIS, INFORMAÇÕES DE CONTA e
                    INFORMAÇÕES FINANCEIRAS, em poder da LICENCIANTE serão
                    excluídos permanentemente do banco de dados da LICENCIANTE,
                    independentemente de terem sido extraídas ou não pelo
                    LICENCIADO. Não obstante o disposto acima, as informações
                    referentes à data e hora de acesso e ao endereço de
                    protocolo de internet utilizado pelo LICENCIADO para acessar
                    o Site e o SOFTWARE permanecerão armazenadas pela
                    LICENCIANTE por 6 (meses) a contar da data de cada acesso
                    realizado, independentemente do término da relação jurídica
                    e comercial entre a LICENCIANTE e o LICENCIADO, em
                    cumprimento ao disposto no Artigo 15 da Lei nº 12.965/2014,
                    podendo ser armazenados por um período maior de tempo
                    mediante ordem judicial.
                </p>

                <div
                    class="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 md:px-5 md:py-3.5"
                >
                    <p
                        class="text-[13px] md:text-[14px] text-amber-900 leading-relaxed"
                    >
                        Em resumo, durante o período em que o seu acesso ao F10
                        estiver suspenso, nós deixaremos as suas informações
                        disponíveis para extração. Você terá um prazo de até 90
                        dias para reaver as informações que você colocou no
                        sistema. Após esse prazo nós excluiremos suas
                        informações de forma definitiva e irrecuperável. Dados
                        sobre a data de seus acessos e o endereço IP utilizado
                        permanecerão armazenadas por, no mínimo, 6 meses
                        contados de cada acesso, mesmo em caso de exclusão das
                        informações em caso de suspensão do acesso ao software.
                    </p>
                </div>
            </section>

            <div
                class="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"
            />

            <!-- 8. Das Obrigações do Licenciado -->
            <section id="obrigacoes-licenciado" class="scroll-mt-28 space-y-4">
                <h2
                    class="text-[18px] md:text-[20px] font-semibold text-[#010D28]"
                >
                    8. Das Obrigações do Licenciado
                </h2>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    Obriga-se o LICENCIADO a: Manter pessoal treinado para a
                    operação do SOFTWARE e para a comunicação com a LICENCIANTE
                    e prover, sempre que ocorrerem quaisquer problemas com o
                    SOFTWARE, toda a documentação, relatórios e demais
                    informações que relatem as circunstâncias em que os
                    problemas ocorreram, objetivando facilitar e agilizar os
                    trabalhos; Manter, às suas expensas, linha de
                    telecomunicação, modem, software de comunicação, endereço de
                    correio eletrônico e outros recursos necessários à
                    comunicação com a LICENCIANTE; Responder pelas INFORMAÇÕES
                    inseridas no SOFTWARE, pelo cadastramento, permissões,
                    senhas e modo de utilização de seus usuários. A LICENCIANTE
                    em hipótese alguma será responsável pelo conteúdo
                    (INFORMAÇÕES, senhas, cópias de informações, etc.) incluído
                    no SOFTWARE, não sendo, portanto, estas INFORMAÇÕES
                    revisadas em momento algum. A responsabilidade pelas
                    INFORMAÇÕES inseridas no SOFTWARE é sempre do LICENCIADO;
                    Certificar-se de que não está proibido por determinação
                    legal e/ou contratual de passar INFORMAÇÕES, INFORMAÇÕES
                    FINANCEIRAS, INFORMAÇÕES DE CONTA e INFORMAÇÕES PESSOAIS,
                    bem como quaisquer outros dados à LICENCIANTE, necessários
                    para a execução do serviço oferecido por este EULA; Não
                    utilizar o SOFTWARE de qualquer forma que possa implicar em
                    ato ilícito, infração, violação de direitos ou danos à
                    LICENCIANTE ou terceiros, incluindo, mas não se limitando ao
                    uso para invasão de dispositivo informático com o objetivo
                    de obter, adulterar ou destruir dados ou informações sem a
                    autorização expressa do titular de tais dados ou do
                    dispositivo ou servidor nos quais estes estejam armazenados;
                    Não publicar, enviar ou transmitir qualquer arquivo que
                    contenha vírus, worms, cavalos de troia ou qualquer outro
                    programa que possa contaminar, destruir ou interferir no bom
                    funcionamento do SOFTWARE; Informar a LICENCIANTE sempre que
                    houver qualquer alteração das INFORMAÇÕES fornecidas à
                    LICENCIANTE e que possam impedir, limitar ou prejudicar o
                    acesso da LICENCIANTE às INFORMAÇÕES necessárias para a
                    execução das funcionalidades ofertadas pelo SOFTWARE; Caso o
                    LICENCIADO acredite que seu login e senha de acesso ao
                    SOFTWARE tenham sido roubados ou sejam de conhecimento de
                    outras pessoas, por qualquer razão, o LICENCIADO deverá
                    imediatamente comunicar tal fato à LICENCIANTE, sem prejuízo
                    da alteração da sua senha imediatamente, por meio do
                    SOFTWARE. Quando o LICENCIADO se tratar de empresa de
                    contabilidade, deverá indicar no ato do cadastramento os
                    usuários autorizados a acessar a base cadastrada, assim como
                    indicar o responsável financeiro pelo pagamento.
                </p>

                <div
                    class="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 md:px-5 md:py-3.5 space-y-3"
                >
                    <p
                        class="text-[13px] md:text-[14px] text-amber-900 leading-relaxed"
                    >
                        Em resumo, o F10 é um produto de fácil utilização, mas
                        se você precisar entrar em contato conosco por qualquer
                        motivo, nossos atendentes farão algumas perguntas e
                        poderão solicitar alguns documentos e informações para
                        poder fazer um diagnóstico e ajudá-lo. Lembre-se que
                        quanto mais detalhadas e precisas forem suas respostas,
                        melhor será a ajuda que conseguiremos lhe dar.
                    </p>
                    <p
                        class="text-[13px] md:text-[14px] text-amber-900 leading-relaxed"
                    >
                        Além disso, você é responsável pelas informações que
                        coloca no software e deve ter as autorizações
                        necessárias para inclui-las caso não seja o titular
                        dessas informações. Você não deve usar o software de
                        forma ilegal ou danosa a nós ou a terceiros (não deve
                        utilizá-lo para a prática de crimes e nem para o envio
                        de vírus, por exemplo). Algumas funcionalidades do
                        sistema são automáticas e dependem de acesso a sistemas
                        de terceiros, como de instituições financeiras, por
                        exemplo, e, portanto, precisaremos dos seus dados para
                        que elas funcionem perfeitamente. Se você quiser
                        utilizar essas funcionalidades, você deverá informar
                        seus dados para o sistema e mantê-los sempre
                        atualizados. Seus dados serão sempre tratados com
                        confidencialidade por nós.
                    </p>
                </div>
            </section>

            <div
                class="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"
            />

            <!-- 9. Das Obrigações do Licenciante -->
            <section id="obrigacoes-licenciante" class="scroll-mt-28 space-y-4">
                <h2
                    class="text-[18px] md:text-[20px] font-semibold text-[#010D28]"
                >
                    9. Das Obrigações do Licenciante
                </h2>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    Obriga-se a LICENCIANTE a: A LICENCIANTE garante ao
                    LICENCIADO que o SOFTWARE deverá funcionar regularmente, se
                    respeitadas as condições de uso definidas na documentação.
                    Na ocorrência de falhas de programação (“bugs”), a
                    LICENCIANTE obrigar-se-á a corrigir tais falhas, podendo a
                    seu critério substituir a cópia dos Programas com falhas por
                    cópias corrigidas; Fornecer, ato contínuo ao aceite deste
                    EULA, acesso ao SOFTWARE durante a vigência deste EULA;
                    Suspender o acesso ao SOFTWARE do LICENCIADO que esteja
                    desrespeitando as regras de conteúdo aqui estabelecidas ou
                    as normas legais em vigor; Alterar as especificações e/ou
                    características do SOFTWARE licenciados para a melhoria e/ou
                    correções de erros; Disponibilizar acesso aos serviços de
                    suporte compreendido de segunda a sexta-feira, das 08:00h às
                    17:30h (horário de Brasília), sem intervalo, via chat
                    (localizado no interior do SOFTWARE), por meio de correio
                    eletrônico (suporte@f10.com.br), e ainda através da página
                    de suporte (https://ajuda.f10.com.br), disponível 24 horas
                    por dia e todos os dias da semana) para esclarecimento de
                    dúvidas de ordem não técnica diretamente relacionadas ao
                    SOFTWARE (conforme o plano contratado). Manter as
                    INFORMAÇÕES FINANCEIRAS, INFORMAÇÕES DE CONTA e INFORMAÇÕES
                    PESSOAIS do LICENCIADO, bem como seus registros de acesso,
                    em sigilo, sendo que as referidas INFORMAÇÕES serão
                    armazenadas em ambiente seguro, sendo respeitadas a
                    intimidade, a vida privada, a honra e a imagem do
                    LICENCIADO, em conformidade com as disposições da Lei nº
                    12.965/2014.
                </p>

                <div
                    class="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 md:px-5 md:py-3.5 space-y-3"
                >
                    <p
                        class="text-[13px] md:text-[14px] text-amber-900 leading-relaxed"
                    >
                        Em resumo, nós vamos lhe entregar o melhor software que
                        pudermos e, se eventualmente ocorrerem falhas,
                        envidaremos os melhores esforços para consertá-las, o
                        mais rápido possível. Nós poderemos fazer melhorias no
                        software e disponibilizá-las assim que as testarmos. Nós
                        estaremos prontos para ajudá-los, das 09:00h às 18:30h
                        (horário de Brasilia), e, durante este horário, você nos
                        encontrará por meio do e-mail ou chat (conforme o plano
                        contratado). Garantimos a segurança das informações e
                        dados pessoais de acesso incluídos na sua conta, de
                        acordo com a Lei nº 12.965/2014, também conhecida como
                        Marco Civil da Internet.
                    </p>
                </div>
            </section>

            <div
                class="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"
            />

            <!-- 10. Nível de Serviço -->
            <section id="nivel-servico" class="scroll-mt-28 space-y-4">
                <h2
                    class="text-[18px] md:text-[20px] font-semibold text-[#010D28]"
                >
                    10. Nível de Serviço
                </h2>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    A LICENCIANTE empreenderá esforços comercialmente razoáveis
                    para tornar o SOFTWARE disponível, no mínimo, 99% (noventa e
                    nove por cento) durante cada Ano de Serviço (conforme
                    definido abaixo) (“Compromisso de Nível de Serviço”). Na
                    hipótese de a LICENCIANTE não cumprir o Compromisso de Nível
                    de Serviço, o LICENCIADO terá o direito de receber o crédito
                    correspondente a 1 (um) mês de mensalidade, (“Crédito de
                    Serviço”). Por “Ano de Serviço” entende-se os 365 dias
                    precedentes à data de uma reivindicação relacionada ao nível
                    de serviço. Se o LICENCIADO estiver se utilizando do
                    SOFTWARE durante período inferior a 365 dias, o Ano de
                    Serviço que lhe corresponde será, ainda assim, considerado
                    como os 365 dias precedentes; no entanto, os dias anteriores
                    a seu uso dos serviços serão considerados como de 100% de
                    disponibilidade. Os períodos de inatividade operacional que
                    ocorrerem antes de uma reivindicação bem-sucedida de Crédito
                    de Serviço não poderão ser usados para efeito de
                    reivindicações futuras. O Compromisso de Nível de Serviço
                    não se aplica caso as circunstâncias de indisponibilidade
                    resultem (i) de uma interrupção do fornecimento de energia
                    elétrica ou paradas emergenciais não superiores a 2 (duas)
                    horas ou que ocorram no período das 24h às 6:00h (horário de
                    Brasília); (ii) forem causadas por fatores que fujam ao
                    razoável controle da LICENCIANTE, inclusive casos de força
                    maior ou de acesso à Internet e problemas correlatos; (iii)
                    resultem de quaisquer atos ou omissões do LICENCIADO ou de
                    terceiros; (iv) resultem do equipamento, software ou outras
                    tecnologias que o LICENCIADO usar que impeçam o acesso
                    regular do SOFTWARE; (v) resultem de falhas de instâncias
                    individuais não atribuíveis à indisponibilidade do
                    LICENCIADO; (vi) resultem de alterações realizadas na forma
                    de acesso a INFORMAÇÕES FINANCEIRAS e/ou INFORMAÇÕES DE
                    CONTA do LICENCIADO pelas instituições financeiras; (vii)
                    resultem de práticas de gerenciamento da rede que possam
                    afetar sua qualidade.
                </p>

                <div
                    class="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 md:px-5 md:py-3.5 space-y-3"
                >
                    <p
                        class="text-[13px] md:text-[14px] text-amber-900 leading-relaxed"
                    >
                        Em resumo, se por culpa nossa você ficar impossibilitado
                        de usar o F10 por mais que 248 horas em um ano, nós lhe
                        pagamos o valor equivalente a uma mensalidade do plano
                        de licenciamento contratado por você. 248 horas
                        significam menos de 11 dias. Algumas funcionalidades do
                        F10 dependem também de terceiros, então, se esses
                        serviços de terceiros não funcionarem, a
                        responsabilidade não é do F10.
                    </p>
                </div>
            </section>

            <div
                class="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"
            />

            <!-- 11. Isenção de Responsabilidade da Licenciante -->
            <section
                id="isenção-responsabilidade-licenciante"
                class="scroll-mt-28 space-y-4"
            >
                <h2
                    class="text-[18px] md:text-[20px] font-semibold text-[#010D28]"
                >
                    11. Isenção de Responsabilidade da Licenciante
                </h2>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    A LICENCIANTE não se responsabiliza: Por falha de operação,
                    operação por pessoas não autorizadas ou qualquer outra causa
                    em que não exista culpa da LICENCIANTE; Pelo cumprimento dos
                    prazos legais do LICENCIADO para a entrega de documentos
                    fiscais ou pagamentos de impostos; Pelos danos ou prejuízos
                    decorrentes de decisões administrativas, gerenciais ou
                    comerciais tomadas com base nas informações fornecidas pelo
                    SOFTWARE; Por problemas definidos como “caso fortuito” ou
                    “força maior”, contemplados pelo Art. 393 do Código Civil
                    Brasileiro; Por eventuais problemas oriundos de ações de
                    terceiros que possam interferir na qualidade do serviço; Por
                    danos causados a terceiros em razão de conteúdo gerado pelo
                    LICENCIANTE através de SOFTWARE; Por revisar as INFORMAÇÕES
                    DE CONTA fornecidas pelo LICENCIADO, bem como as INFORMAÇÕES
                    FINANCEIRAS obtidas junto aos sites e/ou meios virtuais das
                    instituições financeiras, seja no que tange à precisão dos
                    dados, seja quanto à legalidade ou ameaça de violação em
                    função do fornecimento destas informações; Por quaisquer
                    produtos e/ou serviços oferecidos por meio dos sites e/ou
                    meios virtuais das instituições financeiras, ainda que de
                    maneira solidária ou subsidiária; O acesso às INFORMAÇÕES DE
                    CONTA e às INFORMAÇÕES FINANCEIRAS do LICENCIADO dependem de
                    serviços prestados pelas instituições financeiras. Sendo
                    assim, a LICENCIANTE não assume qualquer responsabilidade
                    quanto à qualidade, precisão, pontualidade, entrega ou falha
                    na obtenção das referidas INFORMAÇÕES junto aos sites e/ou
                    meios virtuais das instituições financeiras. A LICENCIANTE
                    adota as medidas de segurança adequadas de acordo com os
                    padrões de mercado para a proteção das INFORMAÇÕES do
                    LICENCIADO armazenadas no SOFTWARE, assim como para o acesso
                    às INFORMAÇÕES FINANCEIRAS do LICENCIADO. Contudo, o
                    LICENCIADO reconhece que nenhum sistema, servidor ou
                    software está absolutamente imune a ataques e/ou invasões de
                    hackers e outros agentes maliciosos, não sendo a LICENCIANTE
                    responsável por qualquer exclusão, obtenção, utilização ou
                    divulgação não autorizada de INFORMAÇÕES resultantes de
                    ataques que a LICENCIANTE não poderia razoavelmente evitar
                    por meio dos referidos padrões de segurança.
                </p>

                <div
                    class="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 md:px-5 md:py-3.5 space-y-3"
                >
                    <p
                        class="text-[13px] md:text-[14px] text-amber-900 leading-relaxed"
                    >
                        Em resumo, você, e quem você autorizar, poderão colocar
                        informações no F10, e, por este motivo, nós não podemos
                        nos responsabilizar por quaisquer danos causados a
                        terceiros pelas informações que você ou pessoas
                        autorizadas por você colocarem no software. Nós também
                        não nos responsabilizaremos por revisar informações
                        incluídas no F10 e nem por informações obtidas, ou
                        produtos que você contrate, junto a instituições
                        financeiras ou qualquer terceiro. Ainda, também não
                        podemos nos responsabilizar pela qualidade das
                        informações enviadas pelas instituições financeiras
                        necessárias para a prestação dos nossos serviços a você
                        e nem por eventuais atrasos no envio dessas informações.
                        Apesar de tomarmos medidas de segurança adequadas para
                        proteger suas informações, o F10 pode ser objeto de
                        ataques de hackers que tentem obter os seus dados.
                        Assim, nós não seremos responsáveis por eventuais
                        ataques que, apesar de todas as nossas precauções e
                        esforços, não puderam ser evitados.
                    </p>
                </div>
            </section>

            <div
                class="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"
            />

            <!-- 12. Da Retomada dos Softwares -->
            <section id="retomada-softwares" class="scroll-mt-28 space-y-4">
                <h2
                    class="text-[18px] md:text-[20px] font-semibold text-[#010D28]"
                >
                    12. Da Retomada dos Softwares
                </h2>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    A LICENCIANTE se reserva o direito de cancelar imediatamente
                    o acesso do LICENCIADO ao SOFTWARE nos casos em que o
                    LICENCIADO usar o SOFTWARE de forma diversa daquela
                    estipulada no presente instrumento.
                </p>

                <div
                    class="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 md:px-5 md:py-3.5"
                >
                    <p
                        class="text-[13px] md:text-[14px] text-amber-900 leading-relaxed"
                    >
                        Em resumo, se você utilizar o software desrespeitando as
                        condições estabelecidas no EULA, nós podemos encerrar
                        sua conta no F10.
                    </p>
                </div>
            </section>

            <div
                class="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"
            />

            <!-- 13. Das Garantias Limitadas -->
            <section id="garantias-limitadas" class="scroll-mt-28 space-y-4">
                <h2
                    class="text-[18px] md:text-[20px] font-semibold text-[#010D28]"
                >
                    13. Das Garantias Limitadas
                </h2>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    Na extensão máxima permitida pela lei em vigor, o SOFTWARE é
                    fornecido “no estado em que se encontra” e “conforme a
                    disponibilidade”, com todas as falhas e sem garantia de
                    qualquer espécie. Não obstante o disposto no item 9.a acima,
                    a LICENCIANTE não garante que as funções contidas no
                    SOFTWARE atendam às suas necessidades, que a operação do
                    SOFTWARE será ininterrupta ou livre de erros, que qualquer
                    serviço continuará disponível, que os defeitos no SOFTWARE
                    serão corrigidos ou que o SOFTWARE será compatível ou
                    funcione com qualquer SOFTWARE, aplicações ou serviços de
                    terceiros. Além disso, o LICENCIADO reconhece que o SOFTWARE
                    não deve ser utilizado ou não é adequado para ser utilizado
                    em situações ou ambientes nos quais a falha ou atrasos de,
                    os erros ou inexatidões de conteúdo, dados ou informações
                    fornecidas pelo SOFTWARE possam levar à morte, danos
                    pessoais, ou danos físicos ou ambientais graves, incluindo,
                    mas não se limitando, à operação de instalações nucleares,
                    sistemas de navegação ou de comunicação aérea, controle de
                    tráfego aéreo, sistemas de suporte vital ou de armas.
                </p>

                <div
                    class="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 md:px-5 md:py-3.5"
                >
                    <p
                        class="text-[13px] md:text-[14px] text-amber-900 leading-relaxed"
                    >
                        Em resumo, apesar de nossos esforços em fornecer um
                        produto estável e em corrigir as falhas que sejam
                        identificadas, não podemos garantir que o F10 funcione
                        sem interrupções e que todos os defeitos serão
                        corrigidos. Não garantimos a compatibilidade do F10 com
                        sistemas ou serviços de terceiros.
                    </p>
                </div>
            </section>

            <div
                class="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"
            />

            <!-- 14. Limitação de Responsabilidade -->
            <section
                id="limitacao-responsabilidade"
                class="scroll-mt-28 space-y-4"
            >
                <h2
                    class="text-[18px] md:text-[20px] font-semibold text-[#010D28]"
                >
                    14. Limitação de Responsabilidade
                </h2>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    Em nenhum caso a LICENCIANTE será responsável por danos
                    pessoais ou qualquer prejuízo incidental, especial, indireto
                    ou consequente, incluindo, sem limitação, prejuízos por
                    perda de lucro, corrupção ou perda de dados, falha de
                    transmissão ou recepção de dados, não continuidade do
                    negócio ou qualquer outro prejuízo ou perda comercial,
                    decorrentes ou relacionados ao seu uso ou sua inabilidade em
                    usar o SOFTWARE, por qualquer outro motivo. Sob nenhuma
                    circunstância a responsabilidade integral da LICENCIANTE com
                    relação ao licenciado por todos os danos excederá a quantia
                    correspondente ao plano de licenciamento paga pelo
                    LICENCIADO à LICENCIANTE pela obtenção da presente licença
                    de SOFTWARE.
                </p>

                <div
                    class="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 md:px-5 md:py-3.5"
                >
                    <p
                        class="text-[13px] md:text-[14px] text-amber-900 leading-relaxed"
                    >
                        Em resumo, não nos responsabilizamos por perdas e danos
                        resultantes ou relacionados ao seu uso do F10 cuja culpa
                        não seja nossa. Em caso de danos causados por nós, nossa
                        responsabilidade está limitada ao valor da licença
                        (plano de licenciamento) pago por você.
                    </p>
                </div>
            </section>

            <div
                class="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"
            />

            <!-- 15. Da Rescisão -->
            <section id="rescisao" class="scroll-mt-28 space-y-4">
                <h2
                    class="text-[18px] md:text-[20px] font-semibold text-[#010D28]"
                >
                    15. Da Rescisão
                </h2>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    O LICENCIADO poderá solicitar devolução total dos valores
                    pagos em até 7 dias após a data de contratação ou conforme a
                    adesão de campanhas promocionais. Após este prazo o
                    LICENCIADO poderá solicitar somente o cancelamento da
                    renovação automática, desde que comunique à LICENCIANTE, por
                    escrito, com antecedência mínima de 30 (trinta) dias da
                    próxima renovação, devendo pagar o saldo devedor do plano de
                    licenciamento contratado, se existente. Para os planos de
                    licenciamento com pagamento antecipado, caso o LICENCIADO
                    decida rescindir este EULA antes do término do prazo
                    contratado, o LICENCIANTE não restituirá ao LICENCIADO o
                    saldo restante do plano de licenciamento contratado (exceto
                    em campanhas promocionais que prevejam a devolução dos
                    valores pagos). Este valor será retido pela LICENCIANTE para
                    cobrir os custos operacionais. Aplicam-se as mesmas regras
                    para a contratação do Suporte Premium e demais adicionais. A
                    LICENCIANTE poderá rescindir este EULA a qualquer tempo,
                    desde que comunique ao LICENCIADO, por escrito, com
                    antecedência mínima de [30] dias, devendo neste caso
                    restituir ao LICENCIADO o saldo devedor do plano de
                    licenciamento contratado, se existente. Este prazo de
                    antecedência mínima e a obrigação de restituição acima não
                    se aplicarão nos casos previstos na cláusula 12 acima e nos
                    casos de violação do presente instrumento. A LICENCIANTE
                    poderá rescindir o EULA a qualquer momento em caso de
                    violação pelo LICENCIADO dos termos e condições ora
                    acordados, ou em caso de atraso de pagamento não sanado no
                    prazo de 45 (noventa) dias, conforme cláusula 6 acima. No
                    caso de rescisão do presente contrato, os dados pessoais,
                    bancários, financeiros e demais informações do LICENCIADO
                    ficarão disponíveis conforme cláusula 7 deste termo, sendo
                    excluídos permanentemente após 90 (noventa) dias da data da
                    rescisão.
                </p>

                <div
                    class="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 md:px-5 md:py-3.5 space-y-3"
                >
                    <p
                        class="text-[13px] md:text-[14px] text-amber-900 leading-relaxed"
                    >
                        Em resumo, sua satisfação é muito importante para nós.
                        Caso perceba que o F10 não atende mais as suas
                        necessidades, vamos fazer de tudo para que você não vá
                        embora insatisfeito. Mas lembre-se: você só vai receber
                        devolução total dos valores se pedir o cancelamento em
                        até 7 dias a partir do dia da compra ou conforme a regra
                        de campanhas promocionais que você esteja participando.
                        Após este prazo você poderá cancelar somente a renovação
                        automática a qualquer momento mediante envio de
                        comunicação por escrito, desde que seja em até 30 dias
                        antes da sua próxima renovação. Se você cancelar a sua
                        assinatura antes do término do contrato e depois de
                        terem passado os prazos para devolução, você será
                        responsável pelo pagamento do valor total do compromisso
                        assumido. Antes de você cancelar o contrato, entre em
                        contato conosco para sabermos a razão. Faremos o que for
                        possível para não deixar de tê-lo como nosso cliente.
                    </p>
                </div>
            </section>

            <div
                class="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"
            />

            <!-- 16. Das disposições Legais -->
            <section id="disposicoes-legais" class="scroll-mt-28 space-y-4">
                <h2
                    class="text-[18px] md:text-[20px] font-semibold text-[#010D28]"
                >
                    16. Das disposições Legais
                </h2>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    O LICENCIADO não poderá prestar serviços a terceiros
                    utilizando o SOFTWARE da LICENCIANTE sem autorização prévia
                    e expressa da LICENCIANTE. A autorização de uso do SOFTWARE
                    é fornecida por CNPJ. Desta forma, o SOFTWARE não pode
                    operar sob o regime de multiempresa, necessitando para cada
                    CNPJ uma licença específica; Caso o LICENCIADO venha a
                    desenvolver um novo módulo ou produto que caracterize cópia,
                    de todo ou em parte, quer seja do dicionário de dados quer
                    seja do programa, será considerado como parte do SOFTWARE
                    fornecido pela LICENCIANTE, ficando, portanto, sua
                    propriedade incorporada pela LICENCIANTE e seu uso
                    condicionado a estas cláusulas contratuais; Este EULA obriga
                    as partes e seus sucessores e somente o LICENCIADO possui
                    licença não exclusiva para a utilização do SOFTWARE,
                    sendo-lhe, entretanto, vedado transferir os direitos e
                    obrigações acordados por este instrumento. Tal limitação, no
                    entanto, não atinge a LICENCIANTE, que poderá, a qualquer
                    tempo, ceder, no todo ou em parte, os direitos e obrigações
                    inerentes ao presente EULA; A tolerância de uma parte para
                    com a outra quanto ao descumprimento de qualquer uma das
                    obrigações assumidas neste instrumento não implicará em
                    novação ou renúncia de direito. A parte tolerante poderá, a
                    qualquer tempo, exigir da outra parte o fiel e cabal
                    cumprimento deste instrumento; Não constitui causa de
                    rescisão contratual o não cumprimento das obrigações aqui
                    assumidas em decorrência de fatos que independam da vontade
                    das partes, tais como os que configuram o caso fortuito ou
                    força maior, conforme previsto no artigo 393 do Código Civil
                    Brasileiro; Se qualquer disposição deste EULA for
                    considerada nula, anulável, inválida ou inoperante, nenhuma
                    outra disposição deste EULA será afetada como consequência
                    disso e, portanto, as disposições restantes deste EULA
                    permanecerão em pleno vigor e efeito como se tal disposição
                    nula, anulável, inválida ou inoperante não estivesse contida
                    neste EULA; O LICENCIADO concorda que a LICENCIANTE possa
                    divulgar a celebração deste instrumento para fins
                    comerciais, fazendo menção ao nome e à marca do LICENCIADO
                    em campanhas comerciais, podendo, inclusive, divulgar
                    mensagens enviadas de forma escrita ou oral, por telefone,
                    para uso em sites, jornais, revistas e outras campanhas,
                    enquanto vigorar o presente EULA. O LICENCIADO aceita,
                    ainda, receber comunicações via correio eletrônico sobre
                    treinamentos, parcerias e campanhas relacionadas ao
                    SOFTWARE; Neste ato, o LICENCIANTE expressamente autoriza o
                    LICENCIADO a colher e utilizar seus dados técnicos e
                    operacionais presentes no SOFTWARE, para fins de estudos e
                    melhorias no SOFTWARE; A LICENCIANTE poderá, ao seu
                    exclusivo critério, a qualquer tempo e sem a necessidade de
                    comunicação prévia ao LICENCIADO: a. Encerrar, modificar ou
                    suspender, total ou parcialmente, o acesso do LICENCIADO ao
                    SOFTWARE, quando referido acesso ou cadastro estiver em
                    violação das condições estabelecidas neste EULA; b. Excluir,
                    total ou parcialmente, as informações cadastradas pelo
                    LICENCIADO que não estejam em consonância com as disposições
                    deste EULA; c. Acrescentar, excluir ou modificar o Conteúdo
                    oferecido no site; d. Alterar quaisquer termos e condições
                    deste EULA mediante simples comunicação ao LICENCIADO. A
                    LICENCIANTE ainda poderá, a seu exclusivo critério,
                    suspender, modificar ou encerrar as atividades do SOFTWARE,
                    mediante comunicação prévia por escrito ao LICENCIADO, com
                    antecedência mínima de 30 (trinta) dias, disponibilizando
                    formas e alternativas de extrair do Site as informações,
                    salvo nas hipóteses de caso fortuito ou força maior. A
                    LICENCIANTE poderá, por meio de comunicação ao endereço
                    eletrônico indicado pelo LICENCIADO em seu cadastro ou por
                    meio de aviso no Site, definir preços para a oferta de
                    determinados conteúdos e/ou serviços, ainda que inicialmente
                    tais serviços tenham sido ofertados de forma gratuita, sendo
                    a utilização destes, após o referido aviso, considerada como
                    concordância do LICENCIADO com a cobrança de tais preços.
                    Fica certo e entendido pelo LICENCIADO que somente a pessoa
                    cadastrada pelo próprio LICENCIADO como administradora de
                    conta poderá solicitar que as informações do LICENCIADO
                    inseridas no Software sejam apagadas. Ainda, o LICENCIADO
                    declara sua ciência de que uma vez apagadas, estas não
                    poderão mais ser recuperadas, ficando a LICENCIANTE isenta
                    de qualquer responsabilidade por quaisquer perdas ou danos
                    decorrentes deste procedimento solicitado pelo LICENCIADO.
                </p>

                <div
                    class="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 md:px-5 md:py-3.5"
                >
                    <p
                        class="text-[13px] md:text-[14px] text-amber-900 leading-relaxed"
                    >
                        Em resumo, estamos reforçando algumas informações que já
                        mencionamos anteriormente. Nós ficamos tão felizes de
                        ter você como nosso cliente que queremos falar isso para
                        todo mundo e, com o EULA, você nos autoriza a divulgar a
                        terceiros que você é um de nossos clientes. Poderemos
                        modificar ou encerrar o F10 a qualquer momento, e
                        inclusive definir preços para serviços anteriormente
                        gratuitos ou alterar qualquer termo ou condição deste
                        EULA. Nós avisaremos você sobre essas alterações por
                        meio do nosso site ou pelo envio de e-mail. Somente a
                        pessoa cadastrada por você como administradora de conta
                        poderá solicitar que suas informações inseridas no
                        Software sejam apagadas. Ainda, você declara sua
                        concordância e conhecimento de que uma vez apagadas, as
                        informações não poderão ser mais recuperadas e a F10 não
                        terá nenhuma responsabilidade pela execução deste
                        procedimento.
                    </p>
                </div>
            </section>

            <div
                class="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"
            />

            <!-- 17. Da Lei Aplicável -->
            <section id="lei-aplicavel" class="scroll-mt-28 space-y-4">
                <h2
                    class="text-[18px] md:text-[20px] font-semibold text-[#010D28]"
                >
                    17. Da Lei Aplicável
                </h2>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    Este EULA será regido, interpretado e se sujeitará às leis
                    brasileiras e, o LICENCIADO e a LICENCIANTE desde logo
                    elegem, de forma irrevogável e irretratável, o foro da
                    Comarca da Cidade de Curitiba, Estado do Paraná, para
                    dirimir quaisquer dúvidas ou controvérsias oriundas deste
                    EULA, com a exclusão de qualquer outro, por mais
                    privilegiado que seja.
                </p>

                <div
                    class="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 md:px-5 md:py-3.5"
                >
                    <p
                        class="text-[13px] md:text-[14px] text-amber-900 leading-relaxed"
                    >
                        Em resumo, O instrumento se sujeita às leis brasileiras
                        e caso haja alguma discussão judicial sobre o F10 esta
                        deverá ser resolvida em Curitiba-PR.
                    </p>
                </div>
            </section>

            <div
                class="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"
            />

            <!-- 18. Das definições -->
            <section id="definicoes" class="scroll-mt-28 space-y-4">
                <h2
                    class="text-[18px] md:text-[20px] font-semibold text-[#010D28]"
                >
                    18. Das definições
                </h2>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    Os termos utilizados neste instrumento deverão ser
                    interpretados e usados conforme definições abaixo, seja no
                    singular ou plural: INFORMAÇÕES DE CONTA: informações e
                    dados relativos a contas correntes, contas poupanças,
                    cartões de crédito, incluindo logins, senhas e demais
                    informações necessárias para acessar, coletar, armazenar,
                    usar e tratar as informações obtidas nos sites das
                    instituições financeiras. INFORMAÇÕES FINANCEIRAS:
                    informações fornecidas pelo LICENCIADO ou coletadas
                    diretamente dos sites e dispositivos da instituição
                    financeira por meio do SOFTWARE com os dados do LICENCIADO,
                    tais como recebimentos, pagamentos, investimentos, etc.
                    INFORMAÇÕES PESSOAIS: qualquer informação disponibilizada
                    pelo LICENCIADO que o identifique, tais como nome, endereço,
                    data de nascimento, número de telefone, fax, endereço
                    eletrônico, número de documentos, etc. INFORMAÇÕES:
                    entende-se todas as informações do LICENCIADO relacionadas a
                    INFORMAÇÕES PESSOAIS, INFORMAÇÕES FINANCEIRAS e INFORMAÇÕES
                    DE CONTA. LICENCIADO: pessoa física ou jurídica, com plena
                    capacidade de contratar, que acessa o SOFTWARE da
                    LICENCIANTE por meio do site, realizando seu cadastro,
                    aceitando os termos do presente EULA e usufruindo das
                    funcionalidades oferecidos. SOFTWARE: software de
                    propriedade exclusiva da LICENCIANTE, cujas funcionalidades
                    e serviços estão disponibilizados pelo site, por meio do
                    qual as INFORMAÇÕES FINANCEIRAS do LICENCIADO serão
                    fornecidas diretamente por ele ou coletadas diretamente nos
                    sites das instituições financeiras de maneira automatizada.
                </p>

                <div
                    class="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 md:px-5 md:py-3.5 space-y-3"
                >
                    <p
                        class="text-[13px] md:text-[14px] text-amber-900 leading-relaxed"
                    >
                        Em resumo, ao longo deste instrumento, as expressões a
                        seguir possuem os seguintes significados: Informações de
                        conta: conta corrente, conta poupança, cartão de
                        crédito, logins, senhas e demais informações necessárias
                        para acessar, coletar, armazenar dados obtidos nos sites
                        dos bancos. Informações financeiras: informações dos
                        bancos como recebimento, pagamentos, investimentos etc.
                        Informações pessoais: nome, endereço, data de
                        nascimento, número de telefone, fax, e-mail, número de
                        documentos etc. Informações: todas as suas informações.
                        Licenciado: você, nosso cliente. Software: o F10.
                    </p>
                </div>
            </section>

            <div
                class="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"
            />

            <!-- 19. Política de Privacidade -->
            <section id="politica-privacidade" class="scroll-mt-28 space-y-4">
                <h2
                    class="text-[18px] md:text-[20px] font-semibold text-[#010D28]"
                >
                    19. Política de Privacidade
                </h2>

                <p class="text-[13px] md:text-[14px] text-slate-500">
                    Última Atualização em 08 de Junho de 2020
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    A F10 tem como prioridade a manutenção de uma relação de
                    confiança e no intuito de tornar claras as questões de
                    privacidade da relação quanto aos dados coletados e
                    armazenados, este termo (“Política de privacidade”) tem a
                    intenção de esclarecer sobre quais informações coletamos e
                    como as utilizamos, e este deve ser aceito, observado e
                    cumprido por todos os clientes e usuários da plataforma F10.
                    Por sua vez, desde já, a F10 se obriga, nos termos da
                    legislação em vigor e do presente termo, a garantir a
                    privacidade dos usuários deste site.
                </p>

                <h3
                    class="text-[15px] md:text-[16px] font-semibold text-[#010D28] mt-4"
                >
                    1. QUAIS INFORMAÇÕES QUE COLETAMOS?
                </h3>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    A F10 pode recolher, gravar e utilizar em conexão com outros
                    sites e parceiros as informações pessoais dos usuários,
                    incluindo, mas não se limitando ao nome da empresa, nome do
                    responsável pelo acesso, CNPJ da empresa usuária, endereço,
                    número de telefone, interesses, atividades, tempo de
                    abertura da empresa, etc.
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    A F10 se resguarda o direito de gravar seu IP, tipo de
                    navegador, aparelho e operadora de celular, posição
                    geográfica e outros dados relativos aos usuários.
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    As informações coletadas e existentes em nossos sistemas são
                    (i) informações que o usuário se prontifica a fornecer
                    através de cadastro (dados pessoais, dados financeiros,
                    dados de conta e dados de acesso), emissão de notas fiscais
                    ou importação de extratos bancários e (ii) informações
                    obtidas automaticamente.
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    As informações que os usuários se prontificam a fornecer são
                    aquelas definidas como dados pessoais, dados financeiros,
                    dados de conta e dados de acesso e que são preenchidas no
                    momento do cadastro necessário para utilização da Plataforma
                    F10, bem como aquelas preenchidas sempre que o usuário
                    utiliza nossos serviços através da plataforma.
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    A F10 coleta ainda os dados financeiros também incluídos na
                    Plataforma, através de importação de nota fiscal e/ou no
                    extrato bancário. E, dessa forma, coletamos informações a
                    respeito dos dados financeiros, por exemplo, a localização
                    onde a nota fiscal é emitida, o banco utilizado pelo
                    usuário, entre outros. Coletamos também informações sobre
                    você quando outro usuário emite nota fiscal para você
                    através dos nossos serviços.
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    Quando o usuário realiza possíveis pagamentos na plataforma,
                    a F10 coletará informações sobre o pagamento, o que inclui
                    informações de conta, dados de faturamento, número de cartão
                    de crédito ou débito, etc. Nenhuma consequência poderá
                    ocorrer da recusa em preencher tais informações, exceto que
                    o usuário não poderá obter o benefício de utilização dos
                    serviços.
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    As informações coletadas automaticamente não são informações
                    pessoais, mas sim sobre os computadores, smartphones ou
                    outros dispositivos que o usuário utiliza para acessar a
                    plataforma, bem como o nome de domínio do seu provedor de
                    acesso à internet, o endereço de protocolo IP utilizado para
                    se conectar à Plataforma, o tipo e versão do browser do
                    usuário, o sistema operacional, o tempo médio gasto na
                    Plataforma, as páginas visitadas na Plataforma, as
                    informações procuradas, os horários de acesso e outras
                    estatísticas relevantes para o fornecimento de serviço.
                </p>

                <h3
                    class="text-[15px] md:text-[16px] font-semibold text-[#010D28] mt-4"
                >
                    2. O QUE FAZEMOS COM AS INFORMAÇÕES COLETADAS?
                </h3>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    A F10 não divulga publicamente nem a terceiros suas
                    informações de modo que possam identificá-lo.
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    A F10 busca sempre manter a sua privacidade enquanto estiver
                    utilizando o serviço, MAS PODERÁ UTILIZAR AS INFORMAÇÕES
                    FORNECIDAS OU AQUELAS OBTIDAS AUTOMATICAMENTE DE FORMA
                    AGREGADA NO INTUITO DE REALIZAR ANÁLISES, ESTUDOS, MELHORIAS
                    DO SISTEMA OU POR FORÇA DE ORDEM JUDICIAL.
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    A F10 VISA CRIAR NOVAS EXPERIÊNCIAS PARA ATENDER POSSÍVEIS
                    DEMANDAS NASCENTES.
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    POR ISSO, USAMOS TODAS AS INFORMAÇÕES QUE TEMOS PARA APOIAR
                    NOSSOS SERVIÇOS, MELHORÁ-LO OU ATENDER NOVAS DEMANDAS A
                    PARTIR DAS INFORMAÇÕES OBTIDAS. Por isso, tanto as
                    informações que o usuário se prontifica a fornecer quanto as
                    informações coletadas automaticamente são utilizadas para
                    mensurar o uso da plataforma, bem como para administrar os
                    serviços prestados, aperfeiçoá-lo e identificar possíveis
                    necessidades dos usuários.
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    A F10 envia e-mails, e o usuário desde já autoriza que ela o
                    faça, responsabilizando-se pelos dados ofertados, com
                    alertas e comunicados relacionados às funções da plataforma
                    no intuito permitir que o usuário explore todas as suas
                    funcionalidades, bem como com informações relevantes à
                    contabilidade, planejamento financeiro ou questões
                    referentes à gestão empresarial, entre outros tipos.
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    A F10 PODERÁ OFERECER SERVIÇOS PERSONALIZADOS, CONDUZIR
                    PESQUISAS E TESTAR RECURSOS EM DESENVOLVIMENTO, SOB SUA
                    TOTAL RESPONSABILIDADE.
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    ALÉM DISSO, A F10 USA AS INFORMAÇÕES PARA OFERECER SERVIÇOS
                    DE CONTABILIDADE PARA EMPRESAS A QUEM SÃO EMITIDAS AS NOTAS
                    FISCAIS DIRETAMENTE NA PLATAFORMA. O USUÁRIO AUTORIZA DESDE
                    JÁ QUE A F10 ACESSE DADOS DOS DESTINATÁRIOS DAS NOTAS
                    FISCAIS EMITIDAS, NO INTUITO DE POSSIBILITAR A OFERTA DE
                    SERVIÇOS F10.
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    AS INFORMAÇÕES NÃO SERÃO DIVULGADAS, VENDIDAS OU ALUGADAS
                    PARA QUALQUER ORGANIZAÇÃO OU ENTIDADE, TAMPOUCO COM ELAS
                    SERÁ FEITA PERMUTA SEM ANTES COMUNICAR AO USUÁRIO E OBTER
                    SEU CONSENTIMENTO EXPRESSO, COM EXCEÇÃO DE INFORMAÇÕES
                    EXIGIDAS POR LEIS OU POR ORDEM JUDICIAL.
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    Os “cookies” depositados nas máquinas dos usuários não
                    coleta informações identificadoras do Usuário, mas apresenta
                    informações de forma global e são necessários para
                    aperfeiçoar a navegação na plataforma.
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    A F10 contabiliza os números de visitas em seu site e em
                    todas as suas páginas subjacentes, inclusive mediante
                    utilização de cookies, de forma a melhorar a qualidade dos
                    serviços prestados.
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    AS ANÁLISES ESTATÍSTICAS E GENÉRICAS SOBRE O COMPORTAMENTO
                    DOS USUÁRIOS PODERÃO SER PARTILHADAS, MAS O USUÁRIO JAMAIS
                    EM HIPÓTESE ALGUMA SERÁ INDIVIDUALMENTE IDENTIFICADO.
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    AO PREENCHER O FORMULÁRIO E FORNECER AS INFORMAÇÕES À F10, O
                    USUÁRIO DECLARA QUE PERMITE O PROCESSAMENTO DE DADOS
                    PESSOAIS CONFORME ESTABELECIDO NESTE TERMO.
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    Na plataforma pode conter links a outros web sites. E a
                    presente declaração de privacidade não abrange os referidos
                    sites, não podendo a F10 ser responsabilizada pelas práticas
                    de privacidade de outros sites.
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    A F10 reserva-se o direito de alterar a presente política a
                    qualquer tempo, informando o usuário no prazo de 30 (trinta)
                    dias antes do início de sua vigência para que o usuário tome
                    ciência e expresse nova concordância. CASO O USUÁRIO NÃO
                    CONCORDE COM A NOVA POLÍTICA, DEVE INFORMAR TÃO LOGO TOME
                    CIÊNCIA DA ALTERAÇÃO, DE MODO A VIABILIZAR UMA REGULAR
                    RESCISÃO CONTRATUAL ENTRE A EMPRESA E O USUÁRIO, OBSERVADOS
                    SEMPRE O CONTRATO DE PRESTAÇÃO DE SERVIÇOS E A POLÍTICA DE
                    ARMAZENAMENTO DE INFORMAÇÕES VIGENTES NO PRESENTE MOMENTO.
                </p>

                <h3
                    class="text-[15px] md:text-[16px] font-semibold text-[#010D28] mt-4"
                >
                    3. DO ARMAZENAMENTO E EXCLUSÃO DAS INFORMAÇÕES E DADOS
                    PESSOAIS
                </h3>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    O usuário poderá ter acesso às suas informações pessoais que
                    inclui no momento do cadastro e às informações que incluiu
                    na plataforma (notas fiscais e informações bancárias)
                    através do acesso à plataforma.
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    A F10 armazenará todos os dados e informações pelo tempo que
                    entender necessário e até a exclusão de sua conta e rescisão
                    de contrato de prestação de serviços.
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    O usuário poderá realizar a exclusão de sua conta a qualquer
                    momento, bastando fazê-lo também através da plataforma,
                    respeitadas as obrigações existentes no contrato de
                    prestação de serviços.
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    Quando o usuário exclui sua conta e rescinde o contrato, os
                    dados pessoais serão excluídos, porém são mantidas as
                    informações de guarda obrigatória, conforme determinação
                    legal.
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    Caso o usuário tenha qualquer dúvida quanto à presente
                    política de privacidade, poderá entrar em contato com a F10
                    através da plataforma ou atendimento online junto ao site
                    www.F10.com.br.
                </p>

                <h3
                    class="text-[15px] md:text-[16px] font-semibold text-[#010D28] mt-4"
                >
                    4. DEFINIÇÕES
                </h3>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    4.1. F10 – Quando mencionamos “F10” no presente termos, o
                    usuário deve ter ciência que referimo-nos à empresa F10
                    Comércio de Computadores de Softwares Ltda, (CNPJ sob n.
                    06.027.705/0001-89), a qual é empresa desenvolvedora do
                    sistema F10 e todos os demais recursos aqui citados,
                    detentora de todo e qualquer direito relacionado a ela.
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    4.2. USUÁRIO – Pessoa física ou jurídica que aderiu aos
                    termos e aceitou as condições da presente TERMO DE USO para
                    utilização do sistema F10 e Pessoa física ou jurídica que
                    contratou os serviços da empresa F10 nos termos do CONTRATO
                    DE PRESTAÇÃO DE SERVIÇOS E DE LICENÇA DE SOFTWARE.
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    4.3. SISTEMA F10 – plataforma virtual onde o usuário insere
                    todas as informações que possibilitam o acesso ao sistema e,
                    consequentemente, a utilização dos serviços.
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    4.4. SITE: www.F10.com.br;
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    4.5. DADOS PESSOAIS – quaisquer dados incluídos pelo usuário
                    na Plataforma/Site e que permitam a identificação do
                    usuário, os quais incluem nome, email, CNPJ, endereço de
                    sede da empresa, etc.;
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    4.6. DADOS DE CONTA – quaisquer dados que o Usuário insira
                    no Sistema/site ao se cadastrar no site, como, por exemplo,
                    dados de conta bancária, número de agência e conta bancária,
                    bem como quaisquer outros dados bancários, inclusive cartões
                    de crédito dos Usuários.
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    4.7. DADOS FINANCEIROS – qualquer informação passível de
                    identificação no momento da importação de nota fiscal e/ou
                    no extrato bancário, bem como informações sobre o pagamento,
                    o que inclui informações de conta, dados de faturamento,
                    número de cartão de crédito ou débito, informações
                    referentes à dívidas ou investimentos, etc.
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    4.8. DADOS DE ACESSO – informações coletadas de Usuários no
                    momento da navegação referentes ao domínio do seu provedor
                    de acesso à internet, o endereço de protocolo IP, o sistema
                    operacional, data e cidade de acesso, etc.
                </p>

                <h3
                    class="text-[15px] md:text-[16px] font-semibold text-[#010D28] mt-4"
                >
                    5. CONTROLE SOBRE SUA INFORMAÇÃO
                </h3>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    Configurações de perfil e compartilhamento de dados:
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    Você pode atualizar as informações do seu perfil, como o seu
                    nome de usuário, e-mail e permissões de acesso diretamente
                    no F10, se precisar de assistência, pode enviar um email
                    para o suporte ao cliente em sucesso@f10.com.br
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    Como controlar suas preferências de comunicação:
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    Você pode parar de receber nossas comunicações promocionais
                    por email clicando no “link de cancelamento de assinatura”
                    fornecido nessas comunicações ou no Painel do usuário,
                    acessando Configurações e selecionando suas preferências de
                    email. Você não pode optar por não receber comunicações
                    relacionadas ao serviço (por exemplo, verificação de conta,
                    comunicações transacionais, alterações / atualizações dos
                    recursos do Serviço, avisos técnicos e de segurança).
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    Modificando ou excluindo suas informações:
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    Se desejar, você pode recusar-se a compartilhar suas
                    informações pessoais com a F10, quando não poderemos mais
                    fornecer a você a maioria das funcionalidades de nossas
                    ofertas. Se você deseja acessar, revisar, corrigir,
                    atualizar, suprimir / remover ou limitar de outra forma o
                    uso de suas informações pessoais e / ou Conteúdo do Usuário,
                    entre em contato conosco pelo sucesso@f10.com.br. Observe
                    que, para proteger sua privacidade e segurança, tomamos
                    medidas razoáveis ​​para verificar sua identidade antes de
                    fazer alterações em suas informações pessoais.
                </p>

                <h3
                    class="text-[15px] md:text-[16px] font-semibold text-[#010D28] mt-4"
                >
                    6. COMO ENTRAR EM CONTATO CONOSCO
                </h3>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    Se você tiver alguma dúvida sobre esta Política de
                    Privacidade ou sobre o Serviço, entre em contato conosco em
                    sucesso@f10.com.br.
                </p>

                <h3
                    class="text-[15px] md:text-[16px] font-semibold text-[#010D28] mt-4"
                >
                    7. ALTERAÇÕES À NOSSA POLÍTICA DE PRIVACIDADE
                </h3>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    Podemos modificar ou atualizar esta Política de Privacidade
                    de tempos em tempos para refletir as mudanças em nossos
                    negócios e práticas; portanto, você deve revisar esta página
                    periodicamente. Quando alterarmos a política de maneira
                    material, informaremos e atualizaremos a ‘última data de
                    atualização na parte superior desta página. Se você se
                    opuser a alguma alteração, poderá encerrar sua conta.
                    Continuar usando nosso Serviço depois que publicamos
                    alterações nesta Política de Privacidade significa que você
                    está consentindo com as alterações.
                </p>

                <p class="text-[13px] md:text-[14px] text-slate-500">
                    Última Atualização em 08 de Junho de 2020
                </p>
            </section>

            <div
                class="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"
            />

            <!-- 20. Dos serviços em observância à LGPD -->
            <section id="lgpd-servicos" class="scroll-mt-28 space-y-4">
                <h2
                    class="text-[18px] md:text-[20px] font-semibold text-[#010D28]"
                >
                    20. Dos serviços em observância à LGPD
                </h2>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    20.1 A LICENCIANTE procederá com os serviços de forma a
                    viabilizar a observância pelo LICENCIADO às regras da LGPD,
                    restando claro que a LGPD não estabelece de maneira
                    específica quais padrões, meios técnicos ou processos devem
                    ser aplicados para que os dados obtidos sejam considerados
                    suficientemente anonimizados.
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    20.2 A LICENCIANTE executará os trabalhos a partir das
                    premissas da LGPD, em especial os princípios da finalidade,
                    adequação, transparência, livre acesso, segurança, prevenção
                    e não discriminação no tratamento dos dados.
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    20.3 As partes concordam que o desenvolvimento, sempre que
                    possível, observará que o consentimento do usuário no
                    fornecimento de dados deverá ser livre, informado,
                    inequívoco e relacionado a uma determinada finalidade.
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    20.4 No que toca aos dados eventualmente armazenados pela
                    LICENCIANTE, esta possui processos internos de governança
                    para a proteção dos dados, devendo o LICENCIADO na execução
                    e utilização em seus negócios relacionados aos serviços
                    contratados observar a LGPD e as premissas de governança com
                    seus colaboradores e prestadores de serviços regularmente
                    aceitas no tratamento dos dados obtidos dos clientes.
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    20.5 No decorrer do contrato originário, a LICENCIANTE
                    poderá recusar regras de negócios definidas pelo LICENCIADO
                    que visem frustrar os objetivos da LGPD, ou mesmo proceder
                    com o desenvolvimento requerido pelo LICENCIADO em
                    contrariedade direta ou indireta à LGPD, e nesta hipótese, a
                    LICENCIANTE se exime de qualquer responsabilidade perante o
                    LICENCIADO ou terceiros.20.6 A LICENCIANTE será
                    responsabilizada perante o LICENCIADO quando deixar de
                    observar de forma deliberada e por incapacidade técnica os
                    princípios descritos no item 20.2 deste instrumento, sem
                    prejuízo do item 20.5 acima
                </p>

                <p
                    class="text-[14px] md:text-[15px] text-slate-700 leading-relaxed"
                >
                    Curitiba, 14 de Setembro de 2020 F10 Comércio de
                    Computadores de Softwares Ltda
                </p>
            </section>
        </article>
    </div>
</section>
