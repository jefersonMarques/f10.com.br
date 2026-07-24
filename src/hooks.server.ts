// src/hooks.server.ts
// Redirecionamentos de URLs antigas para preservar autoridade, tráfego e indexação.

import { redirect, type Handle } from "@sveltejs/kit";

type RedirectRule = {
  from: string;
  to: string;
  permanent?: boolean;
};

const CANONICAL_ORIGIN = "https://f10.com.br";
const BLOG_BASE_URL = "https://blog.f10.com.br";
const ALTERNATE_HOSTS = new Set(["www.f10.com.br", "www2.f10.com.br"]);

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function buildCanonicalUrl(url: URL): string {
  return `${CANONICAL_ORIGIN}${url.pathname}${url.search}`;
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
  // ===== Páginas principais e institucionais antigas =====
  { from: "/home", to: "/" },
  { from: "/precos", to: "/preco" },
  { from: "/f10", to: "/sobre" },
  { from: "/sobre-a-f10", to: "/sobre" },
  { from: "/o-que-e-f10", to: "/sobre" },
  { from: "/como-funciona-o-f10", to: "/software-para-escolas" },
  { from: "/beneficios-do-f10", to: "/software-para-escolas" },
  { from: "/solucao-para-franquias", to: "/software-para-escolas" },
  { from: "/multiplas.html", to: "/software-para-escolas" },
  { from: "/inovacao-digital", to: "/inovacao-na-escola" },
  { from: "/contato.html", to: "/contato" },
  { from: "/demonstracao.html", to: "/contato" },

  // ===== Produtos e funcionalidades antigas =====
  { from: "/f10-smart-aluno", to: "/solucoes/aplicativo-smart-aluno" },
  {
    from: "/conheca-o-aplicativo-f10-smart-aluno-e-resolva-o-problema-da-evasao-escolar",
    to: "/solucoes/aplicativo-smart-aluno",
  },
  {
    from: "/conheca-o-aplicativo-f10-smart-aluno-e-resolva-o-problema-da-evasao-escolar/embed",
    to: "/solucoes/aplicativo-smart-aluno",
  },
  { from: "/gestao-financeira-escolar", to: "/solucoes/financeiro" },
  { from: "/comunicacao-escolar", to: "/solucoes/whatsapp" },
  { from: "/galaxpay", to: "/solucoes/financeiro" },
  {
    from: "/treinamentos",
    to: "https://ajuda.f10.com.br/kb/pt-br/article/291730/treinamentos-novo-cliente-f10",
  },
  {
    from: "/passopasso/index.html",
    to: "https://ajuda.f10.com.br/kb/pt-br/article/291730/treinamentos-novo-cliente-f10",
  },
  { from: "/novidades_2020", to: `${BLOG_BASE_URL}/` },
  { from: "/atualizacoes", to: `${BLOG_BASE_URL}/` },

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

  // ===== Entrada antiga do blog no domínio principal =====
  { from: "/blog", to: `${BLOG_BASE_URL}/` },
  { from: "/blog/gestao-escolar", to: "/solucoes" },
  {
    from: "/blog/captacao-de-alunos",
    to: "/solucoes/marketing-captacao-de-alunos",
  },
  { from: "/blog/pedagogico", to: "/solucoes/pedagogico" },
  { from: "/blog/inovacao", to: "/inovacao-na-escola" },

  // ===== Posts antigos com equivalência direta =====
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
    to: "/software-para-escolas",
  },
  { from: "/download/InstaladorF10.exe", to: "/download" },
];

// Estes conteúdos devem ser recriados no WordPress com exatamente os slugs abaixo.
// O 301 já aponta para o endereço final para preservar os backlinks existentes.
const legacyBlogArticleSlugs = [
  "cursos-profissionalizantes-crescimento-em-2018-e-um-mundo-de-possibilidades-para-2019",
  "5-metodologias-de-ensino-inovadoras-para-voce-conhecer",
  "6-erros-que-devem-ser-evitados-na-captacao-de-alunos",
  "7-dicas-para-manter-seus-professores-motivados",
  "como-manter-os-alunos-motivados-para-garantir-indicacao-de-amigos",
  "ensino-interativo-conheca-essa-metodologia-revolucionaria",
  "o-que-eu-preciso-saber-para-ter-uma-escola-de-cursos-livres-de-sucesso",
  "os-5-erros-que-prejudicam-a-administracao-escolar",
  "plano-de-gestao-escolar",
  "sobre-retencao-de-alunos",
  "software-de-gestao-escolar-nuvem-ou-local",
  "tecnologia-medo-de-se-reinventar",
  "qual-a-importancia-do-marketing-local-para-uma-franquia-de-educacao",
  "seguranca-de-dados",
  "o-que-e-roi-como-calcula-lo-e-por-que-utiliza-lo-em-uma-escola",
  "como-montar-uma-campanha-de-matriculas",
  "benchmarking-entenda-o-que-e",
  "como-organizar-a-escola",
  "diminuindo-sua-taxa-de-evasao-com-o-nps",
  "aplicativos-para-captar-e-reter-alunos",
  "boas-praticas-cobranca",
  "como-usar-as-redes-sociais-favor-da-sua-escola",
  "passo-passo-para-um-bom-treinamento-de-equipe",
  "como-captar-novos-alunos-atraves-do-marketing-digital",
] as const;

const legacyBlogRedirectMap = new Map<string, string>();

for (const slug of legacyBlogArticleSlugs) {
  const destination = `${BLOG_BASE_URL}/${slug}/`;
  legacyBlogRedirectMap.set(`/${slug}`, destination);
  legacyBlogRedirectMap.set(`/${slug}/embed`, destination);
}

// URLs que não pertencem ao site F10 e foram criadas por spam, invasão antiga ou backlinks tóxicos.
// Não devem redirecionar para páginas legítimas, pois isso produziria soft 404 e associação temática indevida.
const gonePathPrefixes = [
  "/video.php",
  "/video/",
  "/android/",
  "/ios/",
  "/pt-br/",
  "/games/",
  "/news/",
  "/casino/",
  "/poker/",
  "/bet/",
  "/blank/",
  "/futebol/",
  "/noticias/futebol-brasileiro/",
  "/esportes/",
] as const;

function isGoneSpamPath(pathname: string): boolean {
  return gonePathPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}

const redirectMap = buildRedirectMap(redirectRules);

export const handle: Handle = async ({ event, resolve }) => {
  if (ALTERNATE_HOSTS.has(event.url.hostname)) {
    throw redirect(308, buildCanonicalUrl(event.url));
  }

  const pathname = normalizePath(event.url.pathname);

  if (isGoneSpamPath(pathname)) {
    return new Response("Gone", {
      status: 410,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  const blogDestination = legacyBlogRedirectMap.get(pathname);

  if (blogDestination) {
    throw redirect(301, blogDestination);
  }

  const direct = redirectMap.get(pathname);

  if (direct) {
    const destinationPath = direct.to.startsWith("http")
      ? direct.to
      : normalizePath(direct.to);

    if (destinationPath !== pathname) {
      throw redirect(direct.status, direct.to);
    }
  }

  return resolve(event, {
    transformPageChunk: ({ html }) => {
      if (pathname !== "/contato") return html;

      return html.replace(/\(41\) 9294-3443/g, "(41) 99294-3443");
    },
  });
};
