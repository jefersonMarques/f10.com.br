export type HelpIconName =
  | "access"
  | "book"
  | "classes"
  | "download"
  | "finance"
  | "help"
  | "operations"
  | "sales"
  | "support"
  | "team";

export type HelpDestinationKind =
  | "route"
  | "training"
  | "sequence"
  | "support";

export type HelpDestination = {
  id: string;
  kind: HelpDestinationKind;
  eyebrow: string;
  title: string;
  description: string;
  actionLabel: string;
  icon: HelpIconName;
  href?: string;
  trainingIds?: string[];
};

export type HelpOption = {
  id: string;
  label: string;
  description: string;
  icon: HelpIconName;
  nextQuestionId?: string;
  destinationId?: string;
  opensSearch?: boolean;
};

export type HelpQuestion = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  options: HelpOption[];
  compact?: boolean;
  searchLabel?: string;
};

export const HELP_ROOT_QUESTION_ID = "root";

export const helpDestinations: HelpDestination[] = [
  {
    id: "install-f10",
    kind: "route",
    eyebrow: "Instalação guiada",
    title: "Vamos instalar o F10",
    description:
      "Você verá uma ação por vez, desde o download até o primeiro acesso.",
    actionLabel: "Começar instalação",
    icon: "download",
    href: "/primeiros-passos-f10",
  },
  {
    id: "first-access",
    kind: "route",
    eyebrow: "Primeiro acesso",
    title: "Vamos entrar no F10 pela primeira vez",
    description:
      "Tenha em mãos o login e a senha provisória enviados por e-mail.",
    actionLabel: "Começar primeiro acesso",
    icon: "access",
    href: "/primeiros-passos-f10?etapa=primeiro-acesso",
  },
  {
    id: "create-password",
    kind: "route",
    eyebrow: "Nova senha",
    title: "Vamos criar sua senha pessoal",
    description:
      "A orientação começa no acesso provisório e mostra o que fazer quando a tela recarregar.",
    actionLabel: "Ver orientação da senha",
    icon: "access",
    href: "/primeiros-passos-f10?etapa=primeiro-acesso",
  },
  {
    id: "installation-help",
    kind: "route",
    eyebrow: "Ajuda para instalar",
    title: "Vamos descobrir onde a instalação parou",
    description:
      "A orientação verifica o Windows, o download e a abertura do instalador.",
    actionLabel: "Resolver instalação",
    icon: "download",
    href: "/primeiros-passos-f10",
  },
  {
    id: "login-help",
    kind: "route",
    eyebrow: "Ajuda para entrar",
    title: "Vamos refazer o primeiro acesso",
    description:
      "Confira a senha provisória, crie a nova senha e entre novamente.",
    actionLabel: "Resolver primeiro acesso",
    icon: "access",
    href: "/primeiros-passos-f10?etapa=primeiro-acesso",
  },
  {
    id: "team-setup",
    kind: "sequence",
    eyebrow: "Trilha para gestores",
    title: "Cadastrar a equipe e definir os acessos",
    description:
      "Primeiro cadastre usuários e funcionários. Depois, escolha o que cada pessoa poderá acessar.",
    actionLabel: "Começar orientação",
    icon: "team",
    trainingIds: ["user-registration", "user-permissions"],
  },
  {
    id: "user-registration",
    kind: "training",
    eyebrow: "Configuração da equipe",
    title: "Cadastrar usuários e funcionários",
    description: "Veja como cadastrar as pessoas que utilizarão o F10.",
    actionLabel: "Assistir orientação",
    icon: "team",
    trainingIds: ["user-registration"],
  },
  {
    id: "user-permissions",
    kind: "training",
    eyebrow: "Configuração da equipe",
    title: "Definir os direitos de um usuário",
    description: "Escolha os menus e as rotinas que cada pessoa poderá acessar.",
    actionLabel: "Assistir orientação",
    icon: "team",
    trainingIds: ["user-permissions"],
  },
  {
    id: "class-creation",
    kind: "training",
    eyebrow: "Turmas e aulas",
    title: "Criar uma turma",
    description: "Aprenda a configurar uma nova turma no F10.",
    actionLabel: "Assistir orientação",
    icon: "classes",
    trainingIds: ["class-creation"],
  },
  {
    id: "opportunity-conversion",
    kind: "training",
    eyebrow: "Interessados e vendas",
    title: "Criar e converter uma oportunidade",
    description: "Registre um interessado e avance a oportunidade comercial.",
    actionLabel: "Assistir orientação",
    icon: "sales",
    trainingIds: ["opportunity-conversion"],
  },
  {
    id: "enrollment-flow",
    kind: "sequence",
    eyebrow: "Trilha de matrícula",
    title: "Matricular um novo aluno",
    description:
      "Crie a matrícula e o contrato. Em seguida, inclua as turmas corretas.",
    actionLabel: "Começar matrícula",
    icon: "book",
    trainingIds: ["enrollment-contract", "enrollment-classes"],
  },
  {
    id: "enrollment-contract",
    kind: "training",
    eyebrow: "Matrículas",
    title: "Criar uma matrícula ou contrato",
    description: "Veja como efetivar uma nova matrícula e gerar o contrato.",
    actionLabel: "Assistir orientação",
    icon: "book",
    trainingIds: ["enrollment-contract"],
  },
  {
    id: "enrollment-classes",
    kind: "training",
    eyebrow: "Matrículas",
    title: "Incluir uma turma na matrícula",
    description: "Vincule as turmas corretas à matrícula do aluno.",
    actionLabel: "Assistir orientação",
    icon: "classes",
    trainingIds: ["enrollment-classes"],
  },
  {
    id: "monthly-payment",
    kind: "training",
    eyebrow: "Financeiro",
    title: "Receber uma mensalidade",
    description: "Registre no F10 o pagamento da mensalidade de um aluno.",
    actionLabel: "Assistir orientação",
    icon: "finance",
    trainingIds: ["monthly-payment"],
  },
  {
    id: "pix-payment",
    kind: "training",
    eyebrow: "Financeiro",
    title: "Receber por Pix",
    description: "Veja como utilizar o Pix para receber dos alunos.",
    actionLabel: "Assistir orientação",
    icon: "finance",
    trainingIds: ["pix-payment"],
  },
  {
    id: "student-class-attendance",
    kind: "training",
    eyebrow: "Turmas e aulas",
    title: "Incluir um aluno na turma e abrir a pauta",
    description: "Inclua o aluno e inicie o controle da pauta da turma.",
    actionLabel: "Assistir orientação",
    icon: "classes",
    trainingIds: ["student-class-attendance"],
  },
  {
    id: "attendance-grades",
    kind: "training",
    eyebrow: "Turmas e aulas",
    title: "Lançar pautas, notas e médias",
    description: "Registre presenças, avaliações, notas e médias dos alunos.",
    actionLabel: "Assistir orientação",
    icon: "classes",
    trainingIds: ["attendance-grades"],
  },
  {
    id: "student-progress",
    kind: "training",
    eyebrow: "Alunos",
    title: "Acompanhar o andamento do curso",
    description: "Consulte o progresso dos alunos durante o curso.",
    actionLabel: "Assistir orientação",
    icon: "classes",
    trainingIds: ["student-progress"],
  },
  {
    id: "columns-grouping",
    kind: "training",
    eyebrow: "Listas e relatórios",
    title: "Selecionar colunas e agrupar campos",
    description: "Organize as informações mostradas nas listagens do F10.",
    actionLabel: "Assistir orientação",
    icon: "operations",
    trainingIds: ["columns-grouping"],
  },
  {
    id: "product-movement",
    kind: "training",
    eyebrow: "Produtos",
    title: "Registrar compra ou venda de produtos",
    description: "Registre entradas e saídas dos produtos comercializados.",
    actionLabel: "Assistir orientação",
    icon: "operations",
    trainingIds: ["product-movement"],
  },
  {
    id: "accounts-payable",
    kind: "training",
    eyebrow: "Financeiro",
    title: "Cadastrar uma conta a pagar",
    description: "Cadastre e acompanhe os compromissos financeiros da escola.",
    actionLabel: "Assistir orientação",
    icon: "finance",
    trainingIds: ["accounts-payable"],
  },
  {
    id: "bank-movement",
    kind: "training",
    eyebrow: "Financeiro",
    title: "Conferir caixa e movimentação bancária",
    description: "Registre movimentações e acompanhe o saldo disponível.",
    actionLabel: "Assistir orientação",
    icon: "finance",
    trainingIds: ["bank-movement"],
  },
  {
    id: "crm-sales-funnel",
    kind: "training",
    eyebrow: "Interessados e vendas",
    title: "Controlar leads no CRM e funil de vendas",
    description: "Organize os leads e acompanhe cada etapa do atendimento.",
    actionLabel: "Assistir orientação",
    icon: "sales",
    trainingIds: ["crm-sales-funnel"],
  },
  {
    id: "support",
    kind: "support",
    eyebrow: "Atendimento F10",
    title: "Vamos pedir ajuda ao suporte",
    description:
      "Explique o que tentou fazer e em qual tela apareceu a dificuldade.",
    actionLabel: "Abrir suporte F10",
    icon: "support",
  },
];

