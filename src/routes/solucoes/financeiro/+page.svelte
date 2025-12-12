<script lang="ts">
    // ===== Imports =====
    import Breadcrumb from "$lib/components/Breadcrumb.svelte";
    import FaqAccordion from "$lib/components/FaqAccordion.svelte";
    import { contactModalConfig } from "$lib/stores/contactModals";
    import { showForm } from "$lib/stores/formPopup";
    import { Banknote, ArrowRight, CheckCircle2 } from "lucide-svelte";

    // ===== Tipos =====
    type IconComponent = typeof Banknote;

    type BillingChannel = {
        tag: string;
        title: string;
        description: string;
    };

    type FlowStep = {
        label: string;
        title: string;
        description: string;
    };

    type FaqItem = {
        question: string;
        answer: string;
    };

    type FinanceShortcut = {
        id: string;
        imgSrc: string;
        alt: string;
        labelLine1: string;
        labelLine2?: string;
    };

    type FinanceRow = {
        contract: string;
        person: string;
        holder: string;
        parcel: string;
        type: string;
        typeColor: string;
        bank: string;
        form: string;
        due: string;
        pay: string;
        value: string;
        className: string;
    };

    type FinanceFunction = {
        label: string;
    };

    type TuitionParcel = {
        description: string;
        due: string;
        value: string;
        calc: string;
        paid: string;
        receive?: boolean;
        isCurrent?: boolean;
    };

    // ===== Cobrança de mensalidade (Etapa 1 - gerar cobrança) =====
    const tuitionParcels: TuitionParcel[] = [
        {
            description: "Parcela - 01",
            due: "26/11/2024",
            value: "R$ 200,00",
            calc: "R$ 200,00",
            paid: "R$ 200,00",
            receive: false,
        },
        {
            description: "Parcela - 02",
            due: "01/12/2024",
            value: "R$ 200,00",
            calc: "R$ 200,00",
            paid: "—",
            receive: true,
            isCurrent: true,
        },
        {
            description: "Parcela - 03",
            due: "01/01/2025",
            value: "R$ 200,00",
            calc: "R$ 200,00",
            paid: "—",
        },
        {
            description: "Parcela - 04",
            due: "01/02/2025",
            value: "R$ 200,00",
            calc: "R$ 200,00",
            paid: "—",
        },
        {
            description: "Parcela - 05",
            due: "01/03/2025",
            value: "R$ 200,00",
            calc: "R$ 200,00",
            paid: "—",
        },
        {
            description: "Parcela - 06",
            due: "01/04/2025",
            value: "R$ 200,00",
            calc: "R$ 200,00",
            paid: "—",
        },
        {
            description: "Parcela - 07",
            due: "01/05/2025",
            value: "R$ 200,00",
            calc: "R$ 200,00",
            paid: "—",
        },
        {
            description: "Parcela - 08",
            due: "01/06/2025",
            value: "R$ 200,00",
            calc: "R$ 200,00",
            paid: "—",
        },
        {
            description: "Parcela - 09",
            due: "01/07/2025",
            value: "R$ 200,00",
            calc: "R$ 200,00",
            paid: "—",
        },
    ];

    // ===== Funções chave do módulo Financeiro (para os badges) =====
    const financeFunctions: FinanceFunction[] = [
        { label: "Recebimento de mensalidades" },
        { label: "Cobrança de mensalidades (boletos, PIX e cartão)" },
        { label: "Movimentação financeira diária" },
        { label: "Nota fiscal eletrônica (emissão, cancelamento, XML)" },
        { label: "Contas a pagar e fornecedores" },
        { label: "Cadastro e gerenciamento de caixas e bancos" },
        { label: "Plano de contas da escola" },
        { label: "Orçamento de receitas e despesas" },
        { label: "Realização de receitas e despesas" },
        { label: "Conciliação bancária" },
        { label: "Extratos bancários integrados" },
        { label: "Indicadores e dashboards gerenciais" },
    ];

    // ===== Ribbon financeiro (atalhos) =====
    const financeShortcuts: FinanceShortcut[] = [
        {
            id: "recebimento",
            imgSrc: "/financeiro_recebimento.webp",
            alt: "Recebimento de Mensalidades",
            labelLine1: "Recebimento",
            labelLine2: "de Mensalidades",
        },
        {
            id: "cobranca",
            imgSrc: "/financeiro_cobranca_mensalidade.webp",
            alt: "Cobranças de Mensalidades",
            labelLine1: "Cobranças",
            labelLine2: "de Mensalidades",
        },
        {
            id: "contas-pagar",
            imgSrc: "/financeiro_contas_pagar.webp",
            alt: "Contas a pagar",
            labelLine1: "Contas",
            labelLine2: "a pagar",
        },
        {
            id: "movimentacoes",
            imgSrc: "/financeiro_movimentacao.webp",
            alt: "Movimentações Financeiras",
            labelLine1: "Movimentações",
            labelLine2: "Financeiras",
        },
        {
            id: "nota-fiscal",
            imgSrc: "/financeiro_nota.webp",
            alt: "Nota Fiscal Eletrônica",
            labelLine1: "Nota Fiscal",
            labelLine2: "Eletrônica",
        },
        {
            id: "orcamento-receita",
            imgSrc: "/financeiro_orcamento_contas.webp",
            alt: "Receitas e despesas",
            labelLine1: "Receitas",
            labelLine2: "e despesas",
        },
        {
            id: "plano-contas",
            imgSrc: "/financeiro_plano_contas.webp",
            alt: "Plano de Contas",
            labelLine1: "Plano",
            labelLine2: "de Contas",
        },
        {
            id: "fluxo-caixa",
            imgSrc: "/financeiro_fluxo_caixa.webp",
            alt: "Fluxo de Caixa",
            labelLine1: "Fluxo",
            labelLine2: "de Caixa",
        },
    ];

    // ===== Linhas da grade (amostra realista) =====
    const financeRows: FinanceRow[] = [
        // RECEITAS – MENSALIDADES / MATRÍCULAS / SERVIÇOS
        {
            contract: "7066",
            person: "Alberto Braz Silva",
            holder: "José da Cintra",
            parcel: "12/20",
            type: "Parcela",
            typeColor: "#16A34A",
            bank: "Dinheiro",
            form: "Boleto · Liquidado manualmente na secretaria",
            due: "07/02/24",
            pay: "23/10/25",
            value: "R$ 100,00",
            className: "17/FMC 17 · English Kids",
        },
        {
            contract: "9663",
            person: "Amanda Mark Silva",
            holder: "Amanda Mark Silva",
            parcel: "12/19",
            type: "Parcela",
            typeColor: "#16A34A",
            bank: "Rede",
            form: "Boleto · Liquidado manualmente: Dinheiro, Secretaria",
            due: "07/01/24",
            pay: "30/10/25",
            value: "R$ 251,10",
            className: "English Kids",
        },
        {
            contract: "9211",
            person: "José da Cintra",
            holder: "José da Cintra",
            parcel: "00/01",
            type: "Matrícula",
            typeColor: "#22C55E",
            bank: "F10 Cel_Cash Produção",
            form: "Secretaria · Banco",
            due: "08/03/23",
            pay: "23/10/25",
            value: "R$ 150,00",
            className: "Administração Avançada",
        },
        {
            contract: "9600",
            person: "Aluno Silva",
            holder: "Aluno Silva",
            parcel: "01/03",
            type: "Material",
            typeColor: "#22C55E",
            bank: "PIX",
            form: "Secretaria · Dinheiro",
            due: "31/10/25",
            pay: "18/11/25",
            value: "R$ 199,00",
            className: "Inglês Básico",
        },
        {
            contract: "9571",
            person: "Samuel Ribeiro da Silva",
            holder: "Samuel Ribeiro da Silva",
            parcel: "00/01",
            type: "Matrícula",
            typeColor: "#22C55E",
            bank: "F10 Cel_Cash Produção",
            form: "Secretaria · Banco",
            due: "31/10/25",
            pay: "25/11/25",
            value: "R$ 100,00",
            className: "Curso Livre F10 · ABC · EAD",
        },
        {
            contract: "9530",
            person: "Aluno Testes",
            holder: "Pai do Aluno",
            parcel: "01/02",
            type: "Parcela",
            typeColor: "#16A34A",
            bank: "Dinheiro",
            form: "Secretaria · Dinheiro",
            due: "26/10/25",
            pay: "25/10/25",
            value: "R$ 150,00",
            className: "EAD · Testes 2 F10 Novembro",
        },
        {
            contract: "9569",
            person: "Ane Catarine Oliveira",
            holder: "Ane Catarine Oliveira",
            parcel: "00/01",
            type: "Matrícula",
            typeColor: "#22C55E",
            bank: "PIX",
            form: "Secretaria · Crédito 1x",
            due: "31/10/25",
            pay: "09/11/25",
            value: "R$ 99,00",
            className: "18/ACC 07 A · Inglês Básico",
        },

        // RECEITAS – LIVROS / PRODUTOS / EVENTOS
        {
            contract: "12001",
            person: "Mayara da Cintra",
            holder: "Mayara da Cintra",
            parcel: "-1",
            type: "Livro",
            typeColor: "#2563EB",
            bank: "F10 Cel_Cash Produção",
            form: "Banco",
            due: "04/12/24",
            pay: "04/12/24",
            value: "R$ 1,00",
            className: "Curso Livre F10 (100% Presencial)",
        },
        {
            contract: "12002",
            person: "Carlos da Silva",
            holder: "Carlos da Silva",
            parcel: "-1",
            type: "Livro",
            typeColor: "#2563EB",
            bank: "Dinheiro",
            form: "Secretaria · Dinheiro",
            due: "19/12/24",
            pay: "19/12/24",
            value: "R$ 20,00",
            className: "Turma de Teste",
        },
        {
            contract: "12003",
            person: "Zacharie Lousidor",
            holder: "Zacharie Lousidor",
            parcel: "-1",
            type: "Livro",
            typeColor: "#2563EB",
            bank: "Dinheiro",
            form: "Secretaria · Dinheiro",
            due: "07/03/25",
            pay: "07/03/25",
            value: "R$ 10,00",
            className: "Informática Profissionalizante",
        },
        {
            contract: "12004",
            person: "Pedro Mendes Silva",
            holder: "Pedro Mendes Silva",
            parcel: "01/02",
            type: "Livro",
            typeColor: "#2563EB",
            bank: "F10 Cel_Cash Produção",
            form: "Banco",
            due: "07/03/25",
            pay: "07/03/25",
            value: "R$ 10,00",
            className: "English Kids · 2A",
        },
        {
            contract: "13001",
            person: "Cliente (11) 98555-4996",
            holder: "Cliente (11) 98555-4996",
            parcel: "01/02",
            type: "Produto",
            typeColor: "#EC4899",
            bank: "Dinheiro",
            form: "Secretaria · Dinheiro",
            due: "23/10/25",
            pay: "23/10/25",
            value: "R$ 50,00",
            className: "Eventos · Realidade Virtual",
        },
        {
            contract: "13002",
            person: "Graziele da Cintra",
            holder: "Graziele da Cintra",
            parcel: "00/01",
            type: "Palestra",
            typeColor: "#F97316",
            bank: "Dinheiro",
            form: "Secretaria · Dinheiro",
            due: "23/10/25",
            pay: "23/10/25",
            value: "R$ 50,00",
            className: "Campanha Interna · Marketing",
        },
        {
            contract: "9485",
            person: "Aldair Angelos Santos",
            holder: "Aldair Angelos Santos",
            parcel: "01/02",
            type: "Parcela",
            typeColor: "#16A34A",
            bank: "Dinheiro",
            form: "Secretaria · Dinheiro",
            due: "19/12/24",
            pay: "19/12/24",
            value: "R$ 20,00",
            className: "Curso Livre F10 · Tarde",
        },
        {
            contract: "9437",
            person: "Aluno Testes Dois",
            holder: "Aluno Testes Dois",
            parcel: "00/01",
            type: "Parcela",
            typeColor: "#16A34A",
            bank: "Banco",
            form: "Secretaria · Banco",
            due: "05/10/25",
            pay: "15/10/25",
            value: "R$ 99,00",
            className: "English Kids · Noturno",
        },

        // DESPESAS – CONTAS A PAGAR
        {
            contract: "50001",
            person: "Copel Distribuição",
            holder: "Colégio F10 Unidade Centro",
            parcel: "11/11",
            type: "Conta a pagar",
            typeColor: "#DC2626",
            bank: "Banco Itaú",
            form: "Boleto bancário · Débito automático",
            due: "28/11/25",
            pay: "27/11/25",
            value: "R$ 3.480,72",
            className: "Energia elétrica · Unidade Centro",
        },
        {
            contract: "50002",
            person: "Águas do Paraná",
            holder: "Colégio F10 Unidade Centro",
            parcel: "11/11",
            type: "Conta a pagar",
            typeColor: "#F97316",
            bank: "Caixa Escola",
            form: "Boleto bancário · Pagamento no caixa",
            due: "25/11/25",
            pay: "—",
            value: "R$ 842,15",
            className: "Água e esgoto · Unidade Centro",
        },
        {
            contract: "50003",
            person: "Imobiliária Alphaville",
            holder: "Colégio F10 Unidade Centro",
            parcel: "11/12",
            type: "Conta a pagar",
            typeColor: "#F97316",
            bank: "Banco Bradesco",
            form: "TED · Aluguel",
            due: "05/12/25",
            pay: "—",
            value: "R$ 9.500,00",
            className: "Aluguel · Prédio principal",
        },
        {
            contract: "50004",
            person: "Servlimp Terceirização",
            holder: "Colégio F10 Unidade Centro",
            parcel: "11/11",
            type: "Conta a pagar",
            typeColor: "#FB923C",
            bank: "Banco Itaú",
            form: "Transferência · Prestação de serviços",
            due: "30/11/25",
            pay: "29/11/25",
            value: "R$ 4.280,00",
            className: "Limpeza e portaria · Terceirizado",
        },
    ];

    // ===== Canais de cobrança / recorrência =====
    const billingChannels: BillingChannel[] = [
        {
            tag: "APP SMART ALUNO",
            title: "Cobrança pelo app, com suporte oficial F10",
            description:
                "Responsáveis visualizam mensalidades, boletos, PIX e histórico de pagamentos direto no app. Menos filas na secretaria e mais autonomia para o responsável.",
        },
        {
            tag: "PIX, BOLETO E CARTÃO",
            title: "Recebimentos integrados ao caixa da escola",
            description:
                "Pagamentos recorrentes por PIX, boleto e cartão conectado às rotinas de remessa/retorno, baixa automática e relatórios da Movimentação Financeira.",
        },
        {
            tag: "SMS E COMUNICAÇÃO",
            title: "Lembretes de cobrança sem planilhas paralelas",
            description:
                "Envie lembretes de vencimento e cobrança por SMS e integrações de comunicação, usando as próprias informações financeiras cadastradas no sistema.",
        },
    ];

    // ===== Fluxo financeiro no F10 =====
    const flowSteps: FlowStep[] = [
        {
            label: "1",
            title: "Do contrato à geração das parcelas",
            description:
                "Ao fechar a matrícula, o contrato já gera automaticamente as parcelas, formas de pagamento e regras de reajuste que serão controladas pelo Financeiro.",
        },
        {
            label: "2",
            title: "Cobrança e baixa das mensalidades",
            description:
                "Boleto, PIX, cartão, recebimento na escola e importação de arquivo retorno alimentam a baixa automática das parcelas, reduzindo digitação manual.",
        },
        {
            label: "3",
            title: "Lançamentos de despesas e fornecedores",
            description:
                "Contas a Pagar registra fornecedores, contratos recorrentes, impostos, folha e demais despesas, mantendo o fluxo financeiro completo dentro do F10.",
        },
        {
            label: "4",
            title: "Conciliação e dashboards para decisão",
            description:
                "Conciliação bancária, relatórios e dashboards permitem comparar receitas e despesas, acompanhar inadimplência e enxergar a saúde financeira da escola.",
        },
    ];

    // ===== FAQ =====
    const faqItems: FaqItem[] = [
        {
            question:
                "O módulo Financeiro é integrado ao Comercial e ao Pedagógico?",
            answer: "Sim. Parcelas, contratos e mensalidades são geradas a partir do módulo Comercial e Pedagógico, e o Financeiro faz o controle de recebimentos, despesas, conciliações e relatórios. Nada é lançado duas vezes.",
        },
        {
            question: "Como funciona a cobrança de mensalidades no F10?",
            answer: "Você pode controlar cobrança manual, automática, por boleto, PIX e cartão. O sistema trabalha com rotinas de remessa e retorno, baixa automática, lista total de cobranças e recebimentos em caixa ou banco.",
        },
        {
            question: "Consigo controlar Contas a Pagar e fornecedores?",
            answer: "Sim. O módulo Financeiro possui telas de Contas a Pagar, cadastro de fornecedores, formas de pagamento, planos de contas e centros de custo, permitindo organizar todas as despesas da escola.",
        },
        {
            question: "O F10 emite e exporta nota fiscal eletrônica?",
            answer: "O F10 possui rotinas de nota fiscal eletrônica, incluindo emissão, exportação de XML, inutilização e cancelamento, de forma integrada ao financeiro da escola.",
        },
        {
            question: "Existem dashboards de faturamento e fluxo de caixa?",
            answer: "Sim. A partir da Movimentação Financeira e dos dashboards, é possível acompanhar faturamento, receitas, despesas, fluxo de caixa, recebimentos por forma de pagamento e muito mais.",
        },
        {
            question:
                "Como o módulo Financeiro F10 ajuda a reduzir a inadimplência escolar?",
            answer: "O F10 centraliza contratos, parcelas e formas de cobrança em um único lugar, permitindo enviar lembretes de vencimento, organizar acordos, registrar histórico de contato e acompanhar a inadimplência por turma, nível e período. Isso dá previsibilidade ao caixa e reduz o esquecimento de pagamento por parte dos responsáveis.",
        },
        {
            question:
                "Qual a diferença entre o módulo Financeiro F10 e usar planilhas ou ERPs genéricos?",
            answer: "O módulo Financeiro F10 foi pensado especificamente para escolas e cursos, trabalhando junto com matrículas, turmas, contratos, AVA e aplicativo do aluno. Em vez de lançar tudo manualmente em planilhas ou adaptar um ERP genérico, você já recebe as informações prontas do Pedagógico e do Comercial, com relatórios e indicadores desenhados para a realidade educacional.",
        },
        {
            question:
                "Para que tipo de escola o módulo Financeiro F10 é indicado?",
            answer: "O módulo Financeiro é indicado para escolas de educação básica, colégios, cursos livres, escolas de idiomas, ensino técnico e instituições que trabalham com mensalidades recorrentes, matrículas e venda de materiais. Ele atende tanto escolas com uma única unidade quanto redes com várias unidades ou franquias.",
        },
        {
            question:
                "O módulo Financeiro funciona para escolas que têm EAD e ensino híbrido?",
            answer: "Sim. O F10 integra o financeiro com contratos, turmas presenciais, EAD e ensino híbrido, além do AVA e do aplicativo Smart Aluno. Assim, o mesmo responsável consegue acompanhar mensalidades, boletos, Pix e situação financeira independentemente do formato de oferta do curso.",
        },
    ];

    // ===== Realização de Receitas e Despesas (árvore) =====
    type RealizationLine = {
        label: string;
        level: number; // 0 = topo, 1 = grupo, 2+ = subcontas
        highlight?: boolean; // linha azul (Resultado Operacional)
        yearBudget?: number;
        yearRealized?: number;
        janBudget?: number;
        janRealized?: number;
        febBudget?: number;
        febRealized?: number;
    };

    // classes de indentação (para parecer a árvore do sistema)
    const indentClasses = ["pl-2", "pl-6", "pl-10", "pl-14", "pl-18"];

    const rowIndentClass = (level: number) =>
        indentClasses[Math.min(level, indentClasses.length - 1)];

    const formatAmount = (value?: number) =>
        value === undefined
            ? ""
            : value.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
              });

    const realizedClass = (budget?: number, realized?: number) => {
        if (budget === undefined || realized === undefined)
            return "text-slate-800";
        if (realized > budget) return "text-[#16A34A] font-semibold"; // acima do orçado
        return "text-[#DC2626] font-semibold"; // dentro / abaixo
    };

    const realizationLines: RealizationLine[] = [
        {
            label: "Resultado Operacional",
            level: 0,
            highlight: true,
            yearBudget: 900_000, // lucro esperado no ano
            yearRealized: 970_000, // escola performou melhor
            janBudget: 75_000,
            janRealized: 72_500,
            febBudget: 75_000,
            febRealized: 82_000, // fevereiro melhor que o orçado
        },

        // ====== RECEITAS ======
        {
            label: "Receitas",
            level: 1,
            yearBudget: 4_800_000,
            yearRealized: 4_920_000,
            janBudget: 400_000,
            janRealized: 395_000,
            febBudget: 400_000,
            febRealized: 410_000,
        },
        {
            label: "Cursos regulares",
            level: 2,
            yearBudget: 4_000_000,
            yearRealized: 4_080_000,
            janBudget: 335_000,
            janRealized: 332_000,
            febBudget: 335_000,
            febRealized: 342_000,
        },
        {
            label: "Educação Infantil",
            level: 3,
            yearBudget: 1_000_000,
            yearRealized: 1_020_000,
            janBudget: 83_000,
            janRealized: 82_500,
            febBudget: 83_000,
            febRealized: 85_000,
        },
        {
            label: "Ensino Fundamental",
            level: 3,
            yearBudget: 1_900_000,
            yearRealized: 1_940_000,
            janBudget: 160_000,
            janRealized: 158_000,
            febBudget: 160_000,
            febRealized: 165_000,
        },
        {
            label: "Ensino Médio",
            level: 3,
            yearBudget: 900_000,
            yearRealized: 890_000, // um pouco abaixo
            janBudget: 75_000,
            janRealized: 74_000,
            febBudget: 75_000,
            febRealized: 73_500,
        },
        {
            label: "Cursos livres / contraturno",
            level: 3,
            yearBudget: 200_000,
            yearRealized: 230_000, // acima do orçado (vermelho)
            janBudget: 17_000,
            janRealized: 17_500,
            febBudget: 17_000,
            febRealized: 19_000,
        },
        {
            label: "Livros e materiais",
            level: 2,
            yearBudget: 400_000,
            yearRealized: 380_000, // ficou abaixo (verde)
            janBudget: 40_000,
            janRealized: 35_000,
            febBudget: 40_000,
            febRealized: 38_000,
        },
        {
            label: "Serviços extras e eventos",
            level: 2,
            yearBudget: 250_000,
            yearRealized: 260_000,
            janBudget: 18_000,
            janRealized: 19_500,
            febBudget: 18_000,
            febRealized: 21_000,
        },
        {
            label: "Outras receitas",
            level: 2,
            yearBudget: 150_000,
            yearRealized: 200_000, // receita acima do previsto
            janBudget: 7_000,
            janRealized: 8_500,
            febBudget: 7_000,
            febRealized: 10_000,
        },

        // ====== DESPESAS ======
        {
            label: "Despesas",
            level: 1,
            yearBudget: 3_900_000,
            yearRealized: 3_950_000,
            janBudget: 325_000,
            janRealized: 322_500,
            febBudget: 325_000,
            febRealized: 328_000,
        },
    ];

    function openFinanceModal() {
        contactModalConfig.set({
            defaultMessage:
                "Quero agendar uma demonstração do aplicativo Financeiro",
            product: "F10 – Financeiro",
            subSource: "Modal Financeiro – dobra 1",
            leadDescription: "Contato iniciado pelo formulário do Financeiro.",
        });

        showForm.set(true);
    }
    function openFinancePresentationModal() {
        contactModalConfig.set({
            defaultMessage:
                "Quero agendar uma demonstração do aplicativo Financeiro",
            product: "F10 – Financeiro",
            subSource: "Modal Financeiro – Final da página",
            leadDescription: "Contato iniciado pelo formulário do Financeiro.",
        });

        showForm.set(true);
    }
