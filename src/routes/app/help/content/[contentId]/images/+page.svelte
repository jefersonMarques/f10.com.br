<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import {
    AlertTriangle,
    Check,
    CheckCircle2,
    Download,
    ExternalLink,
    Eye,
    FileText,
    History,
    ImagePlus,
    Info,
    Link2,
    LoaderCircle,
    PenTool,
    PlayCircle,
    Plus,
    RefreshCw,
    Save,
    Settings2,
    Sparkles,
    Trash2,
    TriangleAlert,
    UploadCloud,
    Video,
    X,
  } from "lucide-svelte";
  import ApplicationBackLink from "$lib/components/application/ApplicationBackLink.svelte";
  import ApplicationContent from "$lib/components/application/ApplicationContent.svelte";
  import HelpCategoryIcon from "$lib/components/help/HelpCategoryIcon.svelte";
  import HelpInlineTextEditor from "$lib/components/help/HelpInlineTextEditor.svelte";
  import HelpRichText from "$lib/components/help/HelpRichText.svelte";
  import HelpScreenshotReviewCarousel from "$lib/components/help/HelpScreenshotReviewCarousel.svelte";
  import { UNCATEGORIZED_HELP_CATEGORY_SLUG } from "$lib/help/helpCategoryConstants";
  import { readHelpImageAnnotationsFromMetadata } from "$lib/help/helpImageAnnotations";
  import type { HelpHumanReviewInteraction } from "$lib/help/helpHumanReview";
  import type { PageData } from "./$types";

  export let data: PageData;

  type ReviewStep = PageData["content"]["steps"][number];
  type ReviewContent = PageData["content"];
  type AddBlockType = "text" | "notice" | "link" | "image";
  type SplitSuggestion = {
    stepId: string;
    sourceSignature: string;
    shouldSplit: boolean;
    parts: Array<{
      title: string;
      description: string;
      instruction: string;
    }>;
  };

  let savingMode: "draft" | "confirm" | null = null;
  let saveMessage = "";
  let saveSuccess = false;
  let hasUnsavedReview = false;
  let showUntouchedModal = false;
  let untouchedCount = 0;
  let publishing = false;
  let categoryPickerOpen = false;
  let categorySaving = false;
  let addPanel: { stepId: string; type: AddBlockType } | null = null;
  let addText = "";
  let addLinkLabel = "";
  let addLinkUrl = "";
  let addNoticeVariant = "info";
  let addImageFile: File | null = null;
  let addSaving = false;
  let imageAddingMode: "generate" | "upload" | null = null;
  let openEditors = new Set<string>();
  let appliedContentUpdatedAt = "";
  let reviewSummary = "";
  let reviewQuickGuide = "";
  let reviewSteps: ReviewStep[] = [];
  let reviewCategories = data.content.categories;
  let selectedCategoryIds: string[] = [];
  let reviewPending = data.humanReview.pending;
  let splitTargetStep: ReviewStep | null = null;
  let splitDesiredParts = 2;
  let splitSuggestion: SplitSuggestion | null = null;
  let splitLoadingStepId = "";
  let splitApplying = false;
  let splitError = "";
  let deleteStepTarget: ReviewStep | null = null;
  let deletingStep = false;
  let showVideoUpdateModal = false;
  let regenerationFile: File | null = null;
  let regenerating = false;
  let regenerationProgress: Array<{ stage: string; label: string; detail?: string; status: string }> = [];

  type ReviewItemPayload = {
    blockId: string;
    assetId: string;
    annotations: unknown[];
    interactions: HelpHumanReviewInteraction[];
    reviewed: boolean;
    touched: boolean;
  };

  $: {
    const signature = String(data.content.updatedAt);
    if (signature !== appliedContentUpdatedAt && !hasUnsavedReview) {
      appliedContentUpdatedAt = signature;
      reviewSummary = data.content.summary;
      reviewQuickGuide = data.content.quickGuide;
      reviewSteps = data.content.steps.map((step) => ({
        ...step,
        blocks: [...step.blocks],
      }));
      reviewCategories = data.content.categories;
      selectedCategoryIds = data.content.categories
        .filter((category) => category.slug !== UNCATEGORIZED_HELP_CATEGORY_SLUG)
        .map((category) => category.id);
      reviewPending = data.humanReview.pending;
    }
  }

  $: realCategoriesReady =
    selectedCategoryIds.length > 0 &&
    selectedCategoryIds.every((id) =>
      data.categories.some(
        (category) =>
          category.id === id &&
          category.active &&
          category.slug !== UNCATEGORIZED_HELP_CATEGORY_SLUG,
      ),
    );
  $: stepsReady =
    reviewSteps.length > 0 &&
    reviewSteps.every((step) => step.blocks.some((block) =>
      block.blockType === "text" ||
      block.blockType === "notice" ||
      block.blockType === "link" ||
      Boolean(block.asset?.sourceUrl || block.asset?.storageKey || block.asset?.extractedText),
    ));
  $: singleImagePerStep = reviewSteps.every(
    (step) => step.blocks.filter((block) => block.blockType === "image").length <= 1,
  );
  $: imageOnlyStepsReady = reviewSteps.every((step) => {
    const images = step.blocks.filter((block) => block.blockType === "image");
    if (images.length === 0 || images.length !== step.blocks.length) return true;
    return images.every(
      (block) => Boolean(block.asset?.altText.trim() || block.asset?.assistantDescription.trim()),
    );
  });
  $: videoReady =
    !data.content.featuredVideo || Boolean(data.content.featuredVideo.subtitles.trim());
  $: publicationReady =
    realCategoriesReady &&
    stepsReady &&
    singleImagePerStep &&
    imageOnlyStepsReady &&
    videoReady &&
    reviewPending === 0 &&
    openEditors.size === 0 &&
    !hasUnsavedReview;

  function assetUrl(assetId: string): string {
    return `/api/app/help/assets/${assetId}`;
  }

  function youtubeEmbedUrl(value: string | null): string | null {
    if (!value) return null;
    try {
      const url = new URL(value);
      let id = "";
      if (url.hostname === "youtu.be") id = url.pathname.slice(1).split("/")[0] ?? "";
      if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) {
        if (url.pathname === "/watch") id = url.searchParams.get("v") ?? "";
        else if (url.pathname.startsWith("/embed/") || url.pathname.startsWith("/shorts/")) {
          id = url.pathname.split("/")[2] ?? "";
        }
      }
      return /^[A-Za-z0-9_-]{6,20}$/.test(id)
        ? `https://www.youtube-nocookie.com/embed/${id}`
        : null;
    } catch {
      return null;
    }
  }

  function safeJson<T>(value: string, fallback: T): T {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  function collectReviewItems(): ReviewItemPayload[] {
    return Array.from(document.querySelectorAll<HTMLElement>("[data-human-review-item]")).map((element) => {
      const annotationsInput = element.querySelector<HTMLInputElement>("[data-review-annotations]");
      const interactionsInput = element.querySelector<HTMLInputElement>("[data-review-interactions]");
      return {
        blockId: element.dataset.blockId ?? "",
        assetId: element.dataset.assetId ?? "",
        annotations: safeJson<unknown[]>(annotationsInput?.value ?? "[]", []),
        interactions: safeJson<HelpHumanReviewInteraction[]>(interactionsInput?.value ?? "[]", []),
        reviewed: element.dataset.reviewed === "true",
        touched: element.dataset.touched === "true",
      };
    });
  }

  function applyUpdatedContent(value: unknown): void {
    if (!value || typeof value !== "object") return;
    const updated = value as ReviewContent;
    reviewSummary = updated.summary;
    reviewQuickGuide = updated.quickGuide;
    reviewSteps = updated.steps.map((step) => ({ ...step, blocks: [...step.blocks] }));
    reviewCategories = updated.categories;
    selectedCategoryIds = updated.categories
      .filter((category) => category.slug !== UNCATEGORIZED_HELP_CATEGORY_SLUG)
      .map((category) => category.id);
    appliedContentUpdatedAt = String(updated.updatedAt);
    saveSuccess = true;
    saveMessage = "Alteração salva.";
  }

  function editorState(key: string, active: boolean): void {
    const next = new Set(openEditors);
    if (active) next.add(key);
    else next.delete(key);
    openEditors = next;
  }

  function inlineSaved(event: CustomEvent<{ content: unknown }>): void {
    applyUpdatedContent(event.detail.content);
  }

  async function persistAll(
    mode: "draft" | "confirm",
    confirmUntouched: boolean,
  ): Promise<void> {
    if (openEditors.size > 0) {
      saveSuccess = false;
      saveMessage = "Salve ou cancele o texto que está em edição.";
      return;
    }
    const items = collectReviewItems();
    savingMode = mode;
    saveMessage = "";
    saveSuccess = false;
    try {
      const response = await fetch(`/api/app/help/content/${data.content.id}/images/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode,
          confirmUntouched,
          items: items.map((item) => ({
            blockId: item.blockId,
            assetId: item.assetId,
            annotations: item.annotations,
            interactions: item.interactions,
          })),
        }),
      });
      const payload = await response.json().catch(() => ({})) as {
        success?: boolean;
        message?: string;
      };
      saveSuccess = response.ok && Boolean(payload.success);
      saveMessage = payload.message || (saveSuccess ? "Revisão salva." : "Não foi possível salvar.");
      if (!saveSuccess) return;
      hasUnsavedReview = false;
      showUntouchedModal = false;
      if (mode === "confirm") reviewPending = 0;
      await invalidateAll();
    } catch {
      saveMessage = "A conexão foi interrompida.";
    } finally {
      savingMode = null;
    }
  }

  async function saveDraft(): Promise<void> {
    if (savingMode || !data.canEdit || data.humanReview.total === 0) return;
    await persistAll("draft", false);
  }

  async function concludeReview(): Promise<void> {
    if (savingMode || !data.canEdit || data.humanReview.total === 0) return;
    if (openEditors.size > 0) {
      saveSuccess = false;
      saveMessage = "Salve ou cancele o texto que está em edição.";
      return;
    }
    const items = collectReviewItems();
    untouchedCount = items.filter((item) => !item.reviewed && !item.touched).length;
    if (untouchedCount > 0) {
      showUntouchedModal = true;
      return;
    }
    await persistAll("confirm", false);
  }

  function markInteraction(): void {
    hasUnsavedReview = true;
    saveMessage = "";
  }

  function toggleCategory(categoryId: string): void {
    selectedCategoryIds = selectedCategoryIds.includes(categoryId)
      ? selectedCategoryIds.filter((id) => id !== categoryId)
      : [...selectedCategoryIds, categoryId];
  }

  async function saveCategories(): Promise<void> {
    if (categorySaving || selectedCategoryIds.length === 0) return;
    categorySaving = true;
    try {
      const response = await fetch(`/api/app/help/content/${data.content.id}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          operation: "categories",
          categoryIds: selectedCategoryIds,
        }),
      });
      const payload = await response.json().catch(() => ({})) as {
        success?: boolean;
        message?: string;
        content?: unknown;
      };
      if (!response.ok || !payload.success) {
        saveSuccess = false;
        saveMessage = payload.message || "Não foi possível salvar as categorias.";
        return;
      }
      applyUpdatedContent(payload.content);
      categoryPickerOpen = false;
    } finally {
      categorySaving = false;
    }
  }

  function openAddPanel(stepId: string, type: AddBlockType): void {
    addPanel = { stepId, type };
    addText = "";
    addLinkLabel = "";
    addLinkUrl = "";
    addNoticeVariant = "info";
    addImageFile = null;
  }

  function chooseStepImageFile(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    addImageFile = input.files?.[0] ?? null;
  }

  async function addStepImage(action: "generate" | "upload"): Promise<void> {
    if (!addPanel || addPanel.type !== "image" || imageAddingMode) return;
    if (hasUnsavedReview || openEditors.size > 0) {
      saveSuccess = false;
      saveMessage = hasUnsavedReview
        ? "Salve as alterações das imagens antes de adicionar outra."
        : "Salve ou cancele o texto que está em edição.";
      return;
    }
    if (action === "upload" && !addImageFile) return;

    imageAddingMode = action;
    saveMessage = "";
    try {
      let response: Response;
      if (action === "generate") {
        response = await fetch(
          `/api/app/help/content/${data.content.id}/steps/${addPanel.stepId}/image`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "generate" }),
          },
        );
      } else {
        const formData = new FormData();
        formData.set("file", addImageFile!);
        response = await fetch(
          `/api/app/help/content/${data.content.id}/steps/${addPanel.stepId}/image`,
          { method: "POST", body: formData },
        );
      }
      const payload = await response.json().catch(() => ({})) as {
        success?: boolean;
        message?: string;
      };
      if (!response.ok || !payload.success) {
        saveSuccess = false;
        saveMessage = payload.message || "Não foi possível adicionar a imagem.";
        return;
      }
      saveSuccess = true;
      saveMessage = payload.message || "Imagem adicionada.";
      addPanel = null;
      addImageFile = null;
      await invalidateAll();
    } catch {
      saveSuccess = false;
      saveMessage = "A conexão foi interrompida ao adicionar a imagem.";
    } finally {
      imageAddingMode = null;
    }
  }

  async function addBlock(): Promise<void> {
    if (!addPanel || addPanel.type === "image" || addSaving) return;
    addSaving = true;
    try {
      const response = await fetch(`/api/app/help/content/${data.content.id}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          operation: "add_block",
          targetId: addPanel.stepId,
          blockType: addPanel.type,
          text: addText,
          noticeVariant: addNoticeVariant,
          linkLabel: addLinkLabel,
          linkUrl: addLinkUrl,
        }),
      });
      const payload = await response.json().catch(() => ({})) as {
        success?: boolean;
        message?: string;
        content?: unknown;
      };
      if (!response.ok || !payload.success) {
        saveSuccess = false;
        saveMessage = payload.message || "Não foi possível adicionar.";
        return;
      }
      applyUpdatedContent(payload.content);
      addPanel = null;
    } finally {
      addSaving = false;
    }
  }

  function openSplitDialog(step: ReviewStep): void {
    if (hasUnsavedReview || openEditors.size > 0) {
      saveSuccess = false;
      saveMessage = hasUnsavedReview
        ? "Salve as alterações das imagens antes de reorganizar a etapa."
        : "Salve ou cancele o texto que está em edição.";
      return;
    }
    splitTargetStep = step;
    splitDesiredParts = 2;
    splitSuggestion = null;
    splitError = "";
    saveMessage = "";
  }

  function closeSplitDialog(): void {
    if (splitApplying) return;
    splitTargetStep = null;
    splitSuggestion = null;
    splitError = "";
    splitLoadingStepId = "";
  }

  async function analyzeSplitTarget(): Promise<void> {
    if (!splitTargetStep) return;
    await previewStepSplit(splitTargetStep);
  }

  async function previewStepSplit(step: ReviewStep): Promise<void> {
    if (splitLoadingStepId || splitApplying) return;
    if (hasUnsavedReview || openEditors.size > 0) {
      saveSuccess = false;
      saveMessage = hasUnsavedReview
        ? "Salve as alterações das imagens antes de reorganizar a etapa."
        : "Salve ou cancele o texto que está em edição.";
      return;
    }
    splitLoadingStepId = step.id;
    splitError = "";
    saveMessage = "";
    try {
      const response = await fetch(
        `/api/app/help/content/${data.content.id}/steps/${step.id}/split`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "preview",
            desiredParts: splitDesiredParts,
          }),
        },
      );
      const payload = await response.json().catch(() => ({})) as {
        success?: boolean;
        message?: string;
        suggestion?: Omit<SplitSuggestion, "stepId">;
      };
      if (!response.ok || !payload.success || !payload.suggestion) {
        splitError = payload.message || "Não foi possível analisar a etapa.";
        return;
      }
      splitSuggestion = { stepId: step.id, ...payload.suggestion };
    } catch {
      splitError = "A conexão foi interrompida ao analisar a etapa.";
    } finally {
      splitLoadingStepId = "";
    }
  }

  async function applyStepSplit(): Promise<void> {
    if (!splitSuggestion?.shouldSplit || splitApplying) return;
    if (hasUnsavedReview || openEditors.size > 0) {
      saveSuccess = false;
      saveMessage = "Salve as alterações pendentes antes de aplicar.";
      return;
    }
    splitApplying = true;
    splitError = "";
    try {
      const response = await fetch(
        `/api/app/help/content/${data.content.id}/steps/${splitSuggestion.stepId}/split`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "apply",
            sourceSignature: splitSuggestion.sourceSignature,
            parts: splitSuggestion.parts,
          }),
        },
      );
      const payload = await response.json().catch(() => ({})) as {
        success?: boolean;
        message?: string;
        content?: unknown;
      };
      if (!response.ok || !payload.success) {
        splitError = payload.message || "Não foi possível reorganizar a etapa.";
        return;
      }
      applyUpdatedContent(payload.content);
      splitSuggestion = null;
      splitTargetStep = null;
      saveSuccess = true;
      saveMessage = payload.message || "Etapa reorganizada.";
    } catch {
      splitError = "A conexão foi interrompida ao reorganizar a etapa.";
    } finally {
      splitApplying = false;
    }
  }

  function openDeleteStep(step: ReviewStep): void {
    if (hasUnsavedReview || openEditors.size > 0) {
      saveSuccess = false;
      saveMessage = hasUnsavedReview
        ? "Salve as alterações das imagens antes de excluir uma etapa."
        : "Salve ou cancele o texto que está em edição.";
      return;
    }
    deleteStepTarget = step;
  }

  async function confirmDeleteStep(): Promise<void> {
    if (!deleteStepTarget || deletingStep) return;
    deletingStep = true;
    try {
      const response = await fetch(
        `/api/app/help/content/${data.content.id}/steps/${deleteStepTarget.id}`,
        { method: "DELETE" },
      );
      const payload = await response.json().catch(() => ({})) as {
        success?: boolean;
        message?: string;
      };
      if (!response.ok || !payload.success) {
        saveSuccess = false;
        saveMessage = payload.message || "Não foi possível excluir a etapa.";
        return;
      }
      saveSuccess = true;
      saveMessage = payload.message || "Etapa excluída.";
      deleteStepTarget = null;
      await invalidateAll();
    } finally {
      deletingStep = false;
    }
  }

  function chooseRegenerationFile(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    regenerationFile = input.files?.[0] ?? null;
  }

  function openVideoUpdate(): void {
    if (hasUnsavedReview || openEditors.size > 0) {
      saveSuccess = false;
      saveMessage = hasUnsavedReview
        ? "Salve as alterações das imagens antes de reprocessar."
        : "Salve ou cancele o texto que está em edição.";
      return;
    }
    regenerationFile = null;
    regenerationProgress = [];
    showVideoUpdateModal = true;
  }

  async function runRegeneration(mode: "current" | "upload"): Promise<void> {
    if (regenerating || (mode === "upload" && !regenerationFile)) return;
    regenerating = true;
    regenerationProgress = [];
    saveMessage = "";
    try {
      let response: Response;
      if (mode === "upload") {
        const formData = new FormData();
        formData.set("videoFile", regenerationFile!);
        response = await fetch(
          `/api/app/help/content/${data.content.id}/regenerate`,
          { method: "POST", body: formData },
        );
      } else {
        response = await fetch(
          `/api/app/help/content/${data.content.id}/regenerate`,
          { method: "POST" },
        );
      }

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => ({})) as { message?: string };
        saveSuccess = false;
        saveMessage = payload.message || "Não foi possível iniciar a atualização.";
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let success = false;
      let resultMessage = "";

      const handleLine = (line: string) => {
        if (!line.trim()) return;
        const payload = JSON.parse(line) as {
          type?: string;
          stage?: string;
          status?: string;
          label?: string;
          detail?: string;
          message?: string;
          success?: boolean;
        };
        if (payload.type === "progress" && payload.stage && payload.label) {
          const next = regenerationProgress.filter((item) => item.stage !== payload.stage);
          regenerationProgress = [
            ...next,
            {
              stage: payload.stage,
              label: payload.label,
              detail: payload.detail,
              status: payload.status || "active",
            },
          ];
        } else if (payload.type === "result" && payload.success) {
          success = true;
          resultMessage = payload.message || "Novo rascunho gerado.";
        } else if (payload.type === "error") {
          resultMessage = payload.message || "Não foi possível atualizar o conteúdo.";
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) handleLine(line);
      }
      buffer += decoder.decode();
      if (buffer.trim()) handleLine(buffer);

      saveSuccess = success;
      saveMessage = resultMessage || (success ? "Novo rascunho gerado." : "Não foi possível atualizar o conteúdo.");
      if (success) {
        showVideoUpdateModal = false;
        regenerationFile = null;
        await invalidateAll();
      }
    } catch {
      saveSuccess = false;
      saveMessage = "A conexão foi interrompida durante a atualização.";
    } finally {
      regenerating = false;
    }
  }

  async function publish(): Promise<void> {
    if (!publicationReady || publishing) return;
    publishing = true;
    saveMessage = "";
    try {
      const response = await fetch(`/api/app/help/content/${data.content.id}/publish`, {
        method: "POST",
      });
      const payload = await response.json().catch(() => ({})) as {
        success?: boolean;
        message?: string;
      };
      saveSuccess = response.ok && Boolean(payload.success);
      saveMessage = payload.message || (saveSuccess ? "Conteúdo publicado." : "Não foi possível publicar.");
      if (saveSuccess) await invalidateAll();
    } finally {
      publishing = false;
    }
  }

  function beforeUnload(event: BeforeUnloadEvent): void {
    if (!hasUnsavedReview && openEditors.size === 0) return;
    event.preventDefault();
    event.returnValue = "";
  }
</script>

<svelte:head><title>Revisar conteúdo | {data.content.title} | F10 Operations</title></svelte:head>
<svelte:window on:beforeunload={beforeUnload} />

<ApplicationContent width="standard">
  <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
    <ApplicationBackLink href="/app/help/content" label="Conteúdos" />
    <div class="flex flex-wrap items-center gap-2">
      <a href={`/app/help/content/${data.content.id}/history`} class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3.5 font-semibold text-[#000A57]"><History size={14}/>Histórico</a>
      {#if data.canEdit}
        <button type="button" on:click={openVideoUpdate} class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#F1D7BD] bg-[#FFF9F3] px-3.5 font-semibold text-[#A9510D]"><RefreshCw size={14}/>Atualizar IA</button>
      {/if}
      <a href={`/app/help/content/${data.content.id}/preview`} class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3.5 font-semibold text-[#000A57]"><Eye size={14}/>Preview</a>
      <a href={`/app/help/content/${data.content.id}`} class="application-text-caption inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3.5 font-semibold text-[#000A57]"><Settings2 size={14}/>Modo avançado</a>
      {#if data.canPublish}
        <button type="button" on:click={publish} disabled={!publicationReady || publishing} title={publicationReady ? "Publicar" : "Conclua as pendências antes de publicar"} class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#EA6D0B] px-4 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#B8BCC8]">{#if publishing}<LoaderCircle size={14} class="animate-spin"/>{:else}<CheckCircle2 size={14}/>{/if}Publicar</button>
      {/if}
    </div>
  </div>

  {#if saveMessage}
    <div class={`mb-4 flex items-start gap-2 rounded-2xl border px-4 py-3 text-[10px] font-medium ${saveSuccess ? "border-[#B9E6C9] bg-[#F1FBF4] text-[#176B35]" : "border-[#F0C8C8] bg-[#FFF5F5] text-[#9B2C2C]"}`}>
      {#if saveSuccess}<CheckCircle2 size={15}/>{:else}<TriangleAlert size={15}/>{/if}<span>{saveMessage}</span>
    </div>
  {/if}

  <main data-help-content-id={data.content.id}>
    <header class="rounded-[22px] border border-[#E2E5ED] bg-white p-5 sm:p-6">
      <div class="flex flex-wrap items-center gap-2">
        {#each reviewCategories as category}
          <span class="application-text-meta inline-flex items-center gap-1.5 rounded-full bg-[#FFF3E9] px-3 py-1.5 font-bold uppercase tracking-[0.08em] text-[#B85408]"><HelpCategoryIcon name={category.icon} size={12}/>{category.name}</span>
        {/each}
        {#if data.canEdit}
          <button type="button" on:click={() => (categoryPickerOpen = !categoryPickerOpen)} class="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-[#C7CCD7] bg-white text-[#000A57]" aria-label="Editar categorias" title="Editar categorias"><Plus size={13}/></button>
        {/if}
      </div>

      {#if categoryPickerOpen}
        <div class="mt-3 rounded-2xl border border-[#DDE1EA] bg-[#FAFAFC] p-3">
          <div class="grid gap-2 sm:grid-cols-2">
            {#each data.categories.filter((category) => category.slug !== UNCATEGORIZED_HELP_CATEGORY_SLUG) as category}
              <button type="button" on:click={() => toggleCategory(category.id)} class={`flex min-h-10 items-center justify-between rounded-xl border px-3 text-left text-[10px] font-semibold ${selectedCategoryIds.includes(category.id) ? "border-[#BFC7F4] bg-[#EEF0FF] text-[#000A57]" : "border-[#E1E4EB] bg-white text-[#606777]"}`}>
                <span class="flex items-center gap-2"><HelpCategoryIcon name={category.icon} size={13}/>{category.name}</span>
                {#if selectedCategoryIds.includes(category.id)}<Check size={13}/>{/if}
              </button>
            {/each}
          </div>
          <div class="mt-3 flex justify-end gap-2">
            <button type="button" on:click={() => (categoryPickerOpen = false)} class="flex h-9 w-9 items-center justify-center rounded-lg border border-[#DDE1EA] text-[#6C7383]" aria-label="Cancelar"><X size={14}/></button>
            <button type="button" on:click={saveCategories} disabled={categorySaving || selectedCategoryIds.length === 0} class="flex h-9 w-9 items-center justify-center rounded-lg bg-[#000A57] text-white disabled:opacity-40" aria-label="Salvar categorias">{#if categorySaving}<LoaderCircle size={13} class="animate-spin"/>{:else}<Check size={14}/>{/if}</button>
          </div>
        </div>
      {/if}

      <h1 class="mt-3 text-[24px] font-semibold tracking-[-0.035em] text-[#010D28] sm:text-[30px]">{data.content.title}</h1>
      <div class="mt-2 max-w-[800px]">
        <HelpInlineTextEditor
          contentId={data.content.id}
          operation="summary"
          text={reviewSummary}
          canEdit={data.canEdit}
          className="space-y-1 text-[12px] leading-6 text-[#707788]"
          placeholder="Resumo público"
          on:saved={inlineSaved}
          on:editing={(event) => editorState("summary", event.detail.active)}
        />
      </div>
    </header>

    {#if data.content.featuredVideo}
      {@const featuredEmbed = youtubeEmbedUrl(data.content.featuredVideo.sourceUrl)}
      <section class="mt-5 overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
        {#if featuredEmbed}<div class="aspect-video overflow-hidden bg-black"><iframe src={featuredEmbed} title={data.content.featuredVideo.altText || `Vídeo: ${data.content.title}`} class="h-full w-full" allowfullscreen></iframe></div>{:else if data.content.featuredVideo.storageKey}<video controls preload="metadata" class="aspect-video h-auto w-full bg-black" src={assetUrl(data.content.featuredVideo.id)}><track kind="captions" /></video>{:else if data.content.featuredVideo.sourceUrl}<a href={data.content.featuredVideo.sourceUrl} target="_blank" rel="noopener noreferrer" class="flex min-h-20 items-center justify-between gap-3 px-5 py-4 text-[11px] font-semibold text-[#000A57]"><span class="inline-flex items-center gap-2"><PlayCircle size={18}/>Assistir ao vídeo principal</span><ExternalLink size={13}/></a>{/if}
      </section>
    {/if}

    {#if reviewQuickGuide || data.canEdit}
      <section class="mt-4 rounded-[20px] border border-[#D8DDF4] bg-[#F8F9FF] px-5 py-5">
        <div class="flex items-center gap-2"><Sparkles size={16} class="text-[#EA6D0B]"/><h2 class="text-[13px] font-semibold text-[#000A57]">Resumo rápido</h2></div>
        <div class="mt-3">
          <HelpInlineTextEditor
            contentId={data.content.id}
            operation="quick_guide"
            text={reviewQuickGuide}
            canEdit={data.canEdit}
            className="space-y-1.5 text-[12px] leading-6 text-[#4E5565]"
            rows={7}
            placeholder="Resumo rápido do procedimento"
            on:saved={inlineSaved}
            on:editing={(event) => editorState("quick-guide", event.detail.active)}
          />
        </div>
      </section>
    {/if}

    <div class="mt-5 space-y-5">
      {#each reviewSteps as step, index}
        <section class="overflow-hidden rounded-[22px] border border-[#E2E5ED] bg-white">
          <header class="flex items-start gap-4 border-b border-[#EEF0F5] px-5 py-5 sm:px-6">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#000A57] text-[12px] font-bold text-white">{index + 1}</span>
            <div class="min-w-0 flex-1">
              <HelpInlineTextEditor
                contentId={data.content.id}
                operation="step_title"
                targetId={step.id}
                text={step.title}
                canEdit={data.canEdit}
                mode="plain"
                className="pr-10 text-[17px] font-semibold text-[#252B3B]"
                rows={2}
                on:saved={inlineSaved}
                on:editing={(event) => editorState(`step-title:${step.id}`, event.detail.active)}
              />
              <div class="mt-1">
                <HelpInlineTextEditor
                  contentId={data.content.id}
                  operation="step_description"
                  targetId={step.id}
                  text={step.description}
                  canEdit={data.canEdit}
                  className="space-y-1 pr-10 text-[11px] leading-5 text-[#7A8190]"
                  rows={3}
                  placeholder="Descrição opcional"
                  on:saved={inlineSaved}
                  on:editing={(event) => editorState(`step-description:${step.id}`, event.detail.active)}
                />
              </div>
            </div>
            {#if data.canEdit}
              <button type="button" on:click={() => openSplitDialog(step)} disabled={splitApplying} class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#F1D7BD] bg-[#FFF9F3] text-[#A9510D] transition hover:bg-[#FFF4E9] disabled:opacity-50" aria-label="Quebrar etapa com IA" title="Quebrar etapa">
                <Sparkles size={14}/>
              </button>
              <button type="button" on:click={() => openDeleteStep(step)} class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#F0C8C8] bg-[#FFF7F7] text-[#9B2C2C] transition hover:bg-[#FFF0F0]" aria-label="Excluir etapa" title="Excluir etapa"><Trash2 size={14}/></button>
            {/if}
            <a href={`/app/help/content/${data.content.id}?step=${encodeURIComponent(step.id)}`} class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#DDE1EA] bg-white text-[#6E7584] transition hover:text-[#000A57]" aria-label="Abrir etapa no modo avançado" title="Modo avançado desta etapa"><Settings2 size={14}/></a>
          </header>

          <div class="space-y-5 px-5 py-6 sm:px-6">
            {#each step.blocks as block}
              {#if block.blockType === "text"}
                <div class="rounded-2xl border border-transparent p-1 transition hover:border-[#E4E7ED]">
                  <HelpInlineTextEditor
                    contentId={data.content.id}
                    operation="block_text"
                    targetId={block.id}
                    text={block.textContent}
                    canEdit={data.canEdit}
                    className="space-y-1.5 pr-10 text-[13px] leading-7 text-[#505767]"
                    rows={6}
                    on:saved={inlineSaved}
                    on:editing={(event) => editorState(`block:${block.id}`, event.detail.active)}
                  />
                </div>
              {:else if block.blockType === "notice"}
                <div class={`rounded-2xl border px-4 py-3 ${block.noticeVariant === "warning" || block.noticeVariant === "danger" ? "border-[#F0D0C8] bg-[#FFF8F5]" : "border-[#D8DEF2] bg-[#F8F9FF]"}`}>
                  <div class="flex gap-3">{#if block.noticeVariant === "warning" || block.noticeVariant === "danger"}<AlertTriangle size={16} class="mt-1 shrink-0 text-[#A9510D]"/>{:else}<Info size={16} class="mt-1 shrink-0 text-[#000A57]"/>{/if}<div class="min-w-0 flex-1"><HelpInlineTextEditor contentId={data.content.id} operation="block_text" targetId={block.id} text={block.textContent} canEdit={data.canEdit} className="space-y-1 pr-10 text-[11px] leading-6 text-[#555D6C]" rows={4} on:saved={inlineSaved} on:editing={(event) => editorState(`block:${block.id}`, event.detail.active)}/></div></div>
                </div>
              {:else if block.blockType === "image" && block.asset}
                {@const review = data.screenshotReview.find((item) => item.blockId === block.id)}
                {@const humanStatus = data.humanReview.items.find((item) => item.blockId === block.id)}
                <HelpScreenshotReviewCarousel
                  contentId={data.content.id}
                  blockId={block.id}
                  candidates={review?.candidates ?? [{ assetId: block.asset.id, candidateIndex: 1, timeSeconds: null, recommended: false }]}
                  activeAssetId={block.asset.id}
                  initialSelectedAssetId={review?.draftSelectedAssetId ?? null}
                  initialAnnotations={review?.draftAnnotations ?? readHelpImageAnnotationsFromMetadata(block.metadata)}
                  initialInteractions={review?.draftInteractions ?? []}
                  reviewed={humanStatus?.reviewed ?? false}
                  canGenerateFrames={data.canGenerateVideoFrames}
                  disabled={!data.canEdit}
                  on:interaction={markInteraction}
                />
              {:else if block.blockType === "file" && block.asset}
                {@const fileUrl = block.asset.storageKey ? assetUrl(block.asset.id) : block.asset.sourceUrl}
                {#if fileUrl}<a href={fileUrl} target="_blank" rel="noopener noreferrer" class="flex items-center justify-between rounded-2xl border border-[#E1E4EC] bg-[#FAFAFC] px-4 py-4"><span class="inline-flex items-center gap-2 text-[11px] font-semibold text-[#303645]"><Download size={15}/>{block.linkLabel || "Baixar arquivo"}</span></a>{/if}
              {:else if block.blockType === "link" && block.linkUrl}
                <a href={block.linkUrl} target="_blank" rel="noopener noreferrer" class="application-text-caption inline-flex items-center gap-2 rounded-xl bg-[#EEF0FF] px-4 py-2.5 font-semibold text-[#000A57]">{block.linkLabel || "Abrir link"}<ExternalLink size={12}/></a>
              {/if}
            {/each}

            {#if data.canEdit}
              <div class="border-t border-dashed border-[#DDE1EA] pt-4">
                <div class="flex flex-wrap gap-2">
                  <button type="button" on:click={() => openAddPanel(step.id, "text")} class="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[10px] font-semibold text-[#000A57]"><FileText size={13}/>Texto</button>
                  <button type="button" on:click={() => openAddPanel(step.id, "notice")} class="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[#F1D7BD] bg-[#FFF9F3] px-3 text-[10px] font-semibold text-[#A9510D]"><Info size={13}/>Aviso</button>
                  <button type="button" on:click={() => openAddPanel(step.id, "link")} class="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[#D8DDF4] bg-[#F8F9FF] px-3 text-[10px] font-semibold text-[#000A57]"><Link2 size={13}/>Link</button>
                  {#if !step.blocks.some((block) => block.blockType === "image")}
                    <button type="button" on:click={() => openAddPanel(step.id, "image")} class="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[#D8DDF4] bg-white px-3 text-[10px] font-semibold text-[#000A57]"><ImagePlus size={13}/>Imagem</button>
                  {/if}
                </div>

                {#if addPanel?.stepId === step.id}
                  <div class="mt-3 rounded-2xl border border-[#DDE1EA] bg-[#FAFAFC] p-3">
                    {#if addPanel.type === "image"}
                      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                        {#if data.canGenerateVideoFrames}
                          <button type="button" on:click={() => addStepImage("generate")} disabled={Boolean(imageAddingMode)} class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 text-[10px] font-semibold text-white disabled:opacity-50">
                            {#if imageAddingMode === "generate"}<LoaderCircle size={14} class="animate-spin"/>{:else}<Sparkles size={14}/>{/if}
                            Gerar do vídeo
                          </button>
                        {/if}
                        <label class="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[#DDE1EA] bg-white px-3 py-2">
                          <ImagePlus size={14} class="shrink-0 text-[#000A57]"/>
                          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" on:change={chooseStepImageFile} class="min-w-0 flex-1 text-[9px]"/>
                        </label>
                        <button type="button" on:click={() => addStepImage("upload")} disabled={!addImageFile || Boolean(imageAddingMode)} class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#D8DDF4] bg-[#F8F9FF] px-4 text-[10px] font-semibold text-[#000A57] disabled:opacity-40">
                          {#if imageAddingMode === "upload"}<LoaderCircle size={14} class="animate-spin"/>{:else}<Check size={14}/>{/if}
                          Enviar
                        </button>
                      </div>
                    {:else if addPanel.type === "link"}
                      <div class="grid gap-2 sm:grid-cols-2">
                        <input bind:value={addLinkLabel} maxlength="240" placeholder="Texto do link" class="h-10 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px]"/>
                        <input bind:value={addLinkUrl} placeholder="https://..." class="h-10 rounded-xl border border-[#DDE1EA] bg-white px-3 text-[11px]"/>
                      </div>
                    {:else}
                      <textarea bind:value={addText} rows={4} maxlength="50000" placeholder={addPanel.type === "notice" ? "Texto do aviso" : "Novo texto"} class="w-full resize-y rounded-xl border border-[#DDE1EA] bg-white px-3 py-2.5 text-[11px] leading-5"></textarea>
                      {#if addPanel.type === "notice"}
                        <div class="mt-2 flex flex-wrap gap-2">
                          {#each [["info","Informação"],["warning","Atenção"],["success","Sucesso"],["danger","Importante"]] as option}
                            <button type="button" on:click={() => (addNoticeVariant = option[0])} class={`rounded-lg border px-3 py-2 text-[9px] font-semibold ${addNoticeVariant === option[0] ? "border-[#000A57] bg-[#000A57] text-white" : "border-[#DDE1EA] bg-white text-[#687080]"}`}>{option[1]}</button>
                          {/each}
                        </div>
                      {/if}
                    {/if}
                    <div class="mt-3 flex justify-end gap-2">
                      <button type="button" on:click={() => (addPanel = null)} class="flex h-9 w-9 items-center justify-center rounded-lg border border-[#DDE1EA] text-[#6C7383]" aria-label="Cancelar"><X size={14}/></button>
                      {#if addPanel.type !== "image"}
                        <button type="button" on:click={addBlock} disabled={addSaving} class="flex h-9 w-9 items-center justify-center rounded-lg bg-[#000A57] text-white disabled:opacity-50" aria-label="Adicionar">{#if addSaving}<LoaderCircle size={13} class="animate-spin"/>{:else}<Check size={14}/>{/if}</button>
                      {/if}
                    </div>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        </section>
      {/each}
    </div>
  </main>

  {#if data.canEdit && data.humanReview.total > 0}
    <div class="sticky bottom-4 z-20 mt-5 flex flex-col gap-3 rounded-2xl border border-[#D8DDF4] bg-white/95 px-4 py-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-2"><PenTool size={14} class="text-[#000A57]"/><span class="text-[9px] font-semibold text-[#707788]">{reviewPending === 0 && !hasUnsavedReview ? "Imagens revisadas" : `${data.humanReview.total - reviewPending}/${data.humanReview.total} imagens revisadas`}</span></div>
      <div class="flex shrink-0 flex-wrap gap-2">
        <button type="button" disabled={Boolean(savingMode)} on:click={saveDraft} class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#D8DDF4] bg-white px-4 text-[10px] font-semibold text-[#000A57] disabled:opacity-60">{#if savingMode === "draft"}<LoaderCircle size={14} class="animate-spin"/>{:else}<Save size={14}/>{/if}Salvar imagens</button>
        <button type="button" disabled={Boolean(savingMode)} on:click={concludeReview} class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 text-[10px] font-semibold text-white disabled:opacity-60">{#if savingMode === "confirm"}<LoaderCircle size={14} class="animate-spin"/>{:else}<CheckCircle2 size={14}/>{/if}Concluir imagens</button>
      </div>
    </div>
  {/if}
</ApplicationContent>

{#if showVideoUpdateModal}
  <div class="fixed inset-0 z-[150] flex items-center justify-center bg-[#050A1A]/60 px-4 py-6" role="presentation">
    <section role="dialog" aria-modal="true" class="max-h-[88vh] w-full max-w-[620px] overflow-y-auto rounded-[24px] bg-white p-5 shadow-2xl sm:p-6">
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF3E9] text-[#EA6D0B]"><Sparkles size={17}/></span>
          <div><h2 class="text-[16px] font-semibold text-[#11182C]">Atualizar com IA</h2><p class="mt-1 text-[10px] text-[#858A98]">A publicação atual permanece ativa.</p></div>
        </div>
        <button type="button" on:click={() => !regenerating && (showVideoUpdateModal = false)} disabled={regenerating} class="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F3F4F7] text-[#6E7482] disabled:opacity-50" aria-label="Fechar"><X size={16}/></button>
      </div>

      <div class="mt-5 grid gap-3 sm:grid-cols-2">
        <button type="button" on:click={() => runRegeneration("current")} disabled={regenerating || !data.content.featuredVideo?.storageKey} class="rounded-2xl border border-[#D8DDF4] bg-[#F8F9FF] p-4 text-left disabled:opacity-40">
          <Video size={19} class="text-[#000A57]"/>
          <strong class="mt-3 block text-[11px] text-[#303645]">Reprocessar vídeo atual</strong>
          <span class="mt-1 block text-[9px] text-[#858A98]">Refaz texto, etapas e prints.</span>
        </button>

        <div class="rounded-2xl border border-[#F1D7BD] bg-[#FFF9F3] p-4">
          <UploadCloud size={19} class="text-[#EA6D0B]"/>
          <strong class="mt-3 block text-[11px] text-[#303645]">Novo vídeo</strong>
          <input type="file" accept="video/mp4,.mp4" on:change={chooseRegenerationFile} disabled={regenerating} class="mt-3 block w-full text-[9px]"/>
          <button type="button" on:click={() => runRegeneration("upload")} disabled={regenerating || !regenerationFile} class="mt-3 inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#EA6D0B] px-3 text-[9px] font-semibold text-white disabled:opacity-40"><RefreshCw size={12}/>Atualizar</button>
        </div>
      </div>

      {#if regenerating || regenerationProgress.length > 0}
        <div class="mt-4 space-y-2 rounded-2xl border border-[#E2E5ED] bg-[#FAFAFC] p-3">
          {#each regenerationProgress as item}
            <div class="flex items-start gap-2 rounded-xl bg-white px-3 py-2.5">
              {#if item.status === "done"}<CheckCircle2 size={13} class="mt-0.5 shrink-0 text-[#2D7143]"/>{:else}<LoaderCircle size={13} class="mt-0.5 shrink-0 animate-spin text-[#000A57]"/>{/if}
              <div><strong class="block text-[9px] text-[#454C5D]">{item.label}</strong>{#if item.detail}<span class="mt-0.5 block text-[8px] text-[#9297A5]">{item.detail}</span>{/if}</div>
            </div>
          {/each}
        </div>
      {/if}

      <div class="mt-4 rounded-xl border border-[#F1D7BD] bg-[#FFF9F3] px-4 py-3 text-[9px] font-medium text-[#7A3B08]">O rascunho atual será substituído. A versão publicada e o histórico não mudam até você publicar novamente.</div>
    </section>
  </div>
{/if}

{#if deleteStepTarget}
  <div class="fixed inset-0 z-[148] flex items-center justify-center bg-[#050A1A]/60 px-4" role="presentation">
    <section role="dialog" aria-modal="true" class="w-full max-w-[420px] rounded-[22px] bg-white p-5 shadow-2xl">
      <div class="flex items-center gap-3"><span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF0F0] text-[#9B2C2C]"><Trash2 size={17}/></span><div><h2 class="text-[14px] font-semibold text-[#11182C]">Excluir etapa?</h2><p class="mt-1 text-[9px] text-[#858A98]">{deleteStepTarget.title}</p></div></div>
      <div class="mt-5 flex justify-end gap-2">
        <button type="button" on:click={() => (deleteStepTarget = null)} disabled={deletingStep} class="min-h-10 rounded-xl border border-[#DDE1EA] px-4 text-[10px] font-semibold text-[#626979]">Cancelar</button>
        <button type="button" on:click={confirmDeleteStep} disabled={deletingStep} class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#9B2C2C] px-4 text-[10px] font-semibold text-white disabled:opacity-50">{#if deletingStep}<LoaderCircle size={13} class="animate-spin"/>{:else}<Trash2 size={13}/>{/if}Excluir</button>
      </div>
    </section>
  </div>
{/if}

{#if splitTargetStep}
  <div class="fixed inset-0 z-[145] flex items-center justify-center bg-[#050A1A]/60 px-4 py-6" role="presentation">
    <section role="dialog" aria-modal="true" class="max-h-[88vh] w-full max-w-[680px] overflow-y-auto rounded-[24px] bg-white p-5 shadow-2xl sm:p-6">
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF3E9] text-[#EA6D0B]"><Sparkles size={17}/></span>
          <div>
            <h2 class="text-[16px] font-semibold text-[#11182C]">Quebrar etapa</h2>
            <p class="mt-1 text-[10px] text-[#858A98]">{splitTargetStep.title}</p>
          </div>
        </div>
        <button type="button" on:click={closeSplitDialog} disabled={splitApplying} class="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F3F4F7] text-[#6E7482]" aria-label="Fechar"><X size={16}/></button>
      </div>

      <div class="mt-5">
        <strong class="text-[11px] font-semibold text-[#303645]">Quantas partes?</strong>
        <div class="mt-2 flex flex-wrap gap-2">
          {#each [2, 3, 4, 5, 6] as count}
            <button type="button" on:click={() => { splitDesiredParts = count; splitSuggestion = null; splitError = ""; }} class={`flex h-10 w-10 items-center justify-center rounded-xl border text-[11px] font-bold ${splitDesiredParts === count ? "border-[#000A57] bg-[#000A57] text-white" : "border-[#DDE1EA] bg-white text-[#5F6676]"}`}>{count}</button>
          {/each}
          <button type="button" on:click={analyzeSplitTarget} disabled={Boolean(splitLoadingStepId) || splitApplying} class="ml-auto inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#EA6D0B] px-4 text-[10px] font-semibold text-white disabled:opacity-50">
            {#if splitLoadingStepId}<LoaderCircle size={14} class="animate-spin"/>{:else}<Sparkles size={14}/>{/if}
            Analisar
          </button>
        </div>
      </div>

      {#if splitError}
        <div class="mt-4 flex items-start gap-2 rounded-xl border border-[#F0C8C8] bg-[#FFF5F5] px-3 py-2.5 text-[9px] font-medium text-[#9B2C2C]">
          <TriangleAlert size={13} class="mt-0.5 shrink-0"/>
          <span>{splitError}</span>
        </div>
      {/if}

      {#if splitSuggestion}
        <div class="mt-5 space-y-3">
          {#each splitSuggestion.parts as part, index}
            <article class="rounded-2xl border border-[#E2E5ED] bg-[#FAFAFC] p-4">
              <div class="flex items-start gap-3">
                <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#000A57] text-[10px] font-bold text-white">{index + 1}</span>
                <div class="min-w-0 flex-1">
                  <strong class="text-[12px] font-semibold text-[#303645]">{part.title}</strong>
                  {#if part.description}<p class="mt-1 text-[9px] leading-4 text-[#858B99]">{part.description}</p>{/if}
                  <div class="mt-2"><HelpRichText text={part.instruction} className="space-y-1 text-[10px] leading-5 text-[#555D6C]"/></div>
                </div>
              </div>
            </article>
          {/each}
        </div>
      {/if}

      <div class="mt-5 flex justify-end gap-2">
        <button type="button" on:click={closeSplitDialog} disabled={splitApplying} class="min-h-10 rounded-xl border border-[#DDE1EA] px-4 text-[10px] font-semibold text-[#626979]">Cancelar</button>
        {#if splitSuggestion?.shouldSplit}
          <button type="button" on:click={applyStepSplit} disabled={splitApplying} class="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#000A57] px-4 text-[10px] font-semibold text-white disabled:opacity-50">
            {#if splitApplying}<LoaderCircle size={14} class="animate-spin"/>{:else}<Check size={14}/>{/if}
            Aplicar
          </button>
        {/if}
      </div>
    </section>
  </div>
{/if}

{#if showUntouchedModal}
  <div class="fixed inset-0 z-[140] flex items-center justify-center bg-[#050A1A]/60 px-4" role="presentation">
    <section role="dialog" aria-modal="true" class="w-full max-w-[460px] rounded-[24px] bg-white p-5 shadow-2xl sm:p-6">
      <div class="flex items-start justify-between gap-4"><div><h2 class="text-[16px] font-semibold text-[#11182C]">Imagens sem interação</h2><p class="mt-1 text-[10px] text-[#777D8D]">{untouchedCount} {untouchedCount === 1 ? "imagem ainda não foi alterada." : "imagens ainda não foram alteradas."}</p></div><button type="button" on:click={() => (showUntouchedModal = false)} class="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F3F4F7] text-[#6E7482]" aria-label="Fechar"><X size={16}/></button></div>
      <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" on:click={() => (showUntouchedModal = false)} class="min-h-10 rounded-xl border border-[#DDE1EA] px-4 text-[10px] font-semibold text-[#626979]">Voltar</button><button type="button" disabled={Boolean(savingMode)} on:click={() => persistAll("confirm", true)} class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#000A57] px-4 text-[10px] font-semibold text-white disabled:opacity-60"><CheckCircle2 size={14}/>Confirmar imagens</button></div>
    </section>
  </div>
{/if}
