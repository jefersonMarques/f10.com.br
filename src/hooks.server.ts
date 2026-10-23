// src/hooks.server.ts
// Redirecionamentos de URLs antigas para preservar autoridade, tráfego e indexação.

import { redirect, type Handle, type HandleServerError } from "@sveltejs/kit";
import { startHelpVideoProcessingWorker } from "$lib/server/help/helpVideoProcessingWorker";
import { startSupportEmailInboundWorker } from "$lib/server/support/emailInboundWorker";
import { resolveMovideskLegacyArticleId } from "$lib/server/help/movideskLegacyLinks";
import { getPublicHelpCollectionBySlug } from "$lib/server/help/helpCollectionRepository";

startHelpVideoProcessingWorker();
startSupportEmailInboundWorker();
// Migração Movidesk encerrada: não iniciar trabalhadores de importação,
// recuperação de imagens ou publicação em massa no servidor.
// Os artigos e os redirecionamentos legados permanecem preservados.

type RedirectRule = {
  from: string;
  to: string;
  permanent?: boolean;
};

const CANONICAL_ORIGIN = "https://f10.com.br";
const BLOG_BASE_URL = "https://blog.f10.com.br";
const ALTERNATE_HOSTS = new Set(["www.f10.com.br", "www2.f10.com.br"]);

const LEGACY_KB_CATEGORY_COLLECTIONS = new Map<string, string>([
  ["primeiros-passos", "primeiros-passos"],
  ["cadastros-iniciais", "primeiros-passos"],
  ["comercial", "comercial-visitas-e-contratos"],
  ["crm-e-funil-de-vendas", "crm-e-whatsapp"],
  ["mensagens-de-sms", "sms"],
  ["aceite-online", "aceite-online"],
  ["financeiro", "contas-bancos-conciliacao"],
  ["emissao-de-boletos", "boletos-remessa-retorno"],
  ["emissao-de-notas-fiscais", "notas-fiscais"],
  ["sistema", "parametrizacao"],
  ["aplicativo-portal-do-aluno", "portal-app-aluno"],
  ["dashboards-e-bi", "dashboards-relatorios"],
]);

function isOldHelpHostname(event: Parameters<Handle>[0]["event"]): boolean {
  // O adapter-node pode usar ORIGIN=https://f10.com.br mesmo para requests
  // recebidas para o subdomínio. O proxy deve preservar o header Host real.
  const rawHost = event.request.headers.get("host")?.toLowerCase().trim() ?? "";
  return event.url.hostname === "ajuda.f10.com.br"
    || rawHost === "ajuda.f10.com.br"
    || rawHost === "ajuda.f10.com.br:443";
}

function retiredKnowledgePath(): Response {
  return new Response("Endereço de ajuda não encontrado.", {
    status: 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}


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
    to: "/ajuda-f10",
  },
  {
    from: "/passopasso/index.html",
    to: "/ajuda-f10",
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
  // Só assume o domínio antigo depois de o DNS e o HTTPS apontarem para o F10.
  // Nenhuma requisição a f10.com.br/ajuda-f10 entra nesta regra.
  if (isOldHelpHostname(event)) {
    const oldPath = normalizePath(event.url.pathname);
    const article = /^\/kb\/(?:pt-br\/)?article\/(\d+)(?:\/[^/]*)?$/i.exec(oldPath);
    if (article) {
      const destination = await resolveMovideskLegacyArticleId(Number(article[1]));
      if (!destination) return retiredKnowledgePath();
      // URL absoluta, para garantir que nunca redirecione de volta ao subdomínio.
      throw redirect(destination.status, CANONICAL_ORIGIN + destination.location);
    }
    if (oldPath === "/" || /^\/kb(?:\/pt-br)?$/i.test(oldPath)) {
      throw redirect(301, CANONICAL_ORIGIN + "/ajuda-f10");
    }

    const category = /^\/kb\/(?:pt-br\/)?category\/([a-z0-9-]+)$/i.exec(oldPath);
    if (category) {
      const collectionSlug = LEGACY_KB_CATEGORY_COLLECTIONS.get(category[1].toLowerCase());
      if (collectionSlug) {
        const publishedCollection = await getPublicHelpCollectionBySlug(collectionSlug);
        if (publishedCollection) {
          throw redirect(301, CANONICAL_ORIGIN + "/ajuda-f10/colecoes/" +
            encodeURIComponent(publishedCollection.slug));
        }
      }
      // Sem coleção ativa correspondente: não declarar equivalência permanente.
      return retiredKnowledgePath();
    }
    return retiredKnowledgePath();
  }
  if (ALTERNATE_HOSTS.has(event.url.hostname)) {
    throw redirect(308, buildCanonicalUrl(event.url));
  }

  const pathname = normalizePath(event.url.pathname);

  // Ferramenta temporária encerrada. Bloqueia GET, POST de ações antigas,
  // exportações e páginas filhas antes de executar qualquer handler.
  if (
    pathname === "/app/help/content/movidesk" ||
    pathname.startsWith("/app/help/content/movidesk/")
  ) {
    return new Response("Página não encontrada.", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

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

  return resolve(event);
};

export const handleError: HandleServerError = ({ error, event, status, message }) => {
  if (/^\/app\/tickets\/[0-9a-f-]{36}(?:\/|$)/i.test(event.url.pathname)) {
    const cause = error instanceof Error ? error : null;
    const nestedCause = cause?.cause instanceof Error ? cause.cause : null;
    const frames = cause?.stack?.split("\n").slice(1, 6).map((line) => line.trim()) ?? [];

    console.error("[operations.ticket.render_failed]", {
      path: event.url.pathname,
      status,
      errorType: cause?.name ?? typeof error,
      causeType: nestedCause?.name ?? null,
      stackFrames: frames,
    });
  }

  return { message };
};
