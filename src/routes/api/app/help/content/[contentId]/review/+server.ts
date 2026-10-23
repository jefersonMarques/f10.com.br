import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { moveHelpBlock } from "$lib/server/help/helpContentOrdering";
import { updateHelpQuickGuide } from "$lib/server/help/helpQuickGuideRepository";
import {
  addStructuredHelpBlock,
  deleteStructuredHelpBlock,
  getStructuredHelpContent,
  updateStructuredHelpBlock,
  updateStructuredHelpContent,
  updateStructuredHelpStep,
  type StructuredHelpBlockInput,
  type StructuredHelpContentCategoryInput,
} from "$lib/server/help/structuredHelpRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function currentCategories(
  content: NonNullable<Awaited<ReturnType<typeof getStructuredHelpContent>>>,
): StructuredHelpContentCategoryInput[] {
  return content.categories.map((category, index) => ({
    categoryId: category.id,
    destinationUrl: category.destinationUrl,
    sortOrder: category.sortOrder || (index + 1) * 10,
  }));
}

async function saveContentFields(
  actorUserId: string,
  content: NonNullable<Awaited<ReturnType<typeof getStructuredHelpContent>>>,
  changes: Partial<{
    summary: string;
    categories: StructuredHelpContentCategoryInput[];
  }>,
): Promise<void> {
  await updateStructuredHelpContent(actorUserId, content.id, {
    title: content.title,
    slug: content.slug,
    summary: changes.summary ?? content.summary,
    searchAliases: content.searchAliases,
    assistantKnowledge: content.assistantKnowledge,
    internalSupportNotes: content.internalSupportNotes,
    categories: changes.categories ?? currentCategories(content),
  });
}

function blockInput(
  block: NonNullable<Awaited<ReturnType<typeof getStructuredHelpContent>>>["steps"][number]["blocks"][number],
  textContent: string,
): StructuredHelpBlockInput {
  return {
    blockType: block.blockType,
    textContent,
    sourceUrl: block.asset?.sourceUrl ?? "",
    altText: block.asset?.altText ?? "",
    assistantDescription: block.asset?.assistantDescription ?? "",
    subtitles: block.asset?.subtitles ?? "",
    assistantSummary: block.asset?.assistantSummary ?? "",
    extractedText: block.asset?.extractedText ?? "",
    linkUrl: block.linkUrl ?? "",
    linkLabel: block.linkLabel ?? "",
    noticeVariant: block.noticeVariant ?? "",
  };
}

function responseMessage(code: string): string {
  switch (code) {
    case "CONTENT_ARCHIVED":
      return "Conteúdo arquivado não pode ser alterado.";
    case "CONTENT_CATEGORY_REQUIRED":
      return "Selecione ao menos uma categoria.";
    case "CONTENT_CATEGORY_INVALID":
      return "Selecione somente categorias ativas.";
    case "BLOCK_TEXT_REQUIRED":
      return "Informe o texto.";
    case "BLOCK_LINK_REQUIRED":
      return "Informe o texto e o endereço do link.";
    default:
      return "Não foi possível salvar a alteração.";
  }
}

