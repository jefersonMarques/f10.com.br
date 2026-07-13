import type { PageServerLoad } from "./$types";

type WordPressPost = {
  id: number;
  date: string;
  slug: string;
  title: {
    rendered: string;
  };
  excerpt: {
    rendered: string;
  };
};

type BlogPost = {
  id: number;
  title: string;
  excerpt: string;
  date: string;
  slug: string;
  color: string;
};

const BLOG_API_URL = "https://blog.f10.com.br/wp-json/wp/v2/posts";
const BLOG_CARD_COLORS = ["#45A7DE", "#EA6D0B", "#6A26F1"];

function buildUrl(query: number | string | null, limit: number): string {
  const url = new URL(BLOG_API_URL);
  url.searchParams.set("_embed", "true");
  url.searchParams.set("per_page", String(limit));

  if (typeof query === "number") {
    url.searchParams.set("include[]", String(query));
  } else if (typeof query === "string" && query.trim()) {
    url.searchParams.set("search", query.trim());
  }

  return url.toString();
}

function cleanExcerpt(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&#[0-9]+;/g, "")
    .replace(/&[a-z]+;/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function limitWords(text: string, maximumWords: number): string {
  const words = text.split(" ").filter(Boolean);
  return words.length <= maximumWords
    ? text
    : `${words.slice(0, maximumWords).join(" ")}…`;
}

function mapPost(
  post: WordPressPost,
  color: string,
  excerptWords: number,
): BlogPost {
  return {
    id: post.id,
    title: post.title.rendered,
    excerpt: limitWords(cleanExcerpt(post.excerpt.rendered), excerptWords),
    date: new Date(post.date).toLocaleDateString("pt-BR"),
    slug: post.slug,
    color,
  };
}

async function fetchPosts(
  fetchFunction: typeof fetch,
  query: number | string | null,
  limit: number,
): Promise<WordPressPost[]> {
  const response = await fetchFunction(buildUrl(query, limit));

  if (!response.ok) {
    throw new Error(`WordPress API returned ${response.status}`);
  }

  return response.json() as Promise<WordPressPost[]>;
}

export const load: PageServerLoad = async ({ fetch }) => {
  try {
    const [heroPosts, cardPosts] = await Promise.all([
      fetchPosts(fetch, "destaque", 1),
      fetchPosts(fetch, null, 3),
    ]);

    const hero = heroPosts[0]
      ? mapPost(heroPosts[0], "#EA6D0B", 35)
      : null;

    const posts = cardPosts.map((post, index) =>
      mapPost(
        post,
        BLOG_CARD_COLORS[index % BLOG_CARD_COLORS.length],
        18,
      ),
    );

    return {
      blog: {
        hero,
        posts,
        error: null,
      },
    };
  } catch (error) {
    console.error("[Homepage] Failed to preload blog posts:", error);

    return {
      blog: {
        hero: null,
        posts: [],
        error: "Não foi possível carregar os artigos do blog neste momento.",
      },
    };
  }
};
