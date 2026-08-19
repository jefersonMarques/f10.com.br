export type ApplicationRouteMetadata = {
  title: string;
  section?: string;
  description?: string;
};

type ApplicationRouteRule = ApplicationRouteMetadata & {
  prefix: string;
  exact?: boolean;
};

const operationsRouteRules: ApplicationRouteRule[] = [
  {
    prefix: "/app/tickets/workflows",
    title: "Configurar Kanban",
    section: "Tickets",
    description: "Workflows, áreas e etapas",
  },
  {
    prefix: "/app/help/content/import",
    title: "Importar conteúdos",
    section: "Base de Conhecimento",
    description: "Migração estruturada de conteúdo",
  },
  {
    prefix: "/app/help/content",
    title: "Conteúdos",
    section: "Base de Conhecimento",
    description: "Artigos e materiais de suporte",
  },
  {
    prefix: "/app/help/trilhas",
    title: "Trilhas",
    section: "Base de Conhecimento",
    description: "Treinamentos e aprendizado",
  },
  {
    prefix: "/app/help/search",
    title: "Pesquisa de Suporte",
    section: "Base de Conhecimento",
    description: "Pesquisa operacional centralizada",
  },
  {
    prefix: "/app/help/insights",
    title: "Insights da Central",
    section: "Base de Conhecimento",
    description: "Uso, cobertura e oportunidades",
  },
  {
    prefix: "/app/help/assets",
    title: "Biblioteca de arquivos",
    section: "Base de Conhecimento",
    description: "Mídias e anexos reutilizáveis",
  },
  {
    prefix: "/app/help/flows",
    title: "Fluxos da Central",
    section: "Base de Conhecimento",
    description: "Estrutura interativa de ajuda",
  },
  {
    prefix: "/app/help",
    title: "Base de Conhecimento",
    section: "Conhecimento",
    description: "Conteúdos, treinamentos e estrutura de ajuda",
  },
  {
    prefix: "/app/tasks/calendar/scheduling",
    title: "Links de agendamento",
    section: "Agenda",
    description: "Disponibilidade e links para reuniões",
  },
  {
    prefix: "/app/tasks/calendar/availability",
    title: "Disponibilidade",
    section: "Agenda",
    description: "Horários disponíveis para agendamento",
  },
  {
    prefix: "/app/tasks/calendar",
    title: "Agenda",
    section: "Trabalho interno",
    description: "Tarefas, eventos e compromissos",
  },
  {
    prefix: "/app/tasks/projects",
    title: "Configurar projeto",
    section: "Tarefas",
    description: "Equipe, status e regras do projeto",
  },
  {
    prefix: "/app/tasks",
    title: "Tarefas",
    section: "Trabalho interno",
    description: "Projetos e atividades",
  },
  {
    prefix: "/app/tickets",
    title: "Tickets",
    section: "Atendimento",
    description: "Kanban global e fluxos por área",
  },
  {
    prefix: "/app/chat/lab",
    title: "Laboratório de IA",
    section: "Chat",
    description: "Teste controlado do agente de suporte",
  },
  {
    prefix: "/app/chat/preview",
    title: "Preview do cliente",
    section: "Chat",
    description: "Homologação ponta a ponta do atendimento",
  },
  {
    prefix: "/app/chat",
    title: "Chat",
    section: "Atendimento em tempo real",
    description: "Conversas e atendimento humano",
  },
  {
    prefix: "/app/remote",
    title: "Acesso remoto",
    section: "Suporte assistido",
    description: "Sessões, dispositivos e auditoria",
  },
  {
    prefix: "/app/performance",
    title: "Performance",
    section: "Gestão",
    description: "Indicadores operacionais",
  },
  {
    prefix: "/app/team",
    title: "Equipe",
    section: "Gestão",
    description: "Pessoas, papéis e permissões",
  },
  {
    prefix: "/app/settings/atendimento",
    title: "Operação do suporte",
    section: "Configurações",
    description: "Filas, equipes, presença, IA e horários",
  },
  {
    prefix: "/app/settings",
    title: "Configurações",
    section: "Administração",
    description: "Parâmetros do ambiente interno",
  },
  {
    prefix: "/app/minha-conta",
    title: "Minha conta",
    section: "Perfil",
    description: "Dados pessoais e segurança",
  },
  {
    prefix: "/app/notifications",
    title: "Notificações",
    section: "Operação",
    description: "Atualizações que precisam da sua atenção",
  },
  {
    prefix: "/app/calendar",
    title: "Agenda",
    section: "Trabalho interno",
    description: "Compromissos e disponibilidade",
  },
  {
    prefix: "/app",
    exact: true,
    title: "Visão geral",
    section: "Operação",
    description: "Resumo do ambiente interno",
  },
];

const customerRouteRules: ApplicationRouteRule[] = [
  {
    prefix: "/cliente/chamados/novo",
    title: "Novo chamado",
    section: "Portal do cliente",
  },
  {
    prefix: "/cliente/chamados/conta",
    title: "Minha conta",
    section: "Portal do cliente",
  },
  {
    prefix: "/cliente/chamados/ajuda",
    title: "Ajuda",
    section: "Portal do cliente",
  },
  {
    prefix: "/cliente/chamados",
    title: "Chamados",
    section: "Portal do cliente",
  },
  {
    prefix: "/cliente/unidade",
    title: "Selecionar unidade",
    section: "Portal do cliente",
  },
  {
    prefix: "/cliente/acesso",
    title: "Acesso do cliente",
    section: "Portal do cliente",
  },
  {
    prefix: "/cliente",
    exact: true,
    title: "Área do cliente",
    section: "Portal do cliente",
  },
];

function resolveRouteMetadata(
  pathname: string,
  rules: ApplicationRouteRule[],
  fallback: ApplicationRouteMetadata,
): ApplicationRouteMetadata {
  const match = rules.find((rule) =>
    rule.exact
      ? pathname === rule.prefix
      : pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`),
  );

  if (!match) return fallback;
  return {
    title: match.title,
    section: match.section,
    description: match.description,
  };
}

export function resolveOperationsRouteMetadata(pathname: string): ApplicationRouteMetadata {
  return resolveRouteMetadata(pathname, operationsRouteRules, {
    title: "Operação",
    section: "Área interna",
  });
}

export function resolveCustomerRouteMetadata(pathname: string): ApplicationRouteMetadata {
  return resolveRouteMetadata(pathname, customerRouteRules, {
    title: "Área do cliente",
    section: "Portal do cliente",
  });
}
