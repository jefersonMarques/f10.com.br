<script lang="ts">
    import { Check, Minus, AlertTriangle, ChevronDown } from "lucide-svelte";

    // IDs fixos dos planos
    type PlanId = "starter" | "standard" | "pro" | "enterprise";

    // Nomes exibidos na tabela
    const planOrder: PlanId[] = ["starter", "standard", "pro", "enterprise"];

    const planMap: Record<PlanId, { id: PlanId; name: string }> = {
        starter: { id: "starter", name: "Inicial" },
        standard: { id: "standard", name: "Perfeito" }, // plano intermediário (principal)
        pro: { id: "pro", name: "Full" },
        enterprise: { id: "enterprise", name: "Multiunidades" },
    };

    // estados da célula
    type CellValue = boolean | "partial" | "limited" | "consult" | "full";

    type ComparisonRow = {
        label: string;
        helper?: string;
        values: Record<PlanId, CellValue>;
    };

    type ComparisonGroupId = "marketing" | "commercial" | "pedagogy" | "finance";

    type ComparisonGroup = {
        id: ComparisonGroupId;
        title: string;
        description?: string;
        rows: ComparisonRow[];
    };

    function cellIconColor(value: CellValue): string {
        if (value === true) return "text-emerald-500"; // incluso
        if (value === "full") return "text-emerald-600"; // full
        if (value === "partial") return "text-amber-500"; // parcial
        if (value === "limited") return "text-orange-500"; // limitado
        if (value === "consult") return "text-yellow-500"; // sob consulta
        return "text-slate-300"; // não incluso
    }

    function cellLabel(value: CellValue): string | null {
        if (value === "limited") return "Limitado";
        if (value === "consult") return "Sob consulta";
        if (value === "full") return "Full";
        if (value === "partial") return "Parcial";
        return null;
    }

    // grupo aberto por padrão
    let openGroupId: ComparisonGroupId | null = "marketing";

    const comparisonGroups: ComparisonGroup[] = [
        // --------------- MARKETING ---------------
        {
            id: "marketing",
            title: "Marketing e Captação",
            description:
                "Tudo que envolve campanhas, formulários, prospecção, listas, mensageria e custo por lead.",
            rows: [
                {
                    label: "Fontes & eventos para campanhas",
                    helper:
                        "Cadastro de campanhas, canais, ações de divulgação e origem dos leads.",
                    values: {
                        starter: true,
                        standard: true,
                        pro: true,
                        enterprise: true,
                    },
                },
                {
                    label: "Campanhas com formulários Meta Ads / Google Ads",
                    helper:
                        "Uso de formulários de campanha conectados ao funil de vendas.",
                    values: {
                        starter: "partial",
                        standard: true,
                        pro: true,
                        enterprise: true,
                    },
                },
                {
                    label: "Prospecção e geração de listas",
                    helper:
                        "Construção de listas a partir de campanhas, bases próprias e indicações.",
                    values: {
                        starter: "partial",
                        standard: true,
                        pro: true,
                        enterprise: true,
                    },
                },
                {
                    label: "Importação de leads (CSV / Excel)",
                    helper:
                        "Importe cadastros em massa a partir de planilhas existentes.",
                    values: {
                        starter: true,
                        standard: true,
                        pro: true,
                        enterprise: true,
                    },
                },
                {
                    label: "Inclusão e atualização via API",
                    helper:
                        "Entrada e atualização automática de leads por integrações externas.",
                    values: {
                        starter: false,
                        standard: "limited",
                        pro: "full",
                        enterprise: "consult",
                    },
                },
                {
                    label:
                        "Distribuição das listas para TMK / Tele / SDR (fila, round-robin etc.)",
                    values: {
                        starter: "partial",
                        standard: true,
                        pro: true,
                        enterprise: true,
                    },
                },
                {
                    label: "Serviço de mensageria (SMS, WhatsApp)",
                    helper:
                        "Envio de campanhas e notificações integrado ao funil.",
                    values: {
                        starter: "limited",
                        standard: "partial",
                        pro: "full",
                        enterprise: "full",
                    },
                },
                {
                    label: "Indicação de amigos",
                    helper:
                        "Controle de indicações internas para aproveitar a rede dos alunos.",
                    values: {
                        starter: "partial",
                        standard: true,
                        pro: true,
                        enterprise: true,
                    },
                },
                {
                    label: "Higienização / limpeza de leads",
                    helper:
                        "Ferramentas para remover duplicidades, organizar contatos e qualificar base.",
                    values: {
                        starter: false,
                        standard: "partial",
                        pro: "full",
                        enterprise: "full",
                    },
                },
                {
                    label:
                        "Reciclagem / repique de ex-alunos e leads não convertidos",
                    values: {
                        starter: "partial",
                        standard: true,
                        pro: true,
                        enterprise: true,
                    },
                },
                {
                    label: "Custo por lead / prospect / cadastro",
                    helper:
                        "Cálculo de custo por campanha, origem e cadastros recebidos.",
                    values: {
                        starter: false,
                        standard: "partial",
                        pro: "full",
                        enterprise: "full",
                    },
                },
                {
                    label: "Painéis de conversão por etapa do funil",
                    values: {
                        starter: false,
                        standard: true,
                        pro: true,
                        enterprise: true,
                    },
                },
                {
                    label: "Relatórios avançados de ROI por campanha",
                    values: {
                        starter: false,
                        standard: "partial",
                        pro: true,
                        enterprise: true,
                    },
                },
            ],
        },

        // --------------- COMERCIAL ---------------
        {
            id: "commercial",
            title: "Comercial e CRM de matrículas",
            description:
                "Funil de vendas, contratos, agenda comercial, comissões e jornada até a matrícula.",
            rows: [
                {
                    label: "Módulo Comercial / CRM para matrículas",
                    helper:
                        "Do primeiro contato até a matrícula confirmada, em um funil único.",
                    values: {
                        starter: true,
                        standard: true,
                        pro: true,
                        enterprise: true,
                    },
                },
                {
                    label: "Controle por estágio do funil",
                    helper:
                        "Status claros de cada lead: contato, proposta, visita, matrícula etc.",
                    values: {
                        starter: "partial",
                        standard: true,
                        pro: true,
                        enterprise: true,
                    },
                },
                {
                    label: "Atribuição automática de leads para a equipe",
                    helper:
                        "Regras para distribuir leads entre vendedores, TMK e consultores.",
                    values: {
                        starter: false,
                        standard: true,
                        pro: true,
                        enterprise: true,
                    },
                },
                {
                    label: "Cadência de atividades e workflows",
                    helper:
                        "Sequências de tarefas, lembretes e ações recomendadas por perfil de lead.",
                    values: {
                        starter: "limited",
                        standard: true,
                        pro: true,
                        enterprise: true,
                    },
                },
                {
                    label: "Agenda de visitas e atendimentos",
                    helper:
                        "Agendamento, confirmação, reagendamento e registro de atendimento.",
                    values: {
                        starter: "partial",
                        standard: true,
                        pro: true,
                        enterprise: true,
                    },
                },
                {
                    label: "Controle de propostas, pré-matrículas e contratos",
                    values: {
                        starter: true,
                        standard: true,
                        pro: true,
                        enterprise: true,
                    },
                },
                {
                    label: "Checklist de novas matrículas",
                    helper:
                        "Etapas obrigatórias para garantir dados completos e matrícula sem pendências.",
                    values: {
                        starter: "limited",
                        standard: true,
                        pro: true,
                        enterprise: true,
                    },
                },
                {
                    label:
                        "Envio e controle de documentos (selfie, CNH, comprovantes etc.)",
                    values: {
                        starter: false,
                        standard: "partial",
                        pro: true,
                        enterprise: true,
                    },
                },
                {
                    label: "Tipos de venda (bolsa, bolsa parcial, tabelado / livre)",
                    values: {
                        starter: "partial",
                        standard: true,
                        pro: true,
                        enterprise: true,
                    },
                },
                {
                    label: "Cálculo automático de comissão",
                    values: {
                        starter: false,
                        standard: "partial",
                        pro: true,
                        enterprise: true,
                    },
                },
            ],
        },

        // --------------- PEDAGÓGICO ---------------
        {
            id: "pedagogy",
            title: "Pedagógico, turmas e conteúdo",
            description:
                "Rotina de secretaria, diários, avaliações, conteúdos e jornada do aluno.",
            rows: [
                {
                    label: "Módulo Pedagógico (diário, avaliações, planos de aula)",
                    values: {
                        starter: true,
                        standard: true,
                        pro: true,
                        enterprise: true,
                    },
                },
                {
                    label: "Cadastro e controle de turmas",
                    helper:
                        "Abertura, tipo, nível, carga horária, período e capacidade.",
                    values: {
                        starter: true,
                        standard: true,
                        pro: true,
                        enterprise: true,
                    },
                },
                {
                    label: "Pauta de chamada / diário de classe",
                    values: {
                        starter: true,
                        standard: true,
                        pro: true,
                        enterprise: true,
                    },
                },
                {
                    label: "Frequência, notas, avaliações e médias automáticas",
                    values: {
                        starter: "partial",
                        standard: true,
                        pro: true,
                        enterprise: true,
                    },
                },
                {
                    label: "Conteúdo programático e plano previsto de aulas",
                    values: {
                        starter: "partial",
                        standard: true,
                        pro: true,
                        enterprise: true,
                    },
                },
                {
                    label:
                        "Cursos com matérias / módulos / níveis e materiais didáticos",
                    values: {
                        starter: "partial",
                        standard: true,
                        pro: true,
                        enterprise: true,
                    },
                },
                {
                    label: "Testes de nivelamento / acompanhamento de andamento",
                    values: {
                        starter: false,
                        standard: "limited",
                        pro: true,
                        enterprise: true,
                    },
                },
                {
                    label:
                        "Tipos de aula (presencial, online, ao vivo, gravada, EAD)",
                    values: {
                        starter: "partial",
                        standard: true,
                        pro: true,
                        enterprise: true,
                    },
                },
                {
                    label:
                        "Boletins e certificados com personalização e QR Code",
                    values: {
                        starter: "limited",
                        standard: true,
                        pro: true,
                        enterprise: true,
                    },
                },
                {
                    label:
                        "App do aluno / professor, conteúdos digitais e EAD integrado (AVA)",
                    values: {
                        starter: false,
                        standard: false,
                        pro: "full",
                        enterprise: "full",
                    },
                },
            ],
        },

        // --------------- FINANCEIRO ---------------
        {
            id: "finance",
            title: "Financeiro, cobrança e indicadores",
            description:
                "Mensalidades, contas a pagar / receber, nota fiscal e visão financeira da escola.",
            rows: [
                {
                    label: "Módulo financeiro integrado às matrículas",
                    helper:
                        "Cobrança vinculada a contratos, turmas e situação do aluno.",
                    values: {
                        starter: false,
                        standard: true,
                        pro: true,
                        enterprise: true,
                    },
                },
                {
                    label: "Cobrança de mensalidade (manual e automática)",
                    values: {
                        starter: "partial", // só manual
                        standard: true,
                        pro: true,
                        enterprise: true,
                    },
                },
                {
                    label: "Pagamento recorrente (PIX, boleto, cartão)",
                    values: {
                        starter: false,
                        standard: true,
                        pro: true,
                        enterprise: true,
                    },
                },
                {
                    label: "Contas a receber (mensalidades, produtos, serviços)",
                    values: {
                        starter: "partial",
                        standard: true,
                        pro: true,
                        enterprise: true,
                    },
                },
                {
                    label: "Contas a pagar e controle de faturas",
                    values: {
                        starter: false,
                        standard: true,
                        pro: true,
                        enterprise: true,
                    },
                },
                {
                    label: "Receita x despesas e orçamentos",
                    values: {
                        starter: false,
                        standard: "partial",
                        pro: true,
                        enterprise: true,
                    },
                },
                {
                    label: "Plano de contas e centros de custo",
                    values: {
                        starter: false,
                        standard: true,
                        pro: true,
                        enterprise: true,
                    },
                },
                {
                    label: "Conciliação bancária e extrato bancário",
                    values: {
                        starter: false,
                        standard: false,
                        pro: true,
                        enterprise: true,
                    },
                },
                {
                    label: "Nota fiscal eletrônica com integração oficial",
                    values: {
                        starter: false,
                        standard: false,
                        pro: "full",
                        enterprise: "consult",
                    },
                },
                {
                    label:
                        "Relatórios de inadimplência e projeção de recebíveis",
                    values: {
                        starter: false,
                        standard: "partial",
                        pro: true,
                        enterprise: true,
                    },
                },
            ],
        },
    ];
