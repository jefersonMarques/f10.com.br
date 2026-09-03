import { getPublishedStructuredHelpBySlug } from "$lib/server/help/publicStructuredHelpRepository";

export type HelpPresentationSource = {
  contentId: string;
  slug: string;
  title: string;
  href: string;
};

export type HelpPresentationMedia = {
  kind: "youtube" | "video" | "link";
  title: string;
  url: string;
};

export type HelpPresentation = {
  source: HelpPresentationSource;
  media: HelpPresentationMedia | null;
};

function youtubeEmbedUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    let videoId = "";
    if (url.hostname === "youtu.be") videoId = url.pathname.slice(1).split("/")[0] ?? "";
    if (
      url.hostname === "www.youtube.com" ||
      url.hostname === "youtube.com" ||
      url.hostname === "m.youtube.com" ||
      url.hostname === "www.youtube-nocookie.com" ||
      url.hostname === "youtube-nocookie.com"
    ) {
      if (url.pathname === "/watch") videoId = url.searchParams.get("v") ?? "";
      else if (url.pathname.startsWith("/embed/")) videoId = url.pathname.split("/")[2] ?? "";
      else if (url.pathname.startsWith("/shorts/")) videoId = url.pathname.split("/")[2] ?? "";
    }
    return /^[A-Za-z0-9_-]{6,20}$/.test(videoId)
      ? `https://www.youtube-nocookie.com/embed/${videoId}`
      : null;
  } catch {
    return null;
  }
}

function safeExternalUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function getHelpPresentation(
  slug: string,
  anchor: string | null = null,
): Promise<HelpPresentation | null> {
  const content = await getPublishedStructuredHelpBySlug(slug);
  if (!content) return null;

  const encodedSlug = encodeURIComponent(content.slug);
  const href = `/ajuda-f10/${encodedSlug}${anchor ? `#${encodeURIComponent(anchor)}` : ""}`;
  const source: HelpPresentationSource = {
    contentId: content.contentId,
    slug: content.slug,
    title: content.title,
    href,
  };

  if (!content.featuredVideo) return { source, media: null };

  const videoTitle = content.featuredVideo.altText || `Vídeo: ${content.title}`;
  const youtubeUrl = youtubeEmbedUrl(content.featuredVideo.sourceUrl);
  if (youtubeUrl) {
    return { source, media: { kind: "youtube", title: videoTitle, url: youtubeUrl } };
  }

  if (content.featuredVideo.storageKey) {
    return {
      source,
      media: {
        kind: "video",
        title: videoTitle,
        url: `/api/help/content/${encodedSlug}/assets/${encodeURIComponent(content.featuredVideo.id)}`,
      },
    };
  }

  const externalUrl = safeExternalUrl(content.featuredVideo.sourceUrl);
  return externalUrl
    ? { source, media: { kind: "link", title: videoTitle, url: externalUrl } }
    : { source, media: null };
}
