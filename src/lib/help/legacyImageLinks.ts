type ImageLinkBlock = {
  blockType: string;
  linkUrl?: string | null;
  linkLabel?: string | null;
};

/** Hides the redundant URL emitted after an image wrapped by <a href="..."> in Movidesk. */
export function isRedundantLegacyImageLink(
  blocks: readonly ImageLinkBlock[],
  index: number,
): boolean {
  const block = blocks[index];
  if (block?.blockType !== "link" || blocks[index - 1]?.blockType !== "image" || !block.linkUrl) {
    return false;
  }

  try {
    const url = new URL(block.linkUrl);
    const isMovidesk = url.hostname === "s3.amazonaws.com"
      && /^\/movidesk-files\/[a-f0-9]{32}\/?$/i.test(url.pathname);
    const isFreshdesk = url.hostname === "s3.amazonaws.com"
      && url.pathname.startsWith("/cdn.freshdesk.com/data/helpdesk/attachments/");
    if (!isMovidesk && !isFreshdesk) return false;

    // Only the raw, auto-generated source URL is redundant. Keep descriptive links.
    const label = block.linkLabel?.trim() ?? "";
    return !label || label === block.linkUrl || label === url.href;
  } catch {
    return false;
  }
}

type HelpDisplayBlock = ImageLinkBlock & {
  textContent?: string | null;
  asset?: { sourceUrl?: string | null; storageKey?: string | null } | null;
};

/** Keep empty editor steps intact, but omit them from public and preview reading views. */
export function hasVisibleHelpStepContent(step: {
  description?: string | null;
  blocks: readonly HelpDisplayBlock[];
}): boolean {
  if (step.description?.trim()) return true;
  return step.blocks.some((block, index) => {
    if (block.blockType === "text" || block.blockType === "notice") {
      return Boolean(block.textContent?.trim());
    }
    if (block.blockType === "link") {
      return Boolean(block.linkUrl) && !isRedundantLegacyImageLink(step.blocks, index);
    }
    if (block.blockType === "image" || block.blockType === "file") {
      return Boolean(block.asset?.storageKey || block.asset?.sourceUrl);
    }
    return false;
  });
}
