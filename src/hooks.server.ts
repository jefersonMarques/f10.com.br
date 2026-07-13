// src/hooks.server.ts
// Redirecionamentos de URLs antigas para preservar autoridade, tráfego e indexação.

import { redirect, type Handle } from "@sveltejs/kit";

type RedirectRule = {
  from: string;
  to: string;
  permanent?: boolean;
};

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function buildRedirectMap(
  rules: RedirectRule[],
): Map<string, { to: string; status: number }> {
  const map = new Map<string, { to: string; status: number }>();

  for (const rule of rules) {
    map.set(normalizePath(rule.from), {
      to: rule.to,
      status: rule.permanent === false ? 302 : 301,
    });
  }

  return map;
}

const redirectRules: RedirectRule[] = [
  // ===== Páginas principais e URLs institucionais antigas =====
  { from: "/home", to: "/" },
  { from: "/f10", to: "/sobre" },
  { from: "/inovacao-digital", to: "/inovacao-na-escola" },
  { from: "/f10-smart-aluno", to: "/solucoes/aplicativo-smart-aluno" },

  // Destino temporário até o artigo equivalente ser publicado no blog F10.
  // Depois da publicação, trocar por um redirecionamento 301 para a URL definitiva.
  {
    from: "/cursos-profissionalizantes-crescimento-em-2018-e-um-mundo-de-possibilidades-para-2019",
    to: "/inovacao-na-escola/marketing-educacional",
    permanent: false,
  },

  // ===== Treinamentos =====
  {
    from: "/treinamentos",
    to: "https://ajuda.f10.com.br/kb/pt-br/article/291730/treinamentos-novo-cliente-f10",
  },

  // ===== Soluções antigas =====
  {
    from: "/solucoes/envio-de-sms",
    to: "/solucoes/marketing-captacao-de-alunos",
  },
  { from: "/solucoes/funil-de-vendas", to: "/solucoes/vendas" },
  {
    from: "/solucoes/app-e-portal-do-aluno",
    to: "/solucoes/aplicativo-smart-aluno",
  },
  {
    from: "/solucoes/pagamento-recorrente",
    to: "/solucoes/financeiro",
  },
  { from: "/cel_cash", to: "/celcoin/cadastro-de-escolas" },

  // ===== Categorias antigas do blog =====
  { from: "/blog", to: "/inovacao-na-escola" },
  { from: "/blog/gestao-escolar", to: "/solucoes" },
  {
    from: "/blog/captacao-de-alunos",
    to: "/solucoes/marketing-captacao-de-alunos",
  },
  { from: "/blog/pedagogico", to: "/solucoes/pedagogico" },
  { from: "/blog/inovacao", to: "/inovacao-na-escola" },

  // ===== Posts antigos do blog =====
  {
    from: "/blog/4-dicas-de-controle-de-frequencia-de-alunos-que-voce-deveria-adotar",
    to: "/solucoes/pedagogico",
  },
  {
    from: "/blog/4-reais-beneficios-da-automacao-escolar-na-rotina-da-escola",
    to: "/inovacao-na-escola",
  },
  {
    from: "/blog/como-melhorar-o-atendimento-ao-aluno-com-um-sistema-de-gestao",
    to: "/solucoes/aplicativo-smart-aluno",
  },
  {
    from: "/blog/conheca-5-maiores-desafios-da-gestao-escolar-e-como-supera-los",
    to: "/solucoes",
  },
  { from: "/download/InstaladorF10.exe", to: "/download" },
];

const redirectMap = buildRedirectMap(redirectRules);

export const handle: Handle = async ({ event, resolve }) => {
  const pathname = normalizePath(event.url.pathname);
  const direct = redirectMap.get(pathname);

  if (direct) {
    const destinationPath = direct.to.startsWith("http")
      ? direct.to
      : normalizePath(direct.to);

    if (destinationPath !== pathname) {
      throw redirect(direct.status, direct.to);
    }
  }

  const response = await resolve(event, {
    transformPageChunk: ({ html }) => {
      if (pathname !== "/contato") return html;

      return html.replace(/\(41\) 9294-3443/g, "(41) 99294-3443");
    },
  });

  if (response.status === 404) {
    if (pathname.startsWith("/blog/")) {
      throw redirect(301, "/inovacao-na-escola/marketing-educacional");
    }

    if (pathname.startsWith("/solucoes/")) {
      throw redirect(301, "/solucoes");
    }
  }

  return response;
};