export const helpQuestions: HelpQuestion[] = [
  {
    id: HELP_ROOT_QUESTION_ID,
    eyebrow: "Ajuda F10",
    title: "O que você precisa fazer agora?",
    description: "Escolha uma opção. Mostraremos somente o próximo passo.",
    options: [
      {
        id: "access",
        label: "Instalar ou acessar o F10",
        description: "Download, instalação, senha e primeiro acesso.",
        icon: "access",
        nextQuestionId: "access",
      },
      {
        id: "task",
        label: "Aprender a fazer uma tarefa",
        description: "Matrículas, turmas, financeiro e outras rotinas.",
        icon: "book",
        nextQuestionId: "task-areas",
      },
      {
        id: "problem",
        label: "Resolver um problema",
        description: "Não consegui instalar, entrar ou usar uma rotina.",
        icon: "support",
        nextQuestionId: "problem",
      },
    ],
  },
  {
    id: "access",
    eyebrow: "Instalação e acesso",
    title: "Em qual situação você está?",
    description: "Escolha a frase que melhor descreve o momento atual.",
    compact: true,
    options: [
      {
        id: "not-installed",
        label: "Ainda preciso instalar",
        description: "O F10 ainda não está instalado neste computador.",
        icon: "download",
        destinationId: "install-f10",
      },
      {
        id: "installed-first-access",
        label: "Já instalei e nunca entrei",
        description: "Tenho o login e a senha provisória do e-mail.",
        icon: "access",
        destinationId: "first-access",
      },
      {
        id: "password-screen",
        label: "Apareceu a tela para criar senha",
        description: "Entrei com a senha provisória e preciso continuar.",
        icon: "access",
        destinationId: "create-password",
      },
      {
        id: "cannot-login",
        label: "Não consigo entrar",
        description: "O login ou a senha não estão funcionando.",
        icon: "help",
        destinationId: "login-help",
      },
    ],
  },
  {
    id: "task-areas",
    eyebrow: "Aprender uma tarefa",
    title: "O que você quer fazer?",
    description: "Escolha a área. Na próxima tela indicaremos a tarefa exata.",
    compact: true,
    searchLabel: "Não sei qual opção escolher",
    options: [
      {
        id: "enrollment",
        label: "Matricular um aluno",
        description: "Matrícula, contrato e inclusão de turmas.",
        icon: "book",
        nextQuestionId: "enrollment",
      },
      {
        id: "classes",
        label: "Organizar turmas e aulas",
        description: "Turmas, pautas, notas e andamento do curso.",
        icon: "classes",
        nextQuestionId: "classes",
      },
      {
        id: "finance",
        label: "Receber ou movimentar dinheiro",
        description: "Mensalidades, Pix, contas e caixa.",
        icon: "finance",
        nextQuestionId: "finance",
      },
      {
        id: "sales",
        label: "Trabalhar com interessados",
        description: "Oportunidades, leads, CRM e funil de vendas.",
        icon: "sales",
        nextQuestionId: "sales",
      },
      {
        id: "team",
        label: "Configurar usuários da equipe",
        description: "Cadastro de funcionários e direitos de acesso.",
        icon: "team",
        nextQuestionId: "team",
      },
      {
        id: "operations",
        label: "Produtos, listas e relatórios",
        description: "Compras, vendas, colunas e agrupamentos.",
        icon: "operations",
        nextQuestionId: "operations",
      },
    ],
  },
  {
    id: "problem",
    eyebrow: "Resolver um problema",
    title: "Onde você encontrou dificuldade?",
    description: "Escolha uma opção para receber a orientação correta.",
    compact: true,
    options: [
      {
        id: "installation-problem",
        label: "Não consegui instalar",
        description: "Problema no Windows, download ou instalador.",
        icon: "download",
        destinationId: "installation-help",
      },
      {
        id: "login-problem",
        label: "Não consigo entrar",
        description: "Dificuldade com login, senha ou primeiro acesso.",
        icon: "access",
        destinationId: "login-help",
      },
      {
        id: "task-problem",
        label: "Não sei onde fazer uma tarefa",
        description: "Descreva o que precisa e encontraremos a orientação.",
        icon: "help",
        opensSearch: true,
      },
      {
        id: "system-error",
        label: "Apareceu um erro no F10",
        description: "O sistema mostrou uma mensagem ou não respondeu.",
        icon: "support",
        destinationId: "support",
      },
    ],
  },
  {
    id: "enrollment",
    eyebrow: "Matrículas",
    title: "O que você quer fazer com o aluno?",
    description: "Escolha a ação que precisa realizar agora.",
    compact: true,
    options: [
      {
        id: "complete-enrollment",
        label: "Matricular um novo aluno",
        description: "Matrícula, contrato e inclusão das turmas.",
        icon: "book",
        destinationId: "enrollment-flow",
      },
      {
        id: "create-contract",
        label: "Criar matrícula ou contrato",
        description: "Efetivar a matrícula e gerar o contrato.",
        icon: "book",
        destinationId: "enrollment-contract",
      },
      {
        id: "add-enrollment-class",
        label: "Colocar uma turma na matrícula",
        description: "Vincular uma turma à matrícula existente.",
        icon: "classes",
        destinationId: "enrollment-classes",
      },
    ],
  },
  {
    id: "classes",
    eyebrow: "Turmas e aulas",
    title: "O que você quer fazer?",
    description: "Escolha a rotina pedagógica que precisa aprender.",
    compact: true,
    options: [
      {
        id: "create-class",
        label: "Criar uma turma",
        description: "Configurar uma nova turma no F10.",
        icon: "classes",
        destinationId: "class-creation",
      },
      {
        id: "add-student-attendance",
        label: "Incluir aluno e abrir pauta",
        description: "Colocar o aluno na turma e iniciar a pauta.",
        icon: "classes",
        destinationId: "student-class-attendance",
      },
      {
        id: "add-grades",
        label: "Lançar notas e médias",
        description: "Registrar pautas, presenças, notas e médias.",
        icon: "classes",
        destinationId: "attendance-grades",
      },
      {
        id: "view-progress",
        label: "Acompanhar o andamento do curso",
        description: "Consultar o progresso de um aluno.",
        icon: "classes",
        destinationId: "student-progress",
      },
    ],
  },
  {
    id: "finance",
    eyebrow: "Financeiro",
    title: "Qual movimentação você quer fazer?",
    description: "Escolha somente a operação que precisa realizar agora.",
    compact: true,
    options: [
      {
        id: "receive-monthly-payment",
        label: "Receber uma mensalidade",
        description: "Registrar o pagamento de um aluno.",
        icon: "finance",
        destinationId: "monthly-payment",
      },
      {
        id: "receive-pix",
        label: "Receber por Pix",
        description: "Utilizar o Pix para receber dos alunos.",
        icon: "finance",
        destinationId: "pix-payment",
      },
      {
        id: "pay-account",
        label: "Cadastrar uma conta a pagar",
        description: "Controlar um compromisso financeiro.",
        icon: "finance",
        destinationId: "accounts-payable",
      },
      {
        id: "check-cash",
        label: "Conferir o caixa",
        description: "Movimentação bancária e saldo disponível.",
        icon: "finance",
        destinationId: "bank-movement",
      },
    ],
  },
  {
    id: "sales",
    eyebrow: "Interessados e vendas",
    title: "O que você quer fazer?",
    description: "Escolha a etapa comercial que precisa aprender.",
    compact: true,
    options: [
      {
        id: "create-opportunity",
        label: "Criar ou converter uma oportunidade",
        description: "Registrar um interessado e avançar a oportunidade.",
        icon: "sales",
        destinationId: "opportunity-conversion",
      },
      {
        id: "manage-leads",
        label: "Controlar leads no CRM",
        description: "Acompanhar os leads no funil de vendas.",
        icon: "sales",
        destinationId: "crm-sales-funnel",
      },
    ],
  },
  {
    id: "team",
    eyebrow: "Configuração da equipe",
    title: "O que você quer configurar?",
    description: "Estas orientações são destinadas aos gestores da escola.",
    compact: true,
    options: [
      {
        id: "complete-team-setup",
        label: "Configurar uma pessoa do início",
        description: "Cadastrar o usuário e depois definir os direitos.",
        icon: "team",
        destinationId: "team-setup",
      },
      {
        id: "register-user",
        label: "Cadastrar usuário ou funcionário",
        description: "Criar o cadastro de uma pessoa da equipe.",
        icon: "team",
        destinationId: "user-registration",
      },
      {
        id: "set-permissions",
        label: "Alterar os direitos de um usuário",
        description: "Definir o que a pessoa poderá acessar.",
        icon: "team",
        destinationId: "user-permissions",
      },
    ],
  },
  {
    id: "operations",
    eyebrow: "Produtos, listas e relatórios",
    title: "O que você quer fazer?",
    description: "Escolha a operação que precisa aprender.",
    compact: true,
    options: [
      {
        id: "move-products",
        label: "Registrar compra ou venda de produtos",
        description: "Controlar entradas e saídas de produtos.",
        icon: "operations",
        destinationId: "product-movement",
      },
      {
        id: "organize-columns",
        label: "Organizar colunas de uma lista",
        description: "Selecionar colunas e agrupar campos.",
        icon: "operations",
        destinationId: "columns-grouping",
      },
    ],
  },
];

export function getHelpDestination(
  destinationId: string,
): HelpDestination | undefined {
  return helpDestinations.find(
    (destination) => destination.id === destinationId,
  );
}

export function getHelpQuestion(questionId: string): HelpQuestion | undefined {
  return helpQuestions.find((question) => question.id === questionId);
}
