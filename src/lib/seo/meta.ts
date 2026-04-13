// src/lib/seo/meta.ts
export type SeoMetaInput = {
  title: string;
  description: string;
  canonical: string;
  ogImage: string;
  ogTitle?: string;
  ogDescription?: string;
};

export function buildSeoMeta(input: SeoMetaInput) {
  return {
    title: input.title,
    description: input.description,
    canonical: input.canonical,
    ogImage: input.ogImage,
    ogTitle: input.ogTitle ?? input.title,
    ogDescription: input.ogDescription ?? input.description,
  };
}