<script lang="ts">
    import Breadcrumb from "$lib/components/Breadcrumb.svelte";
    import { onMount } from "svelte";

    type MenuItem = {
        id: string;
        label: string;
    };

    const menuItems: MenuItem[] = [
        { id: "politica-intro", label: "Introdução" },
        {
            id: "quais-informacoes-coletamos",
            label: "1. Quais informações coletamos?",
        },
        {
            id: "o-que-fazemos-informacoes",
            label: "2. O que fazemos com as informações",
        },
        {
            id: "armazenamento-exclusao",
            label: "3. Armazenamento e exclusão",
        },
        { id: "definicoes", label: "4. Definições" },
        {
            id: "controle-sua-informacao",
            label: "5. Controle sobre sua informação",
        },
        {
            id: "como-entrar-contato",
            label: "6. Como entrar em contato",
        },
        {
            id: "alteracoes-politica",
            label: "7. Alterações na política",
        },
        {
            id: "servicos-lgpd",
            label: "8. Serviços em observância à LGPD",
        },
        {
            id: "indicacao-contatos",
            label: "9. Indicação de contatos",
        },
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
    <!-- BREADCRUMB -->
    <div>
        <Breadcrumb
            baseUrl="https://f10.com.br"
            items={[
                { label: "INÍCIO", href: "/" },
                { label: "POLÍTICA DE PRIVACIDADE" },
            ]}
        />
    </div>

    <!-- TÍTULO -->
    <header class="container mb-8 md:mb-12 space-y-3">
        <div class="space-y-2">
            <h1
                class="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900"
            >
                Política de Privacidade
            </h1>
            <p class="max-w-2xl text-sm md:text-[15px] text-slate-600">
                Este documento descreve como a F10 coleta, utiliza, armazena e
                protege os dados dos usuários, em conformidade com a legislação
                vigente e com o compromisso de manter uma relação de confiança e
                transparência.
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
                        Acesse diretamente cada seção da Política de Privacidade
                        da F10.
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

        <article
            class="bg-white/95 rounded-3xl border border-slate-200 shadow-[0_18px_45px_rgba(15,23,42,0.06)] px-5 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10 space-y-8"
        >
            <!-- INTRODUÇÃO -->
            <section id="politica-intro" class="scroll-mt-28 space-y-3">
                <h2 class="text-lg font-semibold text-slate-900">
                    Política de Privacidade
                </h2>
                <p class="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Última Atualização em 08 de Junho de 2020
                </p>
                <p>
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
            </section>

            <!-- 1. QUAIS INFORMAÇÕES QUE COLETAMOS? -->
            <section
                id="quais-informacoes-coletamos"
                class="scroll-mt-28 space-y-3"
            >
                <h2 class="text-lg font-semibold text-slate-900">
                    1. QUAIS INFORMAÇÕES QUE COLETAMOS?
                </h2>

                <p>
                    A F10 pode recolher, gravar e utilizar em conexão com outros
                    sites e parceiros as informações pessoais dos usuários,
                    incluindo, mas não se limitando ao nome da empresa, nome do
                    responsável pelo acesso, CNPJ da empresa usuária, endereço,
                    número de telefone, interesses, atividades, tempo de
                    abertura da empresa, etc.
                </p>

                <p>
                    A F10 se resguarda o direito de gravar seu IP, tipo de
                    navegador, aparelho e operadora de celular, posição
                    geográfica e outros dados relativos aos usuários.
                </p>

                <p>
                    As informações coletadas e existentes em nossos sistemas são
                    (i) informações que o usuário se prontifica a fornecer
                    através de cadastro (dados pessoais, dados financeiros,
                    dados de conta e dados de acesso), emissão de notas fiscais
                    ou importação de extratos bancários e (ii) informações
                    obtidas automaticamente.
                </p>

                <p>
                    As informações que os usuários se prontificam a fornecer são
                    aquelas definidas como dados pessoais, dados financeiros,
                    dados de conta e dados de acesso e que são preenchidas no
                    momento do cadastro necessário para utilização da Plataforma
                    F10, bem como aquelas preenchidas sempre que o usuário
                    utiliza nossos serviços através da plataforma.
                </p>

                <p>
                    A F10 coleta ainda os dados financeiros também incluídos na
                    Plataforma, através de importação de nota fiscal e/ou no
                    extrato bancário. E, dessa forma, coletamos informações a
                    respeito dos dados financeiros, por exemplo, a localização
                    onde a nota fiscal é emitida, o banco utilizado pelo
                    usuário, entre outros. Coletamos também informações sobre
                    você quando outro usuário emite nota fiscal para você
                    através dos nossos serviços.
                </p>

                <p>
                    Quando o usuário realiza possíveis pagamentos na plataforma,
                    a F10 coletará informações sobre o pagamento, o que inclui
                    informações de conta, dados de faturamento, número de cartão
                    de crédito ou débito, etc. Nenhuma consequência poderá
                    ocorrer da recusa em preencher tais informações, exceto que
                    o usuário não poderá obter o benefício de utilização dos
                    serviços.
                </p>

                <p>
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
            </section>

            <!-- 2. O QUE FAZEMOS COM AS INFORMAÇÕES COLETADAS? -->
            <section
                id="o-que-fazemos-informacoes"
                class="scroll-mt-28 space-y-3"
            >
                <h2 class="text-lg font-semibold text-slate-900">
                    2. O QUE FAZEMOS COM AS INFORMAÇÕES COLETADAS?
                </h2>

                <p>
                    A F10 não divulga publicamente nem a terceiros suas
                    informações de modo que possam identificá-lo.
                </p>

                <p>
                    A F10 busca sempre manter a sua privacidade enquanto estiver
                    utilizando o serviço, MAS PODERÁ UTILIZAR AS INFORMAÇÕES
                    FORNECIDAS OU AQUELAS OBTIDAS AUTOMATICAMENTE DE FORMA
                    AGREGADA NO INTUITO DE REALIZAR ANÁLISES, ESTUDOS, MELHORIAS
                    DO SISTEMA OU POR FORÇA DE ORDEM JUDICIAL.
                </p>

                <p>
                    A F10 VISA CRIAR NOVAS EXPERIÊNCIAS PARA ATENDER POSSÍVEIS
                    DEMANDAS NASCENTES.
                </p>

                <p>
                    POR ISSO, USAMOS TODAS AS INFORMAÇÕES QUE TEMOS PARA APOIAR
                    NOSSOS SERVIÇOS, MELHORÁ-LO OU ATENDER NOVAS DEMANDAS A
                    PARTIR DAS INFORMAÇÕES OBTIDAS. Por isso, tanto as
                    informações que o usuário se prontifica a fornecer quanto as
                    informações coletadas automaticamente são utilizadas para
                    mensurar o uso da plataforma, bem como para administrar os
                    serviços prestados, aperfeiçoá-lo e identificar possíveis
                    necessidades dos usuários.
                </p>

                <p>
                    A F10 envia e-mails, e o usuário desde já autoriza que ela o
                    faça, responsabilizando-se pelos dados ofertados, com
                    alertas e comunicados relacionados às funções da plataforma
                    no intuito permitir que o usuário explore todas as suas
                    funcionalidades, bem como com informações relevantes à
                    contabilidade, planejamento financeiro ou questões
                    referentes à gestão empresarial, entre outros tipos.
                </p>

                <p>
                    A F10 PODERÁ OFERECER SERVIÇOS PERSONALIZADOS, CONDUZIR
                    PESQUISAS E TESTAR RECURSOS EM DESENVOLVIMENTO, SOB SUA
                    TOTAL RESPONSABILIDADE.
                </p>

                <p>
                    ALÉM DISSO, A F10 USA AS INFORMAÇÕES PARA OFERECER SERVIÇOS
                    DE CONTABILIDADE PARA EMPRESAS A QUEM SÃO EMITIDAS AS NOTAS
                    FISCAIS DIRETAMENTE NA PLATAFORMA. O USUÁRIO AUTORIZA DESDE
                    JÁ QUE A F10 ACESSE DADOS DOS DESTINATÁRIOS DAS NOTAS
                    FISCAIS EMITIDAS, NO INTUITO DE POSSIBILITAR A OFERTA DE
                    SERVIÇOS F10.
                </p>

                <p>
                    AS INFORMAÇÕES NÃO SERÃO DIVULGADAS, VENDIDAS OU ALUGADAS
                    PARA QUALQUER ORGANIZAÇÃO OU ENTIDADE, TAMPOUCO COM ELAS
                    SERÁ FEITA PERMUTA SEM ANTES COMUNICAR AO USUÁRIO E OBTER
                    SEU CONSENTIMENTO EXPRESSO, COM EXCEÇÃO DE INFORMAÇÕES
                    EXIGIDAS POR LEIS OU POR ORDEM JUDICIAL.
                </p>

                <p>
                    Os “cookies” depositados nas máquinas dos usuários não
                    coleta informações identificadoras do Usuário, mas apresenta
                    informações de forma global e são necessários para
                    aperfeiçoar a navegação na plataforma.
                </p>

                <p>
                    A F10 contabiliza os números de visitas em seu site e em
                    todas as suas páginas subjacentes, inclusive mediante
                    utilização de cookies, de forma a melhorar a qualidade dos
                    serviços prestados.
                </p>

                <p>
                    AS ANÁLISES ESTATÍSTICAS E GENÉRICAS SOBRE O COMPORTAMENTO
                    DOS USUÁRIOS PODERÃO SER PARTILHADAS, MAS O USUÁRIO JAMAIS
                    EM HIPÓTESE ALGUMA SERÁ INDIVIDUALMENTE IDENTIFICADO.
                </p>

                <p>
                    AO PREENCHER O FORMULÁRIO E FORNECER AS INFORMAÇÕES À F10, O
                    USUÁRIO DECLARA QUE PERMITE O PROCESSAMENTO DE DADOS
                    PESSOAIS CONFORME ESTABELECIDO NESTE TERMO.
                </p>

                <p>
                    Na plataforma pode conter links a outros web sites. E a
                    presente declaração de privacidade não abrange os referidos
                    sites, não podendo a F10 ser responsabilizada pelas práticas
                    de privacidade de outros sites.
                </p>

                <p>
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
            </section>

            <!-- 3. DO ARMAZENAMENTO E EXCLUSÃO DAS INFORMAÇÕES E DADOS PESSOAIS -->
            <section id="armazenamento-exclusao" class="scroll-mt-28 space-y-3">
                <h2 class="text-lg font-semibold text-slate-900">
                    3. DO ARMAZENAMENTO E EXCLUSÃO DAS INFORMAÇÕES E DADOS
                    PESSOAIS
                </h2>

                <p>
                    O usuário poderá ter acesso às suas informações pessoais que
                    inclui no momento do cadastro e às informações que incluiu
                    na plataforma (notas fiscais e informações bancárias)
                    através do acesso à plataforma.
                </p>

                <p>
                    A F10 armazenará todos os dados e informações pelo tempo que
                    entender necessário e até a exclusão de sua conta e rescisão
                    de contrato de prestação de serviços.
                </p>

                <p>
                    O usuário poderá realizar a exclusão de sua conta a qualquer
                    momento, bastando fazê-lo também através da plataforma,
                    respeitadas as obrigações existentes no contrato de
                    prestação de serviços.
                </p>

                <p>
                    Quando o usuário exclui sua conta e rescinde o contrato, os
                    dados pessoais serão excluídos, porém são mantidas as
                    informações de guarda obrigatória, conforme determinação
                    legal.
                </p>

                <p>
                    Caso o usuário tenha qualquer dúvida quanto à presente
                    política de privacidade, poderá entrar em contato com a F10
                    através da plataforma ou atendimento online junto ao site
                    www.F10.com.br.
                </p>
            </section>

            <!-- 4. DEFINIÇÕES -->
            <section id="definicoes" class="scroll-mt-28 space-y-3">
                <h2 class="text-lg font-semibold text-slate-900">
                    4. DEFINIÇÕES
                </h2>

                <p>
                    4.1. F10 – Quando mencionamos “F10” no presente termos, o
                    usuário deve ter ciência que referimo-nos à empresa F10
                    Comércio de Computadores de Softwares Ltda, (CNPJ sob n.
                    06.027.705/0001-89), a qual é empresa desenvolvedora do
                    sistema F10 e todos os demais recursos aqui citados,
                    detentora de todo e qualquer direito relacionado a ela.
                </p>

                <p>
                    4.2. USUÁRIO – Pessoa física ou jurídica que aderiu aos
                    termos e aceitou as condições da presente TERMO DE USO para
                    utilização do sistema F10 e Pessoa física ou jurídica que
                    contratou os serviços da empresa F10 nos termos do CONTRATO
                    DE PRESTAÇÃO DE SERVIÇOS E DE LICENÇA DE SOFTWARE.
                </p>

                <p>
                    4.3. SISTEMA F10 – plataforma virtual onde o usuário insere
                    todas as informações que possibilitam o acesso ao sistema e,
                    consequentemente, a utilização dos serviços.
                </p>

                <p>4.4. SITE: www.F10.com.br;</p>

                <p>
                    4.5. DADOS PESSOAIS – quaisquer dados incluídos pelo usuário
                    na Plataforma/Site e que permitam a identificação do
                    usuário, os quais incluem nome, email, CNPJ, endereço de
                    sede da empresa, etc.;
                </p>

                <p>
                    4.6. DADOS DE CONTA – quaisquer dados que o Usuário insira
                    no Sistema/site ao se cadastrar no site, como, por exemplo,
                    dados de conta bancária, número de agência e conta bancária,
                    bem como quaisquer outros dados bancários, inclusive cartões
                    de crédito dos Usuários.
                </p>

                <p>
                    4.7. DADOS FINANCEIROS – qualquer informação passível de
                    identificação no momento da importação de nota fiscal e/ou
                    no extrato bancário, bem como informações sobre o pagamento,
                    o que inclui informações de conta, dados de faturamento,
                    número de cartão de crédito ou débito, informações
                    referentes à dívidas ou investimentos, etc.
                </p>

                <p>
                    4.8. DADOS DE ACESSO – informações coletadas de Usuários no
                    momento da navegação referentes ao domínio do seu provedor
                    de acesso à internet, o endereço de protocolo IP, o sistema
                    operacional, data e cidade de acesso, etc.
                </p>
            </section>

            <!-- 5. CONTROLE SOBRE SUA INFORMAÇÃO -->
            <section
                id="controle-sua-informacao"
                class="scroll-mt-28 space-y-3"
            >
                <h2 class="text-lg font-semibold text-slate-900">
                    5. CONTROLE SOBRE SUA INFORMAÇÃO
                </h2>

                <p>
                    <strong
                        >Configurações de perfil e compartilhamento de dados:</strong
                    >
                </p>

                <p>
                    Você pode atualizar as informações do seu perfil, como o seu
                    nome de usuário, e-mail e permissões de acesso diretamente
                    no F10, se precisar de assistência, pode enviar um email
                    para o suporte ao cliente em sucesso@f10.com.br
                </p>

                <p>
                    <strong
                        >Como controlar suas preferências de comunicação:</strong
                    >
                </p>

                <p>
                    Você pode parar de receber nossas comunicações promocionais
                    por email clicando no “link de cancelamento de assinatura”
                    fornecido nessas comunicações ou no Painel do usuário,
                    acessando Configurações e selecionando suas preferências de
                    email. Você não pode optar por não receber comunicações
                    relacionadas ao serviço (por exemplo, verificação de conta,
                    comunicações transacionais, alterações / atualizações dos
                    recursos do Serviço, avisos técnicos e de segurança).
                </p>

                <p>
                    <strong>Modificando ou excluindo suas informações:</strong>
                </p>

                <p>
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
            </section>

            <!-- 6. COMO ENTRAR EM CONTATO CONOSCO -->
            <section id="como-entrar-contato" class="scroll-mt-28 space-y-3">
                <h2 class="text-lg font-semibold text-slate-900">
                    6. COMO ENTRAR EM CONTATO CONOSCO
                </h2>

                <p>
                    Se você tiver alguma dúvida sobre esta Política de
                    Privacidade ou sobre o Serviço, entre em contato conosco em
                    sucesso@f10.com.br.
                </p>
            </section>

            <!-- 7. ALTERAÇÕES À NOSSA POLÍTICA DE PRIVACIDADE -->
            <section id="alteracoes-politica" class="scroll-mt-28 space-y-3">
                <h2 class="text-lg font-semibold text-slate-900">
                    7. ALTERAÇÕES À NOSSA POLÍTICA DE PRIVACIDADE
                </h2>

                <p>
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

                <p>Última Atualização em 08 de Junho de 2020</p>
            </section>

            <!-- 8. DOS SERVIÇOS EM OBSERVÂNCIA À LGPD -->
            <section id="servicos-lgpd" class="scroll-mt-28 space-y-3">
                <h2 class="text-lg font-semibold text-slate-900">
                    8. DOS SERVIÇOS EM OBSERVÂNCIA À LGPD
                </h2>

                <p>
                    A F10 procederá com os serviços de forma a viabilizar a
                    observância pelo cliente às regras da LGPD, restando claro
                    que a LGPD não estabelece de maneira específica quais
                    padrões, meios técnicos ou processos devem ser aplicados
                    para que os dados obtidos sejam considerados suficientemente
                    anonimizados.
                </p>

                <p>
                    A F10 executará os trabalhos a partir das premissas da LGPD,
                    em especial os princípios da finalidade, adequação,
                    transparência, livre acesso, segurança, prevenção e não
                    discriminação no tratamento dos dados.
                </p>

                <p>
                    As partes concordam que o desenvolvimento, sempre que
                    possível, observará que o consentimento do usuário no
                    fornecimento de dados deverá ser livre, informado,
                    inequívoco e relacionado a uma determinada finalidade.
                </p>

                <p>
                    No que toca aos dados eventualmente armazenados pela F10,
                    esta possui processos internos de governança para a proteção
                    dos dados, devendo o cliente na execução e utilização em
                    seus negócios relacionados aos serviços contratados observar
                    a LGPD e as premissas de governança com seus colaboradores e
                    prestadores de serviços regularmente aceitas no tratamento
                    dos dados obtidos dos clientes.
                </p>

                <p>
                    No decorrer do contrato originário, a F10 poderá recusar
                    regras de negócios definidas pelo cliente que visem frustrar
                    os objetivos da LGPD, ou mesmo proceder com o
                    desenvolvimento requerido pelo cliente em contrariedade
                    direta ou indireta à LGPD, e nesta hipótese, a LICENCIANTE
                    se exime de qualquer responsabilidade perante o LICENCIADO
                    ou terceiros.
                </p>
            </section>

            <!-- 9. DA INDICAÇÃO DE CONTATOS PELAS PLATAFORMAS ELETRÔNICAS -->
            <section id="indicacao-contatos" class="scroll-mt-28 space-y-3">
                <h2 class="text-lg font-semibold text-slate-900">
                    9. DA INDICAÇÃO DE CONTATOS PELAS PLATAFORMAS ELETRÔNICAS
                </h2>

                <p>
                    As plataformas eletrônicas da F10, em especial o App F10
                    SmartAluno, disponível no Google Play Store e App Store,
                    permitem que usuários cadastrados indiquem contatos para que
                    estes recebam vantagens, como prêmios, aulas gratuitas ou
                    descontos em cursos.
                </p>

                <p>
                    Os dados de terceiros informados pelos usuários cadastrados
                    são apenas os essenciais para que o contato indicado seja
                    contatado para recebimento de sua vantagem, ou seja, apenas
                    são cadastrados nome e número de telefone do contato
                    indicado. A F10 somente trata os dados pessoais de amigos
                    indicados após o consentimento de seu titular quanto ao
                    contato. Não havendo consentimento do titular, os dados
                    indicados são imediatamente excluídos das plataformas.
                </p>

                <p>Curitiba, 08 de Junho de 2020</p>

                <p>F10 Comércio de Computadores de Softwares Ltda</p>
            </section>
        </article>
    </div>
</section>
