<script lang="ts">
  import { enhance } from "$app/forms";
  import { onMount } from "svelte";
  import type { SubmitFunction } from "@sveltejs/kit";
  import {
    ArrowLeft,
    Check,
    LoaderCircle,
    Play,
    RotateCcw,
    Sparkles,
  } from "lucide-svelte";
  import HelpTrainingTutor from "$lib/components/help/HelpTrainingTutor.svelte";
  import { claimTrainingPipWindow, trainingPipSupported } from "$lib/help/trainingPipBridge";
  import { trainingMarkupToHtml } from "$lib/help/trainingMarkup";

  type TrainingPlayerStep = {
    id: string;
    title: string;
    question?: string;
    instruction: string;
    expectedResult: string;
    successMessage: string;
    primaryActionLabel: string;
    interactionMode: "presentation" | "action";
    videoStartSeconds: number;
    images: Array<{ assetId: string; altText: string }>;
    videoUrl: string | null;
  };

  type InteractionStage = "action" | "verify" | "recovery";
  type PipMode = "guide" | "video";
  type DocumentPictureInPictureController = {
    requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
  };

  export let mode: "preview" | "invite" | "public";
  export let trainingTitle: string;
  export let sourceContentSlug: string;
  export let step: TrainingPlayerStep;
  export let assetBasePath: string;
  export let canGoBack = false;
  export let successMessage = "";
  export let formMessage = "";
  export let successAction = "";
  export let backAction = "";
  export let onAdvance: (() => void) | null = null;
  export let onBack: (() => void) | null = null;

  let interactionStage: InteractionStage = "action";
  let trackedStepId = step.id;
  let pipSupported = false;
  let pipOpening = false;
  let pipWindow: Window | null = null;
  let pipMode: PipMode = "guide";
  let fallbackOpen = false;
  let successForm: HTMLFormElement | null = null;
  let backForm: HTMLFormElement | null = null;
  let isSubmitting = false;

  $: currentImage = step.images[0] ?? null;
  $: verificationQuestion = verificationQuestionForStep(step);

  $: if (step.id !== trackedStepId) {
    trackedStepId = step.id;
    interactionStage = "action";
    pipMode = "guide";
    if (pipWindow && !pipWindow.closed) renderPip();
  }

  $: if (pipWindow && !pipWindow.closed) {
    step.id;
    interactionStage;
    canGoBack;
    isSubmitting;
    successMessage;
    formMessage;
    pipMode;
    renderPip();
  }

  onMount(() => {
    pipSupported = trainingPipSupported();
    const pending = claimTrainingPipWindow();
    if (pending) {
      void pending.then((claimed) => {
        if (claimed) adoptPipWindow(claimed);
        else fallbackOpen = true;
      });
    }

    return () => {
      if (pipWindow && !pipWindow.closed) pipWindow.close();
    };
  });

  const enhanceNavigation: SubmitFunction = () => {
    if (isSubmitting) return () => undefined;
    isSubmitting = true;
    return async ({ update }) => {
      try {
        await update({ reset: false, invalidateAll: true });
      } finally {
        isSubmitting = false;
      }
    };
  };

  function verificationQuestionForStep(currentStep: TrainingPlayerStep): string {
    const title = currentStep.title.trim().toLocaleLowerCase("pt-BR");
    const question = currentStep.question?.trim() ?? "";
    if (question && question.toLocaleLowerCase("pt-BR") !== title) return question;
    if (currentStep.expectedResult.trim()) return "O resultado esperado abaixo aconteceu no F10?";
    return "Você concluiu esta etapa no F10?";
  }

  function startVerification(): void {
    if (isSubmitting) return;
    interactionStage = "verify";
  }

  function rejectVerification(): void {
    if (isSubmitting) return;
    interactionStage = "recovery";
  }

  function retryAction(): void {
    if (isSubmitting) return;
    interactionStage = "action";
  }

  function triggerAdvance(): void {
    if (interactionStage !== "verify" || isSubmitting) return;
    if (mode === "preview") onAdvance?.();
    else successForm?.requestSubmit();
  }

  function triggerBack(): void {
    if (isSubmitting) return;
    if (interactionStage !== "action") {
      interactionStage = "action";
      return;
    }
    if (!canGoBack) return;
    if (mode === "preview") onBack?.();
    else backForm?.requestSubmit();
  }

  function formatSeconds(value: number): string {
    const seconds = Math.max(0, Math.round(value || 0));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function getDocumentPictureInPicture(): DocumentPictureInPictureController | null {
    if (typeof window === "undefined") return null;
    return (window as Window & {
      documentPictureInPicture?: DocumentPictureInPictureController;
    }).documentPictureInPicture ?? null;
  }

  function adoptPipWindow(windowRef: Window): void {
    pipWindow = windowRef;
    fallbackOpen = false;
    pipMode = "guide";
    pipWindow.addEventListener("pagehide", () => {
      pipWindow = null;
      pipMode = "guide";
    }, { once: true });
    renderPip();
  }

  async function openGuide(): Promise<void> {
    const controller = getDocumentPictureInPicture();
    if (!controller || pipOpening) {
      fallbackOpen = true;
      return;
    }
    pipOpening = true;
    try {
      const availableHeight = Number.isFinite(window.screen?.availHeight)
        ? window.screen.availHeight
        : 760;
      const opened = await controller.requestWindow({
        width: 430,
        height: Math.max(620, availableHeight - 40),
      });
      adoptPipWindow(opened);
    } catch {
      fallbackOpen = true;
    } finally {
      pipOpening = false;
    }
  }

  function openVideoHelp(): void {
    if (!step.videoUrl) return;
    if (pipWindow && !pipWindow.closed) {
      pipMode = "video";
      renderPip();
      return;
    }
    const controller = getDocumentPictureInPicture();
    if (!controller || pipOpening) {
      fallbackOpen = true;
      return;
    }
    pipOpening = true;
    void controller.requestWindow({ width: 560, height: 420 })
      .then((opened) => {
        pipWindow = opened;
        fallbackOpen = false;
        pipMode = "video";
        pipWindow.addEventListener("pagehide", () => {
          pipWindow = null;
          pipMode = "guide";
        }, { once: true });
        renderPip();
      })
      .catch(() => {
        fallbackOpen = true;
      })
      .finally(() => {
        pipOpening = false;
      });
  }

  function trainingVideoAssetId(value: string | null): string | null {
    if (!value?.startsWith("asset:")) return null;
    const id = value.slice("asset:".length);
    return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
  }

  function youtubeEmbedUrl(value: string | null): string | null {
    if (!value || value.startsWith("asset:")) return null;
    try {
      const url = new URL(value);
      let id = "";
      if (url.hostname === "youtu.be") id = url.pathname.slice(1).split("/")[0] ?? "";
      if (url.hostname.endsWith("youtube.com")) {
        if (url.pathname === "/watch") id = url.searchParams.get("v") ?? "";
        else if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) {
          id = url.pathname.split("/")[2] ?? "";
        }
      }
      return id
        ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&start=${Math.max(0, Math.round(step.videoStartSeconds || 0))}`
        : null;
    } catch {
      return null;
    }
  }

  function appendText(
    doc: Document,
    parent: HTMLElement,
    tag: "p" | "h1" | "strong" | "span",
    className: string,
    value: string,
  ): HTMLElement {
    const element = doc.createElement(tag);
    element.className = className;
    element.textContent = value;
    parent.append(element);
    return element;
  }

  function appendMarkup(doc: Document, parent: HTMLElement, className: string, value: string): HTMLElement {
    const element = doc.createElement("div");
    element.className = className;
    element.innerHTML = trainingMarkupToHtml(value);
    parent.append(element);
    return element;
  }

  function pipButton(
    doc: Document,
    label: string,
    className: string,
    handler: () => void,
    disabled = false,
  ): HTMLButtonElement {
    const element = doc.createElement("button");
    element.type = "button";
    element.className = className;
    element.textContent = label;
    element.disabled = disabled;
    if (!disabled) element.addEventListener("click", handler);
    return element;
  }

  function pipStyle(doc: Document): void {
    const style = doc.createElement("style");
    style.textContent = `
      :root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#061333;background:#f7f8fb}
      *{box-sizing:border-box}body{margin:0;height:100vh;overflow:hidden;background:#f7f8fb}
      .guide{height:100vh;display:grid;grid-template-rows:auto minmax(0,1fr) auto}.top{display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid #e5e8ef;background:#fff;padding:12px 14px}.brand{display:flex;min-width:0;align-items:center;gap:9px}.logo{font-size:22px;font-weight:900;letter-spacing:-.07em;color:#f36b00}.training{max-width:210px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;font-weight:700;color:#697187}
      .content{overflow-y:auto;padding:24px 20px 28px}.eyebrow{font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#f36b00;margin:0 0 9px}.eyebrow.red{color:#b42318}.title{font-size:28px;line-height:1.08;letter-spacing:-.04em;margin:0;color:#061333}.rich{font-size:15px;line-height:1.65;color:#4f5a70;margin-top:17px}.rich p{margin:0 0 11px}.rich strong{font-weight:850;color:#061333}.rich code{display:inline-block;border-radius:6px;background:#edf0f5;padding:1px 6px;color:#000a57;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.92em;font-weight:800}.rich ul,.rich ol{margin:8px 0 12px;padding-left:22px}.rich li{margin:6px 0}.verify{margin-top:16px;font-size:20px;line-height:1.35;font-weight:800;color:#061333}.expected{margin-top:16px;border:1px solid #d9e8dd;border-radius:14px;background:#f4fbf6;padding:13px 14px;color:#315b3d;font-size:12px;line-height:1.55}.expected strong{color:#245133}.expected .rich{margin:6px 0 0;font-size:12px;color:#315b3d}.recovery{margin-top:16px;border:1px solid #f0c9c5;border-radius:14px;background:#fff5f4;padding:14px;color:#7a2e28;font-size:13px;line-height:1.55}.success{margin-top:14px;border-radius:12px;background:#eef8f1;padding:10px 12px;color:#2f7045;font-size:10px;font-weight:700}.error{margin-top:14px;border-radius:12px;background:#fff2f2;padding:10px 12px;color:#9b2c2c;font-size:10px}.video-help{width:100%;margin-top:17px;border:1px solid #ffd0ad;background:#fff7f0;color:#b94e00;border-radius:13px;min-height:46px;font-size:11px;font-weight:800;cursor:pointer}
      .footer{display:grid;grid-template-columns:1fr 1.45fr;gap:9px;border-top:1px solid #e5e8ef;background:#fff;padding:12px 14px}.neutral,.negative,.positive{border-radius:14px;min-height:50px;font-size:12px;font-weight:800;cursor:pointer}.neutral{border:1px solid #d8dde7;background:#fff;color:#596174}.neutral:disabled{opacity:.4}.negative{border:1px solid #d92d20;background:#d92d20;color:#fff;box-shadow:0 10px 24px rgba(217,45,32,.18)}.positive{border:1px solid #2f7d4c;background:#2f7d4c;color:#fff;box-shadow:0 10px 24px rgba(47,125,76,.20)}.positive:disabled,.negative:disabled{opacity:.55}
      .video-shell{height:100vh;display:grid;grid-template-rows:auto minmax(0,1fr);background:#07132d}.video-top{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 13px;background:#010d28;color:#fff}.video-meta{min-width:0}.video-meta span{display:block;font-size:8px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#ff9a4b}.video-meta strong{display:block;max-width:360px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:3px;font-size:11px}.back-guide{border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);color:#fff;border-radius:10px;min-height:34px;padding:0 11px;font-size:9px;font-weight:700;cursor:pointer}.video-content{min-height:0;display:flex;align-items:center;justify-content:center;background:#000}.video-content video,.video-content iframe{width:100%;height:100%;border:0;background:#000;object-fit:contain}.video-link{display:inline-flex;min-height:44px;align-items:center;border-radius:999px;background:#fff;padding:0 18px;color:#000a57;font-size:10px;font-weight:800;text-decoration:none}
    `;
    doc.head.append(style);
  }

  function renderGuide(doc: Document): void {
    const root = doc.createElement("main");
    root.className = "guide";

    const top = doc.createElement("header");
    top.className = "top";
    const brand = doc.createElement("div");
    brand.className = "brand";
    appendText(doc, brand, "strong", "logo", "F10");
    appendText(doc, brand, "span", "training", trainingTitle);
    top.append(brand);
    root.append(top);

    const content = doc.createElement("section");
    content.className = "content";
    const footer = doc.createElement("footer");
    footer.className = "footer";

    if (interactionStage === "action") {
      appendText(doc, content, "p", "eyebrow", step.interactionMode === "presentation" ? "Observe agora" : "Faça isso agora");
      appendText(doc, content, "h1", "title", step.title);
      appendMarkup(doc, content, "rich", step.instruction);
      if (step.videoUrl) {
        content.append(pipButton(
          doc,
          `▶ Ajuda em vídeo · trecho ${formatSeconds(step.videoStartSeconds)}`,
          "video-help",
          openVideoHelp,
        ));
      }
      if (successMessage) appendText(doc, content, "p", "success", successMessage);
      if (formMessage) appendText(doc, content, "p", "error", formMessage);

      footer.append(pipButton(doc, "← Voltar", "neutral", triggerBack, !canGoBack || isSubmitting));
      footer.append(pipButton(
        doc,
        step.interactionMode === "presentation" ? "Continuar" : "Já fiz esta etapa",
        "positive",
        startVerification,
        isSubmitting,
      ));
    } else if (interactionStage === "verify") {
      appendText(doc, content, "p", "eyebrow", "Confirme antes de continuar");
      appendMarkup(doc, content, "verify", verificationQuestion);
      if (step.expectedResult.trim()) {
        const expected = doc.createElement("div");
        expected.className = "expected";
        appendText(doc, expected, "strong", "", "Confira no F10:");
        appendMarkup(doc, expected, "rich", step.expectedResult);
        content.append(expected);
      }
      if (step.videoUrl) {
        content.append(pipButton(
          doc,
          `▶ Rever ajuda em vídeo · ${formatSeconds(step.videoStartSeconds)}`,
          "video-help",
          openVideoHelp,
        ));
      }
      footer.append(pipButton(doc, "Não", "negative", rejectVerification, isSubmitting));
      footer.append(pipButton(doc, "Sim", "positive", triggerAdvance, isSubmitting));
    } else {
      appendText(doc, content, "p", "eyebrow red", "Não avance ainda");
      appendText(doc, content, "h1", "title", "Vamos corrigir esta etapa");
      appendText(doc, content, "p", "recovery", "Confira a orientação, veja novamente o trecho do vídeo se precisar e tente outra vez no F10.");
      if (step.expectedResult.trim()) {
        const expected = doc.createElement("div");
        expected.className = "expected";
        appendText(doc, expected, "strong", "", "O que precisa acontecer:");
        appendMarkup(doc, expected, "rich", step.expectedResult);
        content.append(expected);
      }
      if (step.videoUrl) {
        content.append(pipButton(
          doc,
          `▶ Ver ajuda em vídeo · ${formatSeconds(step.videoStartSeconds)}`,
          "video-help",
          openVideoHelp,
        ));
      }
      footer.style.gridTemplateColumns = "1fr";
      footer.append(pipButton(doc, "Tentar novamente", "positive", retryAction, isSubmitting));
    }

    root.append(content);
    root.append(footer);
    doc.body.append(root);
  }

  function renderVideo(doc: Document): void {
    const root = doc.createElement("main");
    root.className = "video-shell";

    const top = doc.createElement("header");
    top.className = "video-top";
    const meta = doc.createElement("div");
    meta.className = "video-meta";
    appendText(doc, meta, "span", "", `Ajuda em vídeo · ${formatSeconds(step.videoStartSeconds)}`);
    appendText(doc, meta, "strong", "", step.title);
    top.append(meta);
    top.append(pipButton(doc, "← Voltar à orientação", "back-guide", () => {
      pipMode = "guide";
      renderPip();
    }));
    root.append(top);

    const content = doc.createElement("section");
    content.className = "video-content";

    const assetId = trainingVideoAssetId(step.videoUrl);
    const youtubeUrl = youtubeEmbedUrl(step.videoUrl);

    if (assetId) {
      const video = doc.createElement("video");
      video.src = `${assetBasePath}/${assetId}`;
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      video.addEventListener("loadedmetadata", () => {
        try {
          video.currentTime = Math.max(0, step.videoStartSeconds || 0);
          void video.play().catch(() => undefined);
        } catch {
          // Mantém reprodução normal se o seek não estiver disponível.
        }
      }, { once: true });
      content.append(video);
    } else if (youtubeUrl) {
      const iframe = doc.createElement("iframe");
      iframe.src = youtubeUrl;
      iframe.title = `Ajuda em vídeo: ${step.title}`;
      iframe.allow = "autoplay; encrypted-media; picture-in-picture";
      iframe.allowFullscreen = true;
      content.append(iframe);
    } else if (step.videoUrl) {
      const link = doc.createElement("a");
      link.className = "video-link";
      link.href = step.videoUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Abrir vídeo";
      content.append(link);
    }

    root.append(content);
    doc.body.append(root);
  }

  function renderPip(): void {
    if (!pipWindow || pipWindow.closed) return;
    const doc = pipWindow.document;
    doc.title = pipMode === "video" ? `Vídeo | ${step.title}` : `${step.title} | Trilha F10`;
    doc.head.replaceChildren();
    doc.body.replaceChildren();
    pipStyle(doc);
    if (pipMode === "video") renderVideo(doc);
    else renderGuide(doc);
  }
</script>

{#if mode !== "preview"}
  <form bind:this={successForm} method="POST" action={successAction} use:enhance={enhanceNavigation} class="hidden"></form>
  <form bind:this={backForm} method="POST" action={backAction} use:enhance={enhanceNavigation} class="hidden"></form>
{/if}

<div class="fixed inset-0 z-[80] h-[100dvh] overflow-hidden bg-[#F5F6FA] text-[#061333]">
  <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_12%,rgba(234,109,11,0.11),transparent_27%),radial-gradient(circle_at_88%_78%,rgba(0,10,87,0.08),transparent_28%)]"></div>

  <header class="relative z-20 flex min-h-16 items-center justify-between gap-3 border-b border-[#E4E7EE] bg-white/92 px-4 py-2 backdrop-blur sm:px-8 lg:px-[max(2rem,calc((100vw-1180px)/2))]">
    <div class="flex min-w-0 items-center gap-3">
      <span class="text-[28px] font-black tracking-[-0.08em] text-[#F36B00]">F10</span>
      <span class="h-7 w-px bg-[#D9DDE7]"></span>
      <strong class="truncate text-[11px] font-semibold text-[#1E2942] sm:text-[12px]">{trainingTitle}</strong>
    </div>
    <span class="hidden text-[8px] font-semibold uppercase tracking-[0.08em] text-[#8D93A0] sm:block">Trilha guiada</span>
  </header>

  <main class="relative z-10 h-[calc(100dvh-4rem)] overflow-y-auto px-4 py-5 sm:px-7 sm:py-7">
    <div class="mx-auto grid min-h-full w-full max-w-[1180px] items-center gap-6 lg:grid-cols-[minmax(300px,0.78fr)_minmax(0,1.42fr)] lg:gap-9">
      <section class="order-2 flex min-h-[250px] items-center justify-center lg:order-1 lg:min-h-[520px]">
        {#if !pipWindow || pipWindow.closed}
          <div class="w-full max-w-[420px] text-center">
            <span class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#000A57] text-[12px] font-black text-white">F10</span>
            <p class="mt-7 text-[9px] font-bold uppercase tracking-[0.18em] text-[#F36B00]">Trilha em andamento</p>
            <h1 class="mt-3 text-balance text-[34px] font-semibold tracking-[-0.045em] text-[#061333] sm:text-[40px]">Continuar trilha</h1>
            <p class="mx-auto mt-4 max-w-[360px] text-[12px] leading-6 text-[#667086]">Abra novamente a guia para continuar exatamente desta etapa.</p>
            <button type="button" on:click={() => void openGuide()} disabled={pipOpening} class="training-resume mt-7 inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#F36B00] px-8 text-[12px] font-bold text-white shadow-[0_18px_40px_rgba(243,107,0,0.24)] disabled:opacity-60">
              {#if pipOpening}<LoaderCircle size={16} class="animate-spin"/>{:else}<Sparkles size={16}/>{/if}
              Continuar trilha
            </button>
          </div>
        {:else}
          <div class="hidden lg:block">
            <span class="inline-flex items-center gap-2 rounded-full border border-[#DDE5DF] bg-white/72 px-4 py-2 text-[9px] font-semibold text-[#477257] shadow-sm">
              <span class="h-2 w-2 rounded-full bg-[#2F7D4C]"></span>
              Guia flutuante aberta
            </span>
          </div>
        {/if}
      </section>

      <section class="order-1 flex min-h-[320px] items-center justify-end lg:order-2 lg:min-h-[560px]">
        {#if currentImage}
          <div class="flex max-h-[74dvh] min-h-[300px] w-full items-center justify-center overflow-hidden rounded-[28px] bg-white shadow-[0_24px_70px_rgba(12,23,52,0.10)] ring-1 ring-[#E4E7EE] lg:min-h-[470px]">
            <img src={`${assetBasePath}/${currentImage.assetId}`} alt={currentImage.altText || step.title} class="max-h-[74dvh] w-full object-contain" />
          </div>
        {:else}
          <div class="flex min-h-[470px] w-full items-center justify-center rounded-[28px] border border-[#E3E6EE] bg-white shadow-[0_24px_70px_rgba(12,23,52,0.08)]">
            <span class="flex h-20 w-20 items-center justify-center rounded-[22px] bg-[#EEF8F1] text-[#2F7D4C]"><Check size={34}/></span>
          </div>
        {/if}
      </section>
    </div>
  </main>
</div>

{#if fallbackOpen}
  <div class="fixed inset-0 z-[140] flex items-end justify-center bg-[#07132D]/60 p-3 backdrop-blur-[3px] sm:items-center">
    <section class="max-h-[88dvh] w-full max-w-[520px] overflow-y-auto rounded-[26px] bg-white p-5 shadow-2xl sm:p-6">
      <p class="text-[8px] font-bold uppercase tracking-[0.13em] text-[#EA6D0B]">Guia da trilha</p>
      <h2 class="mt-2 text-[25px] font-semibold tracking-[-0.035em] text-[#061333]">{step.title}</h2>
      {#if interactionStage === "action"}
        <div class="training-rich mt-4 text-[13px] leading-6 text-[#5E687E]">{@html trainingMarkupToHtml(step.instruction)}</div>
        {#if step.videoUrl}<button type="button" on:click={openVideoHelp} class="mt-4 min-h-10 w-full rounded-xl border border-[#FFD1B0] bg-[#FFF7F0] text-[10px] font-bold text-[#B94E00]"><Play size={13} class="mr-1 inline"/>Ajuda em vídeo · {formatSeconds(step.videoStartSeconds)}</button>{/if}
        <div class="mt-5 grid grid-cols-[1fr_1.45fr] gap-2">
          <button type="button" on:click={triggerBack} disabled={!canGoBack || isSubmitting} class="min-h-12 rounded-xl border border-[#D8DDE7] bg-white text-[10px] font-semibold text-[#596174] disabled:opacity-40"><ArrowLeft size={14} class="mr-1 inline"/>Voltar</button>
          <button type="button" on:click={startVerification} disabled={isSubmitting} class="min-h-12 rounded-xl bg-[#2F7D4C] text-[10px] font-bold text-white">Já fiz esta etapa</button>
        </div>
      {:else if interactionStage === "verify"}
        <div class="training-rich mt-4 text-[17px] font-semibold leading-7 text-[#061333]">{@html trainingMarkupToHtml(verificationQuestion)}</div>
        {#if step.expectedResult.trim()}<div class="mt-4 rounded-xl border border-[#D9E8DD] bg-[#F4FBF6] px-4 py-3"><div class="training-rich text-[10px] leading-5 text-[#315B3D]">{@html trainingMarkupToHtml(step.expectedResult)}</div></div>{/if}
        {#if step.videoUrl}<button type="button" on:click={openVideoHelp} class="mt-4 min-h-10 w-full rounded-xl border border-[#FFD1B0] bg-[#FFF7F0] text-[10px] font-bold text-[#B94E00]"><Play size={13} class="mr-1 inline"/>Rever ajuda em vídeo</button>{/if}
        <div class="mt-5 grid grid-cols-2 gap-2">
          <button type="button" on:click={rejectVerification} disabled={isSubmitting} class="min-h-12 rounded-xl bg-[#D92D20] text-[10px] font-bold text-white">Não</button>
          <button type="button" on:click={triggerAdvance} disabled={isSubmitting} class="min-h-12 rounded-xl bg-[#2F7D4C] text-[10px] font-bold text-white">Sim</button>
        </div>
      {:else}
        <p class="mt-4 rounded-xl border border-[#F0C9C5] bg-[#FFF5F4] px-4 py-3 text-[11px] leading-5 text-[#7A2E28]">Confira novamente a orientação e tente outra vez.</p>
        {#if step.videoUrl}<button type="button" on:click={openVideoHelp} class="mt-4 min-h-10 w-full rounded-xl border border-[#FFD1B0] bg-[#FFF7F0] text-[10px] font-bold text-[#B94E00]"><Play size={13} class="mr-1 inline"/>Ver ajuda em vídeo</button>{/if}
        <button type="button" on:click={retryAction} class="mt-5 min-h-12 w-full rounded-xl bg-[#2F7D4C] text-[10px] font-bold text-white"><RotateCcw size={14} class="mr-1 inline"/>Tentar novamente</button>
      {/if}
      <button type="button" on:click={() => (fallbackOpen = false)} class="mt-3 min-h-9 w-full text-[9px] font-semibold text-[#737B8C]">Fechar</button>
    </section>
  </div>
{/if}

<HelpTrainingTutor {mode} {sourceContentSlug} />

<style>
  .training-resume {
    animation: training-resume-float 3.2s ease-in-out infinite;
    transition: transform 180ms ease, box-shadow 180ms ease;
  }

  :global(.training-rich p) { margin: 0.28rem 0; }
  :global(.training-rich strong) { font-weight: 800; color: #061333; }
  :global(.training-rich code) {
    display: inline-block;
    border-radius: 0.38rem;
    background: #edf0f5;
    padding: 0.02rem 0.38rem;
    color: #000a57;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.92em;
    font-weight: 800;
  }

  @keyframes training-resume-float {
    0%, 100% { transform: translateY(0); box-shadow: 0 18px 40px rgba(243,107,0,0.22); }
    50% { transform: translateY(-5px); box-shadow: 0 24px 46px rgba(243,107,0,0.30); }
  }

  @media (prefers-reduced-motion: reduce) {
    .training-resume { animation: none; transition: none; }
  }
</style>