export const POST: RequestHandler = async ({ cookies, params, request, url }) => {
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) {
    return json({ success: false, message: "Origem inválida." }, { status: 403 });
  }
  if (!isUuid(params.contentId)) {
    return json({ success: false, message: "Conteúdo não encontrado." }, { status: 404 });
  }

  const { session } = await requireAppPermission(
    cookies,
    "help.edit",
    `/app/help/content/${params.contentId}/images`,
  );

  let payload: Record<string, unknown>;
  try {
    payload = await request.json() as Record<string, unknown>;
  } catch {
    return json({ success: false, message: "Alteração inválida." }, { status: 400 });
  }

  const operation = typeof payload.operation === "string" ? payload.operation : "";
  const targetId = typeof payload.targetId === "string" ? payload.targetId.trim() : "";
  const text = typeof payload.text === "string" ? payload.text.trim() : "";

  const content = await getStructuredHelpContent(params.contentId);
  if (!content) {
    return json({ success: false, message: "Conteúdo não encontrado." }, { status: 404 });
  }
  if (content.status === "archived") {
    return json({ success: false, message: "Conteúdo arquivado não pode ser alterado." }, { status: 409 });
  }

  try {
    if (operation === "summary") {
      if (text.length > 320) {
        return json({ success: false, message: "Resumo muito longo." }, { status: 400 });
      }
      await saveContentFields(session.user.id, content, { summary: text });
    } else if (operation === "quick_guide") {
      if (text.length > 12_000) {
        return json({ success: false, message: "Resumo rápido muito longo." }, { status: 400 });
      }
      await updateHelpQuickGuide(session.user.id, content.id, text);
    } else if (operation === "step_title" || operation === "step_description") {
      if (!isUuid(targetId)) {
        return json({ success: false, message: "Etapa inválida." }, { status: 400 });
      }
      const step = content.steps.find((item) => item.id === targetId);
      if (!step) {
        return json({ success: false, message: "Etapa não encontrada." }, { status: 404 });
      }
      if (operation === "step_title" && (text.length < 2 || text.length > 180)) {
        return json({ success: false, message: "Revise o título da etapa." }, { status: 400 });
      }
      if (operation === "step_description" && text.length > 2_000) {
        return json({ success: false, message: "Descrição muito longa." }, { status: 400 });
      }
      await updateStructuredHelpStep(session.user.id, content.id, step.id, {
        title: operation === "step_title" ? text : step.title,
        description: operation === "step_description" ? text : step.description,
        assistantKnowledge: step.assistantKnowledge,
      });
    } else if (operation === "block_text") {
      if (!isUuid(targetId) || text.length < 1 || text.length > 50_000) {
        return json({ success: false, message: "Texto inválido." }, { status: 400 });
      }
      const block = content.steps
        .flatMap((step) => step.blocks)
        .find((item) => item.id === targetId);
      if (!block || (block.blockType !== "text" && block.blockType !== "notice")) {
        return json({ success: false, message: "Bloco não encontrado." }, { status: 404 });
      }
      await updateStructuredHelpBlock(
        session.user.id,
        content.id,
        block.id,
        blockInput(block, text),
      );
    } else if (operation === "update_block") {
      if (!isUuid(targetId)) {
        return json({ success: false, message: "Bloco inválido." }, { status: 400 });
      }
      const block = content.steps
        .flatMap((step) => step.blocks)
        .find((item) => item.id === targetId);
      if (!block) {
        return json({ success: false, message: "Bloco não encontrado." }, { status: 404 });
      }

      const input = blockInput(block, block.textContent);
      const readField = (key: string, maxLength: number): string | null => {
        const value = payload[key];
        return typeof value === "string" && value.length <= maxLength ? value.trim() : null;
      };

      if (block.blockType === "text" || block.blockType === "notice") {
        const value = readField("textContent", 50_000);
        if (!value) {
          return json({ success: false, message: "Informe o texto do bloco." }, { status: 400 });
        }
        input.textContent = value;
        if (block.blockType === "notice") {
          const variant = readField("noticeVariant", 20);
          if (!variant || !["info", "warning", "success", "danger"].includes(variant)) {
            return json({ success: false, message: "Tipo de aviso inválido." }, { status: 400 });
          }
          input.noticeVariant = variant;
        }
      } else if (block.blockType === "link") {
        const label = readField("linkLabel", 240);
        const url = readField("linkUrl", 2_000);
        if (!label || !url || !isHttpUrl(url)) {
          return json({ success: false, message: "Informe um texto e um link válido." }, { status: 400 });
        }
        input.linkLabel = label;
        input.linkUrl = url;
      } else {
        const sourceUrl = readField("sourceUrl", 2_000);
        const altText = readField("altText", 500);
        const assistantDescription = readField("assistantDescription", 20_000);
        const extractedText = readField("extractedText", 200_000);
        const linkLabel = block.blockType === "file"
          ? readField("linkLabel", 240)
          : input.linkLabel;
        if (
          sourceUrl === null ||
          altText === null ||
          assistantDescription === null ||
          extractedText === null ||
          linkLabel === null ||
          (sourceUrl && !isHttpUrl(sourceUrl)) ||
          (block.asset?.storageKey && sourceUrl !== (block.asset.sourceUrl ?? ""))
        ) {
          return json({ success: false, message: "Revise os dados do arquivo." }, { status: 400 });
        }
        input.sourceUrl = sourceUrl;
        input.altText = altText;
        input.assistantDescription = assistantDescription;
        input.extractedText = extractedText;
        input.linkLabel = linkLabel;
      }
      await updateStructuredHelpBlock(session.user.id, content.id, block.id, input);
    } else if (operation === "delete_block" || operation === "move_block") {
      if (!isUuid(targetId) || !content.steps.some((step) =>
        step.blocks.some((block) => block.id === targetId)
      )) {
        return json({ success: false, message: "Bloco não encontrado." }, { status: 404 });
      }
      if (operation === "delete_block") {
        await deleteStructuredHelpBlock(session.user.id, content.id, targetId);
      } else {
        const direction = payload.direction;
        if (direction !== "up" && direction !== "down") {
          return json({ success: false, message: "Movimentação inválida." }, { status: 400 });
        }
        await moveHelpBlock(session.user.id, content.id, targetId, direction);
      }
    } else if (operation === "categories") {
      const categoryIds = Array.isArray(payload.categoryIds)
        ? Array.from(new Set(payload.categoryIds.filter((item): item is string =>
            typeof item === "string" && isUuid(item),
          )))
        : [];
      if (categoryIds.length === 0) {
        return json({ success: false, message: "Selecione ao menos uma categoria." }, { status: 400 });
      }
      const existingById = new Map(content.categories.map((category) => [category.id, category]));
      await saveContentFields(session.user.id, content, {
        categories: categoryIds.map((categoryId, index) => ({
          categoryId,
          destinationUrl: existingById.get(categoryId)?.destinationUrl ?? "",
          sortOrder: (index + 1) * 10,
        })),
      });
    } else if (operation === "add_block") {
      if (!isUuid(targetId)) {
        return json({ success: false, message: "Etapa inválida." }, { status: 400 });
      }
      const step = content.steps.find((item) => item.id === targetId);
      if (!step) {
        return json({ success: false, message: "Etapa não encontrada." }, { status: 404 });
      }
      const blockType = payload.blockType;
      const noticeVariant =
        payload.noticeVariant === "warning" ||
        payload.noticeVariant === "success" ||
        payload.noticeVariant === "danger"
          ? payload.noticeVariant
          : "info";
      const linkLabel = typeof payload.linkLabel === "string" ? payload.linkLabel.trim() : "";
      const linkUrl = typeof payload.linkUrl === "string" ? payload.linkUrl.trim() : "";

      if (blockType !== "text" && blockType !== "notice" && blockType !== "link") {
        return json({ success: false, message: "Tipo de complemento inválido." }, { status: 400 });
      }
      if ((blockType === "text" || blockType === "notice") && (!text || text.length > 50_000)) {
        return json({ success: false, message: "Informe o texto." }, { status: 400 });
      }
      if (
        blockType === "link" &&
        (!linkLabel || linkLabel.length > 240 || !isHttpUrl(linkUrl))
      ) {
        return json({ success: false, message: "Revise o texto e o endereço do link." }, { status: 400 });
      }

      await addStructuredHelpBlock(session.user.id, content.id, step.id, {
        blockType,
        textContent: blockType === "link" ? "" : text,
        sourceUrl: "",
        altText: "",
        assistantDescription: "",
        subtitles: "",
        assistantSummary: "",
        extractedText: "",
        linkUrl: blockType === "link" ? linkUrl : "",
        linkLabel: blockType === "link" ? linkLabel : "",
        noticeVariant: blockType === "notice" ? noticeVariant : "",
      });
    } else {
      return json({ success: false, message: "Alteração não reconhecida." }, { status: 400 });
    }

    const updated = await getStructuredHelpContent(content.id);
    return json({ success: true, content: updated });
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "";
    return json(
      { success: false, message: responseMessage(code) },
      { status: code === "CONTENT_ARCHIVED" ? 409 : 400 },
    );
  }
};