</script>

<section
    class="relative py-16 md:py-20 lg:py-24 bg-white/60"
    aria-label="Comparativo de funcionalidades por plano"
>
    <div class="container">
        <div class="max-w-3xl">
            <h2
                class="text-[24px] md:text-[32px] lg:text-[36px] font-semibold leading-tight tracking-[-0.03em] text-[#010D28]"
            >
                Compare os planos
                <span class="text-primary">em cada área da escola</span>.
            </h2>
            <p
                class="mt-3 text-[14px] md:text-[15px] text-[#4B5563] max-w-[640px]"
            >
                Expanda os grupos para ver, em detalhes, o que cada plano
                oferece em Marketing, Comercial, Pedagógico e Financeiro. Verde
                é incluso, laranja é limitado, amarelo é sob consulta e cinza
                não faz parte daquele pacote.
            </p>
        </div>

        <div class="mt-8 space-y-4">
            {#each comparisonGroups as group}
                <article
                    class="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden"
                >
                    <!-- Cabeçalho do grupo (retrátil) -->
                    <button
                        type="button"
                        class="flex w-full items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4"
                        on:click={() =>
                            (openGroupId =
                                openGroupId === group.id ? null : group.id)}
                    >
                        <div class="text-left">
                            <p
                                class="text-[13px] md:text-[14px] font-semibold text-[#010D28]"
                            >
                                {group.title}
                            </p>
                            {#if group.description}
                                <p
                                    class="mt-0.5 text-[12px] text-[#6B7280] max-w-xl"
                                >
                                    {group.description}
                                </p>
                            {/if}
                        </div>

                        <span
                            class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                            aria-hidden="true"
                        >
                            <ChevronDown
                                size={16}
                                class={`transition-transform ${
                                    openGroupId === group.id
                                        ? "rotate-180"
                                        : ""
                                }`}
                            />
                        </span>
                    </button>

                    {#if openGroupId === group.id}
                        <div
                            class="border-t border-slate-100 bg-white overflow-x-auto"
                        >
                            <table class="min-w-full text-left align-top">
                                <thead class="bg-slate-50">
                                    <tr>
                                        <th
                                            class="px-4 py-4 text-[12px] font-semibold text-slate-500 md:px-6"
                                        >
                                            Recurso
                                        </th>
                                        {#each planOrder as id}
                                            <th
                                                class="px-4 py-4 text-[12px] font-semibold text-slate-500 md:px-6 text-center"
                                            >
                                                <div
                                                    class="flex flex-col items-center gap-1"
                                                >
                                                    <span>
                                                        {planMap[id].name}
                                                    </span>
                                                    {#if id === "standard"}
                                                        <span
                                                            class="inline-flex rounded-full bg-primary/5 px-2 py-[2px] text-[11px] font-semibold text-primary"
                                                        >
                                                            recomendado
                                                        </span>
                                                    {/if}
                                                </div>
                                            </th>
                                        {/each}
                                    </tr>
                                </thead>
                                <tbody
                                    class="divide-y divide-slate-100 text-[13px]"
                                >
                                    {#each group.rows as row}
                                        <tr
                                            class="hover:bg-slate-50/60"
                                        >
                                            <td
                                                class="px-4 py-3 md:px-6 align-middle"
                                            >
                                                <div
                                                    class="flex flex-col gap-1"
                                                >
                                                    <span
                                                        class="font-medium text-[#010D28]"
                                                    >
                                                        {row.label}
                                                    </span>
                                                    {#if row.helper}
                                                        <span
                                                            class="text-[12px] text-[#6B7280]"
                                                        >
                                                            {row.helper}
                                                        </span>
                                                    {/if}
                                                </div>
                                            </td>

                                            {#each planOrder as id}
                                                {#if row.values[id] !== undefined}
                                                    {@const value =
                                                        row.values[id]}
                                                    <td
                                                        class="px-4 py-3 md:px-6 text-center align-middle"
                                                    >
                                                        <div
                                                            class="inline-flex flex-col items-center gap-1"
                                                        >
                                                            {#if value === true}
                                                                <span
                                                                    class={`inline-flex items-center justify-center ${cellIconColor(
                                                                        value,
                                                                    )}`}
                                                                >
                                                                    <Check
                                                                        size={18}
                                                                    />
                                                                </span>
                                                            {:else if
                                                                value === false}
                                                                <span
                                                                    class={`inline-flex items-center justify-center ${cellIconColor(
                                                                        value,
                                                                    )}`}
                                                                >
                                                                    <Minus
                                                                        size={18}
                                                                    />
                                                                </span>
                                                            {:else if
                                                                value ===
                                                                "partial"}
                                                                <span
                                                                    class={`inline-flex items-center justify-center ${cellIconColor(
                                                                        value,
                                                                    )}`}
                                                                >
                                                                    <Check
                                                                        size={18}
                                                                    />
                                                                </span>
                                                            {:else if
                                                                value ===
                                                                    "limited" ||
                                                                value ===
                                                                    "consult"}
                                                                <span
                                                                    class={`inline-flex items-center justify-center ${cellIconColor(
                                                                        value,
                                                                    )}`}
                                                                >
                                                                    <AlertTriangle
                                                                        size={18}
                                                                    />
                                                                </span>
                                                            {:else if
                                                                value ===
                                                                "full"}
                                                                <span
                                                                    class={`inline-flex items-center justify-center ${cellIconColor(
                                                                        value,
                                                                    )}`}
                                                                >
                                                                    <Check
                                                                        size={18}
                                                                    />
                                                                </span>
                                                            {/if}

                                                            {#if cellLabel(
                                                                value,
                                                            )}
                                                                <span
                                                                    class="text-[10px] font-medium text-slate-500"
                                                                >
                                                                    {cellLabel(
                                                                        value,
                                                                    )}
                                                                </span>
                                                            {/if}
                                                        </div>
                                                    </td>
                                                {/if}
                                            {/each}
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        </div>
                    {/if}
                </article>
            {/each}
        </div>

        <div
            class="mt-4 border-t border-slate-100 pt-4 text-[12px] text-[#6B7280]"
        >
            Funcionalidades podem variar conforme o projeto, integrações e
            número de unidades. Na proposta comercial detalhamos exatamente o
            que está incluído em cada cenário.
        </div>
    </div>
</section>