</script>

<svelte:head>
    <title
        >Financeiro escolar — cobranças, mensalidades e fluxo de caixa | F10
        Software</title
    >
    <meta
        name="description"
        content="Controle financeiro completo para escolas: contas a pagar e a receber, cobrança de mensalidades, PIX, boleto, cartão, notas fiscais, conciliação bancária e dashboards integrados ao F10."
    />
    <meta
        property="og:title"
        content="Financeiro escolar — cobranças, mensalidades e fluxo de caixa | F10 Software"
    />
    <meta
        property="og:description"
        content="Centralize o financeiro da sua escola no F10: cobranças, recebimentos, despesas, fluxo de caixa, notas fiscais e conciliação bancária em um único sistema integrado aos contratos."
    />

    <meta
        property="og:image"
        content="https://f10.com.br/og/financeiro-escolar-f10.jpg"
    />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://f10.com.br/solucoes/financeiro" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta
        name="twitter:title"
        content="Financeiro escolar — cobranças, mensalidades e fluxo de caixa | F10 Software"
    />
    <meta
        name="twitter:description"
        content="Centralize o financeiro da sua escola no F10: cobranças, recebimentos, despesas, fluxo de caixa, notas fiscais e conciliação bancária em um único sistema integrado aos contratos."
    />

    <link rel="canonical" href="https://f10.com.br/solucoes/financeiro" />
