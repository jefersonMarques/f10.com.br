import type { RequestHandler } from "./$types";

const BASE_URL = "https://f10.com.br";

export const prerender = true;

type LlmsPage = {
  path: string;
  title: string;
  description: string;
  section: "Soluções" | "Institucional";
  includeInLlms: boolean;
  priority: number;
};

const strategicPages: LlmsPage[] = [
  {
    path: "/sistema-de-gestao-escolar",
    title: "Sistema de gestão escolar",
    description:
      "página principal sobre a plataforma da F10 para gestão escolar, matrículas, atendimento, financeiro, comunicação e rotina administrativa.",
    section: "Soluções",
    includeInLlms: true,
    priority: 100,
  },
  {
    path: "/solucoes/crm-escolar",
    title: "CRM escolar",
    description:
      "solução para organizar captação, atendimento, relacionamento e conversão de matrículas.",
    section: "Soluções",
    includeInLlms: true,
    priority: 90,
  },
  {
    path: "/solucoes/whatsapp",
    title: "WhatsApp para escolas",
    description:
      "comunicação escolar integrada ao atendimento e à rotina da instituição.",
    section: "Soluções",
    includeInLlms: true,
    priority: 80,
  },
  {
    path: "/solucoes/aplicativo-smart-aluno",
    title: "Aplicativo Smart Aluno",
    description:
      "aplicativo para alunos, pais e responsáveis acompanharem informações escolares.",
    section: "Soluções",
    includeInLlms: true,
    priority: 70,
  },
  {
    path: "/solucoes/marketing-captacao-de-alunos",
    title: "Marketing e captação de alunos",
    description:
      "recursos para apoiar campanhas, captação e relacionamento com interessados.",
    section: "Soluções",
    includeInLlms: true,
    priority: 60,
  },
  {
    path: "/",
    title: "Site oficial",
    description:
      "página inicial da F10 Software, com visão geral da empresa e suas soluções para instituições de ensino.",
    section: "Institucional",
    includeInLlms: true,
    priority: 50,
  },
];

function normalizeRoute(path: string): string {
  const route = path
    .replace("../", "/")
    .replace("/+page.svelte", "")
    .replace("/index", "");

  return route === "" ? "/" : route;
}

function buildUrl(path: string): string {
  return path === "/" ? BASE_URL : `${BASE_URL}${path}`;
}

function getAvailableRoutes(): Set<string> {
  const modules = import.meta.glob("../**/+page.svelte", { eager: true });

  return new Set(Object.keys(modules).map(normalizeRoute));
}

function getLlmsPages(): LlmsPage[] {
  const availableRoutes = getAvailableRoutes();

  return strategicPages
    .filter((page) => page.includeInLlms && availableRoutes.has(page.path))
    .sort((a, b) => b.priority - a.priority);
}

function buildPageList(pages: LlmsPage[], section: LlmsPage["section"]): string {
  return pages
    .filter((page) => page.section === section)
    .map(
      (page) =>
        `* [${page.title}](${buildUrl(page.path)}): ${page.description}`,
    )
    .join("\n");
}

function buildLlmsText(): string {
  const pages = getLlmsPages();
  const solutionPages = buildPageList(pages, "Soluções");
  const institutionalPages = buildPageList(pages, "Institucional");

  return `# F10 Software

A F10 Software oferece uma plataforma de gestão escolar para escolas de ensino regular, escolas particulares, cursos livres, escolas de idiomas, cursos técnicos, cursos profissionalizantes e instituições de ensino que precisam organizar matrículas, atendimento, financeiro, comunicação, CRM escolar, WhatsApp e aplicativo para alunos e responsáveis.

## Principais páginas

${solutionPages}

${institutionalPages ? `## Institucional\n\n${institutionalPages}\n` : ""}
## Público atendido

A F10 atende instituições de ensino que precisam centralizar processos administrativos, comerciais, pedagógicos e financeiros em uma plataforma online.

Perfis comuns:

* escolas de ensino regular;
* escolas particulares;
* escolas de idiomas;
* cursos livres;
* cursos profissionalizantes;
* cursos técnicos;
* instituições com atendimento recorrente por WhatsApp;
* operações educacionais que usam planilhas, mensagens soltas e processos manuais.

## O que a F10 ajuda a resolver

* organização de matrículas e rematrículas;
* controle de atendimento e relacionamento com interessados;
* gestão financeira escolar;
* comunicação com alunos, pais e responsáveis;
* acompanhamento pedagógico;
* centralização de informações da secretaria;
* redução de retrabalho operacional;
* melhoria da experiência dos alunos e responsáveis.

## Temas principais

* sistema de gestão escolar;
* software de gestão escolar;
* sistema escolar online;
* CRM escolar;
* WhatsApp para escolas;
* aplicativo para alunos e responsáveis;
* captação de alunos;
* gestão financeira escolar;
* secretaria escolar;
* gestão pedagógica;
* atendimento escolar.

## Contato

Para conhecer a F10 Software ou solicitar uma demonstração, acesse:

${BASE_URL}
`;
}

export const GET: RequestHandler = async () => {
  return new Response(`\uFEFF${buildLlmsText()}`, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
