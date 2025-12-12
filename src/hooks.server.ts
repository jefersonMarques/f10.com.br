// src/hooks.server.ts
// Comentários (pt-BR): Redirecionamentos 301 do site antigo → site novo.
// Objetivo: zerar 404 de URLs legadas e preservar SEO.

import { redirect, type Handle } from "@sveltejs/kit";

type RedirectRule = {
  from: string;          // pathname antigo
  to: string;            // pathname novo (ou URL absoluta)
  permanent?: boolean;   // default true (301)
};

function normalizePath(pathname: string): string {
  // Remove barra final (exceto root)
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

function buildRedirectMap(rules: RedirectRule[]): Map<string, { to: string; status: number }> {
  const map = new Map<string, { to: string; status: number }>();
  for (const rule of rules) {
    const status = rule.permanent === false ? 302 : 301;
    map.set(normalizePath(rule.from), { to: rule.to, status });
  }
  return map;
}

/**
 * ✅ Mapeamento COMPLETO baseado no sitemap antigo que você colou.
 * Site antigo:
 *  /, /blog, /contato, /f10, /inovacao-digital, /solucoes, ...
 * Site novo (pelas rotas existentes no tree):
 *  /contato, /sobre, /preco, /inovacao-na-escola(/marketing-educacional), /solucoes/(...)
 */
const redirectRules: RedirectRule[] = [

  // ===== Páginas principais do sitemap antigo =====
  { from: "/blog", to: "/inovacao-na-escola/marketing-educacional" },
  { from: "/f10", to: "/sobre" },
  { from: "/inovacao-digital", to: "/inovacao-na-escola" },

  // ===== Soluções antigas → soluções novas =====
  { from: "/solucoes/indicadores-e-bi", to: "/solucoes/indicadores-e-bi" },

  // (essas NÃO existem no novo; mandando pra equivalente mais próxima)
  { from: "/solucoes/envio-de-sms", to: "/solucoes/marketing" },
  { from: "/solucoes/funil-de-vendas", to: "/solucoes/comercial" },
  { from: "/solucoes/app-e-portal-do-aluno", to: "/solucoes/aplicativo-smart-aluno" },
  { from: "/solucoes/pagamento-recorrente", to: "/solucoes/financeiro" },

  // ===== Categorias antigas do blog =====
  { from: "/blog/gestao-escolar", to: "/solucoes" },
  { from: "/blog/captacao-de-alunos", to: "/solucoes/marketing" },
  { from: "/blog/pedagogico", to: "/solucoes/pedagogico" },
  { from: "/blog/inovacao", to: "/inovacao-na-escola" },

  // ===== Posts antigos do blog (os 4 do sitemap) =====
  {
    from: "/blog/4-dicas-de-controle-de-frequencia-de-alunos-que-voce-deveria-adotar",
    to: "/solucoes/pedagogico"
  },
  {
    from: "/blog/4-reais-beneficios-da-automacao-escolar-na-rotina-da-escola",
    to: "/inovacao-na-escola"
  },
  {
    from: "/blog/como-melhorar-o-atendimento-ao-aluno-com-um-sistema-de-gestao",
    to: "/solucoes/aplicativo-smart-aluno"
  },
  {
    from: "/blog/conheca-5-maiores-desafios-da-gestao-escolar-e-como-supera-los",
    to: "/solucoes"
  }
];

const redirectMap = buildRedirectMap(redirectRules);

export const handle: Handle = async ({ event, resolve }) => {
  const pathname = normalizePath(event.url.pathname);

  // 1) Match exato (o mais seguro pro SEO)
  const direct = redirectMap.get(pathname);
  if (direct) throw redirect(direct.status, direct.to);

  // 2) Airbag: qualquer coisa que sobrar no /blog/* cai numa página útil
  // (evita 404 de URLs antigas não mapeadas)
  if (pathname.startsWith("/blog/")) {
    throw redirect(301, "/inovacao-na-escola/marketing-educacional");
  }

  // 3) Airbag: soluções antigas não mapeadas caem no hub de soluções
  if (pathname.startsWith("/solucoes/")) {
    throw redirect(301, "/solucoes");
  }

  return resolve(event);
};