</svelte:head>

<!-- ===== HERO FINANCEIRO ===== -->
<section
    class="relative isolate flex min-h-screen max-h-[900px] flex-col overflow-hidden bg-white/80"
>
    <!-- Breadcrumb -->
    <div class="pb-3 pt-4">
        <Breadcrumb
            baseUrl="https://f10.com.br"
            items={[
                { label: "HOME", href: "/" },
                { label: "SOLUÇÕES", href: "/solucoes" },
                { label: "FINANCEIRO E COBRANÇA" },
            ]}
        />
    </div>

    <!-- Conteúdo do hero: texto em cima + tela embaixo -->
    <div class="container flex flex-1 flex-col pb-16">
        <!-- TÍTULO / SUBTÍTULO / CTA -->
        <div class="mx-auto max-w-6xl text-center pt-4 pb-10 md:pb-12 lg:pb-14">
            <h1
                class="mt-4 mx-auto text-[30px] sm:text-[38px] md:text-[44px]
           font-semibold leading-[1.1] tracking-[-0.03em] text-[#010D28]"
            >
                Sistema financeiro escolar para controle de mensalidades e
                cobranças
            </h1>

            <p
                class="mt-3 max-w-[640px] mx-auto text-[15px] md:text-[17px]
           leading-[1.8] text-[#000A57]/85"
            >
                Centralize mensalidades, boletos, PIX, cartões, contas a pagar e
                fluxo de caixa em um único painel integrado ao F10.
            </p>

            <div class="mt-6 flex justify-center">
                <button
                    type="button"
                    on:click={openFinanceModal}
                    class="inline-flex items-center justify-center gap-3 rounded-full
             bg-[#EA6D0B] px-8 md:px-10 py-3.5 text-[15px] md:text-[16px]
             font-semibold text-white shadow-[0_14px_40px_rgba(234,109,11,0.45)]
             hover:brightness-110 focus:outline-none
             focus:ring-2 focus:ring-[#EA6D0B]/60"
                >
                    <span>Agendar apresentação</span>
                    <ArrowRight size={20} />
                </button>
            </div>
        </div>

        <!-- “TELA” DO SISTEMA (fica abaixo do texto e corta no fim do hero) -->
        <div class="relative mx-auto w-full flex-1">
            <figure
                class="relative z-0 overflow-hidden rounded-[18px]
                       border border-[#D4D7E3] bg-[#F2F3FA]
                       shadow-[0_18px_45px_rgba(15,23,42,0.18)]"
            >
                <!-- Barra principal: menu -->
                <div
                    class="flex items-center border-b border-[#D4D7E3]
                           bg-[#F2F3FA] px-4 py-1.5 text-[11px] text-[#4B5563]"
                >
                    <span class="font-semibold text-[#111827] mr-3">
                        Meu F10
                    </span>
                    <span class="mr-3">Cadastros</span>
                    <span class="mr-3">Comercial</span>
                    <span class="mr-3">Pedagógico</span>
                    <span class="mr-3 font-semibold text-primary">
                        Financeiro
                    </span>
                    <span>Sistema</span>
                </div>

                <!-- Ribbon de ícones + logo F10 na mesma linha -->
                <div
                    class="flex items-center justify-between border-b border-[#D4D7E3]
                           bg-[#F5F6FC] px-4 py-3"
                >
                    <!-- Ícones do financeiro -->
                    <div
                        class="grid grid-cols-4 gap-3 md:grid-cols-6 lg:grid-cols-8 flex-1"
                    >
                        {#each financeShortcuts as shortcut}
                            <div
                                class="flex flex-col items-center gap-1 rounded-[12px]
                                       bg-gradient-to-b from-white/40 via-white/15 to-transparent
                                       px-3 py-2 text-center"
                            >
                                <img
                                    src={shortcut.imgSrc}
                                    alt={shortcut.alt}
                                    class="h-8 w-auto object-contain"
                                    loading="lazy"
                                />
                                <span
                                    class="text-[10px] leading-[1.15] text-[#111827]"
                                >
                                    {shortcut.labelLine1}
                                    {#if shortcut.labelLine2}
                                        <br />
                                        {shortcut.labelLine2}
                                    {/if}
                                </span>
                            </div>
                        {/each}
                    </div>

                    <!-- Logo F10 alinhada aos ícones -->
                    <div class="ml-4 hidden md:block">
                        <img
                            src="/logo_f10_3.webp"
                            alt="F10 Software"
                            class="h-16 w-auto"
                            loading="lazy"
                        />
                    </div>
                </div>

                <!-- ABA / TÍTULO DA GRADE -->
                <div class="px-4 pt-3 pb-2">
                    <div
                        class="inline-flex items-center gap-2 rounded-t-xl bg-slate-100
                               px-3 py-1.5 text-[12px] font-semibold text-slate-700
                               border border-b-0 border-slate-200"
                    >
                        <span
                            class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10"
                        >
                            <span class="h-2 w-2 bg-primary rounded-[3px]"
                            ></span>
                        </span>
                        <span>Movimentações financeiras</span>
                    </div>
                </div>

                <!-- Cabeçalho da grade -->
                <div class="border-b border-[#D4D7E3] bg-white px-3 py-1.5">
                    <div
                        class="grid grid-cols-[0.9fr,1.4fr,1.2fr,0.7fr,0.9fr,0.9fr,1.6fr,0.9fr,0.9fr,0.9fr,1.4fr]
                               gap-2 rounded-[6px] bg-[#EEF1F8] px-2.5 py-1
                               text-[10px] font-semibold text-[#4B5563]"
                    >
                        <span>Contrato</span>
                        <span>Pessoa</span>
                        <span>Titular</span>
                        <span>Parcela</span>
                        <span>Tipo</span>
                        <span>Banco</span>
                        <span>Forma de Recebimento</span>
                        <span>Vencimento</span>
                        <span>Pagamento</span>
                        <span>Valor</span>
                        <span>Conta / Turma</span>
                    </div>
                </div>

                <!-- Linhas da grade -->
                <div class="bg-white px-3 pb-2 pt-1">
                    {#each financeRows as row, i}
                        <div
                            class={`grid grid-cols-[0.9fr,1.4fr,1.2fr,0.7fr,0.9fr,0.9fr,1.6fr,0.9fr,0.9fr,0.9fr,1.4fr]
                                    gap-2 px-2.5 py-1 text-[11px]
                                    ${
                                        i % 2 === 0
                                            ? "bg-white"
                                            : "bg-[#F8FAFC]"
                                    }`}
                        >
                            <span class="truncate text-[#111827]">
                                {row.contract}
                            </span>
                            <span class="truncate text-[#111827]">
                                {row.person}
                            </span>
                            <span class="truncate text-[#111827]">
                                {row.holder}
                            </span>
                            <span class="truncate text-[#111827]">
                                {row.parcel}
                            </span>

                            <!-- Tipo com quadrado colorido -->
                            <span class="flex items-center gap-1">
                                <span
                                    class="inline-flex min-w-[82px]
                                           px-2 py-0.5 text-[10px] font-semibold text-white"
                                    style={`background-color:${row.typeColor};`}
                                >
                                    {row.type}
                                </span>
                            </span>

                            <span class="truncate text-[#111827]">
                                {row.bank}
                            </span>
                            <span class="truncate text-[#4B5563]">
                                {row.form}
                            </span>
                            <span class="tabular-nums text-[#111827]">
                                {row.due}
                            </span>
                            <span class="tabular-nums text-[#111827]">
                                {row.pay}
                            </span>
                            <span class="tabular-nums text-[#111827]">
                                {row.value}
                            </span>
                            <span class="truncate text-[#4B5563]">
                                {row.className}
                            </span>
                        </div>
                    {/each}
                </div>

                <!-- Status bar inferior -->
                <div
                    class="flex items-center justify-between border-t border-[#D4D7E3]
                           bg-[#F3F4F6] px-3 py-1.5 text-[10px] text-[#4B5563]"
                >
                    <span class="truncate">
                        Movimentações ocorridas no intervalo de
                        <span class="font-semibold"> 01/12/24 </span>
                        a
                        <span class="font-semibold"> 29/11/25 </span>
                        e Tipo de Cobrança seja
                        <span class="font-semibold">
                            Boleto Bancário | Caixa Escola | PIX | Cartão de
                            Crédito
                        </span>.
                    </span>
                    <span class="hidden md:inline whitespace-nowrap">
                        1.757 registros · versão 3.0 Financeiro F10
                    </span>
                </div>
            </figure>
        </div>
    </div>
</section>

<!-- ===== O QUE O MÓDULO FINANCEIRO ENTREGA ===== -->
<section class="relative py-12 md:py-16 bg-white">
    <div class="container">
        <div class="grid gap-8 lg:grid-cols-3 lg:items-stretch">
            <!-- Card escuro com imagem de fundo e chamada -->
            <article
                class="relative overflow-hidden rounded-[24px]
                       px-6 py-7 md:px-8 md:py-8
                       bg-[#0B1020] text-white
                       shadow-[0_22px_60px_rgba(1,13,40,0.60)]"
            >
                <!-- booble invertido de fundo -->
                <div
                    class="absolute pointer-events-none select-none"
                    style="
                      width: 1288.32px;
                      height: 843.67px;
                      left: -265.53px;
                      top: 14.84px;
                    "
                >
                    <img
                        src="/booble_bg.webp"
                        alt=""
                        aria-hidden="true"
                        class="absolute inset-0 h-full w-full object-cover opacity-30 transform-gpu origin-center"
                        style="transform: rotate(-246.48deg) scale(1.24);"
                    />
                </div>

                <!-- brilho -->
                <div
                    class="pointer-events-none absolute -top-32 -left-24
                           h-[480px] w-[480px] rounded-full
                           bg-[radial-gradient(closest-side,rgba(255,255,255,0.08),transparent)]"
                ></div>

                <!-- conteúdo do card -->
                <div
                    class="relative flex h-full flex-col justify-between gap-4"
                >
                    <div class="space-y-3">
                        <h2
                            class="text-[22px] md:text-[32px] font-semibold
                                   leading-[1.2] tracking-[-0.02em]"
                        >
                            O que é o módulo financeiro escolar F10 Software?
                        </h2>

                        <p
                            class="text-[14px] md:text-[16px] leading-[1.8]
                                   text-[#D1D5F0]"
                        >
                            O módulo financeiro F10 é um sistema financeiro
                            escolar que integra contratos, cobrança de
                            mensalidades, contas a pagar, fluxo de caixa e
                            relatórios em um único lugar, voltado para escolas,
                            cursos livres e instituições de ensino.
                        </p>
                    </div>
                </div>
            </article>

            <!-- Conteúdo à direita com badges e ícone de check -->
            <div class="lg:col-span-2 flex flex-col justify-center">
                <p
                    class="text-[15px] md:text-[16px] leading-[1.9]
                           text-[#000A57]/85 mb-4"
                >
                    O módulo Financeiro cuida de todas as rotinas críticas do
                    caixa da escola — da cobrança de mensalidades às análises
                    gerenciais — sem depender de controles paralelos.
                </p>

                <div class="grid gap-2 sm:grid-cols-2">
                    {#each financeFunctions as fn}
                        <div class="inline-flex items-center gap-2">
                            <CheckCircle2
                                size={16}
                                class="flex-shrink-0 text-[#16A34A]"
                            />
                            <span class="leading-snug">{fn.label}</span>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    </div>
</section>

<!-- ===== COBRANÇA DE MENSALIDADES — ETAPA 1: GERAR COBRANÇA ===== -->
<section class="relative py-12 md:py-16 bg-white/80">
    <div class="container">
        <div class="grid gap-10 lg:grid-cols-12 lg:items-center">
            <!-- TEXTO (ESQUERDA) -->
            <div class="lg:col-span-5">
                <p
                    class="text-[12px] font-semibold tracking-[0.22em]
                           text-[#7E82A2] uppercase"
                >
                    COBRANÇA DE MENSALIDADES · ETAPA 1
                </p>

                <h2
                    class="mt-2 text-[26px] md:text-[32px] font-semibold
                           leading-[1.15] text-[#000A57]"
                >
                    Gere a cobrança de mensalidade direto do contrato do aluno
                </h2>

                <p
                    class="mt-3 text-[15px] md:text-[16px] leading-[1.8]
                           text-[#000A57]/85"
                >
                    A partir do contrato, o F10 já traz todas as parcelas do
                    aluno, com vencimentos, valores e histórico de pagamentos. O
                    financeiro só escolhe a data, o caixa e o tipo de
                    recebimento — sem recálculos manuais.
                </p>

                <div class="mt-4 space-y-2 text-[14px] text-[#000A57]/85">
                    <div class="flex items-start gap-2">
                        <CheckCircle2
                            size={18}
                            class="mt-[2px] flex-shrink-0 text-[#16A34A]"
                        />
                        <span>
                            Visualize todas as parcelas recebidas e a receber em
                            uma única tela, com destaque para a próxima
                            cobrança.
                        </span>
                    </div>
                    <div class="flex items-start gap-2">
                        <CheckCircle2
                            size={18}
                            class="mt-[2px] flex-shrink-0 text-[#16A34A]"
                        />
                        <span>
                            Selecione rapidamente quais parcelas serão cobradas
                            nesse recebimento, sem abrir várias telas.
                        </span>
                    </div>
                    <div class="flex items-start gap-2">
                        <CheckCircle2
                            size={18}
                            class="mt-[2px] flex-shrink-0 text-[#16A34A]"
                        />
                        <span>
                            Os totais são calculados automaticamente, prontos
                            para seguir para PIX, caixa ou conciliação bancária.
                        </span>
                    </div>
                </div>
            </div>

            <!-- MINI TELA (DIREITA) -->
            <div class="lg:col-span-7">
                <div
                    class="relative flex justify-center lg:justify-end mt-6 lg:mt-0"
                >
                    <!-- glow de fundo -->
                    <div
                        class="pointer-events-none absolute -top-10 -left-8 h-40 w-40 rounded-full
                               bg-[#4F46E5]/8 blur-3xl"
                        aria-hidden="true"
                    ></div>

                    <div class="relative w-full max-w-[620px]">
                        <div
                            class="relative z-10 rounded-[26px] bg-white border border-slate-200
                                   shadow-[0_22px_60px_rgba(15,23,42,0.22)] overflow-hidden"
                        >
                            <!-- topo tipo sistema -->
                            <div
                                class="flex items-center justify-between px-4 pt-3 pb-2
                                       border-b border-slate-200 bg-slate-50"
                            >
                                <div class="flex items-center gap-3">
                                    <div
                                        class="hidden sm:flex items-center gap-3 text-[11px] text-slate-600"
                                    >
                                        <span
                                            class="font-semibold text-slate-800"
                                        >
                                            Meu F10
                                        </span>
                                        <span>Cadastros</span>
                                        <span>Comercial</span>
                                        <span>Pedagógico</span>
                                        <span
                                            class="font-semibold text-primary"
                                        >
                                            Financeiro
                                        </span>
                                        <span>Sistema</span>
                                    </div>
                                </div>

                                <div class="flex items-center gap-2">
                                    <img
                                        src="/logo_f10_3.webp"
                                        alt="F10 Software"
                                        class="h-6 w-auto object-contain"
                                    />
                                </div>
                            </div>

                            <!-- ABA / TÍTULO DA GRADE -->
                            <div class="px-4 pt-3 pb-2">
                                <div
                                    class="inline-flex items-center gap-2 rounded-t-xl bg-slate-100
                               px-3 py-1.5 text-[12px] font-semibold text-slate-700
                               border border-b-0 border-slate-200"
                                >
                                    <span
                                        class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10"
                                    >
                                        <span
                                            class="h-2 w-2 bg-primary rounded-[3px]"
                                        ></span>
                                    </span>
                                    <span>Recebimento de mensalidades</span>
                                </div>
                            </div>

                            <!-- filtros principais (data / caixa / tipo) -->
                            <div
                                class="px-4 pt-3 pb-2 bg-slate-50 border-b border-slate-200"
                            >
                                <div
                                    class="grid gap-2 md:grid-cols-3 text-[11px]"
                                >
                                    <div class="flex flex-col gap-1">
                                        <span class="text-slate-500">
                                            Data Recebimento
                                        </span>
                                        <div
                                            class="flex items-center justify-between rounded-md
                                                   border border-slate-200 bg-white px-2 py-1"
                                        >
                                            <span
                                                class="font-semibold text-slate-800"
                                            >
                                                01/12/2025
                                            </span>
                                            <span
                                                class="text-slate-400 text-[10px]"
                                                >▾</span
                                            >
                                        </div>
                                    </div>

                                    <div class="flex flex-col gap-1">
                                        <span class="text-slate-500">
                                            Caixa Recebimento
                                        </span>
                                        <div
                                            class="flex items-center justify-between rounded-md
                                                   border border-slate-200 bg-white px-2 py-1"
                                        >
                                            <span
                                                class="font-semibold text-slate-800"
                                            >
                                                Bianca Mello
                                            </span>
                                            <span
                                                class="text-slate-400 text-[10px]"
                                                >▾</span
                                            >
                                        </div>
                                    </div>

                                    <div class="flex flex-col gap-1">
                                        <span class="text-slate-500">
                                            Tipo de Recebimento
                                        </span>
                                        <div
                                            class="flex items-center justify-between rounded-md
                                                   border border-slate-200 bg-white px-2 py-1"
                                        >
                                            <span
                                                class="font-semibold text-slate-800"
                                            >
                                                Mensalidade
                                            </span>
                                            <span
                                                class="text-slate-400 text-[10px]"
                                                >▾</span
                                            >
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- cabeçalho da grade -->
                            <div class="px-4 pt-3 pb-1">
                                <div
                                    class="grid grid-cols-[1.4fr,1.2fr,1.2fr,1.2fr,1.2fr,0.8fr]
                                           text-[11px] font-semibold text-slate-600
                                           bg-slate-100 rounded-xl px-3 py-2 border border-slate-200"
                                >
                                    <span>Descrição</span>
                                    <span>Vencimento</span>
                                    <span>Valor</span>
                                    <span>Cálculo</span>
                                    <span>Pago</span>
                                    <span class="text-center">Receber</span>
                                </div>
                            </div>

                            <!-- lista de parcelas -->
                            <div class="px-4 pb-4">
                                <div
                                    class="mt-1 rounded-[18px] border border-slate-200
                                           bg-slate-50 overflow-hidden"
                                >
                                    {#each tuitionParcels as row, i}
                                        <div
                                            class={`grid grid-cols-[1.4fr,1.2fr,1.2fr,1.2fr,1.2fr,0.8fr]
                                                    px-3 py-1.5 text-[12px] items-center
                                                    ${
                                                        row.isCurrent
                                                            ? "bg-[#FFF7ED] ring-1 ring-[#FDBA74]"
                                                            : i % 2 === 0
                                                              ? "bg-white"
                                                              : "bg-slate-50/80"
                                                    }`}
                                        >
                                            <span
                                                class="truncate text-slate-800"
                                            >
                                                {row.description}
                                            </span>
                                            <span
                                                class="tabular-nums text-slate-800"
                                            >
                                                {row.due}
                                            </span>
                                            <span
                                                class="tabular-nums text-slate-800"
                                            >
                                                {row.value}
                                            </span>
                                            <span
                                                class="tabular-nums text-slate-800"
                                            >
                                                {row.calc}
                                            </span>
                                            <span
                                                class="tabular-nums text-slate-800"
                                            >
                                                {row.paid}
                                            </span>

                                            <div class="flex justify-center">
                                                <input
                                                    type="checkbox"
                                                    checked={row.receive}
                                                    class="h-3.5 w-3.5 rounded border-slate-300
                                                           text-[#EA6D0B] focus:ring-[#EA6D0B]"
                                                />
                                            </div>
                                        </div>
                                    {/each}
                                </div>

                                <!-- rodapé com totais -->
                                <div
                                    class="mt-2 text-[10px] text-slate-600 flex items-center justify-between"
                                >
                                    <span>
                                        Valores totais para recebimento na data
                                        selecionada.
                                    </span>
                                    <span class="font-semibold">
                                        Total selecionado: R$ 200,00
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- glow extra -->
                        <div
                            class="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full
                                   bg-[#EA6D0B]/14 blur-3xl"
                            aria-hidden="true"
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- ===== COBRANÇA DE MENSALIDADES — ETAPA 3: RECEBIMENTO ONLINE VIA PIX ===== -->
<section class="relative py-12 md:py-16 bg-white">
    <div class="container">
        <div class="grid gap-10 lg:grid-cols-12 items-center">
            <!-- MINI TELA (ESQUERDA – ALINHADA À ESQUERDA) -->
            <div class="lg:col-span-6 flex justify-start">
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
                                <div
                                    class="absolute left-4 flex items-center gap-1.5"
                                >
                                    <span
                                        class="h-2.5 w-2.5 rounded-full bg-[#FF5F57]"
                                    ></span>
                                    <span
                                        class="h-2.5 w-2.5 rounded-full bg-[#FEBB2E]"
                                    ></span>
                                    <span
                                        class="h-2.5 w-2.5 rounded-full bg-[#28C840]"
                                    ></span>
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
                                        app.f10.com.br • Ambiente virtual do
                                        aluno
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

            <!-- TEXTO (DIREITA) -->
            <div class="lg:col-span-6">
                <p
                    class="text-[12px] font-semibold tracking-[0.22em]
                 text-[#7E82A2] uppercase"
                >
                    COBRANÇA DE MENSALIDADES · ETAPA 3
                </p>

                <h2
                    class="mt-2 text-[26px] md:text-[32px] font-semibold
                 leading-[1.15] text-[#000A57]"
                >
                    Financeiro completo: boletos, Pix e histórico de contratos
                </h2>

                <p
                    class="mt-3 text-[15px] md:text-[16px] leading-[1.9]
                 text-[#000A57]/85"
                >
                    No Portal do Aluno, o estudante acompanha parcelas, gera
                    boletos em PDF e paga por Pix. Quando integrado, o registro
                    do pagamento é feito automaticamente no financeiro da
                    escola.
                </p>

                <p
                    class="mt-3 text-[15px] md:text-[16px] leading-[1.9]
                 text-[#000A57]/85"
                >
                    Contratos podem ter aceite online com registro de IP e
                    geração de PDF completo, reduzindo papelada e trazendo mais
                    segurança jurídica para o EAD.
                </p>

                <div class="mt-4 space-y-2 text-[14px] text-[#000A57]/90">
                    <div class="flex items-start gap-2">
                        <CheckCircle2
                            size={18}
                            class="mt-[2px] flex-shrink-0 text-[#16A34A]"
                        />
                        <span>
                            Boletos em PDF, linha digitável e status das
                            parcelas sempre disponíveis para o responsável.
                        </span>
                    </div>

                    <div class="flex items-start gap-2">
                        <CheckCircle2
                            size={18}
                            class="mt-[2px] flex-shrink-0 text-[#16A34A]"
                        />
                        <span>
                            Pagamento por Pix integrado ao F10, com atualização
                            automática do financeiro quando o banco confirma o
                            recebimento.
                        </span>
                    </div>
                </div>

                <!-- Links estratégicos (AVA e Smart Aluno) -->
                <p
                    class="mt-5 text-[13px] md:text-[14px] leading-[1.8]
                 text-[#000A57]/80"
                >
                    O acesso pode ser feito tanto pelo
                    <a
                        href="/ambiente-virtual-de-aprendizado-ava"
                        class="font-semibold text-[#EA6D0B] hover:underline"
                    >
                        Ambiente Virtual de Aprendizado (AVA)
                    </a>
                    quanto pelo
                    <a
                        href="/aplicativo-smart-aluno"
                        class="font-semibold text-[#EA6D0B] hover:underline"
                    >
                        aplicativo Smart Aluno
                    </a>
                    , mantendo o financeiro conectado à experiência digital do estudante.
                </p>
            </div>
        </div>
    </div>
</section>

<!-- ===== COBRANÇA RECORRENTE E CANAIS ===== -->
<section class="relative py-12 md:py-16 bg-white">
    <div class="container">
        <div class="grid gap-10 lg:grid-cols-12 items-center">
            <div class="lg:col-span-5">
                <p
                    class="text-[13px] font-semibold tracking-[0.18em]
                           text-[#7E82A2]"
                >
                    COBRANÇA RECORRENTE
                </p>
                <h2
                    class="mt-2 text-[26px] md:text-[32px] font-semibold
                           leading-[1.15] text-[#000A57]"
                >
                    Mensalidades em dia com cobrança automática e comunicação
                    clara
                </h2>
                <p
                    class="mt-3 text-[15px] md:text-[16px] leading-[1.8]
                           text-[#000A57]/80"
                >
                    Combine APP, PIX, boleto, cartão e SMS para manter o
                    responsável informado e a mensalidade em dia, sem depender
                    de controles paralelos fora do F10.
                </p>
            </div>

            <div class="lg:col-span-7">
                <div class="grid gap-5 md:grid-cols-3">
                    {#each billingChannels as channel}
                        <article
                            class="rounded-[20px] bg-[#F3F4FD] px-5 py-5
                                   ring-1 ring-[#E5E7EB] flex flex-col gap-2"
                        >
                            <p
                                class="text-[11px] font-semibold tracking-[0.18em]
                                       text-[#9CA3AF]"
                            >
                                {channel.tag}
                            </p>
                            <h3
                                class="text-[15px] md:text-[16px] font-semibold
                                       text-[#000A57]"
                            >
                                {channel.title}
                            </h3>
                            <p
                                class="text-[13px] md:text-[14px] leading-[1.7]
                                       text-[#4B5563]/85"
                            >
                                {channel.description}
                            </p>
                        </article>
                    {/each}
                </div>
            </div>
        </div>
    </div>
</section>

<!-- ===== FLUXO FINANCEIRO NO F10 ===== -->
<section class="relative py-12 md:py-16 bg-[#F3F4FD]">
    <div class="container">
        <div class="text-center max-w-3xl mx-auto">
            <p
                class="text-[13px] font-semibold tracking-[0.18em]
                       text-[#7E82A2]"
            >
                FLUXO FINANCEIRO DA ESCOLA
            </p>
            <h2
                class="mt-3 text-[26px] md:text-[32px] font-semibold
                       leading-[1.15] text-[#000A57]"
            >
                Do contrato à conciliação bancária em quatro etapas
            </h2>
            <p
                class="mt-3 text-[14px] md:text-[15px] leading-[1.8]
                       text-[#000A57]/80"
            >
                Cada etapa do fluxo — geração de parcelas, cobrança, despesas e
                conciliação — é controlada dentro do F10, conectando Comercial,
                Financeiro e Diretoria.
            </p>
        </div>

        <div class="mt-8 grid gap-6 md:grid-cols-4">
            {#each flowSteps as step}
                <article
                    class="relative rounded-[20px] bg-white px-5 py-5 md:px-6 md:py-6
                           ring-1 ring-[#E5E7EB] flex flex-col gap-2"
                >
                    <div
                        class="flex h-9 w-9 items-center justify-center rounded-full
                               bg-[#EA6D0B] text-white text-[15px] font-bold"
                    >
                        {step.label}
                    </div>
                    <h3
                        class="mt-1 text-[15px] md:text-[16px] font-semibold
                               text-[#000A57]"
                    >
                        {step.title}
                    </h3>
                    <p
                        class="text-[13px] md:text-[14px] leading-[1.7]
                               text-[#4B5563]/85"
                    >
                        {step.description}
                    </p>
                </article>
            {/each}
        </div>
    </div>
</section>

<!-- ===== REALIZAÇÃO DE RECEITAS E DESPESAS ===== -->
<section class="relative py-12 md:py-16 bg-[#F3F4FD]">
    <div class="container">
        <div class="grid gap-10 lg:grid-cols-12 items-start">
            <!-- TEXTO (ESQUERDA) -->
            <div class="lg:col-span-5">
                <p
                    class="text-[12px] font-semibold tracking-[0.22em]
               text-[#7E82A2] uppercase"
                >
                    REALIZAÇÃO DE RECEITAS E DESPESAS
                </p>

                <h2
                    class="mt-2 text-[26px] md:text-[32px] font-semibold
               leading-[1.15] text-[#000A57]"
                >
                    Resultado operacional por nível, ano e mês
                </h2>

                <p
                    class="mt-3 text-[15px] md:text-[16px] leading-[1.8]
               text-[#000A57]/85"
                >
                    A tela de realização mostra quanto a escola planejou receber
                    e gastar e quanto, de fato, aconteceu em cada grupo de
                    contas. A direção enxerga o impacto real de cursos, livros,
                    serviços extras e despesas no resultado operacional do ano.
                </p>

                <div class="mt-4 space-y-2 text-[14px] text-[#000A57]/90">
                    <div class="flex items-start gap-2">
                        <CheckCircle2
                            size={18}
                            class="mt-[2px] flex-shrink-0 text-[#16A34A]"
                        />
                        <span>
                            Estrutura em níveis, semelhante ao plano de contas,
                            permitindo analisar o resultado de
                            <span class="font-semibold">
                                Receitas → Cursos → Turmas
                            </span>
                            e confrontar com as principais despesas da operação.
                        </span>
                    </div>

                    <div class="flex items-start gap-2">
                        <CheckCircle2
                            size={18}
                            class="mt-[2px] flex-shrink-0 text-[#16A34A]"
                        />
                        <span>
                            Comparação de <span class="font-semibold">
                                ano, janeiro à dezembro
                            </span>
                            com orçamento e realizado lado a lado, ajudando a revisar
                            o orçamento, ajustar investimentos e corrigir rota ainda
                            no início do ano letivo.
                        </span>
                    </div>

                    <div class="flex items-start gap-2">
                        <CheckCircle2
                            size={18}
                            class="mt-[2px] flex-shrink-0 text-[#16A34A]"
                        />
                        <span>
                            Base sólida para decisões estratégicas: renegociação
                            de contratos, revisão de mensalidades, controle de
                            custos fixos e avaliação do impacto de campanhas de
                            captação no caixa da escola.
                        </span>
                    </div>
                </div>
            </div>

            <!-- MINI TELA (DIREITA) -->
            <div class="lg:col-span-7">
                <div class="relative w-full max-w-[780px] ml-auto">
                    <!-- fundo rotacionado -->
                    <div
                        class="pointer-events-none absolute inset-0 rounded-[32px]
                   bg-white/60 rotate-[2deg]"
                        aria-hidden="true"
                    ></div>

                    <figure
                        class="relative z-10 rounded-[24px] overflow-hidden
                   bg-white border border-slate-200
                   shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
                    >
                        <!-- topo tipo sistema -->
                        <div
                            class="flex items-center justify-between px-4 pt-3 pb-2
                       border-b border-slate-200 bg-slate-50"
                        >
                            <div class="flex items-center gap-3">
                                <div
                                    class="hidden sm:flex items-center gap-3 text-[11px] text-slate-600"
                                >
                                    <span class="font-semibold text-slate-800">
                                        Meu F10
                                    </span>
                                    <span>Cadastros</span>
                                    <span>Comercial</span>
                                    <span>Pedagógico</span>
                                    <span class="font-semibold text-primary">
                                        Financeiro
                                    </span>
                                    <span>Sistema</span>
                                </div>
                            </div>

                            <div class="ml-4 hidden md:block">
                                <img
                                    src="/logo_f10_3.webp"
                                    alt="F10 Software"
                                    class="h-6 w-auto"
                                    loading="lazy"
                                />
                            </div>
                        </div>
                        <!-- ABA / TÍTULO DA GRADE -->
                        <div class="px-4 pt-3 pb-2">
                            <div
                                class="inline-flex items-center gap-2 rounded-t-xl bg-slate-100
                               px-3 py-1.5 text-[12px] font-semibold text-slate-700
                               border border-b-0 border-slate-200"
                            >
                                <span
                                    class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10"
                                >
                                    <span
                                        class="h-2 w-2 bg-primary rounded-[3px]"
                                    ></span>
                                </span>
                                <span>Receitas e despesas</span>
                            </div>
                        </div>

                        <!-- cabeçalho em 2 níveis (grupo + colunas) -->
                        <div class="px-4 pt-3 pb-1 bg-slate-50">
                            <!-- linha dos grupos: Ano / Jan / Fev -->
                            <div
                                class="grid grid-cols-[2fr,1.2fr,1.2fr,1.2fr,1.2fr,1.2fr,1.2fr]
                           text-[10px] text-slate-500 px-3"
                            >
                                <span></span>
                                <span class="col-span-2 text-center"
                                    >Ano 2025</span
                                >
                                <span class="col-span-2 text-center"
                                    >Janeiro</span
                                >
                                <span class="col-span-2 text-center"
                                    >Fevereiro</span
                                >
                            </div>

                            <!-- linha das colunas -->
                            <div
                                class="mt-1 grid grid-cols-[2fr,1.2fr,1.2fr,1.2fr,1.2fr,1.2fr,1.2fr]
                           text-[11px] font-semibold text-slate-600
                           bg-slate-100 rounded-xl px-3 py-2 border border-slate-200"
                            >
                                <span>Descrição da conta</span>

                                <span class="text-center">Orçado</span>
                                <span class="text-center">Realizado</span>

                                <span class="text-center">Orçado</span>
                                <span class="text-center">Realizado</span>

                                <span class="text-center">Orçado</span>
                                <span class="text-center">Realizado</span>
                            </div>
                        </div>

                        <!-- linhas -->
                        <div class="px-4 pb-4">
                            <div
                                class="mt-1 rounded-[18px] border border-slate-200
                           bg-slate-50 overflow-hidden"
                            >
                                {#each realizationLines as line, i}
                                    <div
                                        class={`grid grid-cols-[2fr,1.2fr,1.2fr,1.2fr,1.2fr,1.2fr,1.2fr]
                                    px-3 py-1.5 text-[12px] items-center
                                    ${
                                        line.highlight
                                            ? "bg-[#E5ECFF]"
                                            : i % 2 === 0
                                              ? "bg-white"
                                              : "bg-slate-50/80"
                                    }`}
                                    >
                                        <!-- descrição com “árvore” -->
                                        <div
                                            class={`flex items-center gap-1 truncate ${rowIndentClass(
                                                line.level,
                                            )}`}
                                        >
                                            {#if line.level === 0}
                                                <span
                                                    class="text-[11px] text-slate-500"
                                                    >▾</span
                                                >
                                            {:else if line.level === 1}
                                                <span
                                                    class="text-[11px] text-slate-500"
                                                    >▾</span
                                                >
                                            {:else}
                                                <span class="w-3"></span>
                                            {/if}

                                            <span
                                                class="inline-flex items-center justify-center
                                           h-[12px] min-w-[12px]
                                           border border-slate-400 bg-white
                                           text-[11px] leading-none text-slate-700"
                                                aria-hidden="true"
                                            >
                                                ✓
                                            </span>

                                            <span
                                                class={`truncate ${
                                                    line.level <= 1
                                                        ? "font-semibold text-slate-800"
                                                        : "text-slate-800"
                                                }`}
                                            >
                                                {line.label}
                                            </span>
                                        </div>

                                        <!-- Ano 2025 Orçado -->
                                        <span
                                            class="tabular-nums text-[11px] text-slate-800 text-right"
                                        >
                                            {formatAmount(line.yearBudget)}
                                        </span>

                                        <!-- Ano 2025 Realizado -->
                                        <span
                                            class={`tabular-nums text-[11px] text-right ${realizedClass(
                                                line.yearBudget,
                                                line.yearRealized,
                                            )}`}
                                        >
                                            {formatAmount(line.yearRealized)}
                                        </span>

                                        <!-- Janeiro Orçado -->
                                        <span
                                            class="tabular-nums text-[11px] text-slate-800 text-right"
                                        >
                                            {formatAmount(line.janBudget)}
                                        </span>

                                        <!-- Janeiro Realizado -->
                                        <span
                                            class={`tabular-nums text-[11px] text-right ${realizedClass(
                                                line.janBudget,
                                                line.janRealized,
                                            )}`}
                                        >
                                            {formatAmount(line.janRealized)}
                                        </span>

                                        <!-- Fevereiro Orçado -->
                                        <span
                                            class="tabular-nums text-[11px] text-slate-800 text-right"
                                        >
                                            {formatAmount(line.febBudget)}
                                        </span>

                                        <!-- Fevereiro Realizado -->
                                        <span
                                            class={`tabular-nums text-[11px] text-right ${realizedClass(
                                                line.febBudget,
                                                line.febRealized,
                                            )}`}
                                        >
                                            {formatAmount(line.febRealized)}
                                        </span>
                                    </div>
                                {/each}
                            </div>

                            <div
                                class="mt-2 text-[10px] text-slate-600 flex items-center justify-between"
                            >
                                <span>
                                    Estrutura em árvore semelhante ao sistema
                                    desktop, com Resultado Operacional, Receitas
                                    e Despesas.
                                </span>
                                <span class="hidden sm:inline">
                                    Verde = dentro do orçamento · Vermelho =
                                    acima do orçado.
                                </span>
                            </div>
                        </div>
                    </figure>

                    <!-- CARDS FLUTUANTES (DIREITA INFERIOR) -->
                    <div
                        class="pointer-events-none absolute z-10 -bottom-10 -right-12
           flex flex-col items-end gap-3"
                    >
                        <!-- Card escuro com pizza verde (TOP) -->
                        <div
                            class="pointer-events-auto rounded-2xl bg-[#020617] text-white
               px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.55)]
               border border-white/10 w-[250px]"
                        >
                            <p
                                class="text-[11px] font-semibold text-emerald-300"
                            >
                                Resultado operacional
                            </p>
                            <p
                                class="mt-0.5 text-[18px] font-bold leading-tight"
                            >
                                +R$ 970 mil
                            </p>
                            <p class="mt-1 text-[10px] text-slate-300">
                                72% receitas · 28% despesas
                            </p>

                            <!-- pizza simples -->
                            <div class="mt-3 flex items-center gap-3">
                                <svg
                                    viewBox="0 0 40 40"
                                    class="h-12 w-12 rotate-[-90deg]"
                                    aria-hidden="true"
                                >
                                    <!-- fundo cinza -->
                                    <circle
                                        cx="20"
                                        cy="20"
                                        r="16"
                                        class="fill-none stroke-slate-700/60"
                                        stroke-width="8"
                                    />
                                    <!-- fatia verde (resultado positivo) -->
                                    <circle
                                        cx="20"
                                        cy="20"
                                        r="16"
                                        class="fill-none stroke-emerald-400"
                                        stroke-width="8"
                                        stroke-dasharray="72 100"
                                        stroke-linecap="round"
                                    />
                                </svg>

                                <div class="space-y-1 text-[10px]">
                                    <div class="flex items-center gap-1.5">
                                        <span
                                            class="h-2 w-2 rounded-full bg-emerald-400"
                                        ></span>
                                        <span class="text-slate-100">
                                            Receitas acima do previsto
                                        </span>
                                    </div>
                                    <div class="flex items-center gap-1.5">
                                        <span
                                            class="h-2 w-2 rounded-full bg-slate-500"
                                        ></span>
                                        <span class="text-slate-300">
                                            Despesas controladas
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- ===== CUBO DE DADOS FINANCEIROS ===== -->
<section class="relative py-12 md:py-16 bg-white">
    <div class="container">
        <div class="grid gap-10 lg:grid-cols-12 items-start">
            <!-- MINI TELA -->
            <div class="lg:col-span-6">
                <div class="relative w-full max-w-[780px] ml-auto">
                    <!-- fundo rotacionado -->
                    <div
                        class="pointer-events-none absolute inset-0 rounded-[32px]
                               bg-white/60 rotate-[2deg]"
                        aria-hidden="true"
                    ></div>

                    <figure
                        class="relative rounded-[24px] overflow-hidden
                               bg-white border border-slate-200
                               shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
                    >
                        <!-- topo tipo sistema -->
                        <div
                            class="flex items-center justify-between px-4 pt-3 pb-2
                                   border-b border-slate-200 bg-slate-50"
                        >
                            <div class="flex items-center gap-3">
                                <div
                                    class="hidden sm:flex items-center gap-3 text-[11px] text-slate-600"
                                >
                                    <span class="font-semibold text-slate-800">
                                        Meu F10
                                    </span>
                                    <span>Cadastros</span>
                                    <span>Comercial</span>
                                    <span>Pedagógico</span>
                                    <span class="font-semibold text-primary">
                                        Financeiro
                                    </span>
                                    <span>Sistema</span>
                                </div>
                            </div>

                            <!-- Logo F10 alinhada aos ícones -->
                            <div class="ml-4 hidden md:block">
                                <img
                                    src="/logo_f10_3.webp"
                                    alt="F10 Software"
                                    class="h-8 w-auto"
                                    loading="lazy"
                                />
                            </div>
                        </div>

                        <!-- “CUBO” – TABELA SUPERIOR -->
                        <div class="px-4 pt-3 pb-2">
                            <!-- filtros do cubo -->
                            <div class="flex flex-wrap gap-2 text-[11px] mb-2">
                                <div
                                    class="inline-flex items-center gap-1.5 rounded-full
                                           border border-slate-200 bg-slate-50 px-2.5 py-1"
                                >
                                    <span class="text-slate-500"> Linha: </span>
                                    <span class="font-semibold text-slate-800">
                                        Tipo de recebimento
                                    </span>
                                </div>
                                <div
                                    class="inline-flex items-center gap-1.5 rounded-full
                                           border border-slate-200 bg-slate-50 px-2.5 py-1"
                                >
                                    <span class="text-slate-500">
                                        Coluna:
                                    </span>
                                    <span class="font-semibold text-slate-800">
                                        Forma de pagamento
                                    </span>
                                </div>
                                <div
                                    class="inline-flex items-center gap-1.5 rounded-full
                                           border border-slate-200 bg-slate-50 px-2.5 py-1"
                                >
                                    <span class="text-slate-500">
                                        Período:
                                    </span>
                                    <span class="font-semibold text-slate-800">
                                        Vencimento no intervalo
                                    </span>
                                </div>
                            </div>

                            <!-- cabeçalho do cubo -->
                            <div
                                class="grid grid-cols-[1.6fr,1fr,1fr,1fr,1fr]
                                       text-[11px] font-semibold text-slate-600
                                       bg-slate-100 rounded-xl px-3 py-2 border border-slate-200"
                            >
                                <span>Tipo de recebimento</span>
                                <span class="text-right">Totais</span>
                                <span class="text-right">Dinheiro</span>
                                <span class="text-right">Cartão</span>
                                <span class="text-right">Pix</span>
                            </div>

                            <!-- linhas do cubo -->
                            <div
                                class="mt-1 rounded-[14px] border border-slate-200
                                       bg-slate-50 overflow-hidden"
                            >
                                <!-- Material didático -->
                                <div
                                    class="grid grid-cols-[1.6fr,1fr,1fr,1fr,1fr]
                                           px-3 py-1.5 text-[12px]
                                           bg-white"
                                >
                                    <span class="text-slate-800">
                                        Material didático
                                    </span>
                                    <span
                                        class="tabular-nums text-right text-slate-800"
                                    >
                                        R$ 1.250,00
                                    </span>
                                    <span
                                        class="tabular-nums text-right text-slate-800"
                                    >
                                        R$ 249,00
                                    </span>
                                    <span
                                        class="tabular-nums text-right text-slate-800"
                                    >
                                        R$ 499,00
                                    </span>
                                    <span
                                        class="tabular-nums text-right text-slate-800"
                                    >
                                        R$ 502,00
                                    </span>
                                </div>

                                <!-- Matrícula -->
                                <div
                                    class="grid grid-cols-[1.6fr,1fr,1fr,1fr,1fr]
                                           px-3 py-1.5 text-[12px]
                                           bg-slate-50/80"
                                >
                                    <span class="text-slate-800">
                                        Matrícula
                                    </span>
                                    <span
                                        class="tabular-nums text-right text-slate-800"
                                    >
                                        R$ 801,00
                                    </span>
                                    <span
                                        class="tabular-nums text-right text-slate-800"
                                    >
                                        R$ 249,00
                                    </span>
                                    <span
                                        class="tabular-nums text-right text-slate-800"
                                    >
                                        R$ 101,00
                                    </span>
                                    <span
                                        class="tabular-nums text-right text-slate-800"
                                    >
                                        R$ 452,00
                                    </span>
                                </div>

                                <!-- Parcelas -->
                                <div
                                    class="grid grid-cols-[1.6fr,1fr,1fr,1fr,1fr]
                                           px-3 py-1.5 text-[12px]
                                           bg-white"
                                >
                                    <span class="text-slate-800">
                                        Parcelas
                                    </span>
                                    <span
                                        class="tabular-nums text-right text-slate-800"
                                    >
                                        R$ 2.079,28
                                    </span>
                                    <span
                                        class="tabular-nums text-right text-slate-800"
                                    >
                                        R$ 467,28
                                    </span>
                                    <span
                                        class="tabular-nums text-right text-slate-800"
                                    >
                                        R$ 550,00
                                    </span>
                                    <span
                                        class="tabular-nums text-right text-slate-800"
                                    >
                                        R$ 1.062,00
                                    </span>
                                </div>

                                <!-- Totais -->
                                <div
                                    class="grid grid-cols-[1.6fr,1fr,1fr,1fr,1fr]
                                           px-3 py-1.5 text-[12px]
                                           bg-slate-100 border-t border-slate-200
                                           font-semibold"
                                >
                                    <span class="text-slate-900"> Totais </span>
                                    <span
                                        class="tabular-nums text-right text-slate-900"
                                    >
                                        R$ 4.130,28
                                    </span>
                                    <span
                                        class="tabular-nums text-right text-slate-900"
                                    >
                                        R$ 965,28
                                    </span>
                                    <span
                                        class="tabular-nums text-right text-slate-900"
                                    >
                                        R$ 1.150,00
                                    </span>
                                    <span
                                        class="tabular-nums text-right text-slate-900"
                                    >
                                        R$ 2.015,00
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- GRÁFICO DE BARRAS (BASEADO NO CUBO) -->
                        <div class="p-2 border-t border-slate-200 bg-slate-50">
                            <div class="px-2 pt-3">
                                <!-- layout: gráfico à esquerda, legenda à direita -->
                                <div
                                    class="flex flex-col sm:flex-row sm:items-stretch gap-4"
                                >
                                    <!-- GRÁFICO (HTML + CSS, sem SVG) -->
                                    <div class="flex-1 flex gap-3">
                                        <!-- área das barras -->
                                        <div
                                            class="relative flex-1 bg-white border border-slate-200 rounded-xl py-4"
                                        >
                                            <!-- grade horizontal -->
                                            <div
                                                class="absolute inset-x-6 top-3 bottom-7 pointer-events-none"
                                            >
                                                <div
                                                    class="absolute inset-x-0 top-0 h-px bg-slate-200/80"
                                                ></div>
                                                <div
                                                    class="absolute inset-x-0 top-1/4 h-px bg-slate-200/70"
                                                ></div>
                                                <div
                                                    class="absolute inset-x-0 top-2/4 h-px bg-slate-200/70"
                                                ></div>
                                                <div
                                                    class="absolute inset-x-0 top-3/4 h-px bg-slate-200/70"
                                                ></div>
                                                <div
                                                    class="absolute inset-x-0 bottom-0 h-px bg-slate-200"
                                                ></div>
                                            </div>

                                            <!-- barras -->
                                            <div
                                                class="relative flex h-[250px] items-end ml-[-50px] justify-center px-8 pb-5 pt-4"
                                            >
                                                <!-- Totais -->
                                                <div
                                                    class="flex flex-col items-center w-[80px]"
                                                >
                                                    <span
                                                        class="text-[9px] text-slate-600 mb-1 tabular-nums"
                                                    >
                                                        4.130,28
                                                    </span>
                                                    <div
                                                        class="w-full bg-[#FBBF24] h-[200px] border border-slate-400"
                                                    ></div>
                                                    <span
                                                        class="mt-1 text-[9px] text-slate-500"
                                                        >Totais</span
                                                    >
                                                </div>

                                                <!-- Dinheiro -->
                                                <div
                                                    class="flex flex-col items-center w-[80px]"
                                                >
                                                    <span
                                                        class="text-[9px] text-slate-600 mb-1 tabular-nums"
                                                    >
                                                        956,28
                                                    </span>
                                                    <div
                                                        class="w-full bg-[#60A5FA] h-[120px] border border-slate-400"
                                                    ></div>
                                                    <span
                                                        class="mt-1 text-[9px] text-slate-500"
                                                        >Dinheiro</span
                                                    >
                                                </div>

                                                <!-- Cartão -->
                                                <div
                                                    class="flex flex-col items-center w-[80px]"
                                                >
                                                    <span
                                                        class="text-[9px] text-slate-600 mb-1 tabular-nums"
                                                    >
                                                        1.509,00
                                                    </span>
                                                    <div
                                                        class="w-full bg-[#A855F7] h-[80px] border border-slate-400"
                                                    ></div>
                                                    <span
                                                        class="mt-1 text-[9px] text-slate-500"
                                                        >Cartão</span
                                                    >
                                                </div>

                                                <!-- Pix -->
                                                <div
                                                    class="flex flex-col items-center w-[80px]"
                                                >
                                                    <span
                                                        class="text-[9px] text-slate-600 mb-1 tabular-nums"
                                                    >
                                                        980,00
                                                    </span>
                                                    <div
                                                        class="w-full bg-[#22C55E] h-[170px] border border-slate-400"
                                                    ></div>
                                                    <span
                                                        class="mt-1 text-[9px] text-slate-500"
                                                        >Pix</span
                                                    >
                                                </div>
                                            </div>

                                            <!-- eixo vertical à direita com valores -->
                                            <div
                                                class="hidden sm:block absolute top-4 right-4 bottom-7"
                                            >
                                                <div
                                                    class="relative h-full border-l border-slate-400"
                                                >
                                                    <span
                                                        class="absolute -left-8 -top-1 text-[8px] text-slate-500"
                                                    >
                                                        4500
                                                    </span>
                                                    <span
                                                        class="absolute -left-8 top-[26%] text-[8px] text-slate-500"
                                                    >
                                                        3000
                                                    </span>
                                                    <span
                                                        class="absolute -left-8 top-[52%] text-[8px] text-slate-500"
                                                    >
                                                        2000
                                                    </span>
                                                    <span
                                                        class="absolute -left-8 top-[77%] text-[8px] text-slate-500"
                                                    >
                                                        1000
                                                    </span>
                                                    <span
                                                        class="absolute -left-8 -bottom-2 text-[8px] text-slate-500"
                                                    >
                                                        0
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- legenda “numa coluna”, igual ao print -->
                                        <div
                                            class="hidden sm:flex flex-col justify-center gap-2 text-[10px] text-slate-600 w-[120px]"
                                        >
                                            <div
                                                class="flex items-center gap-1.5"
                                            >
                                                <span
                                                    class="h-2 w-3 rounded-sm bg-[#FBBF24]"
                                                ></span>
                                                <span>Totais</span>
                                            </div>
                                            <div
                                                class="flex items-center gap-1.5"
                                            >
                                                <span
                                                    class="h-2 w-3 rounded-sm bg-[#60A5FA]"
                                                ></span>
                                                <span>Dinheiro</span>
                                            </div>
                                            <div
                                                class="flex items-center gap-1.5"
                                            >
                                                <span
                                                    class="h-2 w-3 rounded-sm bg-[#A855F7]"
                                                ></span>
                                                <span>Cartão</span>
                                            </div>
                                            <div
                                                class="flex items-center gap-1.5"
                                            >
                                                <span
                                                    class="h-2 w-3 rounded-sm bg-[#22C55E]"
                                                ></span>
                                                <span>Pix</span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- legenda empilhada embaixo no mobile -->
                                    <div
                                        class="sm:hidden mt-2 flex flex-wrap gap-3 text-[10px] text-slate-600"
                                    >
                                        <div class="flex items-center gap-1.5">
                                            <span
                                                class="h-2 w-3 rounded-sm bg-[#FBBF24]"
                                            ></span>
                                            <span>Totais</span>
                                        </div>
                                        <div class="flex items-center gap-1.5">
                                            <span
                                                class="h-2 w-3 rounded-sm bg-[#60A5FA]"
                                            ></span>
                                            <span>Dinheiro</span>
                                        </div>
                                        <div class="flex items-center gap-1.5">
                                            <span
                                                class="h-2 w-3 rounded-sm bg-[#A855F7]"
                                            ></span>
                                            <span>Cartão</span>
                                        </div>
                                        <div class="flex items-center gap-1.5">
                                            <span
                                                class="h-2 w-3 rounded-sm bg-[#22C55E]"
                                            ></span>
                                            <span>Pix</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </figure>
                </div>
            </div>

            <!-- TEXTO -->
            <div class="lg:col-span-6">
                <p
                    class="text-[12px] font-semibold tracking-[0.22em]
                       text-[#7E82A2] uppercase"
                >
                    CUBO DE DADOS FINANCEIROS
                </p>

                <h2
                    class="mt-2 text-[26px] md:text-[32px] font-semibold
                           leading-[1.15] text-[#000A57]"
                >
                    Arraste, solte e cruze dados de recebimentos em segundos
                </h2>

                <p
                    class="mt-3 text-[15px] md:text-[16px] leading-[1.8]
                           text-[#000A57]/85"
                >
                    O Cubo de Movimentações Financeiras permite que a escola
                    monte visões personalizadas de recebimentos: por forma de
                    pagamento, tipo de título, curso, turma, unidade, período e
                    muito mais — sem exportar nada para o Excel.
                </p>

                <div class="mt-4 space-y-2 text-[14px] text-[#000A57]/90">
                    <div class="flex items-start gap-2">
                        <CheckCircle2
                            size={18}
                            class="mt-[2px] flex-shrink-0 text-[#16A34A]"
                        />
                        <span>
                            Interface de <span class="font-semibold">
                                arrastar e soltar
                            </span>
                            para reorganizar colunas e linhas, cruzando rapidamente
                            formas de recebimento, tipos de lançamento e centros
                            de custo.
                        </span>
                    </div>

                    <div class="flex items-start gap-2">
                        <CheckCircle2
                            size={18}
                            class="mt-[2px] flex-shrink-0 text-[#16A34A]"
                        />
                        <span>
                            Comparação de períodos lado a lado — dia, mês,
                            trimestre ou ano — ajudando a entender sazonalidade,
                            impacto de campanhas e comportamento de
                            inadimplência.
                        </span>
                    </div>

                    <div class="flex items-start gap-2">
                        <CheckCircle2
                            size={18}
                            class="mt-[2px] flex-shrink-0 text-[#16A34A]"
                        />
                        <span>
                            Experiência parecida com
                            <span class="font-semibold">
                                tabela dinâmica do Excel
                            </span>, mas alimentada diretamente pelo F10:
                            tabelas, totais e gráficos saem prontos para
                            reuniões com a direção e o conselho.
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- ===== FAQ FINANCEIRO ===== -->
<section class="relative py-12 md:py-16 bg-white">
    <div class="container">
        <div
            class="flex flex-col md:flex-row md:items-center md:justify-between gap-6"
        >
            <div>
                <h2
                    class="text-[26px] md:text-[32px] font-semibold leading-tight
                           text-[#000A57]"
                >
                    Perguntas frequentes sobre o Financeiro F10
                </h2>
                <p
                    class="mt-2 text-[14px] md:text-[15px] text-[#000A57]/80
                           max-w-[520px]"
                >
                    Entenda como o módulo Financeiro se conecta à cobrança de
                    mensalidades, às notas fiscais, ao app e aos dashboards de
                    faturamento.
                </p>
            </div>

            <a
                href="/contato"
                class="hidden md:inline-flex items-center rounded-full border
                       border-[#EA6D0B] px-4 py-2 text-[14px] font-semibold
                       text-[#000A57] hover:bg-[#EA6D0B]/10
                       focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
            >
                Falar com o time financeiro da F10
            </a>
        </div>

        <div class="mt-8">
            <FaqAccordion items={faqItems} />
        </div>

        <div class="mt-6 md:hidden">
            <a
                href="/contato"
                class="inline-flex items-center rounded-full border
                       border-[#EA6D0B] px-4 py-2 text-[14px] font-semibold
                       text-[#000A57] hover:bg-[#EA6D0B]/10
                       focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
            >
                Falar com o time financeiro da F10
            </a>
        </div>
    </div>
</section>

<!-- ===== CTA FINAL ===== -->
<section class="relative py-12 md:py-16 bg-[#F3F4FD]">
    <div class="container">
        <div class="grid gap-10 lg:grid-cols-12 items-center">
            <div class="lg:col-span-6 flex flex-col gap-5">
                <h2
                    class="text-[#7E82A2] font-medium leading-[1.1]
                 tracking-[-0.01em] text-[32px] md:text-[40px]"
                >
                    Dê previsibilidade ao caixa da sua escola com o Financeiro
                    F10
                </h2>

                <p
                    class="text-[#000A57] text-[15px] md:text-[16px]
                 leading-[1.8] max-w-[560px]"
                >
                    Com contratos, cobranças, despesas, notas fiscais e
                    dashboards trabalhando juntos, o F10 transforma o financeiro
                    em um centro de decisão — e não apenas em uma rotina de
                    boletos.
                </p>

                <p
                    class="text-[#000A57]/80 text-[14px] md:text-[15px]
                 max-w-[560px]"
                >
                    Veja na prática como o módulo Financeiro se conecta ao
                    Comercial, ao Pedagógico e ao app Smart Aluno na sua
                    realidade.
                </p>

                <div class="pt-2">
                    <button
                        type="button"
                        on:click={openFinancePresentationModal}
                        class="inline-flex items-center justify-center gap-3 rounded-[999px]
                   bg-[#EA6D0B] px-8 md:px-10 py-4 text-white text-[16px]
                   font-bold transition hover:brightness-110
                   focus:outline-none focus:ring-2 focus:ring-[#EA6D0B]/40"
                    >
                        <span>Agendar apresentação</span>
                        <ArrowRight size={24} />
                    </button>
                </div>
            </div>

            <div class="lg:col-span-6">
                <div
                    class="relative h-[320px] sm:h-[380px] md:h-[420px]
                 overflow-hidden rounded-[18px] ring-1 ring-black/5
                 bg-[#020617] shadow-[0_18px_50px_rgba(1,13,40,0.16)]"
                >
                    <!-- imagem de fundo -->
                    <img
                        src="/financeiro_escolar_f10_software.webp"
                        alt="Tela do módulo Financeiro F10 com gráficos e relatórios para gestão escolar."
                        class="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                    />

                    <!-- filtro azul escuro por cima -->
                    <div
                        class="absolute inset-0 bg-[#020A3A]/50 mix-blend-multiply"
                        aria-hidden="true"
                    ></div>

                    <!-- brilho suave para dar profundidade -->
                    <div
                        class="pointer-events-none absolute -top-16 -left-10 h-56 w-56 rounded-full
                   bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.38),transparent)] opacity-30"
                        aria-hidden="true"
                    ></div>

                    <!-- conteúdo opcional por cima da imagem (legenda curta) -->
                    <div class="relative h-full w-full flex items-end">
                        <div class="w-full px-6 pb-5">
                            <p
                                class="text-[13px] md:text-[14px] leading-relaxed
                       text-slate-100/85 max-w-[420px]"
                            >
                                Painéis do módulo Financeiro mostrando
                                realização de receitas e despesas, formas de
                                recebimento e evolução do caixa mês a mês.
                            </p>
                        </div>
                    </div>

                    <!-- borda interna sutil -->
                    <div
                        class="pointer-events-none absolute inset-0 rounded-[18px]
                   ring-1 ring-inset ring-white/15"
                    ></div>
                </div>
            </div>
        </div>
    </div>
</section>

<style>
    /* Mantido alinhado ao sistema visual das soluções F10, com hero escuro
       para diferenciar o módulo Financeiro dos demais. */
</style>
