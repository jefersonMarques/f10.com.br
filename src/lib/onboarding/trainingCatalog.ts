export type TrainingCategoryId =
  | "essential"
  | "sales"
  | "pedagogy"
  | "finance"
  | "operations";

export type TrainingCategory = {
  id: TrainingCategoryId;
  label: string;
  description: string;
};

export type TrainingVideo = {
  id: string;
  title: string;
  description: string;
  videoId: string;
  categoryId: TrainingCategoryId;
  audience?: "manager";
  isEssential?: boolean;
  isNew?: boolean;
};

export const trainingCategories: TrainingCategory[] = [
  {
    id: "essential",
    label: "Configuração da equipe",
    description: "Usuários, funcionários e permissões de acesso.",
  },
  {
    id: "sales",
    label: "Comercial e matrículas",
    description: "Leads, oportunidades, matrículas e contratos.",
  },
  {
    id: "pedagogy",
    label: "Pedagógico",
    description: "Turmas, pautas, notas e andamento dos alunos.",
  },
  {
    id: "finance",
    label: "Financeiro",
    description: "Mensalidades, Pix, contas a pagar e caixa.",
  },
  {
    id: "operations",
    label: "Operação",
    description: "Listagens, campos, produtos, compras e vendas.",
  },
];

export const trainingVideos: TrainingVideo[] = [
  {
    id: "user-registration",
    title: "Cadastro de Usuários e Funcionários",
    description: "Cadastre as pessoas que utilizarão o F10 na rotina da escola.",
    videoId: "GMlLpOf5jhM",
    categoryId: "essential",
    audience: "manager",
    isEssential: true,
  },
  {
    id: "user-permissions",
    title: "Direitos de Usuário",
    description: "Defina quais menus e rotinas cada usuário poderá acessar.",
    videoId: "RBkrzecwEno",
    categoryId: "essential",
    audience: "manager",
    isEssential: true,
  },
  {
    id: "class-creation",
    title: "Criação de Turmas",
    description: "Configure as turmas que serão utilizadas pela escola.",
    videoId: "5FxVTgRbKFE",
    categoryId: "pedagogy",
  },
  {
    id: "opportunity-conversion",
    title: "Criação e Conversão de Novas Oportunidades",
    description: "Registre interessados e avance as oportunidades comerciais.",
    videoId: "3Ui0MjqOGyI",
    categoryId: "sales",
  },
  {
    id: "enrollment-contract",
    title: "Efetivação de Novas Matrículas e Criação de Contratos",
    description: "Conclua uma matrícula e gere o contrato do aluno.",
    videoId: "--Z3hFDb7zc",
    categoryId: "sales",
  },
  {
    id: "enrollment-classes",
    title: "Inclusão de Turmas na Matrícula",
    description: "Vincule as turmas corretas durante o processo de matrícula.",
    videoId: "jfQ7GkFg5gE",
    categoryId: "pedagogy",
  },
  {
    id: "monthly-payment",
    title: "Recebimento de Mensalidades",
    description: "Registre o recebimento das mensalidades dos alunos.",
    videoId: "njGM5dlUBGo",
    categoryId: "finance",
  },
  {
    id: "pix-payment",
    title: "Recebimento por Pix",
    description: "Utilize o Pix para facilitar o recebimento dos alunos.",
    videoId: "XWWe9c7QDgo",
    categoryId: "finance",
    isNew: true,
  },
  {
    id: "student-class-attendance",
    title: "Inclusão de Aluno em Turma e Lançamento de Pauta",
    description: "Inclua o aluno em uma turma e inicie o controle da pauta.",
    videoId: "Pr52MVwF5mE",
    categoryId: "pedagogy",
  },
  {
    id: "attendance-grades",
    title: "Lançamento de Pautas, Notas e Médias",
    description: "Registre presença, avaliações, notas e médias dos alunos.",
    videoId: "yQ8myVkqj2Y",
    categoryId: "pedagogy",
  },
  {
    id: "student-progress",
    title: "Gerenciamento dos Alunos e Andamento do Curso",
    description: "Acompanhe o progresso dos alunos durante o curso.",
    videoId: "zyKv9N4KrJk",
    categoryId: "pedagogy",
  },
  {
    id: "columns-grouping",
    title: "Seleção de Colunas e Agrupamento de Campos",
    description: "Organize as informações exibidas nas listagens do F10.",
    videoId: "l4ayG7pvAs0",
    categoryId: "operations",
  },
  {
    id: "product-movement",
    title: "Movimentação de Produtos: Compra e Venda",
    description: "Registre entradas e saídas dos produtos comercializados.",
    videoId: "wKxFMB14www",
    categoryId: "operations",
  },
  {
    id: "accounts-payable",
    title: "Contas a Pagar",
    description: "Cadastre e acompanhe os compromissos financeiros da escola.",
    videoId: "9LS_-JccnvE",
    categoryId: "finance",
  },
  {
    id: "bank-movement",
    title: "Movimentação Bancária e Saldo de Caixa",
    description: "Registre movimentações e acompanhe o saldo disponível.",
    videoId: "RUTZL6hQkg0",
    categoryId: "finance",
  },
  {
    id: "crm-sales-funnel",
    title: "CRM e Funil de Vendas: Controle dos Leads",
    description: "Organize os leads e acompanhe cada etapa do processo comercial.",
    videoId: "iOzN_TnR_W8",
    categoryId: "sales",
  },
];

export function getYoutubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function getYoutubeEmbedUrl(
  videoId: string,
  autoplay = false,
): string {
  const autoplayParameter = autoplay ? "&autoplay=1" : "";
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0${autoplayParameter}`;
}

export function getYoutubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
